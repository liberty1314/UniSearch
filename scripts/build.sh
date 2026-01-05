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
RUN_LOCAL=true  # 默认在本地运行

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-run)
            RUN_LOCAL=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

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
    echo "  $0 [选项] [username] [image] [version]"
    echo
    echo "选项:"
    echo "  --no-run              构建后不在本地运行容器"
    echo "  -h, --help            显示帮助信息"
    echo
    echo "默认配置:"
    echo "  Docker Hub用户名: $DEFAULT_USERNAME"
    echo "  镜像名称: $DEFAULT_IMAGE"
    echo "  版本号: $DEFAULT_VERSION"
    echo "  本地运行: 是"
    echo
    echo "示例:"
    echo "  $0                                    # 使用默认配置并在本地运行"
    echo "  $0 --no-run                           # 构建但不在本地运行"
    echo "  $0 myuser myapp 2.0.0                 # 自定义配置"
    echo "  $0 --no-run myuser myapp 2.0.0        # 自定义配置且不在本地运行"
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

# 验证镜像（带重试机制）
verify_image() {
    log_info "验证推送的镜像..."
    log_warning "Docker Hub 同步可能需要几秒钟，正在等待..."
    
    local max_retries=5
    local retry_delay=3
    
    # 验证版本标签
    local version_success=false
    for i in $(seq 1 $max_retries); do
        if docker manifest inspect "${FULL_IMAGE_NAME}:${VERSION}" &> /dev/null; then
            log_success "镜像 ${FULL_IMAGE_NAME}:${VERSION} 验证成功"
            version_success=true
            break
        else
            if [ $i -lt $max_retries ]; then
                log_info "第 $i 次验证失败，${retry_delay}秒后重试..."
                sleep $retry_delay
            fi
        fi
    done
    
    if [ "$version_success" = false ]; then
        log_warning "镜像 ${FULL_IMAGE_NAME}:${VERSION} 验证失败"
        log_info "这可能是由于 Docker Hub 同步延迟导致的"
        log_info "请稍后手动验证: docker pull ${FULL_IMAGE_NAME}:${VERSION}"
    fi
    
    # 验证latest标签
    local latest_success=false
    for i in $(seq 1 $max_retries); do
        if docker manifest inspect "${FULL_IMAGE_NAME}:latest" &> /dev/null; then
            log_success "镜像 ${FULL_IMAGE_NAME}:latest 验证成功"
            latest_success=true
            break
        else
            if [ $i -lt $max_retries ]; then
                log_info "第 $i 次验证失败，${retry_delay}秒后重试..."
                sleep $retry_delay
            fi
        fi
    done
    
    if [ "$latest_success" = false ]; then
        log_warning "镜像 ${FULL_IMAGE_NAME}:latest 验证失败"
        log_info "这可能是由于 Docker Hub 同步延迟导致的"
        log_info "请稍后手动验证: docker pull ${FULL_IMAGE_NAME}:latest"
    fi
    
    # 如果两个标签都验证失败，给出警告但不退出
    if [ "$version_success" = false ] && [ "$latest_success" = false ]; then
        log_warning "镜像验证未通过，但构建和推送过程已完成"
        log_info "建议等待 1-2 分钟后手动验证镜像是否可用"
        return 0
    fi
}

# 拉取并运行本地镜像
run_local_container() {
    echo
    log_info "=== 启动本地容器 ==="
    echo
    
    # 停止并删除旧容器（如果存在）
    if docker ps -a | grep -q "${IMAGE_NAME}-local"; then
        log_info "停止并删除旧容器..."
        docker stop "${IMAGE_NAME}-local" &> /dev/null || true
        docker rm "${IMAGE_NAME}-local" &> /dev/null || true
    fi
    
    # 拉取最新镜像
    log_info "拉取最新镜像: ${FULL_IMAGE_NAME}:latest"
    if docker pull "${FULL_IMAGE_NAME}:latest"; then
        log_success "镜像拉取成功"
    else
        log_error "镜像拉取失败，请检查网络连接或稍后重试"
        return 1
    fi
    
    # 启动容器
    log_info "启动本地容器..."
    docker run -d \
        --name "${IMAGE_NAME}-local" \
        -p 3000:80 \
        -p 8888:8888 \
        -e TZ=Asia/Shanghai \
        -e PORT=8888 \
        -e CACHE_ENABLED=true \
        -e CACHE_PATH=/app/cache \
        -e ASYNC_PLUGIN_ENABLED=true \
        -e ADMIN_PASSWORD_HASH='$2a$10$ZBSWuVQONjalBEe.NziFdOLFg0NMji43X9JiBzu2iLuBCZwHL7WEy' \
        "${FULL_IMAGE_NAME}:latest"
    
    if [ $? -eq 0 ]; then
        log_success "容器启动成功！"
        echo
        log_info "容器信息:"
        echo "  容器名称: ${IMAGE_NAME}-local"
        echo "  前端地址: http://localhost:3000"
        echo "  后端地址: http://localhost:8888"
        echo "  管理后台: http://localhost:3000/admin/login"
        echo
        log_info "管理员登录凭证:"
        echo "  用户名: admin"
        echo "  密码: admin123.com"
        echo
        log_info "容器管理命令:"
        echo "  查看日志: docker logs -f ${IMAGE_NAME}-local"
        echo "  停止容器: docker stop ${IMAGE_NAME}-local"
        echo "  重启容器: docker restart ${IMAGE_NAME}-local"
        echo "  删除容器: docker rm -f ${IMAGE_NAME}-local"
        echo
        
        # 等待容器启动
        log_info "等待容器启动..."
        sleep 5
        
        # 检查容器状态
        if docker ps | grep -q "${IMAGE_NAME}-local"; then
            log_success "容器运行正常"
            
            # 检查健康状态
            log_info "检查服务健康状态..."
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                log_success "前端服务正常"
            else
                log_warning "前端服务可能还在启动中，请稍后访问"
            fi
            
            if curl -s http://localhost:8888/api/health > /dev/null 2>&1; then
                log_success "后端服务正常"
            else
                log_warning "后端服务可能还在启动中，请稍后访问"
            fi
        else
            log_error "容器启动失败，请查看日志: docker logs ${IMAGE_NAME}-local"
            return 1
        fi
    else
        log_error "容器启动失败"
        return 1
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
    echo "✅ 手动验证镜像:"
    echo "  docker manifest inspect ${FULL_IMAGE_NAME}:${VERSION}"
    echo "  docker manifest inspect ${FULL_IMAGE_NAME}:latest"
    echo
    echo "🚀 在服务器上部署:"
    echo "  docker run -d --name ${IMAGE_NAME} \\"
    echo "    -p 3000:80 -p 8888:8888 \\"
    echo "    -e ADMIN_PASSWORD_HASH=\$2a\$10\$... \\"
    echo "    ${FULL_IMAGE_NAME}:${VERSION}"
    echo
    echo "💡 提示:"
    echo "  - 如果验证失败，请等待 1-2 分钟后重试"
    echo "  - Docker Hub 同步可能需要一些时间"
    echo "  - 可以直接在服务器上尝试拉取镜像"
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
    echo
    log_info "=== UniSearch Docker镜像构建和推送脚本 ==="
    echo
    log_info "配置信息:"
    echo "  Docker Hub用户名: ${DOCKER_USERNAME}"
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本号: ${VERSION}"
    echo "  本地运行: $([ "$RUN_LOCAL" = true ] && echo "是" || echo "否")"
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
    
    # 拉取并运行本地容器（如果启用）
    if [ "$RUN_LOCAL" = true ]; then
        run_local_container
    else
        log_info "跳过本地容器启动（使用 --no-run 选项）"
    fi
    
    # 显示信息
    show_image_info
    
    log_success "所有操作完成！"
}

# 执行主函数
main "$@"

