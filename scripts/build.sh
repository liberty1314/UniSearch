#!/bin/bash

# UniSearch Docker镜像构建和推送脚本
# 支持多架构构建（linux/amd64, linux/arm64）
# 用法: ./build.sh [username] [image] [version]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置（可通过命令行参数覆盖）
DEFAULT_USERNAME="liberty159"
DEFAULT_IMAGE="unisearch"
DEFAULT_VERSION="1.0.2"

# 解析命令行参数
DOCKER_USERNAME="${1:-$DEFAULT_USERNAME}"
IMAGE_NAME="${2:-$DEFAULT_IMAGE}"
VERSION="${3:-$DEFAULT_VERSION}"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

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

# 显示使用说明
show_usage() {
    echo "UniSearch Docker镜像构建和推送脚本"
    echo
    echo "用法:"
    echo "  $0                                    # 使用默认配置"
    echo "  $0 [username] [image] [version]       # 自定义配置"
    echo
    echo "默认配置:"
    echo "  Docker Hub用户名: $DEFAULT_USERNAME"
    echo "  镜像名称: $DEFAULT_IMAGE"
    echo "  版本号: $DEFAULT_VERSION"
    echo
    echo "示例:"
    echo "  $0                                    # liberty159/unisearch:1.0.0"
    echo "  $0 myuser myapp 2.0.0                 # myuser/myapp:2.0.0"
    echo
}

# 检查Docker是否安装
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker Desktop"
        log_info "下载地址: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker未运行，请启动Docker Desktop"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 检查Docker Hub登录状态
check_dockerhub_login() {
    log_info "检查Docker Hub登录状态..."
    
    if ! docker info 2>/dev/null | grep -q "Username: ${DOCKER_USERNAME}"; then
        log_warning "未检测到Docker Hub登录或用户名不匹配"
        log_info "尝试登录到 ${DOCKER_USERNAME}..."
        
        # 执行登录并检查返回码
        if docker login; then
            log_success "Docker Hub登录成功"
        else
            log_error "Docker Hub登录失败"
            exit 1
        fi
    else
        log_success "Docker Hub已登录"
    fi
}

# 创建并配置buildx构建器
setup_buildx() {
    log_info "配置Docker buildx构建器..."
    
    # 检查是否已存在构建器
    if ! docker buildx ls | grep -q "unisearch-builder"; then
        log_info "创建新的buildx构建器..."
        docker buildx create --name unisearch-builder --use
    else
        log_info "使用现有buildx构建器..."
        docker buildx use unisearch-builder
    fi
    
    # 启动构建器
    docker buildx inspect --bootstrap
    
    log_success "buildx构建器配置完成"
}

# 构建多架构镜像
build_multiarch_image() {
    log_info "开始构建多架构镜像..."
    log_info "目标架构: linux/amd64, linux/arm64"
    log_info "镜像标签: ${FULL_IMAGE_NAME}:${VERSION}, ${FULL_IMAGE_NAME}:latest"
    echo
    
    # 构建并推送多架构镜像
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --file Dockerfile \
        --tag "${FULL_IMAGE_NAME}:${VERSION}" \
        --tag "${FULL_IMAGE_NAME}:latest" \
        --push \
        .
    
    if [ $? -eq 0 ]; then
        log_success "多架构镜像构建并推送完成"
    else
        log_error "镜像构建失败"
        exit 1
    fi
}

# 验证镜像
verify_image() {
    log_info "验证推送的镜像..."
    
    # 检查版本标签
    if docker manifest inspect "${FULL_IMAGE_NAME}:${VERSION}" &> /dev/null; then
        log_success "镜像 ${FULL_IMAGE_NAME}:${VERSION} 推送成功"
    else
        log_error "镜像 ${FULL_IMAGE_NAME}:${VERSION} 推送失败"
        exit 1
    fi
    
    # 检查latest标签
    if docker manifest inspect "${FULL_IMAGE_NAME}:latest" &> /dev/null; then
        log_success "镜像 ${FULL_IMAGE_NAME}:latest 推送成功"
    else
        log_error "镜像 ${FULL_IMAGE_NAME}:latest 推送失败"
        exit 1
    fi
}

# 显示镜像信息
show_image_info() {
    echo
    log_success "=== 镜像构建完成 ==="
    echo
    echo "📦 镜像信息:"
    echo "  仓库: ${FULL_IMAGE_NAME}"
    echo "  版本: ${VERSION}"
    echo "  标签: latest"
    echo "  架构: linux/amd64, linux/arm64"
    echo
    echo "🔗 Docker Hub链接:"
    echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
    echo
    echo "📥 拉取命令:"
    echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
    echo "  docker pull ${FULL_IMAGE_NAME}:latest"
    echo
    echo "🚀 在服务器上部署:"
    echo "  docker run -d --name ${IMAGE_NAME} \\"
    echo "    -p 3000:3000 -p 8888:8888 \\"
    echo "    ${FULL_IMAGE_NAME}:${VERSION}"
    echo
}

# 清理函数
cleanup() {
    log_warning "接收到中断信号，正在清理..."
    exit 1
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    # 显示帮助信息
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    echo
    log_info "=== UniSearch Docker镜像构建和推送脚本 ==="
    echo
    log_info "配置信息:"
    echo "  Docker Hub用户名: ${DOCKER_USERNAME}"
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本号: ${VERSION}"
    echo
    
    # 检查环境
    check_docker
    check_dockerhub_login
    
    # 配置构建器
    setup_buildx
    
    # 构建镜像
    build_multiarch_image
    
    # 验证镜像
    verify_image
    
    # 显示信息
    show_image_info
    
    log_success "所有操作完成！"
}

# 执行主函数
main "$@"

