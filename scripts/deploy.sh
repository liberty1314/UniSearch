#!/bin/bash

# ==============================================================================
# UniSearch 生产环境一键部署脚本
# ==============================================================================
# 功能：
#   - 自动从 Docker Hub 拉取生产镜像
#   - 交互式环境配置向导
#   - SSL 证书自动配置（本地证书 / Let's Encrypt）
#   - Docker Compose 一键启动所有服务
#   - 完整的健康检查和验证机制
#   - 服务管理操作（启动、停止、重启、日志查看）
# 用法: ./scripts/deploy.sh [deploy|start|stop|restart|status|logs|update|clean]
# ==============================================================================

set -e  # 遇到错误立即退出

# ==============================================================================
# 颜色定义
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'  # No Color

# ==============================================================================
# 全局配置
# ==============================================================================
SCRIPT_VERSION="1.0.0"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.production"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
NGINX_CONF_DIR="${PROJECT_ROOT}/nginx"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

# Docker 镜像配置
DEFAULT_DOCKER_USERNAME="liberty159"
DEFAULT_IMAGE_NAME="unisearch"
DEFAULT_VERSION="latest"

# ==============================================================================
# 日志输出函数
# ==============================================================================

# 信息日志
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 成功日志
log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

# 警告日志
log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

# 错误日志
log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 步骤日志
log_step() {
    echo -e "${CYAN}[→]${NC} $1"
}

# 标题日志
log_header() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==============================================================================
# 欢迎横幅
# ==============================================================================

show_welcome() {
    clear
    cat << "EOF"

    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║        UniSearch 生产环境一键部署工具                ║
    ║                                                      ║
    ║        Docker Hub | SSL 证书 | 健康检查              ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝

EOF
    echo -e "${CYAN}版本: ${SCRIPT_VERSION}${NC}"
    echo ""
}

# ==============================================================================
# 使用帮助
# ==============================================================================

show_usage() {
    echo "用法: $0 [命令]"
    echo
    echo "命令:"
    echo "  deploy   执行完整部署流程（配置 → 拉取镜像 → 启动服务）"
    echo "  start    启动所有服务"
    echo "  stop     停止所有服务"
    echo "  restart  重启所有服务"
    echo "  status   查看服务运行状态"
    echo "  logs     查看服务日志"
    echo "  update   更新镜像并重启服务"
    echo "  clean    清理容器和数据卷（危险操作）"
    echo "  help     显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 deploy    # 首次部署"
    echo "  $0 status    # 查看服务状态"
    echo "  $0 logs      # 查看日志"
    echo
}

# ==============================================================================
# 环境检查模块
# ==============================================================================

# 检查 Docker 环境
# 返回: 0=成功, 1=失败
check_docker() {
    log_header "检查 Docker 环境"
    
    local all_checks_passed=true
    
    # 1. 检查 Docker 是否安装
    log_step "检查 Docker 是否安装..."
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version 2>/dev/null | cut -d ' ' -f3 | tr -d ',')
        log_success "Docker 已安装 (版本: ${docker_version})"
    else
        log_error "Docker 未安装"
        log_info "请访问 https://docs.docker.com/get-docker/ 安装 Docker"
        all_checks_passed=false
    fi
    
    # 2. 检查 Docker 是否运行
    if command -v docker &> /dev/null; then
        log_step "检查 Docker 是否运行..."
        if docker info &> /dev/null; then
            log_success "Docker 服务正在运行"
        else
            log_error "Docker 服务未运行"
            log_info "请启动 Docker Desktop 或运行: sudo systemctl start docker"
            all_checks_passed=false
        fi
    fi
    
    # 3. 检查 Docker Compose 是否可用
    log_step "检查 Docker Compose 是否可用..."
    if docker compose version &> /dev/null; then
        local compose_version=$(docker compose version --short 2>/dev/null)
        log_success "Docker Compose 已安装 (版本: ${compose_version})"
    elif command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version 2>/dev/null | cut -d ' ' -f4 | tr -d ',')
        log_success "Docker Compose 已安装 (版本: ${compose_version})"
        log_warning "检测到旧版 docker-compose 命令，建议使用 'docker compose'"
    else
        log_error "Docker Compose 不可用"
        log_info "请更新 Docker 到最新版本或安装 docker-compose"
        all_checks_passed=false
    fi
    
    echo ""
    
    # 返回检查结果
    if [ "$all_checks_passed" = true ]; then
        log_success "Docker 环境检查通过"
        return 0
    else
        log_error "Docker 环境检查失败，请解决上述问题后重试"
        return 1
    fi
}

# 检查端口占用
# 参数: $1=端口号
# 返回: 0=占用, 1=空闲
check_port() {
    local port=$1
    
    if [ -z "$port" ]; then
        log_error "check_port: 端口号参数缺失"
        return 2
    fi
    
    # 尝试使用 lsof 检查端口（优先，输出更详细）
    if command -v lsof &> /dev/null; then
        local result=$(lsof -i ":${port}" -sTCP:LISTEN -t 2>/dev/null)
        if [ -n "$result" ]; then
            # 端口被占用，显示进程信息
            log_warning "端口 ${port} 已被占用"
            echo ""
            echo -e "${YELLOW}占用进程信息:${NC}"
            lsof -i ":${port}" -sTCP:LISTEN 2>/dev/null | head -n 10
            echo ""
            return 0
        else
            # 端口空闲
            return 1
        fi
    # 备用方案：使用 netstat
    elif command -v netstat &> /dev/null; then
        local result=$(netstat -tuln 2>/dev/null | grep ":${port} " | grep LISTEN)
        if [ -n "$result" ]; then
            # 端口被占用
            log_warning "端口 ${port} 已被占用"
            echo ""
            echo -e "${YELLOW}占用端口信息:${NC}"
            echo "$result"
            echo ""
            # 尝试使用 ss 获取进程信息（如果可用）
            if command -v ss &> /dev/null; then
                echo -e "${YELLOW}进程信息:${NC}"
                ss -tlnp 2>/dev/null | grep ":${port} " | head -n 5
                echo ""
            fi
            return 0
        else
            # 端口空闲
            return 1
        fi
    # 最后备用方案：使用 ss
    elif command -v ss &> /dev/null; then
        local result=$(ss -tuln 2>/dev/null | grep ":${port} " | grep LISTEN)
        if [ -n "$result" ]; then
            # 端口被占用
            log_warning "端口 ${port} 已被占用"
            echo ""
            echo -e "${YELLOW}占用端口信息:${NC}"
            echo "$result"
            echo ""
            # 尝试获取进程信息
            echo -e "${YELLOW}进程信息:${NC}"
            ss -tlnp 2>/dev/null | grep ":${port} " | head -n 5
            echo ""
            return 0
        else
            # 端口空闲
            return 1
        fi
    else
        # 没有可用的端口检查工具
        log_warning "未找到端口检查工具 (lsof/netstat/ss)，跳过端口检查"
        return 1
    fi
}

# 检查磁盘空间
# 参数: $1=最小空间(GB)，默认为 10GB
# 返回: 0=充足, 1=不足
check_disk_space() {
    local min_gb=${1:-10}
    
    log_step "检查磁盘空间（最小需求: ${min_gb}GB）..."
    
    # 获取当前目录所在文件系统的可用空间（单位：KB）
    # df -k 输出格式：Filesystem 1K-blocks Used Available Use% Mounted on
    local available_kb=$(df -k "${PROJECT_ROOT}" 2>/dev/null | tail -n 1 | awk '{print $4}')
    
    if [ -z "$available_kb" ]; then
        log_warning "无法获取磁盘空间信息，跳过检查"
        return 0
    fi
    
    # 转换为 GB（1GB = 1024 * 1024 KB）
    local available_gb=$(echo "scale=2; $available_kb / 1024 / 1024" | bc 2>/dev/null)
    
    # 如果 bc 不可用，使用整数除法
    if [ -z "$available_gb" ]; then
        available_gb=$((available_kb / 1024 / 1024))
    fi
    
    # 比较可用空间和最小需求
    # 使用 awk 进行浮点数比较
    local is_sufficient=$(echo "$available_gb $min_gb" | awk '{if ($1 >= $2) print "yes"; else print "no"}')
    
    if [ "$is_sufficient" = "yes" ]; then
        log_success "磁盘空间充足 (可用: ${available_gb}GB)"
        return 0
    else
        log_warning "磁盘空间不足 (可用: ${available_gb}GB, 需求: ${min_gb}GB)"
        echo ""
        echo -e "${YELLOW}建议操作:${NC}"
        echo "  1. 清理 Docker 未使用的镜像: docker image prune -a"
        echo "  2. 清理 Docker 未使用的容器: docker container prune"
        echo "  3. 清理 Docker 未使用的卷: docker volume prune"
        echo "  4. 清理系统临时文件和缓存"
        echo "  5. 释放其他磁盘空间"
        echo ""
        echo -e "${YELLOW}当前磁盘使用情况:${NC}"
        df -h "${PROJECT_ROOT}" 2>/dev/null | head -n 2
        echo ""
        return 1
    fi
}

# ==============================================================================
# 配置管理模块
# ==============================================================================

# 生成随机密钥
# 参数: $1=长度(字节数)，默认为 32 字节
# 输出: base64 编码的密钥
# 返回: 0=成功, 1=失败
generate_random_key() {
    local bytes=${1:-32}
    
    # 验证参数是否为正整数
    if ! [[ "$bytes" =~ ^[0-9]+$ ]] || [ "$bytes" -le 0 ]; then
        log_error "generate_random_key: 无效的字节数参数 '$bytes'，必须为正整数"
        return 1
    fi
    
    # 检查 openssl 是否可用
    if ! command -v openssl &> /dev/null; then
        log_error "generate_random_key: openssl 命令不可用，请安装 OpenSSL"
        return 1
    fi
    
    # 使用 openssl rand -base64 生成随机密钥
    # -base64 选项会将随机字节编码为 base64 格式
    local key=$(openssl rand -base64 "$bytes" 2>/dev/null)
    
    # 检查生成是否成功
    if [ $? -ne 0 ] || [ -z "$key" ]; then
        log_error "generate_random_key: 密钥生成失败"
        return 1
    fi
    
    # 输出生成的密钥（去除可能的换行符）
    echo -n "$key" | tr -d '\n'
    return 0
}

# 生成环境配置文件
# 参数: 通过关联数组传递配置参数
# 返回: 0=成功, 1=失败
generate_env_config() {
    log_step "正在生成 .env.production 文件..."
    
    # 检查 .env.example 是否存在
    if [ ! -f "${PROJECT_ROOT}/.env.example" ]; then
        log_error ".env.example 文件不存在"
        return 1
    fi
    
    # 验证必需的配置参数
    local required_params=(
        "DOMAIN"
        "WWW_DOMAIN"
        "SSL_EMAIL"
        "DOCKER_USERNAME"
        "IMAGE_NAME"
        "VERSION"
        "DB_PASSWORD"
        "AUTH_JWT_SECRET"
        "SECRET_MASTER_KEY"
        "REFRESH_TOKEN_ENCRYPT_KEY"
        "REDIS_PASSWORD"
        "WATCHTOWER_TOKEN"
    )
    
    for param in "${required_params[@]}"; do
        if [ -z "${!param}" ]; then
            log_error "缺少必需的配置参数: ${param}"
            return 1
        fi
    done
    
    # 备份现有的 .env.production（如果存在）
    if [ -f "$ENV_FILE" ]; then
        local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$backup_file"
        log_info "已备份现有配置到: ${backup_file}"
    fi
    
    # 复制模板
    cp "${PROJECT_ROOT}/.env.example" "$ENV_FILE"
    
    # 转义特殊字符（用于 sed 替换）
    local escaped_db_password=$(echo "$DB_PASSWORD" | sed 's/[\/&]/\\&/g')
    local escaped_jwt_secret=$(echo "$AUTH_JWT_SECRET" | sed 's/[\/&]/\\&/g')
    local escaped_master_key=$(echo "$SECRET_MASTER_KEY" | sed 's/[\/&]/\\&/g')
    local escaped_refresh_token_key=$(echo "$REFRESH_TOKEN_ENCRYPT_KEY" | sed 's/[\/&]/\\&/g')
    local escaped_redis_password=$(echo "$REDIS_PASSWORD" | sed 's/[\/&]/\\&/g')
    local escaped_watchtower_token=$(echo "$WATCHTOWER_TOKEN" | sed 's/[\/&]/\\&/g')
    
    # 使用 sed 替换配置项（兼容 macOS 和 Linux）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "$ENV_FILE"
        sed -i '' "s|^WWW_DOMAIN=.*|WWW_DOMAIN=${WWW_DOMAIN}|" "$ENV_FILE"
        sed -i '' "s|^SSL_EMAIL=.*|SSL_EMAIL=${SSL_EMAIL}|" "$ENV_FILE"
        sed -i '' "s|^DOCKER_USERNAME=.*|DOCKER_USERNAME=${DOCKER_USERNAME}|" "$ENV_FILE"
        sed -i '' "s|^IMAGE_NAME=.*|IMAGE_NAME=${IMAGE_NAME}|" "$ENV_FILE"
        sed -i '' "s|^VERSION=.*|VERSION=${VERSION}|" "$ENV_FILE"
        sed -i '' "s|^FULL_IMAGE_NAME=.*|FULL_IMAGE_NAME=${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}|" "$ENV_FILE"
        sed -i '' "s|^DB_PASSWORD=.*|DB_PASSWORD=${escaped_db_password}|" "$ENV_FILE"
        sed -i '' "s|^AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=${escaped_jwt_secret}|" "$ENV_FILE"
        sed -i '' "s|^SECRET_MASTER_KEY=.*|SECRET_MASTER_KEY=${escaped_master_key}|" "$ENV_FILE"
        sed -i '' "s|^REFRESH_TOKEN_ENCRYPT_KEY=.*|REFRESH_TOKEN_ENCRYPT_KEY=${escaped_refresh_token_key}|" "$ENV_FILE"
        sed -i '' "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${escaped_redis_password}|" "$ENV_FILE"
        sed -i '' "s|^WATCHTOWER_TOKEN=.*|WATCHTOWER_TOKEN=${escaped_watchtower_token}|" "$ENV_FILE"
        sed -i '' "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem|" "$ENV_FILE"
        sed -i '' "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/letsencrypt/live/${DOMAIN}/privkey.pem|" "$ENV_FILE"
        sed -i '' "s|^DB_HOST=.*|DB_HOST=mysql|" "$ENV_FILE"
        sed -i '' "s|^REDIS_HOST=.*|REDIS_HOST=redis|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "$ENV_FILE"
        sed -i "s|^WWW_DOMAIN=.*|WWW_DOMAIN=${WWW_DOMAIN}|" "$ENV_FILE"
        sed -i "s|^SSL_EMAIL=.*|SSL_EMAIL=${SSL_EMAIL}|" "$ENV_FILE"
        sed -i "s|^DOCKER_USERNAME=.*|DOCKER_USERNAME=${DOCKER_USERNAME}|" "$ENV_FILE"
        sed -i "s|^IMAGE_NAME=.*|IMAGE_NAME=${IMAGE_NAME}|" "$ENV_FILE"
        sed -i "s|^VERSION=.*|VERSION=${VERSION}|" "$ENV_FILE"
        sed -i "s|^FULL_IMAGE_NAME=.*|FULL_IMAGE_NAME=${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}|" "$ENV_FILE"
        sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${escaped_db_password}|" "$ENV_FILE"
        sed -i "s|^AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=${escaped_jwt_secret}|" "$ENV_FILE"
        sed -i "s|^SECRET_MASTER_KEY=.*|SECRET_MASTER_KEY=${escaped_master_key}|" "$ENV_FILE"
        sed -i "s|^REFRESH_TOKEN_ENCRYPT_KEY=.*|REFRESH_TOKEN_ENCRYPT_KEY=${escaped_refresh_token_key}|" "$ENV_FILE"
        sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${escaped_redis_password}|" "$ENV_FILE"
        sed -i "s|^WATCHTOWER_TOKEN=.*|WATCHTOWER_TOKEN=${escaped_watchtower_token}|" "$ENV_FILE"
        sed -i "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem|" "$ENV_FILE"
        sed -i "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/letsencrypt/live/${DOMAIN}/privkey.pem|" "$ENV_FILE"
        sed -i "s|^DB_HOST=.*|DB_HOST=mysql|" "$ENV_FILE"
        sed -i "s|^REDIS_HOST=.*|REDIS_HOST=redis|" "$ENV_FILE"
    fi
    
    # 设置文件权限为 600（仅所有者可读写）
    chmod 600 "$ENV_FILE"
    
    log_success ".env.production 文件已生成"
    log_info "文件位置: ${ENV_FILE}"
    log_info "文件权限: 600 (仅所有者可读写)"
    
    return 0
}

# 交互式配置向导
# 返回: 0=成功, 1=取消
interactive_config() {
    log_header "交互式配置向导"
    
    log_info "本向导将帮助您配置生产环境所需的参数"
    log_warning "请确保您已准备好域名和 SSL 证书邮箱"
    echo ""
    
    # 临时存储配置
    local config_domain=""
    local config_www_domain=""
    local config_ssl_email=""
    local config_docker_username=""
    local config_image_name=""
    local config_version=""
    local config_db_password=""
    local config_jwt_secret=""
    local config_master_key=""
    local config_refresh_token_key=""
    local config_redis_password=""
    local config_watchtower_token=""
    
    # ========================================
    # 1. 域名配置
    # ========================================
    log_step "步骤 1/7: 域名配置"
    echo ""
    
    while true; do
        read -p "$(echo -e ${CYAN}请输入您的域名 ${NC}[例如: example.com]: )" config_domain
        
        if [ -z "$config_domain" ]; then
            log_error "域名不能为空，请重新输入"
            continue
        fi
        
        # 简单的域名格式验证
        if [[ ! "$config_domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
            log_error "域名格式不正确，请重新输入"
            continue
        fi
        
        # 自动生成 www 域名
        config_www_domain="www.${config_domain}"
        log_success "域名: ${config_domain}"
        log_info "WWW 域名: ${config_www_domain}"
        break
    done
    
    echo ""
    
    # ========================================
    # 2. SSL 证书邮箱
    # ========================================
    log_step "步骤 2/7: SSL 证书邮箱"
    echo ""
    
    while true; do
        read -p "$(echo -e ${CYAN}请输入 SSL 证书管理员邮箱 ${NC}[例如: admin@${config_domain}]: )" config_ssl_email
        
        if [ -z "$config_ssl_email" ]; then
            log_error "邮箱不能为空，请重新输入"
            continue
        fi
        
        # 简单的邮箱格式验证
        if [[ ! "$config_ssl_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            log_error "邮箱格式不正确，请重新输入"
            continue
        fi
        
        log_success "SSL 邮箱: ${config_ssl_email}"
        break
    done
    
    echo ""
    
    # ========================================
    # 3. Docker 镜像配置
    # ========================================
    log_step "步骤 3/7: Docker 镜像配置"
    echo ""
    
    # Docker 用户名
    read -p "$(echo -e ${CYAN}请输入 Docker Hub 用户名 ${NC}[默认: ${DEFAULT_DOCKER_USERNAME}]: )" config_docker_username
    config_docker_username=${config_docker_username:-$DEFAULT_DOCKER_USERNAME}
    log_success "Docker 用户名: ${config_docker_username}"
    
    # 镜像名称
    read -p "$(echo -e ${CYAN}请输入镜像名称 ${NC}[默认: ${DEFAULT_IMAGE_NAME}]: )" config_image_name
    config_image_name=${config_image_name:-$DEFAULT_IMAGE_NAME}
    log_success "镜像名称: ${config_image_name}"
    
    # 镜像版本
    read -p "$(echo -e ${CYAN}请输入镜像版本 ${NC}[默认: ${DEFAULT_VERSION}]: )" config_version
    config_version=${config_version:-$DEFAULT_VERSION}
    log_success "镜像版本: ${config_version}"
    
    echo ""
    
    # ========================================
    # 4. 数据库密码
    # ========================================
    log_step "步骤 4/7: 数据库密码配置"
    echo ""
    
    while true; do
        read -p "$(echo -e ${CYAN}是否自动生成数据库密码？${NC} [Y/n]: )" auto_gen_db_pass
        auto_gen_db_pass=${auto_gen_db_pass:-Y}
        
        if [[ "$auto_gen_db_pass" =~ ^[Yy]$ ]]; then
            # 自动生成密码（24 字节 = 32 个 base64 字符）
            config_db_password=$(generate_random_key 24)
            if [ $? -eq 0 ]; then
                log_success "数据库密码已自动生成（长度: ${#config_db_password} 字符）"
                break
            else
                log_error "密码生成失败，请手动输入"
            fi
        else
            # 手动输入密码
            while true; do
                read -sp "$(echo -e ${CYAN}请输入数据库密码 ${NC}[至少 16 字符]: )" config_db_password
                echo ""
                
                if [ -z "$config_db_password" ]; then
                    log_error "密码不能为空，请重新输入"
                    continue
                fi
                
                if [ ${#config_db_password} -lt 16 ]; then
                    log_error "密码长度不足 16 字符，请重新输入"
                    continue
                fi
                
                # 确认密码
                read -sp "$(echo -e ${CYAN}请再次输入密码确认: ${NC})" config_db_password_confirm
                echo ""
                
                if [ "$config_db_password" != "$config_db_password_confirm" ]; then
                    log_error "两次输入的密码不一致，请重新输入"
                    continue
                fi
                
                log_success "数据库密码已设置"
                break
            done
            break
        fi
    done
    
    echo ""
    
    # ========================================
    # 5. JWT 密钥
    # ========================================
    log_step "步骤 5/7: JWT 签名密钥配置"
    echo ""
    
    read -p "$(echo -e ${CYAN}是否自动生成 JWT 签名密钥？${NC} [Y/n]: )" auto_gen_jwt
    auto_gen_jwt=${auto_gen_jwt:-Y}
    
    if [[ "$auto_gen_jwt" =~ ^[Yy]$ ]]; then
        config_jwt_secret=$(generate_random_key 32)
        if [ $? -eq 0 ]; then
            log_success "JWT 签名密钥已自动生成"
        else
            log_error "密钥生成失败"
            return 1
        fi
    else
        read -sp "$(echo -e ${CYAN}请输入 JWT 签名密钥 ${NC}[至少 32 字符]: )" config_jwt_secret
        echo ""
        if [ ${#config_jwt_secret} -lt 32 ]; then
            log_error "密钥长度不足 32 字符"
            return 1
        fi
        log_success "JWT 签名密钥已设置"
    fi
    
    echo ""
    
    # ========================================
    # 6. 主密钥和刷新令牌密钥
    # ========================================
    log_step "步骤 6/7: 主密钥和刷新令牌密钥配置"
    echo ""
    
    read -p "$(echo -e ${CYAN}是否自动生成主密钥和刷新令牌密钥？${NC} [Y/n]: )" auto_gen_keys
    auto_gen_keys=${auto_gen_keys:-Y}
    
    if [[ "$auto_gen_keys" =~ ^[Yy]$ ]]; then
        # 生成主密钥（32 字节）
        config_master_key=$(generate_random_key 32)
        if [ $? -ne 0 ]; then
            log_error "主密钥生成失败"
            return 1
        fi
        log_success "主密钥已自动生成"
        
        # 生成刷新令牌加密密钥（32 字节）
        config_refresh_token_key=$(generate_random_key 32)
        if [ $? -ne 0 ]; then
            log_error "刷新令牌密钥生成失败"
            return 1
        fi
        log_success "刷新令牌加密密钥已自动生成"
    else
        read -sp "$(echo -e ${CYAN}请输入主密钥 ${NC}[至少 32 字符]: )" config_master_key
        echo ""
        if [ ${#config_master_key} -lt 32 ]; then
            log_error "主密钥长度不足 32 字符"
            return 1
        fi
        
        read -sp "$(echo -e ${CYAN}请输入刷新令牌加密密钥 ${NC}[至少 32 字符]: )" config_refresh_token_key
        echo ""
        if [ ${#config_refresh_token_key} -lt 32 ]; then
            log_error "刷新令牌密钥长度不足 32 字符"
            return 1
        fi
        
        log_success "主密钥和刷新令牌密钥已设置"
    fi
    
    echo ""
    
    # ========================================
    # 7. Redis 密码和 Watchtower 令牌
    # ========================================
    log_step "步骤 7/7: Redis 密码和 Watchtower 令牌配置"
    echo ""
    
    read -p "$(echo -e ${CYAN}是否自动生成 Redis 密码和 Watchtower 令牌？${NC} [Y/n]: )" auto_gen_misc
    auto_gen_misc=${auto_gen_misc:-Y}
    
    if [[ "$auto_gen_misc" =~ ^[Yy]$ ]]; then
        # 生成 Redis 密码（24 字节）
        config_redis_password=$(generate_random_key 24)
        if [ $? -ne 0 ]; then
            log_error "Redis 密码生成失败"
            return 1
        fi
        log_success "Redis 密码已自动生成"
        
        # 生成 Watchtower 令牌（使用 hex 格式，32 字节）
        if command -v openssl &> /dev/null; then
            config_watchtower_token=$(openssl rand -hex 32 2>/dev/null)
            if [ $? -eq 0 ]; then
                log_success "Watchtower 令牌已自动生成"
            else
                log_error "Watchtower 令牌生成失败"
                return 1
            fi
        else
            log_error "openssl 命令不可用"
            return 1
        fi
    else
        read -sp "$(echo -e ${CYAN}请输入 Redis 密码 ${NC}[至少 16 字符]: )" config_redis_password
        echo ""
        if [ ${#config_redis_password} -lt 16 ]; then
            log_error "Redis 密码长度不足 16 字符"
            return 1
        fi
        
        read -p "$(echo -e ${CYAN}请输入 Watchtower 令牌: ${NC})" config_watchtower_token
        if [ -z "$config_watchtower_token" ]; then
            log_error "Watchtower 令牌不能为空"
            return 1
        fi
        
        log_success "Redis 密码和 Watchtower 令牌已设置"
    fi
    
    echo ""
    
    # ========================================
    # 显示配置摘要
    # ========================================
    log_header "配置摘要"
    
    echo -e "${CYAN}域名配置:${NC}"
    echo "  域名: ${config_domain}"
    echo "  WWW 域名: ${config_www_domain}"
    echo "  SSL 邮箱: ${config_ssl_email}"
    echo ""
    
    echo -e "${CYAN}Docker 镜像配置:${NC}"
    echo "  Docker 用户名: ${config_docker_username}"
    echo "  镜像名称: ${config_image_name}"
    echo "  镜像版本: ${config_version}"
    echo "  完整镜像: ${config_docker_username}/${config_image_name}:${config_version}"
    echo ""
    
    echo -e "${CYAN}安全配置:${NC}"
    echo "  数据库密码: $(echo "$config_db_password" | sed 's/./*/g') (${#config_db_password} 字符)"
    echo "  JWT 签名密钥: $(echo "$config_jwt_secret" | sed 's/./*/g') (${#config_jwt_secret} 字符)"
    echo "  主密钥: $(echo "$config_master_key" | sed 's/./*/g') (${#config_master_key} 字符)"
    echo "  刷新令牌密钥: $(echo "$config_refresh_token_key" | sed 's/./*/g') (${#config_refresh_token_key} 字符)"
    echo "  Redis 密码: $(echo "$config_redis_password" | sed 's/./*/g') (${#config_redis_password} 字符)"
    echo "  Watchtower 令牌: $(echo "$config_watchtower_token" | sed 's/./*/g') (${#config_watchtower_token} 字符)"
    echo ""
    
    # ========================================
    # 确认配置
    # ========================================
    read -p "$(echo -e ${YELLOW}确认以上配置并生成 .env.production 文件？${NC} [Y/n]: )" confirm
    confirm=${confirm:-Y}
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_warning "配置已取消"
        return 1
    fi
    
    # ========================================
    # 导出配置参数并调用生成函数
    # ========================================
    export DOMAIN="$config_domain"
    export WWW_DOMAIN="$config_www_domain"
    export SSL_EMAIL="$config_ssl_email"
    export DOCKER_USERNAME="$config_docker_username"
    export IMAGE_NAME="$config_image_name"
    export VERSION="$config_version"
    export DB_PASSWORD="$config_db_password"
    export AUTH_JWT_SECRET="$config_jwt_secret"
    export SECRET_MASTER_KEY="$config_master_key"
    export REFRESH_TOKEN_ENCRYPT_KEY="$config_refresh_token_key"
    export REDIS_PASSWORD="$config_redis_password"
    export WATCHTOWER_TOKEN="$config_watchtower_token"
    
    # 调用配置文件生成函数
    if ! generate_env_config; then
        log_error "配置文件生成失败"
        return 1
    fi
    
    echo ""
    log_success "配置向导完成！"
    
    return 0
}

# 验证配置完整性
# 返回: 0=有效, 1=无效
validate_config() {
    log_header "验证配置文件"
    
    # 检查配置文件是否存在
    if [ ! -f "$ENV_FILE" ]; then
        log_error "配置文件不存在: ${ENV_FILE}"
        return 1
    fi
    
    log_step "正在验证配置参数..."
    echo ""
    
    # 加载配置文件
    # 使用 set -a 自动导出所有变量
    set -a
    source "$ENV_FILE"
    set +a
    
    local validation_failed=false
    local warnings=()
    
    # ========================================
    # 1. 检查所有必需参数是否存在
    # ========================================
    log_info "检查必需参数..."
    
    local required_params=(
        "DOMAIN:域名"
        "WWW_DOMAIN:WWW 域名"
        "SSL_EMAIL:SSL 证书邮箱"
        "DOCKER_USERNAME:Docker 用户名"
        "IMAGE_NAME:镜像名称"
        "VERSION:镜像版本"
        "DB_HOST:数据库主机"
        "DB_PORT:数据库端口"
        "DB_USER:数据库用户"
        "DB_PASSWORD:数据库密码"
        "DB_NAME:数据库名称"
        "AUTH_JWT_SECRET:JWT 签名密钥"
        "SECRET_MASTER_KEY:主密钥"
        "REFRESH_TOKEN_ENCRYPT_KEY:刷新令牌加密密钥"
        "REDIS_HOST:Redis 主机"
        "REDIS_PORT:Redis 端口"
        "REDIS_PASSWORD:Redis 密码"
    )
    
    for param_info in "${required_params[@]}"; do
        local param_name="${param_info%%:*}"
        local param_desc="${param_info##*:}"
        local param_value="${!param_name}"
        
        if [ -z "$param_value" ]; then
            log_error "缺少必需参数: ${param_desc} (${param_name})"
            validation_failed=true
        else
            log_success "✓ ${param_desc}"
        fi
    done
    
    echo ""
    
    # ========================================
    # 2. 验证密码强度（≥ 16 字符）
    # ========================================
    log_info "验证密码强度..."
    
    # 检查数据库密码
    if [ -n "$DB_PASSWORD" ]; then
        local db_pass_length=${#DB_PASSWORD}
        if [ $db_pass_length -lt 16 ]; then
            log_error "数据库密码长度不足 16 字符 (当前: ${db_pass_length} 字符)"
            validation_failed=true
        else
            log_success "✓ 数据库密码强度符合要求 (${db_pass_length} 字符)"
        fi
    fi
    
    # 检查 Redis 密码
    if [ -n "$REDIS_PASSWORD" ]; then
        local redis_pass_length=${#REDIS_PASSWORD}
        if [ $redis_pass_length -lt 16 ]; then
            log_error "Redis 密码长度不足 16 字符 (当前: ${redis_pass_length} 字符)"
            validation_failed=true
        else
            log_success "✓ Redis 密码强度符合要求 (${redis_pass_length} 字符)"
        fi
    fi
    
    echo ""
    
    # ========================================
    # 3. 验证刷新令牌密钥长度（32 字节）
    # ========================================
    log_info "验证刷新令牌加密密钥..."
    
    if [ -n "$REFRESH_TOKEN_ENCRYPT_KEY" ]; then
        # base64 编码的 32 字节密钥，解码后应该是 32 字节
        # base64 编码后的长度约为 44 字符（32 * 4/3 ≈ 43-44）
        local refresh_key_length=${#REFRESH_TOKEN_ENCRYPT_KEY}
        
        # 尝试解码并检查长度
        if command -v base64 &> /dev/null; then
            local decoded_length=$(echo -n "$REFRESH_TOKEN_ENCRYPT_KEY" | base64 -d 2>/dev/null | wc -c | tr -d ' ')
            
            if [ -z "$decoded_length" ] || [ "$decoded_length" -eq 0 ]; then
                # 解码失败，可能不是 base64 格式，使用原始长度检查
                if [ $refresh_key_length -lt 32 ]; then
                    log_error "刷新令牌加密密钥长度不足 32 字符 (当前: ${refresh_key_length} 字符)"
                    validation_failed=true
                else
                    log_success "✓ 刷新令牌加密密钥长度符合要求 (${refresh_key_length} 字符)"
                fi
            else
                # 解码成功，检查解码后的字节数
                if [ "$decoded_length" -lt 32 ]; then
                    log_error "刷新令牌加密密钥解码后长度不足 32 字节 (当前: ${decoded_length} 字节)"
                    validation_failed=true
                else
                    log_success "✓ 刷新令牌加密密钥长度符合要求 (${decoded_length} 字节)"
                fi
            fi
        else
            # base64 命令不可用，使用原始长度检查（至少 32 字符）
            if [ $refresh_key_length -lt 32 ]; then
                log_error "刷新令牌加密密钥长度不足 32 字符 (当前: ${refresh_key_length} 字符)"
                validation_failed=true
            else
                log_success "✓ 刷新令牌加密密钥长度符合要求 (${refresh_key_length} 字符)"
            fi
        fi
    fi
    
    echo ""
    
    # ========================================
    # 4. 检测默认密码并警告
    # ========================================
    log_info "检测默认密码..."
    
    # 常见的默认密码列表
    local default_passwords=(
        "password"
        "123456"
        "admin"
        "root"
        "changeme"
        "default"
        "test"
        "demo"
        "password123"
        "admin123"
    )
    
    # 检查数据库密码
    if [ -n "$DB_PASSWORD" ]; then
        local db_pass_lower=$(echo "$DB_PASSWORD" | tr '[:upper:]' '[:lower:]')
        for default_pass in "${default_passwords[@]}"; do
            if [ "$db_pass_lower" = "$default_pass" ]; then
                log_error "检测到默认数据库密码: ${default_pass}"
                log_error "使用默认密码存在严重安全风险，拒绝部署！"
                validation_failed=true
                break
            fi
        done
        
        # 检查是否包含 "example" 或 "sample"
        if [[ "$db_pass_lower" == *"example"* ]] || [[ "$db_pass_lower" == *"sample"* ]]; then
            log_warning "数据库密码包含 'example' 或 'sample'，可能是示例密码"
            warnings+=("数据库密码可能是示例密码")
        fi
    fi
    
    # 检查 Redis 密码
    if [ -n "$REDIS_PASSWORD" ]; then
        local redis_pass_lower=$(echo "$REDIS_PASSWORD" | tr '[:upper:]' '[:lower:]')
        for default_pass in "${default_passwords[@]}"; do
            if [ "$redis_pass_lower" = "$default_pass" ]; then
                log_error "检测到默认 Redis 密码: ${default_pass}"
                log_error "使用默认密码存在严重安全风险，拒绝部署！"
                validation_failed=true
                break
            fi
        done
        
        # 检查是否包含 "example" 或 "sample"
        if [[ "$redis_pass_lower" == *"example"* ]] || [[ "$redis_pass_lower" == *"sample"* ]]; then
            log_warning "Redis 密码包含 'example' 或 'sample'，可能是示例密码"
            warnings+=("Redis 密码可能是示例密码")
        fi
    fi
    
    # 检查 JWT 密钥
    if [ -n "$AUTH_JWT_SECRET" ]; then
        local jwt_lower=$(echo "$AUTH_JWT_SECRET" | tr '[:upper:]' '[:lower:]')
        if [[ "$jwt_lower" == *"example"* ]] || [[ "$jwt_lower" == *"sample"* ]] || [[ "$jwt_lower" == *"changeme"* ]]; then
            log_warning "JWT 签名密钥可能是示例密钥"
            warnings+=("JWT 签名密钥可能是示例密钥")
        fi
    fi
    
    if [ "$validation_failed" = false ]; then
        log_success "✓ 未检测到默认密码"
    fi
    
    echo ""
    
    # ========================================
    # 5. 额外的安全检查
    # ========================================
    log_info "执行额外的安全检查..."
    
    # 检查 JWT 密钥长度
    if [ -n "$AUTH_JWT_SECRET" ]; then
        local jwt_length=${#AUTH_JWT_SECRET}
        if [ $jwt_length -lt 32 ]; then
            log_warning "JWT 签名密钥长度不足 32 字符 (当前: ${jwt_length} 字符)"
            warnings+=("JWT 签名密钥长度建议至少 32 字符")
        else
            log_success "✓ JWT 签名密钥长度符合要求 (${jwt_length} 字符)"
        fi
    fi
    
    # 检查主密钥长度
    if [ -n "$SECRET_MASTER_KEY" ]; then
        local master_key_length=${#SECRET_MASTER_KEY}
        if [ $master_key_length -lt 32 ]; then
            log_warning "主密钥长度不足 32 字符 (当前: ${master_key_length} 字符)"
            warnings+=("主密钥长度建议至少 32 字符")
        else
            log_success "✓ 主密钥长度符合要求 (${master_key_length} 字符)"
        fi
    fi
    
    # 检查域名格式
    if [ -n "$DOMAIN" ]; then
        if [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
            log_success "✓ 域名格式正确"
        else
            log_error "域名格式不正确: ${DOMAIN}"
            validation_failed=true
        fi
    fi
    
    # 检查邮箱格式
    if [ -n "$SSL_EMAIL" ]; then
        if [[ "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            log_success "✓ SSL 邮箱格式正确"
        else
            log_error "SSL 邮箱格式不正确: ${SSL_EMAIL}"
            validation_failed=true
        fi
    fi
    
    echo ""
    
    # ========================================
    # 6. 显示验证结果
    # ========================================
    if [ "$validation_failed" = true ]; then
        log_error "配置验证失败！请修复上述错误后重试。"
        echo ""
        echo -e "${YELLOW}建议操作:${NC}"
        echo "  1. 编辑配置文件: ${ENV_FILE}"
        echo "  2. 修复标记为错误的配置项"
        echo "  3. 重新运行部署脚本"
        echo ""
        return 1
    fi
    
    # 显示警告（如果有）
    if [ ${#warnings[@]} -gt 0 ]; then
        echo ""
        log_warning "发现 ${#warnings[@]} 个警告:"
        for warning in "${warnings[@]}"; do
            echo -e "  ${YELLOW}•${NC} ${warning}"
        done
        echo ""
        
        read -p "$(echo -e ${YELLOW}是否继续部署？${NC} [y/N]: )" continue_deploy
        if [[ ! "$continue_deploy" =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            return 1
        fi
    fi
    
    log_success "配置验证通过！"
    return 0
}

# ==============================================================================
# SSL 配置模块
# ==============================================================================

# 检查本地证书文件
# 参数: $1=域名
# 返回: 0=存在, 1=不存在
check_local_cert() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        log_error "check_local_cert: 域名参数缺失"
        return 1
    fi
    
    # 检查 deploy/{domain}/ 目录
    local cert_dir="${DEPLOY_DIR}/${domain}"
    local fullchain_path="${cert_dir}/fullchain.pem"
    local privkey_path="${cert_dir}/privkey.pem"
    
    log_step "检查本地证书目录: ${cert_dir}"
    
    # 检查目录是否存在
    if [ ! -d "$cert_dir" ]; then
        log_info "证书目录不存在: ${cert_dir}"
        return 1
    fi
    
    # 检查 fullchain.pem 是否存在
    if [ ! -f "$fullchain_path" ]; then
        log_info "证书文件不存在: ${fullchain_path}"
        return 1
    fi
    
    # 检查 privkey.pem 是否存在
    if [ ! -f "$privkey_path" ]; then
        log_info "私钥文件不存在: ${privkey_path}"
        return 1
    fi
    
    log_success "找到本地证书文件"
    log_info "证书文件: ${fullchain_path}"
    log_info "私钥文件: ${privkey_path}"
    
    return 0
}

# 验证证书有效性
# 参数: $1=证书路径, $2=域名
# 返回: 0=有效, 1=无效
validate_cert() {
    local cert_path=$1
    local domain=$2
    
    if [ -z "$cert_path" ] || [ -z "$domain" ]; then
        log_error "validate_cert: 参数缺失（证书路径或域名）"
        return 1
    fi
    
    # 检查证书文件是否存在
    if [ ! -f "$cert_path" ]; then
        log_error "证书文件不存在: ${cert_path}"
        return 1
    fi
    
    # 检查 openssl 是否可用
    if ! command -v openssl &> /dev/null; then
        log_error "openssl 命令不可用，无法验证证书"
        return 1
    fi
    
    log_step "验证证书有效性..."
    
    # 1. 检查证书是否可以被解析
    if ! openssl x509 -in "$cert_path" -noout 2>/dev/null; then
        log_error "证书文件格式无效或损坏"
        return 1
    fi
    
    # 2. 检查证书是否过期
    local expiry_date=$(openssl x509 -in "$cert_path" -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -z "$expiry_date" ]; then
        log_error "无法读取证书过期时间"
        return 1
    fi
    
    # 将过期日期转换为时间戳（兼容 macOS 和 Linux）
    local expiry_timestamp
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        expiry_timestamp=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    else
        # Linux
        expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
    fi
    
    if [ -z "$expiry_timestamp" ]; then
        log_warning "无法解析证书过期时间，跳过过期检查"
    else
        local current_timestamp=$(date +%s)
        
        if [ "$expiry_timestamp" -le "$current_timestamp" ]; then
            log_error "证书已过期"
            log_info "过期时间: ${expiry_date}"
            return 1
        fi
        
        # 计算剩余天数
        local remaining_seconds=$((expiry_timestamp - current_timestamp))
        local remaining_days=$((remaining_seconds / 86400))
        
        log_success "证书未过期 (剩余 ${remaining_days} 天)"
        log_info "过期时间: ${expiry_date}"
        
        # 如果证书即将过期（少于 30 天），发出警告
        if [ "$remaining_days" -lt 30 ]; then
            log_warning "证书即将过期，建议尽快续期"
        fi
    fi
    
    # 3. 验证证书域名是否匹配
    log_step "验证证书域名..."
    
    # 获取证书的 CN (Common Name)
    local cert_cn=$(openssl x509 -in "$cert_path" -noout -subject 2>/dev/null | sed -n 's/.*CN[[:space:]]*=[[:space:]]*\([^,]*\).*/\1/p')
    
    # 获取证书的 SAN (Subject Alternative Names)
    # 兼容 macOS 和 Linux 的 grep
    local cert_san=$(openssl x509 -in "$cert_path" -noout -ext subjectAltName 2>/dev/null | grep "DNS:" | sed 's/DNS://g' | tr ',' '\n' | xargs | tr ' ' ',')
    
    log_info "证书 CN: ${cert_cn:-未找到}"
    log_info "证书 SAN: ${cert_san:-未找到}"
    
    # 检查域名是否匹配（CN 或 SAN 中任一匹配即可）
    local domain_matched=false
    
    # 检查 CN
    if [ -n "$cert_cn" ]; then
        if [ "$cert_cn" = "$domain" ] || [ "$cert_cn" = "*.${domain#*.}" ]; then
            domain_matched=true
        fi
    fi
    
    # 检查 SAN
    if [ "$domain_matched" = false ] && [ -n "$cert_san" ]; then
        # 将 SAN 转换为数组
        IFS=',' read -ra san_array <<< "$cert_san"
        for san_domain in "${san_array[@]}"; do
            # 去除空格
            san_domain=$(echo "$san_domain" | xargs)
            if [ "$san_domain" = "$domain" ] || [ "$san_domain" = "*.${domain#*.}" ]; then
                domain_matched=true
                break
            fi
        done
    fi
    
    if [ "$domain_matched" = true ]; then
        log_success "证书域名匹配: ${domain}"
    else
        log_error "证书域名不匹配"
        log_info "期望域名: ${domain}"
        log_info "证书域名: CN=${cert_cn}, SAN=${cert_san}"
        return 1
    fi
    
    log_success "证书验证通过"
    return 0
}

# 使用 Let's Encrypt 申请证书
# 参数: $1=域名, $2=邮箱
# 返回: 0=成功, 1=失败
request_letsencrypt_cert() {
    local domain=$1
    local email=$2
    
    if [ -z "$domain" ] || [ -z "$email" ]; then
        log_error "request_letsencrypt_cert: 参数缺失（域名或邮箱）"
        return 1
    fi
    
    log_header "使用 Let's Encrypt 申请 SSL 证书"
    
    # 检查 certbot 是否安装
    if ! command -v certbot &> /dev/null; then
        log_error "certbot 未安装"
        echo ""
        echo -e "${YELLOW}安装 certbot:${NC}"
        echo "  Ubuntu/Debian: sudo apt-get install certbot"
        echo "  CentOS/RHEL:   sudo yum install certbot"
        echo "  macOS:         brew install certbot"
        echo ""
        return 1
    fi
    
    local certbot_version=$(certbot --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -n 1)
    log_success "certbot 已安装 (版本: ${certbot_version})"
    
    echo ""
    log_info "域名: ${domain}"
    log_info "邮箱: ${email}"
    echo ""
    
    # 选择验证方式
    log_step "选择验证方式"
    echo ""
    echo "Let's Encrypt 支持以下验证方式:"
    echo "  1. HTTP 验证 (推荐) - 需要域名已解析到本服务器，端口 80 可访问"
    echo "  2. DNS 验证 - 需要手动添加 DNS TXT 记录"
    echo "  3. 手动配置 - 稍后手动配置证书"
    echo ""
    
    read -p "$(echo -e ${CYAN}请选择验证方式 ${NC}[1-3, 默认: 1]: )" validation_method
    validation_method=${validation_method:-1}
    
    case "$validation_method" in
        1)
            # HTTP 验证
            log_step "使用 HTTP 验证方式申请证书..."
            echo ""
            
            log_warning "请确保:"
            echo "  1. 域名 ${domain} 已解析到本服务器的公网 IP"
            echo "  2. 端口 80 未被占用且可从外网访问"
            echo "  3. 防火墙已开放端口 80"
            echo ""
            
            read -p "$(echo -e ${YELLOW}确认以上条件已满足？${NC} [y/N]: )" confirm_http
            if [[ ! "$confirm_http" =~ ^[Yy]$ ]]; then
                log_info "证书申请已取消"
                return 1
            fi
            
            # 使用 standalone 模式申请证书
            log_step "正在申请证书（这可能需要几分钟）..."
            
            if sudo certbot certonly \
                --standalone \
                --non-interactive \
                --agree-tos \
                --email "$email" \
                --domains "$domain" \
                --preferred-challenges http; then
                
                log_success "证书申请成功！"
                
                # 证书路径
                local cert_path="/etc/letsencrypt/live/${domain}/fullchain.pem"
                local key_path="/etc/letsencrypt/live/${domain}/privkey.pem"
                
                log_info "证书文件: ${cert_path}"
                log_info "私钥文件: ${key_path}"
                
                return 0
            else
                log_error "证书申请失败"
                echo ""
                echo -e "${YELLOW}可能的原因:${NC}"
                echo "  1. 域名未正确解析到本服务器"
                echo "  2. 端口 80 被占用或无法访问"
                echo "  3. 防火墙阻止了端口 80"
                echo "  4. Let's Encrypt 服务暂时不可用"
                echo ""
                echo -e "${YELLOW}建议操作:${NC}"
                echo "  1. 检查域名解析: dig ${domain}"
                echo "  2. 检查端口占用: sudo lsof -i :80"
                echo "  3. 检查防火墙规则"
                echo "  4. 查看 certbot 日志: sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log"
                echo ""
                return 1
            fi
            ;;
        
        2)
            # DNS 验证
            log_step "使用 DNS 验证方式申请证书..."
            echo ""
            
            log_info "DNS 验证需要手动添加 TXT 记录到您的 DNS 服务商"
            log_warning "此过程需要您在 certbot 提示时暂停并添加 DNS 记录"
            echo ""
            
            read -p "$(echo -e ${YELLOW}是否继续？${NC} [y/N]: )" confirm_dns
            if [[ ! "$confirm_dns" =~ ^[Yy]$ ]]; then
                log_info "证书申请已取消"
                return 1
            fi
            
            # 使用 manual 模式和 DNS 验证
            log_step "正在申请证书..."
            
            if sudo certbot certonly \
                --manual \
                --preferred-challenges dns \
                --agree-tos \
                --email "$email" \
                --domains "$domain"; then
                
                log_success "证书申请成功！"
                
                # 证书路径
                local cert_path="/etc/letsencrypt/live/${domain}/fullchain.pem"
                local key_path="/etc/letsencrypt/live/${domain}/privkey.pem"
                
                log_info "证书文件: ${cert_path}"
                log_info "私钥文件: ${key_path}"
                
                return 0
            else
                log_error "证书申请失败"
                return 1
            fi
            ;;
        
        3)
            # 手动配置
            log_info "已选择手动配置证书"
            log_warning "请稍后手动配置证书文件"
            return 1
            ;;
        
        *)
            log_error "无效的选择: ${validation_method}"
            return 1
            ;;
    esac
}

# SSL 配置主函数
# 返回: 0=成功, 1=失败
setup_ssl() {
    log_header "SSL 证书配置"
    
    # 加载配置文件（获取域名和邮箱）
    if [ ! -f "$ENV_FILE" ]; then
        log_error "配置文件不存在: ${ENV_FILE}"
        log_info "请先运行配置向导"
        return 1
    fi
    
    # 加载配置
    set -a
    source "$ENV_FILE"
    set +a
    
    # 验证必需参数
    if [ -z "$DOMAIN" ]; then
        log_error "配置文件中缺少 DOMAIN 参数"
        return 1
    fi
    
    if [ -z "$SSL_EMAIL" ]; then
        log_error "配置文件中缺少 SSL_EMAIL 参数"
        return 1
    fi
    
    log_info "域名: ${DOMAIN}"
    log_info "SSL 邮箱: ${SSL_EMAIL}"
    echo ""
    
    # 1. 检查本地证书
    log_step "检查本地证书..."
    echo ""
    
    local use_local_cert=false
    local local_cert_valid=false
    
    if check_local_cert "$DOMAIN"; then
        # 本地证书存在，验证有效性
        local cert_path="${DEPLOY_DIR}/${DOMAIN}/fullchain.pem"
        
        echo ""
        if validate_cert "$cert_path" "$DOMAIN"; then
            local_cert_valid=true
            log_success "本地证书有效"
        else
            log_warning "本地证书无效或已过期"
        fi
    else
        log_info "未找到本地证书"
    fi
    
    echo ""
    
    # 2. 提供选项
    if [ "$local_cert_valid" = true ]; then
        log_step "证书配置选项"
        echo ""
        echo "检测到有效的本地证书，请选择:"
        echo "  1. 使用本地证书（推荐）"
        echo "  2. 申请新的 Let's Encrypt 证书"
        echo "  3. 手动配置证书路径"
        echo ""
        
        read -p "$(echo -e ${CYAN}请选择 ${NC}[1-3, 默认: 1]: )" cert_option
        cert_option=${cert_option:-1}
    else
        log_step "证书配置选项"
        echo ""
        echo "请选择证书配置方式:"
        echo "  1. 申请新的 Let's Encrypt 证书（推荐）"
        echo "  2. 手动配置证书路径"
        echo ""
        
        read -p "$(echo -e ${CYAN}请选择 ${NC}[1-2, 默认: 1]: )" cert_option
        cert_option=${cert_option:-1}
        
        # 调整选项编号（因为没有本地证书选项）
        if [ "$cert_option" = "1" ]; then
            cert_option=2
        elif [ "$cert_option" = "2" ]; then
            cert_option=3
        fi
    fi
    
    echo ""
    
    # 3. 根据选择执行操作
    case "$cert_option" in
        1)
            # 使用本地证书
            log_step "配置本地证书..."
            
            local local_cert_path="${DEPLOY_DIR}/${DOMAIN}/fullchain.pem"
            local local_key_path="${DEPLOY_DIR}/${DOMAIN}/privkey.pem"
            
            # 更新环境变量
            export SSL_CERT_PATH="$local_cert_path"
            export SSL_KEY_PATH="$local_key_path"
            
            # 更新配置文件
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${local_cert_path}|" "$ENV_FILE"
                sed -i '' "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${local_key_path}|" "$ENV_FILE"
            else
                sed -i "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${local_cert_path}|" "$ENV_FILE"
                sed -i "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${local_key_path}|" "$ENV_FILE"
            fi
            
            log_success "已配置使用本地证书"
            log_info "证书路径: ${SSL_CERT_PATH}"
            log_info "私钥路径: ${SSL_KEY_PATH}"
            
            return 0
            ;;
        
        2)
            # 申请 Let's Encrypt 证书
            if request_letsencrypt_cert "$DOMAIN" "$SSL_EMAIL"; then
                # 申请成功，更新配置
                local le_cert_path="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
                local le_key_path="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
                
                export SSL_CERT_PATH="$le_cert_path"
                export SSL_KEY_PATH="$le_key_path"
                
                # 更新配置文件
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${le_cert_path}|" "$ENV_FILE"
                    sed -i '' "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${le_key_path}|" "$ENV_FILE"
                else
                    sed -i "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${le_cert_path}|" "$ENV_FILE"
                    sed -i "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${le_key_path}|" "$ENV_FILE"
                fi
                
                log_success "SSL 证书配置完成"
                log_info "证书路径: ${SSL_CERT_PATH}"
                log_info "私钥路径: ${SSL_KEY_PATH}"
                
                return 0
            else
                log_error "Let's Encrypt 证书申请失败"
                return 1
            fi
            ;;
        
        3)
            # 手动配置证书路径
            log_step "手动配置证书路径"
            echo ""
            
            read -p "$(echo -e ${CYAN}请输入证书文件路径 ${NC}[fullchain.pem]: )" manual_cert_path
            read -p "$(echo -e ${CYAN}请输入私钥文件路径 ${NC}[privkey.pem]: )" manual_key_path
            
            # 验证文件是否存在
            if [ ! -f "$manual_cert_path" ]; then
                log_error "证书文件不存在: ${manual_cert_path}"
                return 1
            fi
            
            if [ ! -f "$manual_key_path" ]; then
                log_error "私钥文件不存在: ${manual_key_path}"
                return 1
            fi
            
            # 验证证书
            if ! validate_cert "$manual_cert_path" "$DOMAIN"; then
                log_warning "证书验证失败，但仍可继续配置"
                read -p "$(echo -e ${YELLOW}是否继续？${NC} [y/N]: )" continue_manual
                if [[ ! "$continue_manual" =~ ^[Yy]$ ]]; then
                    log_info "配置已取消"
                    return 1
                fi
            fi
            
            # 更新配置
            export SSL_CERT_PATH="$manual_cert_path"
            export SSL_KEY_PATH="$manual_key_path"
            
            # 更新配置文件
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${manual_cert_path}|" "$ENV_FILE"
                sed -i '' "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${manual_key_path}|" "$ENV_FILE"
            else
                sed -i "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=${manual_cert_path}|" "$ENV_FILE"
                sed -i "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=${manual_key_path}|" "$ENV_FILE"
            fi
            
            log_success "SSL 证书配置完成"
            log_info "证书路径: ${SSL_CERT_PATH}"
            log_info "私钥路径: ${SSL_KEY_PATH}"
            
            return 0
            ;;
        
        *)
            log_error "无效的选择: ${cert_option}"
            return 1
            ;;
    esac
}

# ==============================================================================
# 服务编排模块
# ==============================================================================

# 生成 Docker Compose 配置文件
# 返回: 0=成功, 1=失败
generate_docker_compose() {
    log_header "生成 Docker Compose 配置"
    
    # 加载配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "配置文件不存在: ${ENV_FILE}"
        return 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    log_step "正在生成 docker-compose.production.yml..."
    
    # 生成 Docker Compose 配置
    cat > "$DOCKER_COMPOSE_FILE" << 'EOF'
version: '3.8'

services:
  # MySQL 数据库服务
  mysql:
    image: mysql:8.0
    container_name: unisearch-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - unisearch-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    command: --default-authentication-plugin=mysql_native_password

  # Redis 缓存服务
  redis:
    image: redis:7-alpine
    container_name: unisearch-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    environment:
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - redis_data:/data
    networks:
      - unisearch-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # 后端服务
  backend:
    image: ${FULL_IMAGE_NAME}
    container_name: unisearch-backend
    restart: unless-stopped
    env_file:
      - .env.production
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - unisearch-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 60s

  # 前端服务
  frontend:
    image: ${FULL_IMAGE_NAME}
    container_name: unisearch-frontend
    restart: unless-stopped
    env_file:
      - .env.production
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - unisearch-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 30s
    command: ["npm", "run", "start:prod"]

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: unisearch-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ${SSL_CERT_PATH}:/etc/nginx/ssl/fullchain.pem:ro
      - ${SSL_KEY_PATH}:/etc/nginx/ssl/privkey.pem:ro
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy
    networks:
      - unisearch-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 20s

networks:
  unisearch-network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
EOF
    
    log_success "Docker Compose 配置已生成"
    log_info "文件位置: ${DOCKER_COMPOSE_FILE}"
    
    return 0
}

# 生成 Nginx 配置文件
# 返回: 0=成功, 1=失败
generate_nginx_config() {
    log_header "生成 Nginx 配置"
    
    # 加载配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "配置文件不存在: ${ENV_FILE}"
        return 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    # 创建 nginx 配置目录
    mkdir -p "$NGINX_CONF_DIR"
    
    log_step "正在生成 nginx.conf..."
    
    # 生成 Nginx 配置
    cat > "${NGINX_CONF_DIR}/nginx.conf" << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # HTTP 到 HTTPS 重定向
    server {
        listen 80;
        server_name ${DOMAIN} ${WWW_DOMAIN};

        # Let's Encrypt 验证路径（如果需要）
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # 健康检查端点（不重定向）
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # 其他所有请求重定向到 HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # HTTPS 服务器
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN} ${WWW_DOMAIN};

        # SSL 证书配置
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL 协议和加密套件
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;

        # SSL 会话缓存
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # OCSP Stapling
        ssl_stapling on;
        ssl_stapling_verify on;

        # 安全响应头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # 后端 API 代理
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # 前端静态资源代理
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
    }
}
EOF
    
    log_success "Nginx 配置已生成"
    log_info "文件位置: ${NGINX_CONF_DIR}/nginx.conf"
    
    return 0
}

# 拉取 Docker 镜像
# 参数: $1=版本号(可选)
# 返回: 0=成功, 1=失败
pull_images() {
    local version=${1:-}
    
    log_header "拉取 Docker 镜像"
    
    # 加载配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "配置文件不存在: ${ENV_FILE}"
        return 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    # 如果指定了版本，覆盖配置文件中的版本
    if [ -n "$version" ]; then
        VERSION="$version"
        FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
    fi
    
    log_info "镜像: ${FULL_IMAGE_NAME}"
    echo ""
    
    log_step "正在拉取镜像（这可能需要几分钟）..."
    
    if docker pull "$FULL_IMAGE_NAME"; then
        log_success "镜像拉取成功"
        echo ""
        
        # 显示镜像信息
        log_info "镜像信息:"
        docker images "$FULL_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        return 0
    else
        log_error "镜像拉取失败"
        echo ""
        echo -e "${YELLOW}可能的原因:${NC}"
        echo "  1. 镜像不存在或版本号错误"
        echo "  2. 网络连接问题"
        echo "  3. Docker Hub 服务暂时不可用"
        echo "  4. 需要登录 Docker Hub (docker login)"
        echo ""
        return 1
    fi
}

# 启动所有服务
# 返回: 0=成功, 1=失败
start_services() {
    log_header "启动服务"
    
    # 检查 Docker Compose 配置文件是否存在
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose 配置文件不存在: ${DOCKER_COMPOSE_FILE}"
        log_info "请先运行部署流程生成配置文件"
        return 1
    fi
    
    log_step "正在启动所有服务..."
    echo ""
    
    # 使用 docker compose up -d 启动服务
    if docker compose -f "$DOCKER_COMPOSE_FILE" up -d; then
        log_success "服务启动命令已执行"
        echo ""
        
        log_info "服务正在初始化，请稍候..."
        sleep 5
        
        return 0
    else
        log_error "服务启动失败"
        return 1
    fi
}

# 停止所有服务
# 返回: 0=成功, 1=失败
stop_services() {
    log_header "停止服务"
    
    # 检查 Docker Compose 配置文件是否存在
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose 配置文件不存在: ${DOCKER_COMPOSE_FILE}"
        return 1
    fi
    
    log_step "正在停止所有服务..."
    echo ""
    
    # 使用 docker compose down 停止服务（保留数据卷）
    if docker compose -f "$DOCKER_COMPOSE_FILE" down; then
        log_success "所有服务已停止"
        log_info "数据卷已保留"
        return 0
    else
        log_error "服务停止失败"
        return 1
    fi
}

# 重启所有服务
# 返回: 0=成功, 1=失败
restart_services() {
    log_header "重启服务"
    
    log_step "正在重启所有服务..."
    echo ""
    
    # 先停止
    if stop_services; then
        echo ""
        sleep 2
        # 再启动
        if start_services; then
            log_success "服务重启完成"
            return 0
        fi
    fi
    
    log_error "服务重启失败"
    return 1
}

# ==============================================================================
# 健康检查模块
# ==============================================================================

# 等待服务就绪
# 参数: $1=服务名, $2=超时时间(秒)
# 返回: 0=就绪, 1=超时
wait_for_service() {
    local service_name=$1
    local timeout=${2:-120}
    
    if [ -z "$service_name" ]; then
        log_error "wait_for_service: 服务名参数缺失"
        return 1
    fi
    
    log_step "等待 ${service_name} 服务就绪（超时: ${timeout}秒）..."
    
    local elapsed=0
    local interval=5
    
    while [ $elapsed -lt $timeout ]; do
        # 检查容器是否在运行
        if docker compose -f "$DOCKER_COMPOSE_FILE" ps "$service_name" 2>/dev/null | grep -q "Up"; then
            # 检查健康状态
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "unisearch-${service_name}" 2>/dev/null)
            
            if [ "$health_status" = "healthy" ]; then
                log_success "${service_name} 服务已就绪"
                return 0
            fi
        fi
        
        # 显示进度
        echo -n "."
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    echo ""
    log_warning "${service_name} 服务等待超时"
    return 1
}

# 检查 MySQL 健康状态
# 返回: 0=健康, 1=异常
check_mysql_health() {
    log_step "检查 MySQL 数据库..."
    
    # 检查容器是否运行
    if ! docker ps --filter "name=unisearch-mysql" --filter "status=running" | grep -q "unisearch-mysql"; then
        log_error "MySQL 容器未运行"
        return 1
    fi
    
    # 检查健康状态
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' unisearch-mysql 2>/dev/null)
    
    if [ "$health_status" = "healthy" ]; then
        log_success "✓ MySQL 数据库正常"
        return 0
    else
        log_error "✗ MySQL 数据库异常 (状态: ${health_status})"
        return 1
    fi
}

# 检查 Redis 健康状态
# 返回: 0=健康, 1=异常
check_redis_health() {
    log_step "检查 Redis 缓存..."
    
    # 检查容器是否运行
    if ! docker ps --filter "name=unisearch-redis" --filter "status=running" | grep -q "unisearch-redis"; then
        log_error "Redis 容器未运行"
        return 1
    fi
    
    # 检查健康状态
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' unisearch-redis 2>/dev/null)
    
    if [ "$health_status" = "healthy" ]; then
        log_success "✓ Redis 缓存正常"
        return 0
    else
        log_error "✗ Redis 缓存异常 (状态: ${health_status})"
        return 1
    fi
}

# 检查后端健康状态
# 返回: 0=健康, 1=异常
check_backend_health() {
    log_step "检查后端服务..."
    
    # 检查容器是否运行
    if ! docker ps --filter "name=unisearch-backend" --filter "status=running" | grep -q "unisearch-backend"; then
        log_error "后端容器未运行"
        return 1
    fi
    
    # 检查健康状态
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' unisearch-backend 2>/dev/null)
    
    if [ "$health_status" = "healthy" ]; then
        log_success "✓ 后端服务正常"
        return 0
    else
        log_error "✗ 后端服务异常 (状态: ${health_status})"
        return 1
    fi
}

# 检查前端健康状态
# 返回: 0=健康, 1=异常
check_frontend_health() {
    log_step "检查前端服务..."
    
    # 检查容器是否运行
    if ! docker ps --filter "name=unisearch-frontend" --filter "status=running" | grep -q "unisearch-frontend"; then
        log_error "前端容器未运行"
        return 1
    fi
    
    # 检查健康状态
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' unisearch-frontend 2>/dev/null)
    
    if [ "$health_status" = "healthy" ]; then
        log_success "✓ 前端服务正常"
        return 0
    else
        log_error "✗ 前端服务异常 (状态: ${health_status})"
        return 1
    fi
}

# 检查 Nginx 健康状态
# 返回: 0=健康, 1=异常
check_nginx_health() {
    log_step "检查 Nginx 代理..."
    
    # 检查容器是否运行
    if ! docker ps --filter "name=unisearch-nginx" --filter "status=running" | grep -q "unisearch-nginx"; then
        log_error "Nginx 容器未运行"
        return 1
    fi
    
    # 检查健康状态
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' unisearch-nginx 2>/dev/null)
    
    if [ "$health_status" = "healthy" ]; then
        log_success "✓ Nginx 代理正常"
        return 0
    else
        log_error "✗ Nginx 代理异常 (状态: ${health_status})"
        return 1
    fi
}

# 执行所有健康检查
# 返回: 0=全部健康, 1=存在异常
check_all_services() {
    log_header "服务健康检查"
    
    local all_healthy=true
    
    # 检查所有服务
    check_mysql_health || all_healthy=false
    check_redis_health || all_healthy=false
    check_backend_health || all_healthy=false
    check_frontend_health || all_healthy=false
    check_nginx_health || all_healthy=false
    
    echo ""
    
    if [ "$all_healthy" = true ]; then
        log_success "所有服务健康检查通过！"
        return 0
    else
        log_error "部分服务健康检查失败"
        echo ""
        echo -e "${YELLOW}诊断建议:${NC}"
        echo "  1. 查看服务日志: $0 logs"
        echo "  2. 查看服务状态: $0 status"
        echo "  3. 重启异常服务: $0 restart"
        echo ""
        return 1
    fi
}

# ==============================================================================
# 日志管理模块
# ==============================================================================

# 查看服务日志
# 参数: $1=服务名(可选)
view_logs() {
    local service_name=${1:-}
    
    log_header "查看服务日志"
    
    # 检查 Docker Compose 配置文件是否存在
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose 配置文件不存在: ${DOCKER_COMPOSE_FILE}"
        return 1
    fi
    
    if [ -n "$service_name" ]; then
        # 查看指定服务的日志
        log_info "服务: ${service_name}"
        echo ""
        docker compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f "$service_name"
    else
        # 交互式选择服务
        echo "可用的服务:"
        echo "  1. mysql    - MySQL 数据库"
        echo "  2. redis    - Redis 缓存"
        echo "  3. backend  - 后端服务"
        echo "  4. frontend - 前端服务"
        echo "  5. nginx    - Nginx 代理"
        echo "  6. all      - 所有服务"
        echo ""
        
        read -p "$(echo -e ${CYAN}请选择服务 ${NC}[1-6]: )" service_choice
        
        case "$service_choice" in
            1) service_name="mysql" ;;
            2) service_name="redis" ;;
            3) service_name="backend" ;;
            4) service_name="frontend" ;;
            5) service_name="nginx" ;;
            6) service_name="" ;;
            *)
                log_error "无效的选择"
                return 1
                ;;
        esac
        
        echo ""
        if [ -n "$service_name" ]; then
            log_info "查看 ${service_name} 服务日志（按 Ctrl+C 退出）"
            echo ""
            docker compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f "$service_name"
        else
            log_info "查看所有服务日志（按 Ctrl+C 退出）"
            echo ""
            docker compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50 -f
        fi
    fi
}

# 查看服务状态
show_status() {
    log_header "服务运行状态"
    
    # 检查 Docker Compose 配置文件是否存在
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose 配置文件不存在: ${DOCKER_COMPOSE_FILE}"
        return 1
    fi
    
    log_step "正在获取服务状态..."
    echo ""
    
    # 显示服务状态
    docker compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log_info "提示: 使用 '$0 logs' 查看详细日志"
}

# 显示访问地址
show_access_info() {
    log_header "服务访问信息"
    
    # 加载配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "配置文件不存在，无法显示访问地址"
        return 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    echo -e "${GREEN}✓ 部署成功！${NC}"
    echo ""
    echo -e "${CYAN}访问地址:${NC}"
    echo "  前端: https://${DOMAIN}"
    echo "  API:  https://${DOMAIN}/api"
    echo ""
    echo -e "${CYAN}管理命令:${NC}"
    echo "  查看状态: $0 status"
    echo "  查看日志: $0 logs"
    echo "  重启服务: $0 restart"
    echo "  停止服务: $0 stop"
    echo ""
}

# ==============================================================================
# 主入口
# ==============================================================================

main() {
    # 显示欢迎信息
    show_welcome
    
    # 解析命令行参数
    local command="${1:-help}"
    
    case "$command" in
        deploy)
            # 完整部署流程
            log_info "开始执行生产环境部署流程..."
            echo ""
            
            # 1. 环境检查
            if ! check_docker; then
                log_error "环境检查失败，部署终止"
                exit 1
            fi
            
            # 2. 检查磁盘空间
            if ! check_disk_space 10; then
                read -p "$(echo -e ${YELLOW}磁盘空间不足，是否继续？${NC} [y/N]: )" continue_deploy
                if [[ ! "$continue_deploy" =~ ^[Yy]$ ]]; then
                    log_info "部署已取消"
                    exit 0
                fi
            fi
            
            # 3. 配置管理
            if [ -f "$ENV_FILE" ]; then
                log_info "检测到现有配置文件"
                read -p "$(echo -e ${CYAN}是否使用现有配置？${NC} [Y/n]: )" use_existing
                use_existing=${use_existing:-Y}
                
                if [[ ! "$use_existing" =~ ^[Yy]$ ]]; then
                    if ! interactive_config; then
                        log_error "配置失败，部署终止"
                        exit 1
                    fi
                fi
            else
                if ! interactive_config; then
                    log_error "配置失败，部署终止"
                    exit 1
                fi
            fi
            
            # 4. 验证配置
            if ! validate_config; then
                log_error "配置验证失败，部署终止"
                exit 1
            fi
            
            # 5. SSL 证书配置
            if ! setup_ssl; then
                log_error "SSL 配置失败，部署终止"
                exit 1
            fi
            
            # 6. 生成 Docker Compose 配置
            if ! generate_docker_compose; then
                log_error "Docker Compose 配置生成失败，部署终止"
                exit 1
            fi
            
            # 7. 生成 Nginx 配置
            if ! generate_nginx_config; then
                log_error "Nginx 配置生成失败，部署终止"
                exit 1
            fi
            
            # 8. 拉取镜像
            if ! pull_images; then
                log_error "镜像拉取失败，部署终止"
                exit 1
            fi
            
            # 9. 启动服务
            if ! start_services; then
                log_error "服务启动失败，部署终止"
                exit 1
            fi
            
            # 10. 等待服务初始化
            log_header "等待服务初始化"
            log_info "这可能需要 1-2 分钟，请耐心等待..."
            echo ""
            sleep 10
            
            # 11. 健康检查
            if check_all_services; then
                echo ""
                show_access_info
            else
                log_warning "部分服务健康检查失败，请查看日志排查问题"
                echo ""
                log_info "查看日志: $0 logs"
            fi
            ;;
        
        start)
            # 启动服务
            if start_services; then
                log_info "等待服务初始化..."
                sleep 10
                check_all_services
            else
                exit 1
            fi
            ;;
        
        stop)
            # 停止服务
            stop_services
            ;;
        
        restart)
            # 重启服务
            if restart_services; then
                log_info "等待服务初始化..."
                sleep 10
                check_all_services
            else
                exit 1
            fi
            ;;
        
        status)
            # 查看服务状态
            show_status
            echo ""
            check_all_services
            ;;
        
        logs)
            # 查看日志
            view_logs "$2"
            ;;
        
        update)
            # 更新镜像并重启
            log_header "更新服务"
            
            # 询问版本号
            read -p "$(echo -e ${CYAN}请输入镜像版本 ${NC}[默认: latest]: )" update_version
            update_version=${update_version:-latest}
            
            # 拉取新镜像
            if pull_images "$update_version"; then
                echo ""
                log_step "更新配置文件中的版本号..."
                
                # 更新 .env.production 中的版本号
                if [ -f "$ENV_FILE" ]; then
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        sed -i '' "s|^VERSION=.*|VERSION=${update_version}|" "$ENV_FILE"
                    else
                        sed -i "s|^VERSION=.*|VERSION=${update_version}|" "$ENV_FILE"
                    fi
                    log_success "版本号已更新"
                fi
                
                echo ""
                # 重启服务
                if restart_services; then
                    log_info "等待服务初始化..."
                    sleep 10
                    check_all_services
                    log_success "服务更新完成！"
                else
                    log_error "服务重启失败"
                    exit 1
                fi
            else
                log_error "镜像拉取失败，更新终止"
                exit 1
            fi
            ;;
        
        clean)
            # 清理容器和数据卷
            log_header "清理服务"
            
            log_warning "此操作将删除所有容器和数据卷，数据将无法恢复！"
            echo ""
            read -p "$(echo -e ${RED}确认删除所有数据？请输入 'yes' 确认: ${NC})" confirm_clean
            
            if [ "$confirm_clean" = "yes" ]; then
                log_step "正在清理..."
                
                if [ -f "$DOCKER_COMPOSE_FILE" ]; then
                    # 停止并删除容器和数据卷
                    docker compose -f "$DOCKER_COMPOSE_FILE" down -v
                    log_success "清理完成"
                else
                    log_error "Docker Compose 配置文件不存在"
                    exit 1
                fi
            else
                log_info "清理已取消"
            fi
            ;;
        
        help|--help|-h)
            show_usage
            ;;
        
        *)
            log_error "未知命令: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# 只有在直接执行脚本时才运行 main 函数（不是被 source 时）
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
