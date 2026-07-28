#!/bin/bash

# ==============================================================================
# UniSearch 本地开发环境管理脚本
# 集成启动、停止、重启和状态检查功能
# 用法: ./scripts/local.sh [start|stop|restart|status|logs]
# ==============================================================================

set -e  # 遇到错误立即退出

# 切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ==============================================================================
# 配置与常量
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 端口配置
BACKEND_PORT=8888
FRONTEND_PORT_LOCAL=5173  # 本地开发端口（Vite 默认）
FRONTEND_PORT_DOCKER=3000 # Docker 部署端口

# 目录配置
LOG_DIR="logs"
PID_DIR="pids"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"
MIGRATION_LOG="${LOG_DIR}/migration.log"
BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_PORT_FILE="${PID_DIR}/backend.port"
FRONTEND_PORT_FILE="${PID_DIR}/frontend.port"
CORE_SCHEMA_TABLES="users secrets refresh_token_sessions tg_channels user_login_daily_stats"

# ==============================================================================
# 基础工具函数
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${CYAN}[->]${NC} $1"; }

# 输出最近日志，启动失败时直接给出定位线索。
show_recent_log() {
    local file=$1
    local name=$2
    local lines=${3:-80}

    if [ ! -f "$file" ]; then
        log_warning "$name 日志文件不存在: $file"
        return 0
    fi

    echo
    echo -e "${YELLOW}========== $name 最近 ${lines} 行日志 ==========${NC}"
    tail -n "$lines" "$file" || true
    echo -e "${YELLOW}========== $name 日志结束 ==========${NC}"
    echo
}

# 检查 HTTP 健康接口是否可访问。
check_http_health() {
    local url=$1
    curl -s --max-time 3 --fail "$url" >/dev/null 2>&1
}

mysql_exec() {
    MYSQL_PWD="${DB_PASSWORD:-}" mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$@"
}

# 打印横幅
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           UniSearch 本地开发环境管理脚本                  ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 显示使用帮助
show_usage() {
    echo "用法: $0 [命令]"
    echo
    echo "命令:"
    echo "  start    启动本地开发环境 (后端 + 前端)"
    echo "  stop     停止所有本地服务"
    echo "  restart  重启服务 (先停止后启动)"
    echo "  status   查看服务运行状态"
    echo "  logs     查看并跟踪服务日志 (相当于 tail -f)"
    echo
}

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 占用
    else
        return 1  # 空闲
    fi
}

find_available_port() {
    local port=$1

    while [ "$port" -le 65535 ]; do
        if ! check_port "$port"; then
            echo "$port"
            return 0
        fi
        port=$((port + 1))
    done

    return 1
}

read_runtime_port() {
    local port_file=$1
    local fallback_port=$2
    local pid_file=$3
    local runtime_port=""

    if [ -f "$port_file" ] && [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if check_process "$pid"; then
            runtime_port=$(cat "$port_file")
        fi
    fi

    if [[ "$runtime_port" =~ ^[0-9]+$ ]]; then
        echo "$runtime_port"
    else
        echo "$fallback_port"
    fi
}

# 等待端口启动
wait_for_port() {
    local port=$1
    local name=$2
    local timeout=${3:-30}
    local count=0

    log_step "等待 $name 启动 (端口 $port)..."
    while [ $count -lt $timeout ]; do
        if check_port $port; then
            log_success "$name 已启动"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        printf "."
    done
    echo
    log_error "$name 启动超时"
    return 1
}

# 检查进程是否存在
check_process() {
    local pid=$1
    if ps -p $pid > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 优雅停止进程
graceful_stop_process() {
    local pid=$1
    local name=$2
    local timeout=10

    if ! check_process $pid; then
        log_info "$name (PID: $pid) 已不存在"
        return 0
    fi

    log_info "正在停止 $name (PID: $pid)..."
    kill -TERM $pid 2>/dev/null || true

    local count=0
    while [ $count -lt $timeout ]; do
        if ! check_process $pid; then
            log_success "$name 已停止"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    log_warning "$name 未响应，强制关闭..."
    kill -9 $pid 2>/dev/null || true
}

run_database_migration() {
    local reason=$1

    log_step "执行数据库迁移..."
    log_info "$reason"
    mkdir -p "$LOG_DIR"

    if (
        cd backend
        go run ./cmd/migrate
    ) > "$MIGRATION_LOG" 2>&1; then
        log_success "数据库迁移完成"
        if grep -q "默认管理员账户创建成功" "$MIGRATION_LOG"; then
            log_success "默认管理员账户已创建：admin/admin"
        fi
        return 0
    fi

    log_error "数据库迁移失败，请检查日志: $MIGRATION_LOG"
    show_recent_log "$MIGRATION_LOG" "数据库迁移"
    exit 1
}

verify_database_ready() {
    if ! command -v mysql &> /dev/null; then
        return 0
    fi

    local table
    for table in $CORE_SCHEMA_TABLES; do
        local table_count
        table_count=$(mysql_exec --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = '$table';" 2>/dev/null || echo "0")
        if [ "$table_count" != "1" ]; then
            log_error "数据库迁移后仍缺失核心表: $table"
            show_recent_log "$MIGRATION_LOG" "数据库迁移"
            exit 1
        fi
    done

    local admin_count
    admin_count=$(mysql_exec --batch --skip-column-names "$DB_NAME" -e "SELECT COUNT(*) FROM users WHERE username = 'admin' AND role = 'admin' AND is_enabled = true AND deleted_at IS NULL;" 2>/dev/null || echo "0")
    if [ "$admin_count" = "0" ]; then
        log_error "数据库迁移后仍未检测到启用的 admin 管理员"
        log_info "若已有管理员被禁用或密码已修改，请在后台用户管理或 MySQL 中恢复管理员状态"
        show_recent_log "$MIGRATION_LOG" "数据库迁移"
        exit 1
    fi
}

ensure_database_schema() {
    log_step "检查数据库表结构..."

    if ! command -v mysql &> /dev/null; then
        log_warning "未找到 mysql 客户端，无法检测表结构"
        run_database_migration "迁移命令幂等，将直接通过后端迁移入口确保表结构和默认管理员就绪"
        return 0
    fi

    local missing_tables=""
    local table
    for table in $CORE_SCHEMA_TABLES; do
        local table_count
        table_count=$(mysql_exec --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = '$table';" 2>/dev/null || echo "0")
        if [ "$table_count" != "1" ]; then
            missing_tables="$missing_tables $table"
        fi
    done

    if [ -n "$missing_tables" ]; then
        run_database_migration "检测到缺失核心表:${missing_tables}"
        verify_database_ready
        return 0
    fi

    local admin_count
    admin_count=$(mysql_exec --batch --skip-column-names "$DB_NAME" -e "SELECT COUNT(*) FROM users WHERE username = 'admin' AND role = 'admin' AND is_enabled = true AND deleted_at IS NULL;" 2>/dev/null || echo "0")
    if [ "$admin_count" = "0" ]; then
        run_database_migration "未检测到启用的默认管理员账户，将执行迁移入口补齐种子数据"
        verify_database_ready
        return 0
    fi

    log_success "数据库表结构和默认管理员已就绪"
}

ensure_frontend_dependencies() {
    log_step "检查前端依赖..."

    if [ ! -f "frontend/package.json" ]; then
        log_error "frontend/package.json 不存在"
        exit 1
    fi

    if (
        cd frontend
        pnpm exec vite --version >/dev/null 2>&1
    ); then
        log_success "前端依赖已就绪"
        return 0
    fi

    log_warning "前端依赖缺失或 Vite 不可用，开始安装前端依赖..."
    if (
        cd frontend
        CI=true pnpm install --frozen-lockfile
    ) > "$FRONTEND_LOG" 2>&1; then
        if (
            cd frontend
            pnpm exec vite --version >/dev/null 2>&1
        ); then
            log_success "前端依赖安装完成"
            return 0
        fi

        log_warning "前端依赖已安装但 Vite 仍不可用，开始重建依赖..."
        if (
            cd frontend
            CI=true pnpm install --frozen-lockfile --force
        ) >> "$FRONTEND_LOG" 2>&1 && (
            cd frontend
            pnpm exec vite --version >/dev/null 2>&1
        ); then
            log_success "前端依赖链接重建完成"
            return 0
        fi
    fi

    log_error "前端依赖安装失败，请检查日志: $FRONTEND_LOG"
    show_recent_log "$FRONTEND_LOG" "前端依赖安装"
    exit 1
}

# ==============================================================================
# 核心功能：Start
# ==============================================================================

do_start() {
    print_banner
    log_step "准备启动服务..."

    # 1. 检查依赖
    if ! command -v go &> /dev/null; then log_error "未找到 Go"; exit 1; fi
    if ! command -v pnpm &> /dev/null; then log_error "未找到 pnpm"; exit 1; fi
    if ! command -v lsof &> /dev/null; then log_warning "未找到 lsof，端口检查可能受限"; fi
    if ! command -v mysql &> /dev/null; then log_warning "未找到 mysql 客户端，数据库连接测试将被跳过"; fi

    # 2. 检查 .env 文件
    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在"
        log_info "请复制 .env.example 为 .env 并配置数据库连接信息"
        log_info "命令: cp .env.example .env"
        exit 1
    fi
    log_success ".env 文件已找到"

    # 3. 检查本地环境数据库配置
    log_step "检查本地环境数据库配置..."
    if grep -q "^DB_HOST=" .env; then
        current_db_host=$(grep "^DB_HOST=" .env | cut -d'=' -f2)
        if [ "$current_db_host" != "localhost" ]; then
            log_warning "检测到 DB_HOST=$current_db_host，本地开发通常应使用 localhost"
            log_info "脚本不会修改 .env。若需覆盖本地配置，请创建 .env.local 并设置 DB_HOST=localhost"
        else
            log_success "DB_HOST 配置正确 (localhost)"
        fi
    else
        log_warning ".env 中未找到 DB_HOST"
        log_info "请在 .env 或 .env.local 中显式设置 DB_HOST=localhost"
    fi
    
    # 4. 加载环境变量
    log_step "加载环境变量..."
    set -a
    source .env
    if [ -f ".env.local" ]; then
        source .env.local
        log_success ".env.local 已加载（覆盖本地开发配置）"
    fi
    set +a
    log_success "环境变量已加载"

    # 4. 检查 MySQL 服务状态
    log_step "检查 MySQL 服务状态..."
    
    # 从环境变量获取数据库配置
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-root}
    DB_NAME=${DB_NAME:-unisearch}

    # 目录准备需要早于迁移和依赖安装，确保失败日志可落盘。
    mkdir -p "$LOG_DIR" "$PID_DIR" "backend/cache"
    
    # 检查 MySQL 端口是否可访问
    if command -v nc &> /dev/null; then
        if ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            log_error "无法连接到 MySQL 服务器 ($DB_HOST:$DB_PORT)"
            log_info "请确保 MySQL 服务正在运行"
            log_info "本地 MySQL: brew services start mysql 或 systemctl start mysql"
            log_info "Docker MySQL: docker-compose up -d mysql"
            exit 1
        fi
        log_success "MySQL 端口 $DB_PORT 可访问"
    else
        log_warning "未找到 nc 命令，跳过端口检查"
    fi

    # 5. 测试数据库连接
    if command -v mysql &> /dev/null; then
        log_step "测试数据库连接..."
        
        # 尝试连接数据库
        if mysql_exec -e "USE $DB_NAME;" 2>/dev/null; then
            log_success "数据库连接测试通过 (数据库: $DB_NAME)"
        else
            log_warning "数据库 '$DB_NAME' 不存在或连接失败"
            log_info "尝试创建数据库..."
            
            # 尝试创建数据库
            if mysql_exec -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
                log_success "数据库 '$DB_NAME' 创建成功"
            else
                log_error "无法创建数据库 '$DB_NAME'"
                log_info "请手动创建数据库或检查数据库权限"
                log_info "命令: mysql -u$DB_USER -p -e \"CREATE DATABASE $DB_NAME;\""
                exit 1
            fi
        fi
    else
        log_warning "跳过数据库连接测试（未安装 mysql 客户端）"
        log_info "应用启动时将自动尝试连接数据库"
    fi

    # 6. 检查并补齐数据库表结构和默认管理员
    ensure_database_schema

    # 7. 选择可用端口
    local actual_backend_port
    local actual_frontend_port
    actual_backend_port=$(find_available_port "$BACKEND_PORT") || { log_error "无法找到可用后端端口"; exit 1; }
    actual_frontend_port=$(find_available_port "$FRONTEND_PORT_LOCAL") || { log_error "无法找到可用前端端口"; exit 1; }

    if [ "$actual_backend_port" != "$BACKEND_PORT" ]; then
        log_warning "后端端口 $BACKEND_PORT 被占用，改用 $actual_backend_port"
    fi
    if [ "$actual_frontend_port" != "$FRONTEND_PORT_LOCAL" ]; then
        log_warning "前端端口 $FRONTEND_PORT_LOCAL 被占用，改用 $actual_frontend_port"
    fi

    # 8. 启动后端
    log_step "启动后端服务..."
    
    cd backend
    if [ ! -f "go.mod" ]; then log_error "backend/go.mod 不存在"; exit 1; fi
    
    log_info "运行 Go 后端（数据库: $DB_HOST:$DB_PORT/$DB_NAME）..."
    # 环境变量已经在前面加载，直接运行
    PORT="$actual_backend_port" nohup go run main.go > "../$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "../$BACKEND_PID_FILE"
    echo "$actual_backend_port" > "../$BACKEND_PORT_FILE"
    cd ..

    if wait_for_port "$actual_backend_port" "后端服务" 30; then
        # 健康检查
        sleep 1
        if curl -s "http://localhost:$actual_backend_port/api/health" > /dev/null 2>&1; then
            log_success "后端健康检查通过"
        else
            log_warning "后端健康检查未通过 (但这可能只是暂时的)"
        fi
    else
        log_error "后端启动失败，请检查日志: $BACKEND_LOG"
        show_recent_log "$BACKEND_LOG" "后端服务"
        exit 1
    fi

    # 9. 启动前端
    log_step "启动前端服务..."
    ensure_frontend_dependencies
    cd frontend
    
    log_info "运行 Vite 开发服务器..."
    VITE_BACKEND_PROXY_TARGET="http://localhost:$actual_backend_port" nohup pnpm exec vite --port "$actual_frontend_port" > "../$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$FRONTEND_PID_FILE"
    echo "$actual_frontend_port" > "../$FRONTEND_PORT_FILE"
    cd ..

    # Vite 需要更多时间来编译和启动，增加等待时间
    log_info "等待 Vite 编译完成..."
    sleep 3
    
    if wait_for_port "$actual_frontend_port" "前端服务" 45; then
        log_success "前端服务已启动"
    else
        # 检查进程是否还在运行
        if check_process $FRONTEND_PID; then
            log_warning "前端进程正在运行，但端口检测超时"
            log_warning "这可能是正常的，Vite 可能需要更多时间启动"
            log_info "请手动检查: http://localhost:$actual_frontend_port"
        else
            log_error "前端启动失败，请检查日志: $FRONTEND_LOG"
            show_recent_log "$FRONTEND_LOG" "前端服务"
            # 尝试清理后端
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    fi

    # 10. 显示状态
    do_status
}

# ==============================================================================
# 核心功能：Stop
# ==============================================================================

do_stop() {
    log_step "正在停止服务..."
    local backend_runtime_port
    local frontend_runtime_port
    backend_runtime_port=$(read_runtime_port "$BACKEND_PORT_FILE" "$BACKEND_PORT" "$BACKEND_PID_FILE")
    frontend_runtime_port=$(read_runtime_port "$FRONTEND_PORT_FILE" "$FRONTEND_PORT_LOCAL" "$FRONTEND_PID_FILE")

    # 1. PID 文件停止
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        graceful_stop_process $pid "后端服务"
        rm -f "$BACKEND_PID_FILE"
        rm -f "$BACKEND_PORT_FILE"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        graceful_stop_process $pid "前端服务"
        rm -f "$FRONTEND_PID_FILE"
        rm -f "$FRONTEND_PORT_FILE"
    fi

    # 2. 端口兜底清理 (防止 PID 文件丢失)
    # 后端
    local bpids=$(lsof -ti:"$backend_runtime_port" 2>/dev/null || true)
    if [ -n "$bpids" ]; then
        for p in $bpids; do graceful_stop_process $p "残留后端进程 (Port $backend_runtime_port)"; done
    fi

    # 前端
    local fpids=$(lsof -ti:"$frontend_runtime_port" 2>/dev/null || true)
    if [ -n "$fpids" ]; then
        for p in $fpids; do graceful_stop_process $p "残留前端进程 (Port $frontend_runtime_port)"; done
    fi

    log_success "所有服务已停止"
    
    # 备份日志 (简单追加时间戳，不移动，以便 logs 命令依然能看到最新的错误)
    # 或者，我们这里的策略是：每次 Start 会重写日志，所以 Stop 时不做操作，或者 Stop 时备份？
    # 原脚本是 mv，这导致下次查看 logs/backend.log 找不到文件。
    # 改进：保留当前日志，Start 时覆盖。如果想备份，可以在 Start 前备份。
    # 这里为了简单，不做强制 mv 备份，避免 logs 命令失效。
}

# ==============================================================================
# 核心功能：Restart
# ==============================================================================

do_restart() {
    do_stop
    log_info "等待端口释放..."
    sleep 2
    do_start
}

# ==============================================================================
# 核心功能：Status
# ==============================================================================

print_service_status() {
    local name=$1
    local port=$2
    local url=$3
    local pid_file=$4
    local health_url=${5:-}

    local port_listening=false
    local pid_value=""
    local pid_alive=false
    local pid_invalid=false

    if check_port "$port"; then
        port_listening=true
    fi

    if [ -f "$pid_file" ]; then
        local raw_pid
        raw_pid=$(cat "$pid_file")
        pid_value=$(printf "%s" "$raw_pid" | tr -dc '0-9')
        if [ -z "$pid_value" ] || [ "$pid_value" != "$raw_pid" ]; then
            pid_invalid=true
        elif check_process "$pid_value"; then
            pid_alive=true
        fi
    fi

    if [ "$port_listening" = true ]; then
        if [ "$pid_invalid" = true ]; then
            echo -e "   ${YELLOW}●${NC} $name: ${YELLOW}端口监听，但 PID 文件无效${NC} ($url)"
            echo -e "     PID 文件: $pid_file"
            echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
            return 0
        fi

        if [ -n "$pid_value" ] && [ "$pid_alive" = false ]; then
            echo -e "   ${YELLOW}●${NC} $name: ${YELLOW}端口监听，但 PID 陈旧${NC} ($url)"
            echo -e "     PID 文件: $pid_file -> $pid_value（进程不存在）"
            echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
            return 0
        fi

        if [ -z "$pid_value" ]; then
            echo -e "   ${YELLOW}●${NC} $name: ${YELLOW}端口监听，但缺少 PID 文件${NC} ($url)"
            echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
            return 0
        fi

        if [ -n "$health_url" ]; then
            if check_http_health "$health_url"; then
                echo -e "   ${GREEN}●${NC} $name: ${GREEN}运行中${NC} ($url)"
            else
                echo -e "   ${YELLOW}●${NC} $name: ${YELLOW}端口监听，但健康检查失败${NC} ($url)"
                echo -e "     健康接口: $health_url"
                echo -e "     建议: ${BLUE}./scripts/local.sh logs${NC}"
            fi
        else
            echo -e "   ${GREEN}●${NC} $name: ${GREEN}运行中${NC} ($url)"
        fi

        echo -e "     PID: $pid_value"
        return 0
    fi

    if [ -n "$pid_value" ] && [ "$pid_alive" = true ]; then
        echo -e "   ${YELLOW}●${NC} $name: ${YELLOW}进程存在，但端口未监听${NC} ($url)"
        echo -e "     PID: $pid_value"
        echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
        return 0
    fi

    if [ "$pid_invalid" = true ]; then
        echo -e "   ${RED}●${NC} $name: ${RED}未运行${NC}"
        echo -e "     PID 文件无效: $pid_file"
        echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
        return 0
    fi

    if [ -n "$pid_value" ]; then
        echo -e "   ${RED}●${NC} $name: ${RED}未运行${NC}"
        echo -e "     PID 文件陈旧: $pid_file -> $pid_value"
        echo -e "     建议: ${BLUE}./scripts/local.sh restart${NC}"
    else
        echo -e "   ${RED}●${NC} $name: ${RED}未运行${NC}"
    fi
}

do_status() {
    echo
    echo -e "${CYAN}📡 服务状态:${NC}"

    local backend_runtime_port
    local frontend_runtime_port
    backend_runtime_port=$(read_runtime_port "$BACKEND_PORT_FILE" "$BACKEND_PORT" "$BACKEND_PID_FILE")
    frontend_runtime_port=$(read_runtime_port "$FRONTEND_PORT_FILE" "$FRONTEND_PORT_LOCAL" "$FRONTEND_PID_FILE")
    
    print_service_status "后端服务" "$backend_runtime_port" "http://localhost:$backend_runtime_port" "$BACKEND_PID_FILE" "http://localhost:$backend_runtime_port/api/health"
    print_service_status "前端服务" "$frontend_runtime_port" "http://localhost:$frontend_runtime_port" "$FRONTEND_PID_FILE"

    echo
    echo -e "${CYAN}💡 常用命令:${NC}"
    echo -e "   ${BLUE}./scripts/local.sh stop${NC}    停止服务"
    echo -e "   ${BLUE}./scripts/local.sh restart${NC} 重启服务"
    echo -e "   ${BLUE}./scripts/local.sh logs${NC}    查看日志"
    echo
}

# ==============================================================================
# 核心功能：Logs
# ==============================================================================

do_logs() {
    echo -e "${CYAN}[INFO] 正在追踪日志 (Ctrl+C 退出)...${NC}"
    echo -e "日志文件: $BACKEND_LOG 和 $FRONTEND_LOG"
    
    # 检查日志文件是否存在
    touch "$BACKEND_LOG" "$FRONTEND_LOG"
    
    # 使用 tail -f 同时查看两个文件
    tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
}

# ==============================================================================
# 交互式菜单
# ==============================================================================

show_menu() {
    print_banner
    echo -e "${CYAN}请选择操作:${NC}"
    echo
    echo -e "  ${GREEN}1)${NC} 启动服务 (Start)"
    echo -e "  ${RED}2)${NC} 停止服务 (Stop)"
    echo -e "  ${YELLOW}3)${NC} 重启服务 (Restart)"
    echo -e "  ${BLUE}4)${NC} 查看状态 (Status)"
    echo -e "  ${BLUE}5)${NC} 查看日志 (Logs)"
    echo -e "  ${RED}0)${NC} 退出 (Exit)"
    echo
    echo -e -n "请输入选项 [0-5]: "
}

interactive_menu() {
    while true; do
        clear
        show_menu
        read -r choice
        echo
        
        case "$choice" in
            1)
                do_start
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            2)
                do_stop
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            3)
                do_restart
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            4)
                do_status
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            5)
                # 日志查看是阻塞的，用户Ctrl+C后应该能回到菜单（如果处理得当，或者直接退出）
                # 由于 trap 了 SIGINT，Ctrl+C 会触发 cleanup 并退出脚本。
                # 暂时保持这种行为，或者修改 Logs 让它不 trap?
                # 简单起见，Logs 退出后就直接结束了，不用必须回菜单。
                do_logs
                ;;
            0|q|Q)
                echo "再见！"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重试${NC}"
                sleep 1
                ;;
        esac
    done
}

# ==============================================================================
# 主入口
# ==============================================================================

# 如果没有参数，则进入交互模式
if [ -z "$1" ]; then
    interactive_menu
else
    # 命令行参数模式
    case "$1" in
        start)
            do_start
            ;;
        stop)
            do_stop
            ;;
        restart)
            do_restart
            ;;
        status)
            do_status
            ;;
        logs)
            do_logs
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            show_usage
            exit 1
            ;;
    esac
fi
