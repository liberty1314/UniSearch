#!/bin/bash

# ============================================
# UniSearch 生产环境一键部署脚本
# ============================================
# 功能：
#   - 自动检查项目完整性
#   - 自动配置生产环境
#   - 自动拉取最新镜像
#   - 自动部署和更新服务
# 用法: ./deploy.sh [command]
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
# 路径配置
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"
BACKUP_DIR="${PROJECT_ROOT}/backups"

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

# ============================================
# 检查函数
# ============================================

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户运行此脚本"
        log_info "使用命令: sudo $0 $*"
        exit 1
    fi
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        log_info "请先运行: $0 init"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行"
        log_info "启动 Docker: systemctl start docker"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查项目完整性
check_project_integrity() {
    log_header "检查项目完整性"
    
    local missing_files=()
    local required_files=(
        "deploy/docker-compose.prod.yml"
        "deploy/env.prod"
        ".env.example"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
            missing_files+=("$file")
            log_error "缺少文件: $file"
        else
            log_success "文件存在: $file"
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "项目完整性检查失败，缺少 ${#missing_files[@]} 个文件"
        exit 1
    fi
    
    log_success "项目完整性检查通过"
}

# 检查并创建 .env.local
check_and_create_env_local() {
    log_header "检查环境配置"
    
    local env_local="${DEPLOY_DIR}/.env.local"
    local env_prod="${DEPLOY_DIR}/env.prod"
    
    if [ -f "$env_local" ]; then
        log_success ".env.local 已存在"
        
        # 检查关键配置
        if ! grep -q "^ADMIN_PASSWORD_HASH=.\+" "$env_local"; then
            log_warning "管理员密码未配置"
            return 1
        fi
        
        if ! grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=.\+" "$env_local"; then
            log_warning "刷新令牌加密密钥未配置"
            return 1
        fi
        
        log_success "环境配置检查通过"
        return 0
    else
        log_warning ".env.local 不存在，需要创建"
        
        # 从 env.prod 创建
        if [ ! -f "$env_prod" ]; then
            log_error "env.prod 文件不存在"
            exit 1
        fi
        
        log_step "从 env.prod 创建 .env.local..."
        cp "$env_prod" "$env_local"
        chmod 600 "$env_local"
        log_success ".env.local 创建成功"
        
        return 1
    fi
}

# 配置管理员密码
configure_admin_password() {
    log_header "配置管理员密码"
    
    local env_local="${DEPLOY_DIR}/.env.local"
    
    # 检查是否已配置
    if grep -q "^ADMIN_PASSWORD_HASH=.\+" "$env_local" 2>/dev/null; then
        log_success "管理员密码已配置"
        return 0
    fi
    
    echo ""
    log_warning "首次部署需要配置管理员密码"
    echo ""
    
    # 提示用户输入密码
    read -p "请输入管理员密码（至少6个字符）: " -s admin_password
    echo ""
    
    if [ -z "$admin_password" ]; then
        log_error "密码不能为空"
        exit 1
    fi
    
    if [ ${#admin_password} -lt 6 ]; then
        log_error "密码长度至少为 6 个字符"
        exit 1
    fi
    
    # 生成密码哈希
    log_step "正在生成密码哈希..."
    
    local temp_dir="/tmp/gen_hash_$$"
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    # 配置 Go 代理
    export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
    export GOSUMDB=sum.golang.google.cn
    
    # 创建临时 Go 程序
    cat > go.mod << 'EOF'
module gen_hash
go 1.22
EOF
    
    cat > main.go << 'EOF'
package main
import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)
func main() {
	if len(os.Args) < 2 {
		os.Exit(1)
	}
	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		os.Exit(1)
	}
	fmt.Println(string(hash))
}
EOF
    
    # 生成哈希
    go mod tidy > /dev/null 2>&1
    local hash=$(go run main.go "$admin_password" 2>&1 | tail -1)
    local exit_code=$?
    
    # 清理临时文件
    cd /tmp
    rm -rf "$temp_dir"
    
    # 检查结果
    if [ $exit_code -ne 0 ] || [ -z "$hash" ] || [[ ! "$hash" =~ ^\$2[ab]\$ ]]; then
        log_error "密码哈希生成失败"
        log_info "请手动运行: ./scripts/gen_admin_password.sh '你的密码'"
        exit 1
    fi
    
    # 写入配置文件
    if grep -q "^ADMIN_PASSWORD_HASH=" "$env_local"; then
        sed -i "s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH='${hash}'|" "$env_local"
    else
        echo "ADMIN_PASSWORD_HASH='${hash}'" >> "$env_local"
    fi
    
    log_success "管理员密码配置完成"
}

# 配置刷新令牌加密密钥
configure_refresh_token_key() {
    log_header "配置刷新令牌加密密钥"
    
    local env_local="${DEPLOY_DIR}/.env.local"
    
    # 检查是否已配置
    if grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=.\+" "$env_local" 2>/dev/null; then
        log_success "刷新令牌加密密钥已配置"
        return 0
    fi
    
    # 检查 openssl
    if ! command -v openssl &> /dev/null; then
        log_warning "openssl 未安装，跳过刷新令牌加密密钥配置"
        log_info "记住密码功能将不可用"
        return 0
    fi
    
    log_step "正在生成刷新令牌加密密钥（32字节）..."
    
    local refresh_key=$(openssl rand -base64 32)
    
    if [ -z "$refresh_key" ]; then
        log_warning "加密密钥生成失败"
        return 0
    fi
    
    # 写入配置文件
    if grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=" "$env_local"; then
        sed -i "s|^REFRESH_TOKEN_ENCRYPT_KEY=.*|REFRESH_TOKEN_ENCRYPT_KEY='${refresh_key}'|" "$env_local"
    else
        echo "REFRESH_TOKEN_ENCRYPT_KEY='${refresh_key}'" >> "$env_local"
    fi
    
    log_success "刷新令牌加密密钥配置完成"
    echo ""
    log_warning "⚠️  重要提示："
    log_info "  1. 此密钥用于加密用户的'记住密码'令牌"
    log_info "  2. 请妥善保管 .env.local 文件（权限已设置为 600）"
    log_info "  3. 如果密钥丢失或更改，所有用户需要重新登录"
}

# 自动配置环境
auto_configure() {
    log_header "自动配置生产环境"
    
    # 检查并创建 .env.local
    if ! check_and_create_env_local; then
        # 需要配置
        configure_admin_password
        configure_refresh_token_key
    fi
    
    log_success "环境配置完成"
}

# ============================================
# Docker 镜像管理
# ============================================

# 拉取最新镜像
pull_latest_image() {
    log_header "拉取最新 Docker 镜像"
    
    # 从 .env.local 读取镜像配置
    local env_local="${DEPLOY_DIR}/.env.local"
    if [ -f "$env_local" ]; then
        source "$env_local"
    fi
    
    local image="${DOCKER_USERNAME:-liberty159}/${IMAGE_NAME:-unisearch}:latest"
    
    log_step "拉取镜像: $image"
    
    if docker pull "$image"; then
        log_success "镜像拉取成功"
        return 0
    else
        log_error "镜像拉取失败"
        return 1
    fi
}

# 检查镜像更新
check_image_update() {
    log_header "检查镜像更新"
    
    local env_local="${DEPLOY_DIR}/.env.local"
    if [ -f "$env_local" ]; then
        source "$env_local"
    fi
    
    local image="${DOCKER_USERNAME:-liberty159}/${IMAGE_NAME:-unisearch}:latest"
    
    log_step "检查镜像: $image"
    
    # 获取本地镜像 digest
    local local_digest=$(docker images --digests --format "{{.Digest}}" "$image" 2>/dev/null | head -1)
    
    if [ -z "$local_digest" ]; then
        log_info "本地无此镜像，需要拉取"
        return 0
    fi
    
    # 获取远程镜像 digest
    local remote_digest=$(docker manifest inspect "$image" 2>/dev/null | grep -o '"digest": "[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$local_digest" != "$remote_digest" ]; then
        log_info "发现新版本镜像"
        return 0
    else
        log_success "已是最新版本"
        return 1
    fi
}

# ============================================
# 服务管理
# ============================================

# 启动服务
start_service() {
    log_header "启动服务"
    
    cd "$DEPLOY_DIR"
    
    # 检查配置文件
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml 不存在"
        exit 1
    fi
    
    if [ ! -f ".env.local" ]; then
        log_error ".env.local 不存在"
        exit 1
    fi
    
    # 创建必要的数据目录
    log_step "创建数据目录..."
    mkdir -p /data/mysql /data/backend/cache /data/backend/data
    
    # 启动服务
    log_step "启动 Docker Compose 服务..."
    docker compose -f docker-compose.prod.yml --env-file .env.local up -d
    
    # 等待服务启动
    log_step "等待服务启动..."
    sleep 5
    
    # 检查服务状态
    if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_success "服务启动成功"
        echo ""
        show_service_info
    else
        log_error "服务启动失败"
        log_info "查看日志: docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml logs"
        exit 1
    fi
}

# 停止服务
stop_service() {
    log_header "停止服务"
    
    cd "$DEPLOY_DIR"
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml 不存在"
        exit 1
    fi
    
    log_step "停止服务..."
    docker compose -f docker-compose.prod.yml down
    
    log_success "服务已停止"
}

# 重启服务
restart_service() {
    log_header "重启服务"
    
    stop_service
    sleep 2
    start_service
}

# 更新服务
update_service() {
    log_header "更新服务到最新版本"
    
    # 检查镜像更新
    if check_image_update; then
        log_step "开始更新..."
        
        # 创建备份
        create_auto_backup
        
        # 拉取最新镜像
        if ! pull_latest_image; then
            log_error "更新失败：无法拉取新镜像"
            exit 1
        fi
        
        # 重启服务
        restart_service
        
        # 清理旧镜像
        log_step "清理旧镜像..."
        docker image prune -f
        
        log_success "更新完成"
    else
        log_info "当前已是最新版本，无需更新"
    fi
}

# 显示服务信息
show_service_info() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  服务信息${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 读取配置
    local env_local="${DEPLOY_DIR}/.env.local"
    if [ -f "$env_local" ]; then
        source "$env_local"
    fi
    
    echo ""
    echo -e "  ${CYAN}域名:${NC}         ${DOMAIN:-未配置}"
    echo -e "  ${CYAN}前端端口:${NC}     ${FRONTEND_PORT:-3000}"
    echo -e "  ${CYAN}后端端口:${NC}     ${BACKEND_PORT:-8888}"
    echo -e "  ${CYAN}数据库端口:${NC}   ${DB_PORT:-3306}"
    echo ""
    
    # 获取服务器 IP
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "未知")
    echo -e "  ${CYAN}访问地址:${NC}"
    echo -e "    前端: ${GREEN}http://${server_ip}:${FRONTEND_PORT:-3000}${NC}"
    echo -e "    后端: ${GREEN}http://${server_ip}:${BACKEND_PORT:-8888}${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 查看服务状态
show_status() {
    log_header "服务状态"
    
    cd "$DEPLOY_DIR"
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml 不存在"
        exit 1
    fi
    
    echo ""
    echo "📦 容器状态:"
    docker compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "💾 磁盘使用:"
    df -h / | tail -1
    
    echo ""
    echo "🧠 内存使用:"
    free -h | grep Mem
    
    echo ""
}

# 查看日志
show_logs() {
    cd "$DEPLOY_DIR"
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml 不存在"
        exit 1
    fi
    
    local service="${1:-}"
    
    if [ -z "$service" ]; then
        log_info "查看所有服务日志 (Ctrl+C 退出):"
        docker compose -f docker-compose.prod.yml logs -f --tail 100
    else
        log_info "查看 $service 服务日志 (Ctrl+C 退出):"
        docker compose -f docker-compose.prod.yml logs -f --tail 100 "$service"
    fi
}

# ============================================
# 备份管理
# ============================================

# 创建自动备份
create_auto_backup() {
    log_step "创建自动备份..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$BACKUP_DIR"
    
    # 备份配置文件
    tar czf "${BACKUP_DIR}/auto_backup_${timestamp}.tar.gz" \
        -C "$PROJECT_ROOT" deploy 2>/dev/null || true
    
    log_success "备份创建成功: auto_backup_${timestamp}.tar.gz"
}

# 创建完整备份
create_full_backup() {
    log_header "创建完整备份"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="full_backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "$backup_path"
    
    # 备份配置文件
    log_step "备份配置文件..."
    cp -r "$DEPLOY_DIR" "${backup_path}/"
    
    # 备份数据库
    log_step "备份数据库..."
    cd "$DEPLOY_DIR"
    if docker compose -f docker-compose.prod.yml ps | grep -q "mysql.*Up"; then
        source .env.local
        docker compose -f docker-compose.prod.yml exec -T mysql \
            mysqldump -u"${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" \
            > "${backup_path}/database.sql" 2>/dev/null || true
    fi
    
    # 压缩备份
    log_step "压缩备份文件..."
    cd "$BACKUP_DIR"
    tar czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    log_success "备份完成: ${BACKUP_DIR}/${backup_name}.tar.gz"
    log_info "备份大小: $(du -h "${BACKUP_DIR}/${backup_name}.tar.gz" | cut -f1)"
}

# ============================================
# 服务器初始化
# ============================================

# 初始化服务器
init_server() {
    log_header "初始化服务器环境"
    
    check_root
    
    # 更新系统
    log_step "更新系统包..."
    apt update && apt upgrade -y
    apt install -y curl wget git unzip software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release
    
    # 安装 Docker
    if ! command -v docker &> /dev/null; then
        log_step "安装 Docker..."
        
        # 添加 Docker GPG 密钥
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
            -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc
        
        # 添加 Docker 仓库
        echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # 安装 Docker
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io \
            docker-buildx-plugin docker-compose-plugin
        
        # 启动 Docker
        systemctl start docker
        systemctl enable docker
        
        log_success "Docker 安装完成"
    else
        log_success "Docker 已安装"
    fi
    
    # 配置防火墙
    log_step "配置防火墙..."
    if ! command -v ufw &> /dev/null; then
        apt install -y ufw
    fi
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 3000/tcp comment 'Frontend'
    ufw allow 8888/tcp comment 'Backend'
    ufw --force enable
    
    log_success "防火墙配置完成"
    
    log_success "服务器初始化完成"
    echo ""
    log_info "下一步: 运行 '$0 deploy' 部署应用"
}

# ============================================
# 一键部署
# ============================================

# 一键部署
deploy() {
    log_header "UniSearch 一键部署"
    
    check_root
    check_docker
    check_project_integrity
    auto_configure
    pull_latest_image
    start_service
    
    echo ""
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "  部署完成！"
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ============================================
# 帮助信息
# ============================================

show_help() {
    cat << EOF

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${CYAN}  UniSearch 生产环境部署脚本${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${GREEN}用法:${NC}
  $0 <command> [options]

${GREEN}核心命令:${NC}
  ${YELLOW}deploy${NC}      一键部署（检查+配置+拉取+启动）
  ${YELLOW}update${NC}      更新到最新版本
  ${YELLOW}start${NC}       启动服务
  ${YELLOW}stop${NC}        停止服务
  ${YELLOW}restart${NC}     重启服务
  ${YELLOW}status${NC}      查看服务状态
  ${YELLOW}logs${NC}        查看服务日志

${GREEN}管理命令:${NC}
  ${YELLOW}init${NC}        初始化服务器环境（首次部署）
  ${YELLOW}check${NC}       检查项目完整性
  ${YELLOW}config${NC}      配置生产环境
  ${YELLOW}pull${NC}        拉取最新镜像
  ${YELLOW}backup${NC}      创建完整备份

${GREEN}示例:${NC}
  ${CYAN}# 首次部署${NC}
  sudo $0 init      # 初始化服务器
  sudo $0 deploy    # 一键部署

  ${CYAN}# 日常运维${NC}
  sudo $0 update    # 更新到最新版本
  sudo $0 status    # 查看服务状态
  sudo $0 logs      # 查看日志
  sudo $0 backup    # 创建备份

${GREEN}日志查看:${NC}
  sudo $0 logs              # 查看所有服务日志
  sudo $0 logs backend      # 查看后端日志
  sudo $0 logs frontend     # 查看前端日志
  sudo $0 logs mysql        # 查看数据库日志

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF
}

# ============================================
# 主函数
# ============================================

main() {
    local command="${1:-help}"
    
    case "$command" in
        deploy)
            deploy
            ;;
        init)
            init_server
            ;;
        check)
            check_project_integrity
            ;;
        config)
            auto_configure
            ;;
        pull)
            pull_latest_image
            ;;
        start)
            check_root
            check_docker
            start_service
            ;;
        stop)
            check_root
            check_docker
            stop_service
            ;;
        restart)
            check_root
            check_docker
            restart_service
            ;;
        update)
            check_root
            check_docker
            update_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        backup)
            check_root
            create_full_backup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
