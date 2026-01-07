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
TEST_IMAGE_TAG="${IMAGE_NAME}:local-test"

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
    echo "  --no-run              构建后不在本地运行容器测试"
    echo "  -h, --help            显示帮助信息"
    echo
    echo "流程:"
    echo "  1. 构建本地架构镜像 -> 2. 本地运行测试 -> 3. 询问是否推送 -> 4. 多架构构建并推送"
    echo
    echo "默认配置:"
    echo "  Docker Hub用户名: $DEFAULT_USERNAME"
    echo "  镜像名称: $DEFAULT_IMAGE"
    echo "  版本号: $DEFAULT_VERSION"
    echo "  本地运行: 是"
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

# 构建本地测试镜像
build_local_test_image() {
    log_info "Step 1: 构建本地测试镜像..."
    log_info "注意：为了进行本地功能测试，将仅构建适配当前机器架构的镜像并加载到本地 Docker。"
    
    # 构建并加载到本地 Docker Daemon (--load)
    # 不指定 --platform，让 Docker 自动选择当前机器架构
    docker buildx build \
        --load \
        --file Dockerfile \
        --tag "${TEST_IMAGE_TAG}" \
        .
    
    if [ $? -eq 0 ]; then
        log_success "本地测试镜像构建成功: ${TEST_IMAGE_TAG}"
    else
        log_error "本地测试镜像构建失败"
        exit 1
    fi
}

# 运行本地容器进行测试
run_local_container_test() {
    echo
    log_info "Step 2: 启动本地容器进行测试..."
    echo
    
    # 停止并删除旧容器（如果存在）
    if docker ps -a | grep -q "${IMAGE_NAME}-local"; then
        log_info "停止并删除旧容器..."
        docker stop "${IMAGE_NAME}-local" &> /dev/null || true
        docker rm "${IMAGE_NAME}-local" &> /dev/null || true
    fi
    
    # 启动容器 (使用本地测试 tag)
    log_info "启动本地容器: ${TEST_IMAGE_TAG}"
    docker run -d \
        --name "${IMAGE_NAME}-local" \
        -p 3000:80 \
        -p 8888:8888 \
        -e TZ=Asia/Shanghai \
        -e PORT=8888 \
        -e CACHE_ENABLED=true \
        -e CACHE_PATH=/app/cache \
        -e ASYNC_PLUGIN_ENABLED=true \
        -e API_KEY_ENABLED=true \
        -e ADMIN_PASSWORD_HASH='$2a$10$ZBSWuVQONjalBEe.NziFdOLFg0NMji43X9JiBzu2iLuBCZwHL7WEy' \
        "${TEST_IMAGE_TAG}"
    
    if [ $? -eq 0 ]; then
        log_success "容器启动成功！"
        echo
        log_info "容器信息:"
        echo "  容器名称: ${IMAGE_NAME}-local"
        echo "  前端地址: http://localhost:3000"
        echo "  后端地址: http://localhost:8888"
        echo
        
        # 等待容器启动
        log_info "等待容器启动 (5秒)..."
        sleep 5
        
        # 检查服务健康状态
        log_info "自动检查服务健康状态..."
        local all_good=true
        
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log_success "✅ 前端服务 (Port 3000): 正常"
        else
            log_warning "⚠️  前端服务 (Port 3000): 无法连接/响应慢"
            all_good=false
        fi
        
        if curl -s http://localhost:8888/api/health > /dev/null 2>&1; then
            log_success "✅ 后端服务 (Port 8888): 正常"
        else
            log_warning "⚠️  后端服务 (Port 8888): 无法连接/响应慢"
            all_good=false
        fi
        
        if [ "$all_good" = true ]; then
            log_success "本地测试验证通过！"
        else
            log_warning "自动检测发现潜在问题，请手动验证。"
        fi
    else
        log_error "容器启动失败"
        return 1
    fi
}

# 询问用户是否推送
confirm_push_and_cleanup() {
    echo
    log_info "Step 3: 人工确认"
    echo -e "${YELLOW}请手动验证功能: http://localhost:3000${NC}"
    echo
    
    # 默认 N
    read -p "是否推送到 Docker Hub? [y/N] " choice
    choice=${choice:-N} # Set default to N
    
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        return 0 # 继续推送
    else
        echo
        log_info "已取消推送。"
        
        # 询问是否删除本地构建的测试镜像，默认 Y
        read -p "是否删除刚才构建的本地测试镜像 (${TEST_IMAGE_TAG})? [Y/n] " clean_choice
        clean_choice=${clean_choice:-Y}
        
        if [[ "$clean_choice" =~ ^[Yy]$ ]]; then
            log_info "正在清理本地测试镜像..."
            
            # 先停止容器确保没有进程占用
            if docker ps -a | grep -q "${IMAGE_NAME}-local"; then
                log_info "停止并删除测试容器..."
                docker stop "${IMAGE_NAME}-local" &> /dev/null || true
                docker rm "${IMAGE_NAME}-local" &> /dev/null || true
            fi
            
            # 删除镜像
            log_info "删除本地测试镜像..."
            docker rmi "${TEST_IMAGE_TAG}" &> /dev/null || true
            
            log_success "清理完成。"
        else
            log_info "保留本地测试镜像。"
        fi
        
        exit 0 # 结束脚本
    fi
}

# 推送多架构镜像
push_multiarch_image() {
    echo
    log_info "Step 4: 构建并推送多架构镜像..."
    log_info "目标架构: linux/amd64, linux/arm64"
    log_info "镜像标签: ${FULL_IMAGE_NAME}:${VERSION}, ${FULL_IMAGE_NAME}:latest"
    echo
    
    # 构建并推送多架构镜像
    # 由于之前 buildx 已构建过缓存，这一步会非常快
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
        log_error "镜像推送失败"
        exit 1
    fi
}

# 验证镜像（带重试机制）
verify_image() {
    log_info "验证推送的镜像..."
    log_warning "Docker Hub 同步可能需要几秒钟，正在等待..."
    
    sleep 3
    docker manifest inspect "${FULL_IMAGE_NAME}:${VERSION}" &> /dev/null
    
    if [ $? -eq 0 ]; then
        log_success "镜像 ${FULL_IMAGE_NAME}:${VERSION} 验证成功"
    else
        log_warning "镜像验证需等待 Docker Hub 同步，请稍后使用: docker manifest inspect ${FULL_IMAGE_NAME}:${VERSION}"
    fi
}

# 主函数
main() {
    echo
    log_info "=== UniSearch Docker镜像构建和推送脚本 ==="
    echo
    log_info "配置信息:"
    echo "  Docker Hub用户名: ${DOCKER_USERNAME}"
    echo "  镜像名称: ${IMAGE_NAME}"
    echo "  版本号: ${VERSION}"
    echo
    
    # 1. 检查环境
    check_docker
    check_dockerhub_login
    setup_buildx
    
    # 2. 本地构建 (Load)
    build_local_test_image
    
    # 3. 本地测试 (Run)
    if [ "$RUN_LOCAL" = true ]; then
        run_local_container_test
    else
        log_info "跳过本地容器启动（使用 --no-run 选项）"
    fi
    
    # 4. 询问确认 (Prompt)
    confirm_push_and_cleanup
    
    # 5. 推送正式镜像 (Push Multi-Arch)
    push_multiarch_image
    
    # 6. 验证
    verify_image
    
    log_success "=== 所有操作完成 ==="
    echo "🔗 Docker Hub: https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
    echo
}

# 执行主函数
main "$@"
