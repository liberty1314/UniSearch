#!/bin/bash

# UniSearch Docker 部署脚本
# 使用方法: ./docker-deploy.sh [dev|prod|stop|restart|logs|status]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_message "Docker 环境检查通过"
}

# 启动开发环境
start_dev() {
    print_step "启动开发环境..."
    check_docker
    
    # 检查镜像是否存在
    if [[ "$(docker images -q unisearch-frontend:latest 2> /dev/null)" == "" ]]; then
        print_warning "前端镜像不存在，正在构建..."
        ./docker-build.sh frontend
    fi
    
    if [[ "$(docker images -q unisearch-backend:latest 2> /dev/null)" == "" ]]; then
        print_warning "后端镜像不存在，正在构建..."
        ./docker-build.sh backend
    fi
    
    # 启动服务
    docker-compose up -d
    
    print_message "开发环境启动完成！"
    print_message "前端访问地址: http://localhost:3000"
    print_message "后端API地址: http://localhost:8888"
}

# 启动生产环境
start_prod() {
    print_step "启动生产环境..."
    check_docker
    
    # 检查镜像是否存在
    if [[ "$(docker images -q unisearch-frontend:latest 2> /dev/null)" == "" ]]; then
        print_warning "前端镜像不存在，正在构建..."
        ./docker-build.sh frontend
    fi
    
    if [[ "$(docker images -q unisearch-backend:latest 2> /dev/null)" == "" ]]; then
        print_warning "后端镜像不存在，正在构建..."
        ./docker-build.sh backend
    fi
    
    # 启动生产环境服务
    docker-compose -f docker-compose.prod.yml up -d
    
    print_message "生产环境启动完成！"
    print_message "前端访问地址: http://localhost:80"
    print_message "后端API地址: http://localhost:8888"
}

# 停止服务
stop_services() {
    print_step "停止所有服务..."
    
    # 停止开发环境
    docker-compose down 2>/dev/null || true
    
    # 停止生产环境
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    print_message "所有服务已停止"
}

# 重启服务
restart_services() {
    print_step "重启服务..."
    
    stop_services
    sleep 2
    
    # 根据当前运行的环境选择启动方式
    if docker ps | grep -q "unisearch-frontend-prod"; then
        start_prod
    else
        start_dev
    fi
}

# 查看日志
show_logs() {
    local service=${1:-""}
    
    if [ -z "$service" ]; then
        print_step "显示所有服务日志..."
        docker-compose logs -f
    else
        print_step "显示 $service 服务日志..."
        docker-compose logs -f $service
    fi
}

# 查看状态
show_status() {
    print_step "服务状态："
    echo ""
    
    # 显示运行中的容器
    echo "运行中的容器："
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep unisearch || echo "没有运行中的容器"
    
    echo ""
    
    # 显示所有容器（包括停止的）
    echo "所有容器："
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep unisearch || echo "没有找到相关容器"
    
    echo ""
    
    # 显示网络
    echo "网络："
    docker network ls | grep unisearch || echo "没有找到相关网络"
    
    echo ""
    
    # 显示卷
    echo "卷："
    docker volume ls | grep unisearch || echo "没有找到相关卷"
}

# 清理资源
cleanup() {
    print_warning "清理所有 Docker 资源..."
    
    stop_services
    
    # 清理镜像
    docker rmi $(docker images | grep unisearch | awk '{print $3}') 2>/dev/null || true
    
    # 清理网络
    docker network rm unisearch-network 2>/dev/null || true
    docker network rm unisearch-network-prod 2>/dev/null || true
    
    # 清理卷
    docker volume rm unisearch-backend-cache 2>/dev/null || true
    docker volume rm unisearch-backend-cache-prod 2>/dev/null || true
    docker volume rm unisearch-backend-logs-prod 2>/dev/null || true
    
    print_message "清理完成"
}

# 显示帮助信息
show_help() {
    echo "UniSearch Docker 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [命令]"
    echo ""
    echo "命令:"
    echo "  dev         启动开发环境（默认）"
    echo "  prod        启动生产环境"
    echo "  stop        停止所有服务"
    echo "  restart     重启服务"
    echo "  logs [服务] 查看日志"
    echo "  status      查看服务状态"
    echo "  cleanup     清理所有资源"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev       # 启动开发环境"
    echo "  $0 prod      # 启动生产环境"
    echo "  $0 logs      # 查看所有日志"
    echo "  $0 logs frontend  # 查看前端日志"
    echo "  $0 status    # 查看服务状态"
    echo "  $0 cleanup   # 清理所有资源"
}

# 主函数
main() {
    local command=${1:-dev}
    
    case $command in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            local service=${2:-""}
            show_logs $service
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
