#!/bin/bash

# UniSearch 云服务器部署和管理脚本
# 整合了服务器初始化、应用部署、服务管理、日志监控和数据备份功能
# 用法: ./deploy.sh [command]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录（脚本所在目录的父目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

# 配置变量
DOMAIN="unisearchso.xyz"
DOCKER_USERNAME="liberty159"
IMAGE_NAME="unisearch"
VERSION="1.0.0"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
CONTAINER_NAME="unisearch"
NGINX_CONFIG="/etc/nginx/sites-available/unisearch"
NGINX_ENABLED="/etc/nginx/sites-enabled/unisearch"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
UniSearch 云服务器部署和管理脚本

用法: $0 <command>

命令:
  init      初始化服务器环境（Docker、Nginx、UFW等）
  start     启动应用服务
  stop      停止应用服务
  restart   重启应用服务
  status    查看服务状态
  logs      查看应用日志
  cleanup   清理7天前的日志
  setup-log-rotation  设置定时日志清理
  backup    备份数据和配置
  restore   从备份恢复
  help      显示此帮助信息

示例:
  $0 init         # 首次部署时初始化服务器
  $0 start        # 启动服务
  $0 status       # 查看服务状态
  $0 logs         # 查看实时日志
  $0 backup       # 备份数据

其他脚本:
  ./scripts/monitor.sh    # 监控服务管理
  ./scripts/ssl.sh        # SSL证书管理

配置文件位置:
  ${DEPLOY_DIR}/docker-compose.prod.yml
  ${DEPLOY_DIR}/env.prod
  ${DEPLOY_DIR}/nginx/http.conf

EOF
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        log_info "使用命令: sudo $0 $1"
        exit 1
    fi
}

# ===== 服务器初始化相关函数 =====

# 更新系统包
update_system() {
    log_info "更新系统包..."
    apt update && apt upgrade -y
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    log_success "系统包更新完成"
}

# 安装Docker
install_docker() {
    log_info "安装Docker..."
    
    if command -v docker &> /dev/null; then
        log_warning "Docker已安装，跳过"
        docker --version
        return 0
    fi
    
    # 更新软件包索引
    log_info "更新软件包索引..."
    sudo apt update

    # 更新软件包
    log_info "更新软件包..."
    sudo apt upgrade -y

    # 安装ca-certificates和curl
    sudo apt-get install ca-certificates curl

    # 创建密钥目录
    sudo install -m 0755 -d /etc/apt/keyrings
    
    # 添加Docker官方GPG密钥（使用清华镜像源）
    log_info "添加Docker GPG密钥..."
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    
    # 添加Docker仓库（使用清华镜像源）
    log_info "添加Docker软件源..."
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新软件包索引
    log_info "更新软件包索引..."
    sudo apt update
    
    # 安装Docker和相关插件
    log_info "安装Docker CE及相关插件..."
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动并启用Docker服务
    systemctl start docker
    systemctl enable docker
    
    # 配置Docker镜像加速器
    log_info "配置Docker镜像加速器..."
    tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "100GB",
      "enabled": true
    }
  },
  "data-root": "/home/redhat/MyDocker",
  "experimental": false,
  "registry-mirrors": [
    "https://dockerproxy.net",
    "https://docker.hpcloud.cloud",
    "https://docker.m.daocloud.io",
    "https://docker.unsee.tech",
    "https://docker.1panel.live",
    "http://mirrors.ustc.edu.cn",
    "https://docker.chenby.cn",
    "http://mirror.azure.cn",
    "https://dockerpull.org",
    "https://dockerhub.icu"
  ]
}
EOF
    
    # 重启Docker服务以应用配置
    log_info "重启Docker服务以应用镜像加速器配置..."
    systemctl daemon-reload
    systemctl restart docker
    
    # 验证安装
    log_success "Docker安装完成并已配置镜像加速器"
    docker --version
    docker compose version
}

# 安装Nginx
install_nginx() {
    log_info "安装Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_warning "Nginx已安装，跳过"
        return 0
    fi
    
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx安装完成"
}

# 配置UFW防火墙
configure_firewall() {
    log_info "配置UFW防火墙..."
    
    if ! command -v ufw &> /dev/null; then
        apt install -y ufw
    fi
    
    # 配置防火墙规则
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 8080/tcp comment 'HTTP-Alt'
    ufw allow 3001/tcp comment 'Monitoring'
    ufw --force enable
    
    log_success "UFW防火墙配置完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx反向代理..."
    
    # 检查配置文件是否存在
    if [ ! -f "${DEPLOY_DIR}/nginx/http.conf" ]; then
        log_error "Nginx配置文件不存在: ${DEPLOY_DIR}/nginx/http.conf"
        exit 1
    fi
    
    # 复制配置文件
    cp "${DEPLOY_DIR}/nginx/http.conf" "$NGINX_CONFIG"
    
    # 创建软链接
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # 删除默认配置
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重载Nginx
    systemctl reload nginx
    
    log_success "Nginx配置完成"
}

# 服务器初始化
init_server() {
    log_info "=== 开始服务器初始化 ==="
    echo
    
    check_root "init"
    update_system
    install_docker
    install_nginx
    configure_firewall
    configure_nginx
    
    echo
    log_success "=== 服务器初始化完成 ==="
    log_info "下一步: 运行 '$0 start' 启动应用"
}

# ===== 应用部署相关函数 =====

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先运行: $0 init"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker未运行"
        exit 1
    fi
}

# 拉取最新镜像
pull_image() {
    log_info "拉取Docker镜像: $FULL_IMAGE_NAME"
    docker pull "$FULL_IMAGE_NAME"
    log_success "镜像拉取完成"
}

# 停止并删除旧容器
stop_old_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "停止旧容器..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        log_success "旧容器已清理"
    fi
}

# 创建必要的数据卷
create_volumes() {
    log_info "检查Docker数据卷..."
    
    # 创建缓存数据卷
    if ! docker volume ls | grep -q unisearch-cache; then
        docker volume create unisearch-cache
        log_info "已创建缓存数据卷"
    fi
    
    # 创建日志数据卷
    if ! docker volume ls | grep -q unisearch-logs; then
        docker volume create unisearch-logs
        log_info "已创建日志数据卷"
    fi
}

# 启动新容器
start_container() {
    log_info "启动容器..."
    
    cd "$DEPLOY_DIR"
    
    # 检查配置文件
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "Docker Compose配置文件不存在: ${DEPLOY_DIR}/docker-compose.prod.yml"
        exit 1
    fi
    
    # 创建数据卷
    create_volumes
    
    # 使用docker compose启动
    docker compose -f docker-compose.prod.yml up -d
    
    log_success "容器启动完成"
}

# 启动服务
start_service() {
    log_info "=== 启动应用服务 ==="
    echo
    
    check_root "start"
    check_docker
    pull_image
    stop_old_container
    start_container
    
    # 等待服务启动
    sleep 3
    
    # 检查容器状态
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo
        log_success "=== 服务启动成功 ==="
        log_info "容器名称: $CONTAINER_NAME"
        log_info "访问地址: http://$(curl -s ifconfig.me):3000"
        echo
        log_info "查看日志: $0 logs"
        log_info "查看状态: $0 status"
    else
        log_error "服务启动失败"
        log_info "查看日志: docker logs $CONTAINER_NAME"
        exit 1
    fi
}

# 停止服务
stop_service() {
    log_info "=== 停止应用服务 ==="
    echo
    
    check_root "stop"
    check_docker
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME"
        log_success "服务已停止"
    else
        log_warning "服务未运行"
    fi
}

# 重启服务
restart_service() {
    log_info "=== 重启应用服务 ==="
    echo
    
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
show_status() {
    log_info "=== 服务状态 ==="
    echo
    
    check_docker
    
    # Docker服务状态
    echo "🐳 Docker服务:"
    systemctl status docker --no-pager | head -3
    echo
    
    # 容器状态
    echo "📦 容器状态:"
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "  容器未运行"
    fi
    echo
    
    # Nginx状态
    echo "🌐 Nginx服务:"
    systemctl status nginx --no-pager | head -3
    echo
    
    # 防火墙状态
    echo "🔥 防火墙状态:"
    ufw status | head -10
    echo
    
    # 磁盘使用
    echo "💾 磁盘使用:"
    df -h / | tail -1
    echo
    
    # 内存使用
    echo "🧠 内存使用:"
    free -h | grep Mem
}

# 查看日志
show_logs() {
    check_docker
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "查看容器日志 (Ctrl+C 退出):"
        echo
        docker logs -f --tail 100 "$CONTAINER_NAME"
    else
        log_error "容器未运行"
        exit 1
    fi
}

# 清理旧日志
cleanup_logs() {
    log_info "=== 清理旧日志 ==="
    echo
    
    check_root "cleanup"
    check_docker
    
    log_info "注意: Docker 容器日志已自动管理（保留7个文件，每个最大50MB）"
    echo
    
    # 清理应用日志卷中的旧文件
    log_info "清理应用日志卷中的旧文件..."
    docker run --rm \
        -v unisearch-logs:/logs \
        alpine sh -c 'find /logs -name "*.log*" -type f -mtime +7 -delete && echo "已清理7天前的日志文件"'
    
    # 清理系统日志
    log_info "清理系统日志..."
    journalctl --vacuum-time=7d
    
    # 清理 Docker 系统缓存
    log_info "清理 Docker 系统缓存..."
    docker system prune -f --filter "until=168h"
    
    log_success "日志清理完成"
}

# 设置定时日志清理
setup_log_rotation() {
    log_info "=== 设置定时日志清理 ==="
    echo
    
    check_root "setup-log-rotation"
    
    # 创建日志清理脚本
    cat > /usr/local/bin/unisearch-log-cleanup.sh << 'EOF'
#!/bin/bash
# UniSearch 日志清理脚本

echo "$(date): 开始清理UniSearch日志..."

# 清理Docker日志
docker system prune -f --filter "until=168h" > /dev/null 2>&1

# 清理应用日志
docker run --rm \
    -v unisearch-logs:/logs \
    alpine sh -c 'find /logs -name "*.log*" -type f -mtime +7 -delete' > /dev/null 2>&1

# 清理系统日志
journalctl --vacuum-time=7d > /dev/null 2>&1

echo "$(date): UniSearch日志清理完成"
EOF
    
    chmod +x /usr/local/bin/unisearch-log-cleanup.sh
    
    # 添加定时任务（每天凌晨2点执行）
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/unisearch-log-cleanup.sh >> /var/log/unisearch-cleanup.log 2>&1") | crontab -
    
    log_success "定时日志清理已设置（每天凌晨2点执行）"
    log_info "清理脚本位置: /usr/local/bin/unisearch-log-cleanup.sh"
    log_info "清理日志位置: /var/log/unisearch-cleanup.log"
}

# ===== 备份相关函数 =====

# 备份数据
backup_data() {
    log_info "=== 数据备份 ==="
    echo
    
    check_root "backup"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="${PROJECT_ROOT}/backups"
    BACKUP_NAME="unisearch_backup_${TIMESTAMP}"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    
    mkdir -p "$BACKUP_PATH"
    
    # 备份配置文件
    log_info "备份配置文件..."
    cp -r "$DEPLOY_DIR" "${BACKUP_PATH}/"
    
    # 备份Nginx配置
    if [ -f "$NGINX_CONFIG" ]; then
        mkdir -p "${BACKUP_PATH}/nginx"
        cp "$NGINX_CONFIG" "${BACKUP_PATH}/nginx/"
    fi
    
    # 备份Docker数据卷
    log_info "备份Docker数据卷..."
    if docker volume ls | grep -q unisearch-cache; then
        docker run --rm \
            -v unisearch-cache:/data \
            -v "${BACKUP_PATH}":/backup \
            alpine tar czf /backup/cache.tar.gz -C /data .
    fi
    
    # 压缩备份
    log_info "压缩备份文件..."
    cd "$BACKUP_DIR"
    tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    echo
    log_success "备份完成: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "备份大小: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
}

# 从备份恢复
restore_from_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        log_info "用法: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_info "=== 从备份恢复 ==="
    log_warning "此操作将覆盖当前配置，请确认!"
    read -p "继续? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消"
        exit 0
    fi
    
    check_root "restore"
    
    # 解压备份
    TEMP_DIR=$(mktemp -d)
    tar xzf "$backup_file" -C "$TEMP_DIR"
    
    # 恢复配置
    log_info "恢复配置文件..."
    cp -r "${TEMP_DIR}"/*/deploy/* "$DEPLOY_DIR/"
    
    # 恢复数据卷
    if [ -f "${TEMP_DIR}"/*/cache.tar.gz ]; then
        log_info "恢复数据卷..."
        docker run --rm \
            -v unisearch-cache:/data \
            -v "${TEMP_DIR}":/backup \
            alpine tar xzf /backup/*/cache.tar.gz -C /data
    fi
    
    # 清理临时文件
    rm -rf "$TEMP_DIR"
    
    log_success "恢复完成"
    log_info "请运行 '$0 restart' 重启服务"
}

# ===== 主函数 =====

main() {
    local command="${1:-help}"
    
    case "$command" in
        init)
            init_server
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        cleanup)
            cleanup_logs
            ;;
        setup-log-rotation)
            setup_log_rotation
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_from_backup "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
