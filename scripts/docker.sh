#!/bin/bash

# ==============================================================================
# UniSearch Docker 环境管理脚本
# 集成 Docker Compose 的常用操作
# 用法: ./scripts/docker.sh [start|stop|restart|build|status|logs|clean]
# ==============================================================================

set -e

# ==============================================================================
# 配置
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Docker Compose 命令适配
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}[ERROR] 未找到 docker-compose 或 docker compose 命令${NC}"
    exit 1
fi

# ==============================================================================
# 工具函数
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${CYAN}[->]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           UniSearch Docker 环境管理脚本                   ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo "用法: $0 [命令]"
    echo
    echo "命令:"
    echo "  start    启动容器 (后台运行)"
    echo "  stop     停止并移除容器"
    echo "  restart  重启容器"
    echo "  build    重新构建镜像"
    echo "  status   查看容器状态"
    echo "  logs     查看容器日志"
    echo "  clean    清理容器、网络和挂载卷"
    echo
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 未运行，请先启动 Docker Desktop"
        exit 1
    fi
}

# ==============================================================================
# 核心操作
# ==============================================================================

do_start() {
    check_docker
    
    log_step "检查 Docker Compose 配置..."
    if [ ! -f "docker-compose.yml" ]; then
        log_error "未找到 docker-compose.yml 文件"
        exit 1
    fi
    log_success "配置文件检查通过"
    
    log_step "检查环境变量配置..."
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，将使用默认配置"
        if [ -f ".env.example" ]; then
            log_info "提示: 可以复制 .env.example 为 .env 并修改配置"
        fi
    else
        log_success "环境变量配置已加载"
    fi
    
    log_step "启动 Docker 服务..."
    echo
    log_info "正在启动容器，这可能需要几分钟时间..."
    echo
    
    # 使用 docker-compose up 并显示启动日志
    $DOCKER_COMPOSE up -d
    
    if [ $? -eq 0 ]; then
        echo
        log_success "服务已启动"
        echo
        
        log_step "等待服务就绪..."
        sleep 3
        
        log_info "查看启动日志..."
        echo
        $DOCKER_COMPOSE logs --tail=50
        echo
        
        log_info "容器状态:"
        do_status
        
        echo
        log_success "所有服务已成功启动！"
        echo
        log_info "访问地址:"
        echo "  - 前端: http://localhost:3000"
        echo "  - 后端: http://localhost:8888"
        echo "  - MySQL: localhost:3306"
        echo
        log_info "查看实时日志: $0 logs"
        log_info "停止服务: $0 stop"
    else
        echo
        log_error "启动失败，请查看错误日志"
        echo
        log_info "查看详细日志: $DOCKER_COMPOSE logs"
        exit 1
    fi
}

do_stop() {
    check_docker
    log_step "停止 Docker 服务..."
    $DOCKER_COMPOSE down
    log_success "服务已停止"
}

do_restart() {
    check_docker
    log_step "正在重启..."
    $DOCKER_COMPOSE restart
    log_success "重启完成"
    do_status
}

do_build() {
    check_docker
    log_step "开始构建镜像..."
    $DOCKER_COMPOSE build
    log_success "构建完成"
}

do_status() {
    check_docker
    echo
    log_info "容器状态:"
    $DOCKER_COMPOSE ps
    echo
}

do_logs() {
    check_docker
    log_info "正在追踪日志 (Ctrl+C 退出)..."
    $DOCKER_COMPOSE logs -f
}

do_clean() {
    check_docker
    echo -e "${YELLOW}警告: 此操作将停止容器并删除相关的卷(Volumes)和网络。${NC}"
    read -p "确定要继续吗? [y/N] " choice
    choice=${choice:-N}
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        log_step "正在清理..."
        $DOCKER_COMPOSE down -v --remove-orphans
        log_success "清理完成"
    else
        log_info "已取消"
    fi
}

do_reset() {
    check_docker
    echo -e "${RED}危险警告: 此操作将执行彻底清理！${NC}"
    echo -e "  1. 停止并删除所有容器"
    echo -e "  2. 删除所有挂载卷 (Volumes) - 数据将丢失"
    echo -e "  3. 删除相关网络"
    echo -e "  4. 删除所有构建的镜像 (--rmi all)"
    echo
    read -p "确定要继续吗? [y/N] " choice
    choice=${choice:-N}
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        log_step "正在执行彻底重置..."
        $DOCKER_COMPOSE down -v --remove-orphans --rmi all
        log_success "彻底重置完成"
    else
        log_info "已取消"
    fi
}

# ==============================================================================
# 交互菜单
# ==============================================================================

show_menu() {
    print_banner
    echo -e "${CYAN}请选择操作:${NC}"
    echo
    echo -e "  ${GREEN}1)${NC} 启动服务 (Start)"
    echo -e "  ${RED}2)${NC} 停止服务 (Stop)"
    echo -e "  ${YELLOW}3)${NC} 重启服务 (Restart)"
    echo -e "  ${BLUE}4)${NC} 构建镜像 (Build)"
    echo -e "  ${BLUE}5)${NC} 查看状态 (Status)"
    echo -e "  ${BLUE}6)${NC} 查看日志 (Logs)"
    echo -e "  ${RED}7)${NC} 清理环境 (Clean)"
    echo -e "  ${RED}8)${NC} 彻底重置 (Reset: Clean + Images)"
    echo -e "  ${RED}0)${NC} 退出 (Exit)"
    echo
    echo -e -n "请输入选项 [0-8]: "
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
                do_build
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            5)
                do_status
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            6)
                do_logs
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            7)
                do_clean
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            8)
                do_reset
                read -n 1 -s -r -p "按任意键返回菜单..."
                ;;
            0|q|Q)
                echo "再见！"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项${NC}"
                sleep 1
                ;;
        esac
    done
}

# ==============================================================================
# 主入口
# ==============================================================================

if [ -z "$1" ]; then
    interactive_menu
else
    case "$1" in
        start) do_start ;;
        stop) do_stop ;;
        restart) do_restart ;;
        build) do_build ;;
        status) do_status ;;
        logs) do_logs ;;
        clean) do_clean ;;
        reset) do_reset ;;
        help|--help|-h) show_usage ;;
        *)
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            show_usage
            exit 1
            ;;
    esac
fi
