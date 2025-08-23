#!/bin/bash

# UniSearch Docker 构建脚本
# 使用方法: ./docker-build.sh [dev|prod]

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

# 构建前端镜像
build_frontend() {
    print_step "构建前端镜像..."
    cd frontend
    
    # 清理旧的构建缓存
    docker builder prune -f
    
    # 构建镜像
    docker build -t unisearch-frontend:latest .
    
    if [ $? -eq 0 ]; then
        print_message "前端镜像构建成功"
    else
        print_error "前端镜像构建失败"
        exit 1
    fi
    
    cd ..
}

# 构建后端镜像
build_backend() {
    print_step "构建后端镜像..."
    cd backend
    
    # 清理旧的构建缓存
    docker builder prune -f
    
    # 构建镜像
    docker build -t unisearch-backend:latest .
    
    if [ $? -eq 0 ]; then
        print_message "后端镜像构建成功"
    else
        print_error "后端镜像构建失败"
        exit 1
    fi
    
    cd ..
}

# 构建所有镜像
build_all() {
    print_step "开始构建所有镜像..."
    
    build_frontend
    build_backend
    
    print_message "所有镜像构建完成！"
    
    # 显示构建的镜像
    echo ""
    print_message "已构建的镜像："
    docker images | grep unisearch
}

# 清理镜像
clean_images() {
    print_warning "清理所有 UniSearch 镜像..."
    docker rmi $(docker images | grep unisearch | awk '{print $3}') 2>/dev/null || true
    print_message "镜像清理完成"
}

# 清理容器
clean_containers() {
    print_warning "清理所有 UniSearch 容器..."
    docker rm -f $(docker ps -a | grep unisearch | awk '{print $1}') 2>/dev/null || true
    print_message "容器清理完成"
}

# 清理网络
clean_networks() {
    print_warning "清理所有 UniSearch 网络..."
    docker network rm unisearch-network 2>/dev/null || true
    docker network rm unisearch-network-prod 2>/dev/null || true
    print_message "网络清理完成"
}

# 清理卷
clean_volumes() {
    print_warning "清理所有 UniSearch 卷..."
    docker volume rm unisearch-backend-cache 2>/dev/null || true
    docker volume rm unisearch-backend-cache-prod 2>/dev/null || true
    docker volume rm unisearch-backend-logs-prod 2>/dev/null || true
    print_message "卷清理完成"
}

# 清理所有
clean_all() {
    print_step "清理所有 Docker 资源..."
    clean_containers
    clean_images
    clean_networks
    clean_volumes
    print_message "清理完成"
}

# 显示帮助信息
show_help() {
    echo "UniSearch Docker 构建脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [命令]"
    echo ""
    echo "命令:"
    echo "  build       构建所有镜像（默认）"
    echo "  frontend    仅构建前端镜像"
    echo "  backend     仅构建后端镜像"
    echo "  clean       清理所有 Docker 资源"
    echo "  clean-img   清理镜像"
    echo "  clean-con   清理容器"
    echo "  clean-net   清理网络"
    echo "  clean-vol   清理卷"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 build     # 构建所有镜像"
    echo "  $0 frontend  # 仅构建前端镜像"
    echo "  $0 clean     # 清理所有资源"
}

# 主函数
main() {
    local command=${1:-build}
    
    case $command in
        "build")
            check_docker
            build_all
            ;;
        "frontend")
            check_docker
            build_frontend
            ;;
        "backend")
            check_docker
            build_backend
            ;;
        "clean")
            clean_all
            ;;
        "clean-img")
            clean_images
            ;;
        "clean-con")
            clean_containers
            ;;
        "clean-net")
            clean_networks
            ;;
        "clean-vol")
            clean_volumes
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
