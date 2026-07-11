#!/bin/bash

# ============================================
# UniSearch 生产环境 Docker 镜像构建脚本
# ============================================
# 功能：
#   - 支持多架构构建 (linux/amd64, linux/arm64)
#   - 支持自定义版本标签
#   - 本地测试验证
#   - 推送到远程仓库
# 用法: ./build.sh
# ============================================

set -e

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================
# 默认配置
# ============================================
DEFAULT_USERNAME="liberty159"
DEFAULT_IMAGE="unisearch"
DEFAULT_VERSION="latest"

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 全局变量
DOCKER_USERNAME=""
IMAGE_NAME=""
VERSION=""
FULL_IMAGE_NAME=""
TEST_IMAGE_TAG=""
BUILD_PLATFORMS="linux/amd64,linux/arm64"
SKIP_TEST=false  # 是否跳过测试
KEEP_TEST_ENV=false  # 是否保留测试环境

# ============================================
# 日志函数
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[→]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

count_csv_items() {
    local value="${1:-}"

    if [ -z "$value" ]; then
        echo 0
        return
    fi

    local count=0
    IFS=',' read -ra items <<< "$value"
    for item in "${items[@]}"; do
        item="$(echo "$item" | xargs)"
        if [ -n "$item" ]; then
            count=$((count + 1))
        fi
    done

    echo "$count"
}

load_project_env() {
    local env_file=""

    if [ -f "${PROJECT_ROOT}/.env" ]; then
        env_file="${PROJECT_ROOT}/.env"
    elif [ -f "${PROJECT_ROOT}/.env.example" ]; then
        env_file="${PROJECT_ROOT}/.env.example"
    fi

    if [ -z "$env_file" ]; then
        log_warning "未找到 .env 或 .env.example，测试容器将使用应用默认值"
        return 0
    fi

    log_info "加载项目环境变量: $(basename "$env_file")"

    load_env_value() {
        local key="$1"
        local value=""

        value=$(grep -E "^${key}=" "$env_file" | head -n 1 | cut -d'=' -f2- || true)
        if [ -n "$value" ]; then
            export "${key}=${value}"
        fi
    }

    # 只加载测试容器需要的业务配置，避免覆盖交互输入的构建参数
    load_env_value "CHANNELS"
    load_env_value "ENABLED_PLUGINS"
    load_env_value "CUSTOM_PLUGINS_PATH"
}

# ============================================
# 菜单函数
# ============================================

# 显示欢迎信息
show_welcome() {
    clear
    cat << "EOF"
    
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║        UniSearch Docker 镜像构建工具                 ║
    ║                                                      ║
    ║        支持多架构 | 版本管理 | 自动测试              ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    
EOF
    
    if [ "$SKIP_TEST" = true ]; then
        echo -e "${YELLOW}⚡ 快速模式: 跳过本地测试，直接推送到 Docker Hub${NC}"
        echo ""
    fi
}

# 配置菜单
show_config_menu() {
    log_header "配置构建参数"
    
    echo ""
    echo -e "${CYAN}请配置以下参数（直接回车使用默认值）:${NC}"
    echo ""
    
    # Docker Hub 用户名
    read -p "$(echo -e ${YELLOW}Docker Hub 用户名${NC} [${DEFAULT_USERNAME}]: )" input_username
    DOCKER_USERNAME="${input_username:-$DEFAULT_USERNAME}"
    
    # 镜像名称
    read -p "$(echo -e ${YELLOW}镜像名称${NC} [${DEFAULT_IMAGE}]: )" input_image
    IMAGE_NAME="${input_image:-$DEFAULT_IMAGE}"
    
    # 版本号
    read -p "$(echo -e ${YELLOW}版本号${NC} [${DEFAULT_VERSION}]: )" input_version
    VERSION="${input_version:-$DEFAULT_VERSION}"
    
    # 设置完整镜像名称
    FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
    TEST_IMAGE_TAG="${IMAGE_NAME}:local-test"
    
    echo ""
    log_success "配置完成"
    echo ""
    echo -e "  ${CYAN}Docker Hub 用户:${NC} ${DOCKER_USERNAME}"
    echo -e "  ${CYAN}镜像名称:${NC}       ${IMAGE_NAME}"
    echo -e "  ${CYAN}版本号:${NC}         ${VERSION}"
    echo -e "  ${CYAN}完整镜像名:${NC}     ${FULL_IMAGE_NAME}:${VERSION}"
    echo -e "  ${CYAN}构建平台:${NC}       ${BUILD_PLATFORMS}"
    echo ""
}

# 确认菜单
confirm_action() {
    local prompt="$1"
    local default="${2:-N}"
    
    if [ "$default" = "Y" ]; then
        read -p "$(echo -e ${YELLOW}${prompt}${NC} [Y/n]: )" choice
        choice=${choice:-Y}
    else
        read -p "$(echo -e ${YELLOW}${prompt}${NC} [y/N]: )" choice
        choice=${choice:-N}
    fi
    
    [[ "$choice" =~ ^[Yy]$ ]]
}

# ============================================
# 检查函数
# ============================================

# 检查 Docker 环境
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        log_info "下载地址: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 未运行，请启动 Docker Desktop"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查 Docker Hub 登录状态
check_dockerhub_login() {
    log_info "检查 Docker Hub 登录状态..."
    
    if ! docker info 2>/dev/null | grep -q "Username: ${DOCKER_USERNAME}"; then
        log_warning "未检测到 Docker Hub 登录或用户名不匹配"
        log_info "尝试登录到 ${DOCKER_USERNAME}..."
        
        if docker login; then
            log_success "Docker Hub 登录成功"
        else
            log_error "Docker Hub 登录失败"
            exit 1
        fi
    else
        log_success "Docker Hub 已登录 (${DOCKER_USERNAME})"
    fi
}

# 创建并配置 buildx 构建器
setup_buildx() {
    log_info "配置 Docker buildx 构建器..."
    
    # 检查是否已存在构建器
    if ! docker buildx ls | grep -q "unisearch-builder"; then
        log_info "创建新的 buildx 构建器..."
        docker buildx create --name unisearch-builder --use
    else
        log_info "使用现有 buildx 构建器..."
        docker buildx use unisearch-builder
    fi
    
    # 启动构建器
    docker buildx inspect --bootstrap
    
    log_success "buildx 构建器配置完成"
}

# ============================================
# 构建函数
# ============================================

# 构建本地测试镜像
build_local_test_image() {
    log_header "Step 1: 构建本地测试镜像"
    
    log_info "构建适配当前机器架构的镜像用于本地测试..."
    echo ""
    
    # 构建并加载到本地 Docker Daemon
    docker buildx build \
        --load \
        --file Dockerfile \
        --tag "${TEST_IMAGE_TAG}" \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        .
    
    if [ $? -eq 0 ]; then
        log_success "本地测试镜像构建成功: ${TEST_IMAGE_TAG}"
    else
        log_error "本地测试镜像构建失败"
        exit 1
    fi
}

# 运行本地容器测试
run_local_container_test() {
    log_header "Step 2: 本地容器测试"

    load_project_env

    echo ""
    log_info "将传递到测试容器的业务配置:"
    echo -e "  ${CYAN}频道数量:${NC} $(count_csv_items "${CHANNELS:-}")"
    echo -e "  ${CYAN}启用插件数量:${NC} $(count_csv_items "${ENABLED_PLUGINS:-}")"
    echo -e "  ${CYAN}自定义插件配置:${NC} ${CUSTOM_PLUGINS_PATH:-./custom_plugins.json}"
    echo ""
    
    local network_name="${IMAGE_NAME}-test-network"
    local mysql_container="${IMAGE_NAME}-mysql-test"
    local redis_container="${IMAGE_NAME}-redis-test"
    local app_container="${IMAGE_NAME}-test"
    
    # 清理旧的测试环境
    log_info "清理旧的测试环境..."
    docker stop "${app_container}" &> /dev/null || true
    docker rm "${app_container}" &> /dev/null || true
    docker stop "${mysql_container}" &> /dev/null || true
    docker rm "${mysql_container}" &> /dev/null || true
    docker stop "${redis_container}" &> /dev/null || true
    docker rm "${redis_container}" &> /dev/null || true
    docker network rm "${network_name}" &> /dev/null || true
    
    # 创建测试网络
    log_info "创建测试网络..."
    docker network create "${network_name}" &> /dev/null
    if [ $? -eq 0 ]; then
        log_success "测试网络创建成功: ${network_name}"
    else
        log_error "测试网络创建失败"
        return 1
    fi
    
    # 启动 MySQL 容器
    log_info "启动 MySQL 数据库容器..."
    docker run -d \
        --name "${mysql_container}" \
        --network "${network_name}" \
        -e MYSQL_ROOT_PASSWORD=test_password_123456 \
        -e MYSQL_DATABASE=unisearch_test \
        -e TZ=Asia/Shanghai \
        mysql:8.0 \
        --character-set-server=utf8mb4 \
        --collation-server=utf8mb4_unicode_ci \
        --default-authentication-plugin=mysql_native_password
    
    if [ $? -ne 0 ]; then
        log_error "MySQL 容器启动失败"
        docker network rm "${network_name}" &> /dev/null || true
        return 1
    fi
    
    log_success "MySQL 容器启动成功"
    
    # 启动 Redis 容器
    log_info "启动 Redis 缓存容器..."
    docker run -d \
        --name "${redis_container}" \
        --network "${network_name}" \
        -e TZ=Asia/Shanghai \
        redis:7-alpine \
        redis-server --requirepass test_redis_password
    
    if [ $? -ne 0 ]; then
        log_error "Redis 容器启动失败"
        docker stop "${mysql_container}" &> /dev/null || true
        docker rm "${mysql_container}" &> /dev/null || true
        docker network rm "${network_name}" &> /dev/null || true
        return 1
    fi
    
    log_success "Redis 容器启动成功"
    
    # 等待 MySQL 启动完成
    log_info "等待 MySQL 数据库初始化..."
    local max_wait=60
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        if docker exec "${mysql_container}" mysqladmin ping -h localhost -uroot -ptest_password_123456 &> /dev/null; then
            log_success "MySQL 数据库已就绪"
            break
        fi
        
        wait_count=$((wait_count + 1))
        if [ $((wait_count % 5)) -eq 0 ]; then
            echo -n "."
        fi
        sleep 1
    done
    
    if [ $wait_count -ge $max_wait ]; then
        log_error "MySQL 数据库启动超时"
        docker logs "${mysql_container}" 2>&1 | tail -n 20
        docker stop "${redis_container}" "${mysql_container}" &> /dev/null || true
        docker rm "${redis_container}" "${mysql_container}" &> /dev/null || true
        docker network rm "${network_name}" &> /dev/null || true
        return 1
    fi
    
    echo ""
    
    # 等待 Redis 启动完成
    log_info "等待 Redis 缓存服务就绪..."
    sleep 3
    
    if docker exec "${redis_container}" redis-cli -a test_redis_password ping &> /dev/null; then
        log_success "Redis 缓存服务已就绪"
    else
        log_warning "Redis 连接测试失败，但继续测试"
    fi
    
    echo ""
    
    # 启动应用容器（单容器架构：Nginx + 后端）
    log_info "启动应用容器（Nginx + 后端）..."
    local app_env_args=(
        -e TZ=Asia/Shanghai
        -e PORT=8888
        -e CACHE_PATH=/app/cache
        -e ASYNC_PLUGIN_ENABLED=true
        -e API_KEY_ENABLED=false
        -e DB_HOST="${mysql_container}"
        -e DB_PORT=3306
        -e DB_USER=root
        -e DB_PASSWORD=test_password_123456
        -e DB_NAME=unisearch_test
        -e REDIS_HOST="${redis_container}"
        -e REDIS_PORT=6379
        -e REDIS_PASSWORD=test_redis_password
        -e AUTH_JWT_SECRET=test_jwt_secret_key_for_testing_only
        -e RESOURCE_PUBLIC_ID_SECRET=test_resource_public_id_secret_for_testing_only
        -e SECRET_MASTER_KEY=test_master_key_for_testing_only_32bytes
        -e REFRESH_TOKEN_ENCRYPT_KEY=test_refresh_token_key_32bytes_base64
    )

    if [ -n "${CHANNELS:-}" ]; then
        app_env_args+=(-e "CHANNELS=${CHANNELS}")
    fi

    if [ -n "${ENABLED_PLUGINS:-}" ]; then
        app_env_args+=(-e "ENABLED_PLUGINS=${ENABLED_PLUGINS}")
    fi

    if [ -n "${CUSTOM_PLUGINS_PATH:-}" ]; then
        app_env_args+=(-e "CUSTOM_PLUGINS_PATH=${CUSTOM_PLUGINS_PATH}")
    fi

    docker run -d \
        --name "${app_container}" \
        --network "${network_name}" \
        -p 3000:80 \
        "${app_env_args[@]}" \
        "${TEST_IMAGE_TAG}"
    
    if [ $? -ne 0 ]; then
        log_error "应用容器启动失败"
        docker stop "${redis_container}" "${mysql_container}" &> /dev/null || true
        docker rm "${redis_container}" "${mysql_container}" &> /dev/null || true
        docker network rm "${network_name}" &> /dev/null || true
        return 1
    fi
    
    log_success "应用容器启动成功"
    echo ""
    log_info "容器信息:"
    echo "  网络名称: ${network_name}"
    echo "  MySQL 容器: ${mysql_container}"
    echo "  Redis 容器: ${redis_container}"
    echo "  应用容器: ${app_container}"
    echo "  前端地址: http://localhost:3000"
    echo "  后端 API: http://localhost:3000/api/"
    echo ""
    
    # 等待服务启动
    log_info "等待服务启动和初始化 (20秒)..."
    sleep 20
    
    # 检查服务健康状态
    log_info "检查服务健康状态..."
    local all_good=true
    
    # 检查前端服务（Nginx）
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        log_success "✅ 前端服务 (Nginx): 正常"
    else
        log_warning "⚠️  前端服务 (Nginx): 无法连接"
        all_good=false
    fi
    
    # 检查后端 API 健康端点
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
    if [ "$api_status" = "200" ]; then
        log_success "✅ 后端 API (/api/health): 正常"
    else
        log_warning "⚠️  后端 API (/api/health): 状态码 ${api_status}"
        all_good=false
    fi
    
    # 检查数据库连接
    if docker exec "${mysql_container}" mysqladmin ping -h localhost -uroot -ptest_password_123456 &> /dev/null; then
        log_success "✅ MySQL 数据库: 正常"
    else
        log_warning "⚠️  MySQL 数据库: 连接异常"
        all_good=false
    fi
    
    # 检查 Redis 连接
    if docker exec "${redis_container}" redis-cli -a test_redis_password ping &> /dev/null; then
        log_success "✅ Redis 缓存: 正常"
    else
        log_warning "⚠️  Redis 缓存: 连接异常"
        all_good=false
    fi
    
    echo ""
    if [ "$all_good" = true ]; then
        log_success "本地测试验证通过！"
    else
        log_warning "自动检测发现潜在问题，请手动验证"
        echo ""
        log_info "查看应用容器日志:"
        echo "  docker logs ${app_container}"
        log_info "查看 MySQL 容器日志:"
        echo "  docker logs ${mysql_container}"
        log_info "查看 Redis 容器日志:"
        echo "  docker logs ${redis_container}"
    fi
    
    # 显示应用容器日志
    echo ""
    log_info "应用容器日志 (最后 30 行):"
    echo ""
    docker logs --tail 30 "${app_container}" 2>&1
    
    return 0
}

# 清理本地测试环境
cleanup_local_test() {
    log_info "清理本地测试环境..."
    
    local network_name="${IMAGE_NAME}-test-network"
    local mysql_container="${IMAGE_NAME}-mysql-test"
    local redis_container="${IMAGE_NAME}-redis-test"
    local app_container="${IMAGE_NAME}-test"
    
    # 停止并删除应用容器
    if docker ps -a | grep -q "${app_container}"; then
        docker stop "${app_container}" &> /dev/null || true
        docker rm "${app_container}" &> /dev/null || true
        log_success "已删除应用容器: ${app_container}"
    fi
    
    # 停止并删除 Redis 容器
    if docker ps -a | grep -q "${redis_container}"; then
        docker stop "${redis_container}" &> /dev/null || true
        docker rm "${redis_container}" &> /dev/null || true
        log_success "已删除 Redis 容器: ${redis_container}"
    fi
    
    # 停止并删除 MySQL 容器
    if docker ps -a | grep -q "${mysql_container}"; then
        docker stop "${mysql_container}" &> /dev/null || true
        docker rm "${mysql_container}" &> /dev/null || true
        log_success "已删除 MySQL 容器: ${mysql_container}"
    fi
    
    # 删除测试网络
    if docker network ls | grep -q "${network_name}"; then
        docker network rm "${network_name}" &> /dev/null || true
        log_success "已删除测试网络: ${network_name}"
    fi
    
    # 删除测试镜像
    if docker images | grep -q "${TEST_IMAGE_TAG}"; then
        docker rmi "${TEST_IMAGE_TAG}" &> /dev/null || true
        log_success "已删除测试镜像: ${TEST_IMAGE_TAG}"
    fi
    
    log_success "清理完成"
}

# 构建并推送生产镜像（直接推送，不构建本地测试镜像）
build_and_push_production_image_direct() {
    log_header "构建并推送生产镜像（跳过本地测试）"
    
    log_info "目标架构: ${BUILD_PLATFORMS}"
    echo ""
    log_info "将构建以下镜像标签:"
    echo -e "  ${GREEN}✓${NC} ${FULL_IMAGE_NAME}:${VERSION}"
    echo -e "  ${GREEN}✓${NC} ${FULL_IMAGE_NAME}:latest"
    echo ""
    
    # 构建并推送多架构镜像（同时打 latest 和自定义版本标签）
    docker buildx build \
        --platform "${BUILD_PLATFORMS}" \
        --file Dockerfile \
        --tag "${FULL_IMAGE_NAME}:${VERSION}" \
        --tag "${FULL_IMAGE_NAME}:latest" \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --push \
        .
    
    if [ $? -eq 0 ]; then
        log_success "生产镜像构建并推送完成"
        echo ""
        log_info "已推送的镜像标签:"
        echo -e "  ${CYAN}•${NC} ${FULL_IMAGE_NAME}:${VERSION}"
        echo -e "  ${CYAN}•${NC} ${FULL_IMAGE_NAME}:latest"
    else
        log_error "镜像推送失败"
        exit 1
    fi
}

# 构建并推送生产镜像
build_and_push_production_image() {
    log_header "Step 4: 构建并推送生产镜像"
    
    log_info "目标架构: ${BUILD_PLATFORMS}"
    echo ""
    log_info "将构建以下镜像标签:"
    echo -e "  ${GREEN}✓${NC} ${FULL_IMAGE_NAME}:${VERSION}"
    echo -e "  ${GREEN}✓${NC} ${FULL_IMAGE_NAME}:latest"
    echo ""
    
    # 构建并推送多架构镜像（同时打 latest 和自定义版本标签）
    docker buildx build \
        --platform "${BUILD_PLATFORMS}" \
        --file Dockerfile \
        --tag "${FULL_IMAGE_NAME}:${VERSION}" \
        --tag "${FULL_IMAGE_NAME}:latest" \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --push \
        .
    
    if [ $? -eq 0 ]; then
        log_success "生产镜像构建并推送完成"
        echo ""
        log_info "已推送的镜像标签:"
        echo -e "  ${CYAN}•${NC} ${FULL_IMAGE_NAME}:${VERSION}"
        echo -e "  ${CYAN}•${NC} ${FULL_IMAGE_NAME}:latest"
    else
        log_error "镜像推送失败"
        exit 1
    fi
}

# 验证推送的镜像
verify_pushed_image() {
    log_info "验证推送的镜像..."
    log_warning "Docker Hub 同步可能需要几秒钟..."
    
    sleep 3
    
    echo ""
    log_info "验证镜像标签:"
    
    # 验证自定义版本标签
    if docker manifest inspect "${FULL_IMAGE_NAME}:${VERSION}" &> /dev/null; then
        log_success "✅ ${FULL_IMAGE_NAME}:${VERSION} 验证成功"
    else
        log_warning "⚠️  ${FULL_IMAGE_NAME}:${VERSION} 等待同步"
    fi
    
    # 验证 latest 标签
    if docker manifest inspect "${FULL_IMAGE_NAME}:latest" &> /dev/null; then
        log_success "✅ ${FULL_IMAGE_NAME}:latest 验证成功"
    else
        log_warning "⚠️  ${FULL_IMAGE_NAME}:latest 等待同步"
    fi
    
    # 显示镜像架构信息
    echo ""
    log_info "镜像架构信息:"
    docker manifest inspect "${FULL_IMAGE_NAME}:${VERSION}" 2>/dev/null | grep -E '"architecture"|"os"' | head -4 || true
}

# ============================================
# 主流程
# ============================================

main() {
    # 显示欢迎信息
    show_welcome
    
    # 配置参数
    show_config_menu
    
    # 选择构建模式
    echo ""
    log_header "选择构建模式"
    echo ""
    echo -e "${CYAN}请选择构建模式:${NC}"
    echo ""
    echo -e "  ${GREEN}[1]${NC} 标准流程 - 本地构建 → 本地测试 → 推送到 Docker Hub"
    echo -e "  ${YELLOW}[2]${NC} 快速推送 - 跳过本地测试，直接推送到 Docker Hub"
    echo ""
    
    while true; do
        read -p "$(echo -e ${YELLOW}请输入选项${NC} [1/2]: )" build_mode
        
        case "$build_mode" in
            1)
                log_info "已选择: 标准流程"
                SKIP_TEST=false
                break
                ;;
            2)
                log_info "已选择: 快速推送模式"
                SKIP_TEST=true
                break
                ;;
            *)
                log_error "无效选项，请输入 1 或 2"
                ;;
        esac
    done
    
    # 确认开始构建
    echo ""
    if ! confirm_action "是否开始构建？"; then
        log_info "已取消构建"
        exit 0
    fi
    
    # 检查环境
    echo ""
    check_docker
    check_dockerhub_login
    setup_buildx
    
    # 根据选择的模式执行不同流程
    if [ "$SKIP_TEST" = true ]; then
        # ============================================
        # 快速推送模式：直接构建并推送到 Docker Hub
        # ============================================
        echo ""
        log_warning "⚡ 快速推送模式：跳过本地测试，直接推送到 Docker Hub"
        echo ""
        
        # 最后确认
        if ! confirm_action "确认直接推送到 Docker Hub？"; then
            log_info "已取消推送"
            exit 0
        fi
        
        # 直接构建并推送生产镜像
        echo ""
        build_and_push_production_image_direct
    else
        # ============================================
        # 标准流程：本地构建 → 本地测试 → 推送
        # ============================================
        
        # Step 1: 构建本地测试镜像
        echo ""
        build_local_test_image
        
        # Step 2: 询问是否进行本地测试
        echo ""
        if confirm_action "是否进行本地测试？" "Y"; then
            run_local_container_test
            
            # Step 3: 人工确认
            echo ""
            log_header "Step 3: 人工确认"
            echo -e "${YELLOW}请手动验证功能: http://localhost:3000${NC}"
            echo ""
            
            if ! confirm_action "测试是否通过？"; then
                log_warning "测试未通过，已取消推送"
                
                # 询问是否清理
                echo ""
                if ! confirm_action "是否清理本地测试环境？" "Y"; then
                    log_info "保留本地测试环境"
                    log_info "手动清理命令:"
                    echo "  docker stop ${IMAGE_NAME}-test ${IMAGE_NAME}-mysql-test ${IMAGE_NAME}-redis-test"
                    echo "  docker rm ${IMAGE_NAME}-test ${IMAGE_NAME}-mysql-test ${IMAGE_NAME}-redis-test"
                    echo "  docker network rm ${IMAGE_NAME}-test-network"
                    echo "  docker rmi ${TEST_IMAGE_TAG}"
                    KEEP_TEST_ENV=true
                else
                    cleanup_local_test
                fi
                
                exit 0
            fi
            
            # 清理本地测试环境
            echo ""
            if [ "$KEEP_TEST_ENV" = false ]; then
                cleanup_local_test
            fi
        else
            log_info "跳过本地测试"
        fi
        
        # Step 4: 询问是否推送到远程仓库
        echo ""
        if ! confirm_action "是否推送到 Docker Hub？"; then
            log_info "已取消推送"
            
            # 询问是否清理
            echo ""
            if confirm_action "是否删除本地测试镜像？" "Y"; then
                cleanup_local_test
            fi
            
            exit 0
        fi
        
        # Step 5: 构建并推送生产镜像
        echo ""
        build_and_push_production_image
    fi
    
    # Step 6: 验证镜像
    echo ""
    verify_pushed_image
    
    # 完成
    echo ""
    log_header "构建完成"
    log_success "所有操作已完成"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  镜像信息${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}Docker Hub:${NC}  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
    echo -e "  ${CYAN}镜像标签:${NC}    ${FULL_IMAGE_NAME}:${VERSION}"
    echo -e "  ${CYAN}最新标签:${NC}    ${FULL_IMAGE_NAME}:latest"
    echo -e "  ${CYAN}支持架构:${NC}    linux/amd64, linux/arm64"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    log_info "部署命令:"
    echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
    echo "  或在服务器上运行: sudo ./scripts/deploy.sh deploy"
    echo ""
}

# 执行主函数
main "$@"
