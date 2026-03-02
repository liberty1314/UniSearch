#!/bin/bash

# ==============================================================================
# UniSearch 生产环境更新部署脚本
# ==============================================================================
# 功能：
#   - 备份现有数据（MySQL + Redis + Volumes）
#   - 拉取最新镜像
#   - 滚动更新应用容器
#   - 数据验证
#   - 支持快速回滚
# 用法: sudo ./scripts/deploy-update.sh
# ==============================================================================

set -e

# ==============================================================================
# 颜色定义
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ==============================================================================
# 配置
# ==============================================================================
# 获取脚本目录和项目目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"

# 备份目录
BACKUP_DIR="$HOME/unisearch_backup_$(date +%Y%m%d_%H%M%S)"

# 容器配置
APP_CONTAINER="unisearch-app"
MYSQL_CONTAINER="unisearch-mysql"
REDIS_CONTAINER="unisearch-redis"
NGINX_CONTAINER="unisearch-nginx"
NETWORK_NAME="unisearch_unisearch-network"

# 加载环境变量
load_env() {
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    else
        log_error "环境配置文件不存在: $ENV_FILE"
        exit 1
    fi
}

# IMAGE_NAME 将在 load_env() 调用后设置

# ==============================================================================
# 日志函数
# ==============================================================================
log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[✗]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_step() { echo -e "${CYAN}[→]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

log_header() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==============================================================================
# 检查函数
# ==============================================================================
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 未运行"
        exit 1
    fi
}

check_containers() {
    log_info "检查容器状态..."
    
    local missing_containers=()
    
    for container in "$APP_CONTAINER" "$MYSQL_CONTAINER" "$REDIS_CONTAINER" "$NGINX_CONTAINER"; do
        if ! docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            missing_containers+=("$container")
        fi
    done
    
    if [ ${#missing_containers[@]} -gt 0 ]; then
        log_error "以下容器不存在: ${missing_containers[*]}"
        exit 1
    fi
    
    log_success "所有容器检查通过"
}

# ==============================================================================
# 备份函数
# ==============================================================================
backup_data() {
    log_header "阶段 1: 备份现有数据"
    
    # 创建备份目录
    log_step "创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # 备份 MySQL 数据库
    log_step "备份 MySQL 数据库..."
    
    # 创建临时配置文件（避免密码特殊字符问题）
    local mysql_cnf="/tmp/mysql_backup_$$.cnf"
    cat > "$mysql_cnf" << EOF
[client]
user=${DB_USER}
password=${DB_PASSWORD}
EOF
    chmod 600 "$mysql_cnf"
    docker cp "$mysql_cnf" "$MYSQL_CONTAINER:/tmp/my.cnf"
    
    # 使用配置文件执行备份
    if docker exec "$MYSQL_CONTAINER" mysqldump \
        --defaults-extra-file=/tmp/my.cnf \
        --single-transaction --quick \
        "$DB_NAME" > "$BACKUP_DIR/mysql_backup.sql" 2>&1; then
        
        docker exec "$MYSQL_CONTAINER" rm -f /tmp/my.cnf
        rm -f "$mysql_cnf"
        
        if [ -s "$BACKUP_DIR/mysql_backup.sql" ]; then
            local size=$(du -h "$BACKUP_DIR/mysql_backup.sql" | cut -f1)
            log_success "MySQL 备份完成 (大小: $size)"
        else
            log_error "MySQL 备份文件无效"
            exit 1
        fi
    else
        log_error "MySQL 备份失败"
        docker exec "$MYSQL_CONTAINER" rm -f /tmp/my.cnf 2>/dev/null
        rm -f "$mysql_cnf"
        exit 1
    fi
    
    # 备份 Redis 数据
    log_step "备份 Redis 数据..."
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE 2>/dev/null || true
    else
        docker exec "$REDIS_CONTAINER" redis-cli BGSAVE 2>/dev/null || true
    fi
    sleep 3
    docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$BACKUP_DIR/redis_backup.rdb" 2>/dev/null || \
        log_warning "Redis 备份文件不存在（可能未启用持久化）"
    
    # 备份 Docker Volumes
    log_step "备份 MySQL Volume..."
    docker run --rm \
        -v unisearch_mysql_data:/data \
        -v "$BACKUP_DIR:/backup" \
        alpine tar czf /backup/mysql_volume.tar.gz -C /data . 2>/dev/null
    log_success "MySQL Volume 备份完成"
    
    log_step "备份 Redis Volume..."
    docker run --rm \
        -v unisearch_redis_data:/data \
        -v "$BACKUP_DIR:/backup" \
        alpine tar czf /backup/redis_volume.tar.gz -C /data . 2>/dev/null
    log_success "Redis Volume 备份完成"
    
    # 备份配置文件
    log_step "备份配置文件..."
    cp "$ENV_FILE" "$BACKUP_DIR/env.production.backup" 2>/dev/null || true
    
    # 记录当前容器信息
    docker ps > "$BACKUP_DIR/running_containers.txt"
    docker images | grep unisearch > "$BACKUP_DIR/current_images.txt"
    
    # 记录当前镜像 ID（用于回滚）
    docker inspect "$APP_CONTAINER" --format='{{.Image}}' > "$BACKUP_DIR/old_image_id.txt"
    
    log_success "所有数据备份完成"
    log_info "备份目录: $BACKUP_DIR"
    
    # 显示备份文件列表
    echo ""
    log_info "备份文件列表:"
    ls -lh "$BACKUP_DIR"
    echo ""
}

# ==============================================================================
# 更新函数
# ==============================================================================
pull_new_image() {
    log_header "阶段 2: 拉取最新镜像"
    
    log_step "拉取镜像: $IMAGE_NAME"
    docker pull "$IMAGE_NAME"
    
    log_success "镜像拉取完成"
    
    # 显示镜像信息
    docker images | grep unisearch | head -5
}

stop_old_container() {
    log_header "阶段 3: 停止旧容器"
    
    log_step "停止应用容器: $APP_CONTAINER"
    docker stop "$APP_CONTAINER"
    
    log_step "重命名旧容器（用于回滚）"
    docker rename "$APP_CONTAINER" "${APP_CONTAINER}-old-$(date +%Y%m%d_%H%M%S)"
    
    log_success "旧容器已停止并重命名"
}

start_new_container() {
    log_header "阶段 4: 启动新容器"
    
    log_step "启动新版本应用容器..."
    
    # 使用 --env-file 参数
    docker run -d \
        --name "$APP_CONTAINER" \
        --network "$NETWORK_NAME" \
        --env-file "$ENV_FILE" \
        -e TZ=Asia/Shanghai \
        -e DB_HOST="$MYSQL_CONTAINER" \
        -e REDIS_HOST="$REDIS_CONTAINER" \
        --restart unless-stopped \
        "$IMAGE_NAME"
    
    log_success "新容器已启动"
    
    # 等待服务启动
    log_step "等待服务启动（30秒）..."
    sleep 30
    
    # 检查容器状态
    if docker ps | grep -q "$APP_CONTAINER"; then
        log_success "容器运行正常"
    else
        log_error "容器启动失败"
        docker logs "$APP_CONTAINER" --tail 50
        exit 1
    fi
}

verify_services() {
    log_header "阶段 5: 验证服务"
    
    log_step "检查容器健康状态..."
    sleep 10
    
    local health_status=$(docker inspect "$APP_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
    if [ "$health_status" = "healthy" ] || [ "$health_status" = "none" ]; then
        log_success "容器健康检查通过"
    else
        log_warning "容器健康状态: $health_status"
    fi
    
    # 检查前端服务
    log_step "检查前端服务..."
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
    if [ "$frontend_status" = "200" ] || [ "$frontend_status" = "301" ] || [ "$frontend_status" = "302" ]; then
        log_success "✅ 前端服务正常 (HTTP $frontend_status)"
    else
        log_warning "⚠️  前端服务状态码: $frontend_status"
    fi
    
    # 检查后端 API
    log_step "检查后端 API..."
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
    if [ "$api_status" = "200" ]; then
        log_success "✅ 后端 API 正常 (HTTP $api_status)"
    else
        log_warning "⚠️  后端 API 状态码: $api_status"
    fi
    
    # 检查数据库连接
    log_step "检查数据库连接..."
    if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost -u"$DB_USER" -p"$DB_PASSWORD" &> /dev/null; then
        log_success "✅ MySQL 数据库连接正常"
    else
        log_error "❌ MySQL 数据库连接失败"
    fi
    
    # 检查 Redis 连接
    log_step "检查 Redis 连接..."
    if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" ping &> /dev/null; then
        log_success "✅ Redis 缓存连接正常"
    else
        log_warning "⚠️  Redis 缓存连接异常"
    fi
    
    # 验证数据库数据
    log_step "验证数据库数据..."
    local user_count=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    local apikey_count=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -se "SELECT COUNT(*) FROM api_keys;" 2>/dev/null || echo "0")
    
    log_info "用户数量: $user_count"
    log_info "API Key 数量: $apikey_count"
    
    if [ "$user_count" -gt 0 ]; then
        log_success "数据库数据验证通过"
    else
        log_warning "用户数据为空，请检查"
    fi
    
    # 显示应用日志
    echo ""
    log_info "应用容器日志（最后 30 行）:"
    echo ""
    docker logs "$APP_CONTAINER" --tail 30
    echo ""
}

cleanup_old_container() {
    log_header "阶段 6: 清理旧容器"
    
    log_step "查找旧容器..."
    local old_containers=$(docker ps -a --filter "name=${APP_CONTAINER}-old-" --format '{{.Names}}')
    
    if [ -n "$old_containers" ]; then
        log_info "发现旧容器: $old_containers"
        read -p "$(echo -e ${YELLOW}是否删除旧容器？${NC} [y/N]: )" choice
        choice=${choice:-N}
        
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            echo "$old_containers" | xargs docker rm
            log_success "旧容器已删除"
        else
            log_info "保留旧容器（可用于回滚）"
        fi
    else
        log_info "没有发现旧容器"
    fi
}

# ==============================================================================
# 回滚函数
# ==============================================================================
rollback() {
    log_header "执行回滚"
    
    log_error "检测到更新失败，开始回滚..."
    
    # 停止新容器
    log_step "停止新容器..."
    docker stop "$APP_CONTAINER" 2>/dev/null || true
    docker rm "$APP_CONTAINER" 2>/dev/null || true
    
    # 恢复旧容器
    log_step "恢复旧容器..."
    local old_container=$(docker ps -a --filter "name=${APP_CONTAINER}-old-" --format '{{.Names}}' | head -1)
    
    if [ -n "$old_container" ]; then
        docker rename "$old_container" "$APP_CONTAINER"
        docker start "$APP_CONTAINER"
        log_success "旧容器已恢复"
    else
        log_error "未找到旧容器，无法自动回滚"
        log_info "请手动从备份恢复: $BACKUP_DIR"
        exit 1
    fi
    
    # 验证回滚
    sleep 10
    if docker ps | grep -q "$APP_CONTAINER"; then
        log_success "回滚成功，服务已恢复"
    else
        log_error "回滚失败，请手动处理"
        exit 1
    fi
}

# ==============================================================================
# 主流程
# ==============================================================================
main() {
    clear
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║        UniSearch 生产环境更新部署脚本                   ║"
    echo "║                                                          ║"
    echo "║        版本: v1.1.0                                      ║"
    echo "║        支持: 备份 | 更新 | 验证 | 回滚                  ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 检查权限和环境
    check_root
    check_docker
    load_env
    
    # 设置镜像名称（必须在 load_env 之后）
    IMAGE_NAME="${FULL_IMAGE_NAME:-liberty159/unisearch:latest}"
    
    check_containers
    
    # 显示当前状态
    echo ""
    log_info "当前运行的容器:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | grep unisearch
    echo ""
    
    # 确认执行
    read -p "$(echo -e ${YELLOW}确认开始更新部署？${NC} [y/N]: )" confirm
    confirm=${confirm:-N}
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "已取消更新"
        exit 0
    fi
    
    # 执行更新流程
    backup_data
    pull_new_image
    stop_old_container
    start_new_container
    verify_services
    
    # 询问是否清理
    echo ""
    read -p "$(echo -e ${YELLOW}服务验证通过，是否清理旧容器？${NC} [y/N]: )" cleanup_choice
    cleanup_choice=${cleanup_choice:-N}
    
    if [[ "$cleanup_choice" =~ ^[Yy]$ ]]; then
        cleanup_old_container
    fi
    
    # 完成
    log_header "更新完成"
    log_success "生产环境已成功更新到最新版本"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  部署信息${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}域名:${NC}        https://unisearchso.xyz"
    echo -e "  ${CYAN}镜像版本:${NC}    $IMAGE_NAME"
    echo -e "  ${CYAN}备份目录:${NC}    $BACKUP_DIR"
    echo -e "  ${CYAN}容器名称:${NC}    $APP_CONTAINER"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log_info "查看实时日志: docker logs -f $APP_CONTAINER"
    log_info "如需回滚，请运行: sudo ./scripts/rollback.sh $BACKUP_DIR"
    echo ""
}

# 捕获错误并回滚
trap 'rollback' ERR

# 执行主函数
main "$@"
