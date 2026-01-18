#!/bin/bash

# ============================================
# API Key MySQL 迁移项目 - Docker 镜像构建脚本
# ============================================
# 
# 功能说明：
#   - 构建 Go 后端应用的 Docker 镜像
#   - 支持自定义镜像名称和版本标签
#   - 使用多阶段构建优化镜像大小
#   - 支持构建参数配置（GOOS、GOARCH）
#
# 使用方法：
#   ./scripts/build.sh [VERSION]
#
# 参数说明：
#   VERSION    - 镜像版本号（可选，默认：latest）
#
# 环境变量：
#   IMAGE_NAME - 自定义镜像名称（默认：pansou-backend）
#   GOOS       - 目标操作系统（默认：linux）
#   GOARCH     - 目标架构（默认：amd64）
#
# 使用示例：
#   # 构建默认版本
#   ./scripts/build.sh
#
#   # 构建指定版本
#   ./scripts/build.sh v1.0.0
#
#   # 自定义镜像名称
#   IMAGE_NAME=my-backend ./scripts/build.sh v1.0.0
#
#   # 构建 ARM64 架构镜像
#   GOARCH=arm64 ./scripts/build.sh v1.0.0
#
# ============================================

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令中任何一个失败都会导致整个管道失败

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# ============================================
# 配置参数
# ============================================
# 从环境变量读取或使用默认值
IMAGE_NAME="${IMAGE_NAME:-pansou-backend}"
VERSION="${1:-latest}"
GOOS="${GOOS:-linux}"
GOARCH="${GOARCH:-amd64}"

# Dockerfile 路径
DOCKERFILE="backend/Dockerfile"

# 完整镜像标签
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"

# ============================================
# 日志函数
# ============================================
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

# ============================================
# 错误处理函数
# ============================================
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "构建失败！退出码: ${exit_code}, 行号: ${line_number}"
    log_error "请检查上述错误信息并修复问题后重试"
    exit ${exit_code}
}

# 设置错误陷阱
trap 'handle_error ${LINENO}' ERR

# ============================================
# 环境检查函数
# ============================================
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "下载地址: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 未运行，请启动 Docker 服务"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

check_dockerfile() {
    log_info "检查 Dockerfile..."
    
    if [ ! -f "${DOCKERFILE}" ]; then
        log_error "Dockerfile 不存在: ${DOCKERFILE}"
        log_info "请确保在项目根目录执行此脚本"
        exit 1
    fi
    
    log_success "Dockerfile 检查通过: ${DOCKERFILE}"
}

# ============================================
# 构建镜像函数
# ============================================
build_image() {
    log_info "开始构建 Docker 镜像..."
    echo
    log_info "构建配置："
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本标签: ${VERSION}"
    echo "  完整标签: ${IMAGE_TAG}"
    echo "  目标系统: ${GOOS}"
    echo "  目标架构: ${GOARCH}"
    echo "  Dockerfile: ${DOCKERFILE}"
    echo
    
    # 构建镜像
    # 使用 --build-arg 传递构建参数
    # 使用 --no-cache 确保获取最新依赖（可选）
    log_info "执行 Docker 构建..."
    docker build \
        --file "${DOCKERFILE}" \
        --tag "${IMAGE_TAG}" \
        --build-arg GOOS="${GOOS}" \
        --build-arg GOARCH="${GOARCH}" \
        --build-arg VERSION="${VERSION}" \
        backend/
    
    if [ $? -eq 0 ]; then
        log_success "镜像构建成功！"
    else
        log_error "镜像构建失败"
        exit 1
    fi
}

# ============================================
# 显示镜像信息函数
# ============================================
show_image_info() {
    log_info "获取镜像信息..."
    echo
    
    # 获取镜像大小
    local image_size=$(docker images "${IMAGE_TAG}" --format "{{.Size}}")
    local image_id=$(docker images "${IMAGE_TAG}" --format "{{.ID}}")
    local created=$(docker images "${IMAGE_TAG}" --format "{{.CreatedAt}}")
    
    log_success "镜像构建完成！"
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  镜像信息"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本标签: ${VERSION}"
    echo "  完整标签: ${IMAGE_TAG}"
    echo "  镜像 ID:  ${image_id}"
    echo "  镜像大小: ${image_size}"
    echo "  创建时间: ${created}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    
    # 显示镜像优化提示
    log_info "镜像大小优化说明："
    echo "  ✓ 使用多阶段构建减少最终镜像大小"
    echo "  ✓ 使用 alpine 基础镜像"
    echo "  ✓ 静态编译 Go 二进制文件（CGO_ENABLED=0）"
    echo "  ✓ 使用 -ldflags='-s -w' 去除调试信息"
    echo
}

# ============================================
# 显示后续操作提示
# ============================================
show_next_steps() {
    log_info "后续操作："
    echo
    echo "  1. 运行镜像进行测试："
    echo "     docker run -d -p 8080:8080 --name pansou-test ${IMAGE_TAG}"
    echo
    echo "  2. 查看容器日志："
    echo "     docker logs -f pansou-test"
    echo
    echo "  3. 停止并删除测试容器："
    echo "     docker stop pansou-test && docker rm pansou-test"
    echo
    echo "  4. 推送镜像到仓库（如需要）："
    echo "     docker tag ${IMAGE_TAG} <registry>/${IMAGE_TAG}"
    echo "     docker push <registry>/${IMAGE_TAG}"
    echo
    echo "  5. 使用部署脚本部署到生产环境："
    echo "     ./scripts/deploy.sh"
    echo
}

# ============================================
# 主函数
# ============================================
main() {
    echo
    log_info "=== API Key MySQL 迁移项目 - Docker 镜像构建 ==="
    echo
    
    # 1. 环境检查
    check_docker
    check_dockerfile
    
    echo
    
    # 2. 构建镜像
    build_image
    
    echo
    
    # 3. 显示镜像信息
    show_image_info
    
    # 4. 显示后续操作提示
    show_next_steps
    
    log_success "=== 构建流程完成 ==="
    echo
}

# ============================================
# 执行主函数
# ============================================
main "$@"
