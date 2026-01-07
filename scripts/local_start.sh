#!/bin/bash

# UniSearch 本地开发环境一键启动脚本
# 用于快速启动前端和后端开发服务器

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[→]${NC} $1"
}

# 打印横幅
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           UniSearch 本地开发环境启动脚本                  ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口未被占用
    fi
}

# 等待端口可用
wait_for_port() {
    local port=$1
    local service_name=$2
    local timeout=${3:-30}  # 默认30秒超时
    local count=0
    
    log_step "等待 $service_name 启动 (端口 $port)..."
    
    while [ $count -lt $timeout ]; do
        if check_port $port; then
            log_success "$service_name 已启动 (端口 $port)"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        printf "."
    done
    
    echo
    log_error "$service_name 启动超时 ($timeout 秒)"
    return 1
}

# 检查必要的命令是否存在
check_dependencies() {
    log_step "检查系统依赖..."
    
    local missing_deps=()
    
    # 检查 Go
    if ! command -v go &> /dev/null; then
        missing_deps+=("Go")
    else
        local go_version=$(go version | awk '{print $3}')
        log_info "  Go: $go_version"
    fi
    
    # 检查 pnpm
    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    else
        local pnpm_version=$(pnpm --version)
        log_info "  pnpm: v$pnpm_version"
    fi
    
    # 检查 lsof
    if ! command -v lsof &> /dev/null; then
        log_warning "  lsof 未安装，端口检查功能可能受限"
    fi
    
    # 如果有缺失的依赖，报错退出
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        echo
        echo "安装指南:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "Go")
                    echo "  - Go: https://golang.org/dl/"
                    ;;
                "pnpm")
                    echo "  - pnpm: npm install -g pnpm"
                    ;;
            esac
        done
        exit 1
    fi
    
    log_success "系统依赖检查完成"
}

# 检查项目目录结构
check_project_structure() {
    log_step "检查项目结构..."
    
    local required_dirs=("backend" "frontend")
    local required_files=("backend/main.go" "frontend/package.json")
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log_error "目录不存在: $dir"
            exit 1
        fi
    done
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "文件不存在: $file"
            exit 1
        fi
    done
    
    log_success "项目结构检查完成"
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录..."
    
    # 创建日志目录
    mkdir -p logs
    
    # 创建 PID 目录
    mkdir -p pids
    
    # 创建缓存目录
    mkdir -p backend/cache
    
    log_success "目录创建完成"
}

# 检查并停止已运行的服务
check_and_stop_existing() {
    log_step "检查是否有服务正在运行..."
    
    local backend_running=false
    local frontend_running=false
    
    # 检查后端端口
    if check_port 8888; then
        log_warning "端口 8888 已被占用"
        backend_running=true
    fi
    
    # 检查前端端口
    if check_port 5173; then
        log_warning "端口 5173 已被占用"
        frontend_running=true
    fi
    
    if [ "$backend_running" = true ] || [ "$frontend_running" = true ]; then
        echo
        read -p "是否停止现有服务并重新启动？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "正在停止现有服务..."
            ./scripts/local_stop.sh
            sleep 2
        else
            log_error "取消启动"
            exit 0
        fi
    else
        log_success "端口检查完成，无冲突"
    fi
}

# 启动后端服务
start_backend() {
    log_step "启动后端服务..."
    
    cd backend
    
    # 检查 go.mod
    if [ ! -f "go.mod" ]; then
        log_error "go.mod 文件不存在"
        exit 1
    fi
    
    # 下载依赖
    log_info "  下载 Go 依赖..."
    go mod download
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        log_warning "  .env 文件不存在，使用默认配置"
    fi
    
    # 启动后端服务（后台运行）
    log_info "  启动 Go 后端服务..."
    nohup go run main.go > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../pids/backend.pid
    
    cd ..
    
    # 等待后端服务启动
    if wait_for_port 8888 "后端服务" 30; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
        
        # 测试健康检查接口
        sleep 2
        if curl -s http://localhost:8888/api/health > /dev/null 2>&1; then
            log_success "后端健康检查通过"
        else
            log_warning "后端健康检查失败，请查看日志"
        fi
    else
        log_error "后端服务启动失败"
        log_info "查看日志: tail -f logs/backend.log"
        
        # 清理进程
        if [ -f "pids/backend.pid" ]; then
            kill $(cat pids/backend.pid) 2>/dev/null || true
            rm -f pids/backend.pid
        fi
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    log_step "启动前端服务..."
    
    cd frontend
    
    # 检查 package.json
    if [ ! -f "package.json" ]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    # 安装依赖
    log_info "  安装前端依赖..."
    pnpm install --silent
    
    # 启动前端服务（后台运行）
    log_info "  启动 Vite 开发服务器..."
    nohup pnpm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../pids/frontend.pid
    
    cd ..
    
    # 等待前端服务启动
    if wait_for_port 5173 "前端服务" 30; then
        log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
    else
        log_error "前端服务启动失败"
        log_info "查看日志: tail -f logs/frontend.log"
        
        # 清理进程
        if [ -f "pids/frontend.pid" ]; then
            kill $(cat pids/frontend.pid) 2>/dev/null || true
            rm -f pids/frontend.pid
        fi
        exit 1
    fi
}

# 显示服务状态
show_status() {
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║              🚀 UniSearch 服务启动成功！                  ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}📡 服务地址:${NC}"
    echo -e "   ${GREEN}●${NC} 前端服务: ${BLUE}http://localhost:5173${NC}"
    echo -e "   ${GREEN}●${NC} 后端服务: ${BLUE}http://localhost:8888${NC}"
    echo -e "   ${GREEN}●${NC} API 文档: ${BLUE}http://localhost:8888/api/health${NC}"
    echo
    echo -e "${CYAN}📝 日志文件:${NC}"
    echo -e "   ${YELLOW}●${NC} 后端日志: logs/backend.log"
    echo -e "   ${YELLOW}●${NC} 前端日志: logs/frontend.log"
    echo
    echo -e "${CYAN}🔧 进程信息:${NC}"
    if [ -f "pids/backend.pid" ]; then
        echo -e "   ${GREEN}●${NC} 后端 PID: $(cat pids/backend.pid)"
    fi
    if [ -f "pids/frontend.pid" ]; then
        echo -e "   ${GREEN}●${NC} 前端 PID: $(cat pids/frontend.pid)"
    fi
    echo
    echo -e "${CYAN}💡 常用命令:${NC}"
    echo -e "   ${BLUE}●${NC} 停止服务:    ./scripts/local_stop.sh"
    echo -e "   ${BLUE}●${NC} 查看后端日志: tail -f logs/backend.log"
    echo -e "   ${BLUE}●${NC} 查看前端日志: tail -f logs/frontend.log"
    echo -e "   ${BLUE}●${NC} 重启服务:     ./scripts/local_stop.sh && ./scripts/local_start.sh"
    echo
    echo -e "${YELLOW}⚠️  提示: 使用 Ctrl+C 不会停止后台服务，请使用 ./scripts/local_stop.sh${NC}"
    echo
}

# 清理函数（处理脚本中断）
cleanup() {
    echo
    log_warning "接收到中断信号..."
    log_info "后台服务仍在运行，使用 ./scripts/local_stop.sh 停止服务"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    # 打印横幅
    print_banner
    
    # 检查依赖和项目结构
    check_dependencies
    check_project_structure
    
    # 创建必要的目录
    create_directories
    
    # 检查并停止已运行的服务
    check_and_stop_existing
    
    echo
    log_info "开始启动服务..."
    echo
    
    # 启动服务
    start_backend
    echo
    start_frontend
    
    # 显示状态
    show_status
}

# 执行主函数
main "$@"
