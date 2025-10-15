#!/bin/bash

# UniSearch 监控服务管理脚本
# Uptime Kuma 监控面板管理
# 用法: ./monitor.sh [command]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

# 配置变量
DOMAIN="unisearchso.xyz"
CONTAINER_NAME="unisearch-uptime-kuma"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"
NGINX_MONITOR_CONFIG="/etc/nginx/sites-available/unisearch-monitor"
NGINX_MONITOR_ENABLED="/etc/nginx/sites-enabled/unisearch-monitor"
MONITOR_PORT=3001
NGINX_PORT=8080

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
UniSearch 监控服务管理脚本

用法: $0 <command>

命令:
  install   安装和初始化监控服务
  start     启动监控服务
  stop      停止监控服务
  restart   重启监控服务
  status    查看监控服务状态
  remove    完全移除监控服务
  help      显示此帮助信息

示例:
  $0 install      # 首次安装监控服务
  $0 start        # 启动监控服务
  $0 status       # 查看监控状态
  $0 stop         # 停止监控服务

访问地址:
  - 直接访问: http://服务器IP:3001
  - Nginx代理: http://服务器IP:8080 或 http://域名:8080

说明:
  - 首次访问需要创建管理员账号
  - 建议配置监控项目：主应用、API、前端页面
  - 可配置邮件、Telegram等告警通知

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

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装"
        log_info "请先运行: sudo ./scripts/deploy.sh init"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker未运行"
        exit 1
    fi
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # 开放监控端口
        ufw allow ${MONITOR_PORT}/tcp comment 'Uptime Kuma Monitoring' 2>/dev/null || true
        ufw allow ${NGINX_PORT}/tcp comment 'Monitoring Nginx Proxy' 2>/dev/null || true
        log_success "防火墙配置完成"
    else
        log_warning "未检测到UFW防火墙"
    fi
}

# 配置Nginx反向代理
configure_nginx() {
    log_info "配置Nginx反向代理..."
    
    # 检查Nginx是否安装
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx未安装，跳过Nginx配置"
        return 0
    fi
    
    # 检查配置文件是否存在
    if [ ! -f "${DEPLOY_DIR}/nginx/monitor.conf" ]; then
        log_error "监控配置文件不存在: ${DEPLOY_DIR}/nginx/monitor.conf"
        exit 1
    fi
    
    # 复制配置文件
    cp "${DEPLOY_DIR}/nginx/monitor.conf" "$NGINX_MONITOR_CONFIG"
    
    # 创建软链接
    ln -sf "$NGINX_MONITOR_CONFIG" "$NGINX_MONITOR_ENABLED"
    
    # 测试配置
    if nginx -t 2>/dev/null; then
        # 重载Nginx
        systemctl reload nginx
        log_success "Nginx配置完成"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
}

# 安装监控服务
install_monitoring() {
    log_info "=== 安装监控服务 ==="
    echo
    
    check_root "install"
    check_docker
    
    # 检查compose文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose配置文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    # 配置防火墙
    configure_firewall
    
    # 配置Nginx
    configure_nginx
    
    # 创建数据卷
    log_info "创建数据卷..."
    docker volume create unisearch-uptime-kuma-data 2>/dev/null || true
    
    # 启动服务
    log_info "启动监控服务..."
    cd "$DEPLOY_DIR"
    docker compose -f docker-compose.prod.yml up -d uptime-kuma
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5
    
    # 检查状态
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo
        log_success "=== 监控服务安装完成 ==="
        echo
        log_info "访问地址："
        log_info "  直接访问: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):${MONITOR_PORT}"
        log_info "  Nginx代理: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):${NGINX_PORT}"
        echo
        log_info "首次访问步骤："
        log_info "  1. 创建管理员账号"
        log_info "  2. 添加监控项目："
        log_info "     - 主应用: HTTP(s) - http://unisearch:3000/health"
        log_info "     - API: HTTP(s) - http://unisearch:8888/api/health"
        log_info "     - 前端页面: HTTP(s) - http://unisearch:3000/"
        log_info "  3. 配置告警通知（可选）"
    else
        log_error "监控服务启动失败"
        log_info "查看日志: docker logs $CONTAINER_NAME"
        exit 1
    fi
}

# 启动监控服务
start_monitoring() {
    log_info "=== 启动监控服务 ==="
    echo
    
    check_root "start"
    check_docker
    
    cd "$DEPLOY_DIR"
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "启动容器..."
        docker compose -f docker-compose.prod.yml up -d uptime-kuma
        sleep 3
        
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            echo
            log_success "监控服务启动成功"
            log_info "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):${MONITOR_PORT}"
        else
            log_error "监控服务启动失败"
            exit 1
        fi
    else
        log_warning "监控服务未安装"
        log_info "请先运行: sudo $0 install"
        exit 1
    fi
}

# 停止监控服务
stop_monitoring() {
    log_info "=== 停止监控服务 ==="
    echo
    
    check_root "stop"
    check_docker
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "停止容器..."
        docker stop "$CONTAINER_NAME"
        log_success "监控服务已停止"
    else
        log_warning "监控服务未运行"
    fi
}

# 重启监控服务
restart_monitoring() {
    log_info "=== 重启监控服务 ==="
    echo
    
    stop_monitoring
    sleep 2
    start_monitoring
}

# 查看监控服务状态
status_monitoring() {
    log_info "=== 监控服务状态 ==="
    echo
    
    check_docker
    
    # 容器状态
    echo "📊 监控容器状态:"
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "  未安装"
    fi
    echo
    
    # 端口监听
    echo "🔌 端口监听状态:"
    if netstat -tulpn 2>/dev/null | grep -E ":${MONITOR_PORT}|:${NGINX_PORT}" > /dev/null; then
        netstat -tulpn 2>/dev/null | grep -E ":${MONITOR_PORT}|:${NGINX_PORT}" || echo "  无监听"
    else
        echo "  端口未监听"
    fi
    echo
    
    # 数据卷
    echo "💾 数据卷状态:"
    if docker volume ls | grep -q "unisearch-uptime-kuma-data"; then
        docker volume ls | grep "unisearch-uptime-kuma-data"
    else
        echo "  数据卷未创建"
    fi
    echo
    
    # 访问地址
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "🌐 访问地址:"
        echo "  直接访问: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):${MONITOR_PORT}"
        echo "  Nginx代理: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP'):${NGINX_PORT}"
        echo
    fi
}

# 完全移除监控服务
remove_monitoring() {
    log_info "=== 移除监控服务 ==="
    log_warning "此操作将删除所有监控数据，请确认!"
    read -p "继续? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消"
        exit 0
    fi
    
    check_root "remove"
    check_docker
    
    # 停止并删除容器
    log_info "停止并删除容器..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    # 删除数据卷
    log_info "删除数据卷..."
    docker volume rm unisearch-uptime-kuma-data 2>/dev/null || true
    
    # 移除Nginx配置
    if [ -f "$NGINX_MONITOR_ENABLED" ]; then
        log_info "移除Nginx配置..."
        rm -f "$NGINX_MONITOR_ENABLED"
        rm -f "$NGINX_MONITOR_CONFIG"
        systemctl reload nginx 2>/dev/null || true
    fi
    
    # 关闭防火墙端口
    if command -v ufw &> /dev/null; then
        log_info "关闭防火墙端口..."
        ufw delete allow ${MONITOR_PORT}/tcp 2>/dev/null || true
        ufw delete allow ${NGINX_PORT}/tcp 2>/dev/null || true
    fi
    
    log_success "监控服务已完全移除"
}

# 主函数
main() {
    local command="${1:-help}"
    
    case "$command" in
        install)
            install_monitoring
            ;;
        start)
            start_monitoring
            ;;
        stop)
            stop_monitoring
            ;;
        restart)
            restart_monitoring
            ;;
        status)
            status_monitoring
            ;;
        remove)
            remove_monitoring
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

