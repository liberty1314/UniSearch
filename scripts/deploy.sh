#!/bin/bash

# UniSearch 云服务器部署和管理脚本
# 整合了服务器初始化、应用部署、服务管理、日志监控和数据备份功能
# 用法: ./deploy.sh [command]

set -e

# 配置 Go 环境（处理 sudo 环境变量丢失问题）
if ! command -v go &> /dev/null; then
    # 尝试常见的 Go 安装路径
    if [ -f "/usr/local/go/bin/go" ]; then
        export PATH="/usr/local/go/bin:$PATH"
        export GOPATH="$HOME/go"
        export PATH="$PATH:$GOPATH/bin"
    elif [ -f "$HOME/.local/bin/go" ]; then
        export PATH="$HOME/.local/bin:$PATH"
    fi
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录（脚本所在目录的父目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

# 配置变量
DOMAIN="unisearchso.xyz"
DOCKER_USERNAME="liberty159"
IMAGE_NAME="unisearch"
VERSION="1.0.0"
USE_LATEST="${USE_LATEST:-true}"  # 默认使用 latest 标签
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${USE_LATEST:+latest}"
FULL_IMAGE_NAME="${FULL_IMAGE_NAME:-${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}}"
CONTAINER_NAME="unisearch"
NGINX_CONFIG="/etc/nginx/sites-available/unisearch"
NGINX_ENABLED="/etc/nginx/sites-enabled/unisearch"

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

# 显示帮助信息
show_help() {
    cat << EOF
UniSearch 云服务器部署和管理脚本

用法: $0 <command> [options]

命令:
  init      初始化服务器环境（Docker、Nginx、UFW等）
  start     启动应用服务
  stop      停止应用服务
  restart   重启应用服务
  update    更新到最新版本（仅拉取 latest 镜像）
  sync      同步配置文件（从 Git 仓库）
  setup-auto-sync  设置定时自动同步配置（每小时）
  status    查看服务状态
  logs      查看应用日志
  cleanup   清理7天前的日志
  setup-log-rotation  设置定时日志清理
  backup    备份数据和配置
  restore   从备份恢复
  help      显示此帮助信息

环境变量:
  USE_LATEST=true|false   是否使用 latest 标签（默认: true）
  VERSION=x.x.x           指定版本号（当 USE_LATEST=false 时）

示例:
  $0 init                    # 首次部署时初始化服务器
  $0 start                   # 启动服务（使用 latest）
  USE_LATEST=false VERSION=1.0.1 $0 start  # 启动指定版本
  $0 update                  # 更新到最新版本（仅镜像）
  $0 sync                    # 同步配置文件
  $0 setup-auto-sync         # 设置定时自动同步
  $0 status                  # 查看服务状态
  $0 logs                    # 查看实时日志
  $0 backup                  # 备份数据

其他脚本:
  ./scripts/monitor.sh    # 监控服务管理
  ./scripts/ssl.sh        # SSL证书管理

配置文件位置:
  ${DEPLOY_DIR}/docker-compose.prod.yml
  ${DEPLOY_DIR}/env.prod
  ${DEPLOY_DIR}/nginx/http.conf

EOF
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        log_info "使用命令: sudo $0 $1"
        exit 1
    fi
}

# ===== 服务器初始化相关函数 =====

# 更新系统包
update_system() {
    log_info "更新系统包..."
    apt update && apt upgrade -y
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    log_success "系统包更新完成"
}

# 安装Docker
install_docker() {
    log_info "安装Docker..."
    
    if command -v docker &> /dev/null; then
        log_warning "Docker已安装，跳过"
        docker --version
        return 0
    fi
    
    # 更新软件包索引
    log_info "更新软件包索引..."
    sudo apt update

    # 更新软件包
    log_info "更新软件包..."
    sudo apt upgrade -y

    # 安装ca-certificates和curl
    sudo apt-get install ca-certificates curl

    # 创建密钥目录
    sudo install -m 0755 -d /etc/apt/keyrings
    
    # 添加Docker官方GPG密钥（使用清华镜像源）
    log_info "添加Docker GPG密钥..."
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    
    # 添加Docker仓库（使用清华镜像源）
    log_info "添加Docker软件源..."
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新软件包索引
    log_info "更新软件包索引..."
    sudo apt update
    
    # 安装Docker和相关插件
    log_info "安装Docker CE及相关插件..."
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动并启用Docker服务
    systemctl start docker
    systemctl enable docker
    
    # 配置Docker镜像加速器
    log_info "配置Docker镜像加速器..."
    tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "100GB",
      "enabled": true
    }
  },
  "data-root": "/home/redhat/MyDocker",
  "experimental": false,
  "registry-mirrors": [
    "https://dockerproxy.net",
    "https://docker.hpcloud.cloud",
    "https://docker.m.daocloud.io",
    "https://docker.unsee.tech",
    "https://docker.1panel.live",
    "http://mirrors.ustc.edu.cn",
    "https://docker.chenby.cn",
    "http://mirror.azure.cn",
    "https://dockerpull.org",
    "https://dockerhub.icu"
  ]
}
EOF
    
    # 重启Docker服务以应用配置
    log_info "重启Docker服务以应用镜像加速器配置..."
    systemctl daemon-reload
    systemctl restart docker
    
    # 验证安装
    log_success "Docker安装完成并已配置镜像加速器"
    docker --version
    docker compose version
}

# 安装Nginx
install_nginx() {
    log_info "安装Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_warning "Nginx已安装，跳过"
        return 0
    fi
    
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx安装完成"
}

# 配置UFW防火墙
configure_firewall() {
    log_info "配置UFW防火墙..."
    
    if ! command -v ufw &> /dev/null; then
        apt install -y ufw
    fi
    
    # 配置防火墙规则
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 8080/tcp comment 'HTTP-Alt'
    ufw allow 3001/tcp comment 'Monitoring'
    ufw --force enable
    
    log_success "UFW防火墙配置完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx反向代理..."
    
    # 检查配置文件是否存在
    if [ ! -f "${DEPLOY_DIR}/nginx/http.conf" ]; then
        log_error "Nginx配置文件不存在: ${DEPLOY_DIR}/nginx/http.conf"
        exit 1
    fi
    
    # 复制配置文件
    cp "${DEPLOY_DIR}/nginx/http.conf" "$NGINX_CONFIG"
    
    # 创建软链接
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # 删除默认配置
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重载Nginx
    systemctl reload nginx
    
    log_success "Nginx配置完成"
}

# 服务器初始化
init_server() {
    log_info "=== 开始服务器初始化 ==="
    echo
    
    check_root "init"
    update_system
    install_docker
    install_nginx
    configure_firewall
    configure_nginx
    
    echo
    log_success "=== 服务器初始化完成 ==="
    log_info "下一步: 运行 '$0 start' 启动应用"
}

# ===== 应用部署相关函数 =====

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先运行: $0 init"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker未运行"
        exit 1
    fi
}

# 拉取最新镜像
pull_image() {
    local image_tag="${1:-$FULL_IMAGE_NAME}"
    log_info "拉取Docker镜像: $image_tag"
    
    # 尝试拉取镜像
    if docker pull "$image_tag"; then
        log_success "镜像拉取完成"
        return 0
    else
        log_error "镜像拉取失败"
        return 1
    fi
}

# 检查镜像是否有更新
check_image_update() {
    local image_tag="${1:-$FULL_IMAGE_NAME}"
    
    log_info "检查镜像更新..."
    
    # 获取本地镜像的 digest
    local local_digest=$(docker images --digests --format "{{.Digest}}" "$image_tag" 2>/dev/null | head -1)
    
    # 获取远程镜像的 digest
    local remote_digest=$(docker manifest inspect "$image_tag" 2>/dev/null | grep -o '"digest": "[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$local_digest" ]; then
        log_info "本地无此镜像，需要拉取"
        return 0
    fi
    
    if [ "$local_digest" != "$remote_digest" ]; then
        log_info "发现新版本"
        return 0
    else
        log_info "已是最新版本"
        return 1
    fi
}

# 停止并删除旧容器
stop_old_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "停止旧容器..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        log_success "旧容器已清理"
    fi
}

# 创建必要的数据卷
create_volumes() {
    log_info "检查Docker数据卷..."
    
    # 创建缓存数据卷
    if ! docker volume ls | grep -q unisearch-cache; then
        docker volume create unisearch-cache
        log_info "已创建缓存数据卷"
    fi
    
    # 创建日志数据卷
    if ! docker volume ls | grep -q unisearch-logs; then
        docker volume create unisearch-logs
        log_info "已创建日志数据卷"
    fi
}

# 检查并配置 .env.local
check_and_configure_env() {
    local env_local="${DEPLOY_DIR}/.env.local"
    local env_prod="${DEPLOY_DIR}/env.prod"
    
    # 检查 .env.local 是否存在
    if [ ! -f "$env_local" ]; then
        log_warning ".env.local 文件不存在"
        
        # 检查 env.prod 是否存在
        if [ ! -f "$env_prod" ]; then
            log_error "env.prod 文件不存在: $env_prod"
            exit 1
        fi
        
        log_info "从 env.prod 创建 .env.local..."
        cp "$env_prod" "$env_local"
        chmod 600 "$env_local"
        log_success ".env.local 创建成功"
        
        # 直接提示配置密码（不再询问是否配置）
        echo ""
        log_warning "检测到首次部署，需要配置管理员密码和刷新令牌加密密钥"
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
        log_info "正在生成密码哈希..."
        
        # 临时禁用 set -e，手动处理错误
        set +e
        
        # 创建临时目录
        TEMP_DIR="/tmp/gen_hash_$$"
        log_info "创建临时目录: $TEMP_DIR"
        mkdir -p "$TEMP_DIR"
        if [ $? -ne 0 ]; then
            log_error "无法创建临时目录: $TEMP_DIR"
            set -e
            exit 1
        fi
        
        log_info "进入临时目录..."
        cd "$TEMP_DIR"
        if [ $? -ne 0 ]; then
            log_error "无法进入临时目录: $TEMP_DIR"
            set -e
            exit 1
        fi
        
        # 配置 Go 代理
        export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
        export GOSUMDB=sum.golang.google.cn
        
        # 创建 Go 模块
        log_info "创建 Go 模块文件..."
        cat > go.mod << 'EOF'
module gen_hash
go 1.22
EOF
        
        # 创建主程序
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
        
        # 下载依赖并生成哈希
        log_info "下载 Go 依赖包..."
        go mod tidy 2>&1 | grep -v "finding module" | grep -v "go: downloading" | grep -v "^$" || true
        
        log_info "执行密码哈希生成..."
        HASH=$(go run main.go "$admin_password" 2>&1 | tail -1)
        local hash_exit_code=$?
        
        # 清理
        cd /tmp 2>/dev/null || cd /
        rm -rf "$TEMP_DIR"
        
        # 恢复 set -e
        set -e
        
        # 检查执行结果
        if [ $hash_exit_code -ne 0 ]; then
            log_error "密码哈希生成命令执行失败（退出码: $hash_exit_code）"
            log_info "请手动运行: ./scripts/gen_admin_password.sh '你的密码'"
            exit 1
        fi
        
        # 验证哈希格式
        if [ -z "$HASH" ]; then
            log_error "密码哈希为空"
            log_info "请手动运行: ./scripts/gen_admin_password.sh '你的密码'"
            exit 1
        fi
        
        if [[ ! "$HASH" =~ ^\$2[ab]\$ ]]; then
            log_error "密码哈希格式无效: $HASH"
            log_info "请手动运行: ./scripts/gen_admin_password.sh '你的密码'"
            exit 1
        fi
        
        # 配置到 .env.local（使用 grep -v 删除旧行，避免 sed 转义问题）
        if grep -q "^ADMIN_PASSWORD_HASH=" "$env_local"; then
            grep -v "^ADMIN_PASSWORD_HASH=" "$env_local" > "${env_local}.tmp"
            mv "${env_local}.tmp" "$env_local"
        fi
        echo "ADMIN_PASSWORD_HASH='${HASH}'" >> "$env_local"
        
        log_success "管理员密码配置完成"
        echo ""
        
        # 配置刷新令牌加密密钥
        log_info "正在生成刷新令牌加密密钥（32字节）..."
        
        # 检查 openssl 是否可用
        if ! command -v openssl &> /dev/null; then
            log_warning "openssl 未安装，跳过刷新令牌加密密钥配置"
            log_info "记住密码功能将不可用"
            log_info "请稍后手动安装 openssl 并配置: openssl rand -base64 32"
        else
            # 生成 32 字节随机密钥
            local refresh_key=$(openssl rand -base64 32)
            
            if [ -z "$refresh_key" ]; then
                log_warning "加密密钥生成失败，跳过配置"
                log_info "请稍后手动配置: openssl rand -base64 32"
            else
                # 验证密钥长度
                local key_length=${#refresh_key}
                
                # 配置到 .env.local
                if grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=" "$env_local"; then
                    grep -v "^REFRESH_TOKEN_ENCRYPT_KEY=" "$env_local" > "${env_local}.tmp"
                    mv "${env_local}.tmp" "$env_local"
                fi
                echo "REFRESH_TOKEN_ENCRYPT_KEY='${refresh_key}'" >> "$env_local"
                
                log_success "刷新令牌加密密钥配置完成"
                log_info "密钥长度: $key_length 字符"
                echo ""
                log_warning "⚠️  重要提示："
                log_info "  1. 此密钥用于加密用户的'记住密码'令牌"
                log_info "  2. 请妥善保管 .env.local 文件（权限已设置为 600）"
                log_info "  3. 如果密钥丢失或更改，所有用户需要重新登录"
                log_info "  4. 建议每 3-6 个月轮换一次密钥"
                echo ""
            fi
        fi
    else
        # 检查密码是否已配置
        if ! grep -q "^ADMIN_PASSWORD_HASH=.\+" "$env_local"; then
            log_warning "检测到 .env.local 存在但未配置管理员密码"
            echo ""
            
            read -p "是否现在配置管理员密码? (y/N): " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                read -p "请输入管理员密码（至少6个字符）: " -s admin_password
                echo ""
                
                if [ -z "$admin_password" ] || [ ${#admin_password} -lt 6 ]; then
                    log_error "密码无效"
                    log_info "请手动运行: ./scripts/gen_admin_password.sh '你的密码'"
                    exit 1
                fi
                
                # 生成并配置密码
                log_info "正在生成密码哈希..."
                TEMP_DIR="/tmp/gen_hash_$$"
                mkdir -p "$TEMP_DIR"
                cd "$TEMP_DIR"
                export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
                export GOSUMDB=sum.golang.google.cn
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
                go mod tidy > /dev/null 2>&1
                HASH=$(go run main.go "$admin_password" 2>&1 | tail -1)
                cd /tmp
                rm -rf "$TEMP_DIR"
                
                if [[ ! "$HASH" =~ ^\$2[ab]\$ ]]; then
                    log_error "密码哈希生成失败"
                    exit 1
                fi
                
                # 配置到 .env.local（使用 grep -v 删除旧行）
                if grep -q "^ADMIN_PASSWORD_HASH=" "$env_local"; then
                    grep -v "^ADMIN_PASSWORD_HASH=" "$env_local" > "${env_local}.tmp"
                    mv "${env_local}.tmp" "$env_local"
                fi
                echo "ADMIN_PASSWORD_HASH='${HASH}'" >> "$env_local"
                
                log_success "管理员密码配置完成"
                echo ""
            else
                log_warning "已跳过密码配置"
                log_info "请稍后运行: ./scripts/gen_admin_password.sh '你的密码'"
                exit 1
            fi
        fi
    fi
    
    # 检查刷新令牌加密密钥是否已配置
    if ! grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=.\+" "$env_local"; then
        log_warning "检测到刷新令牌加密密钥未配置"
        echo ""
        
        read -p "是否现在配置刷新令牌加密密钥（记住密码功能）? (Y/n): " -n 1 -r
        echo ""
        
        # 默认为 Yes
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            log_info "正在生成刷新令牌加密密钥（32字节）..."
            
            # 检查 openssl 是否可用
            if ! command -v openssl &> /dev/null; then
                log_error "openssl 未安装，无法生成加密密钥"
                log_info "请手动安装: apt install openssl"
                log_info "或手动运行: openssl rand -base64 32"
                exit 1
            fi
            
            # 生成 32 字节随机密钥
            local refresh_key=$(openssl rand -base64 32)
            
            if [ -z "$refresh_key" ]; then
                log_error "加密密钥生成失败"
                log_info "请手动运行: openssl rand -base64 32"
                exit 1
            fi
            
            # 验证密钥长度
            local key_length=${#refresh_key}
            if [ $key_length -lt 32 ]; then
                log_error "生成的密钥长度不足: $key_length 字符"
                exit 1
            fi
            
            # 配置到 .env.local
            if grep -q "^REFRESH_TOKEN_ENCRYPT_KEY=" "$env_local"; then
                grep -v "^REFRESH_TOKEN_ENCRYPT_KEY=" "$env_local" > "${env_local}.tmp"
                mv "${env_local}.tmp" "$env_local"
            fi
            echo "REFRESH_TOKEN_ENCRYPT_KEY='${refresh_key}'" >> "$env_local"
            
            log_success "刷新令牌加密密钥配置完成"
            log_info "密钥长度: $key_length 字符"
            echo ""
            log_warning "⚠️  重要提示："
            log_info "  1. 此密钥用于加密用户的'记住密码'令牌"
            log_info "  2. 请妥善保管 .env.local 文件（权限已设置为 600）"
            log_info "  3. 如果密钥丢失或更改，所有用户需要重新登录"
            log_info "  4. 建议每 3-6 个月轮换一次密钥"
            echo ""
        else
            log_warning "已跳过刷新令牌加密密钥配置"
            log_info "记住密码功能将不可用"
            log_info "请稍后手动配置: openssl rand -base64 32"
            echo ""
        fi
    fi
}

# 启动新容器
start_container() {
    log_info "启动容器..."
    
    cd "$DEPLOY_DIR"
    
    # 检查配置文件
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "Docker Compose配置文件不存在: ${DEPLOY_DIR}/docker-compose.prod.yml"
        exit 1
    fi
    
    # 检查 .env.local 文件
    if [ ! -f ".env.local" ]; then
        log_error ".env.local 文件不存在"
        log_info "请执行以下步骤创建配置："
        log_info "  1. 复制模板: cp .env.local.example .env.local"
        log_info "  2. 生成密码: ../scripts/gen_admin_password.sh '你的密码'"
        log_info "  3. 编辑配置: vi .env.local"
        log_info "  4. 添加配置: ADMIN_PASSWORD_HASH=<生成的哈希值>"
        log_info "  5. 设置权限: chmod 600 .env.local"
        exit 1
    fi
    
    # 验证 ADMIN_PASSWORD_HASH 配置
    if grep -q "^ADMIN_PASSWORD_HASH=.\+" .env.local; then
        local password_hash=$(grep "^ADMIN_PASSWORD_HASH=" .env.local | cut -d'=' -f2-)
        if [ -n "$password_hash" ]; then
            log_success "密码哈希配置验证通过"
        else
            log_error "ADMIN_PASSWORD_HASH 值为空"
            exit 1
        fi
    else
        log_error "ADMIN_PASSWORD_HASH 未在 .env.local 中配置"
        log_info "请执行以下步骤："
        log_info "  1. 生成密码哈希: ../scripts/gen_admin_password.sh '你的密码'"
        log_info "  2. 编辑 .env.local: vi .env.local"
        log_info "  3. 添加配置: ADMIN_PASSWORD_HASH=\$2a\$10\$..."
        exit 1
    fi
    
    # 检查文件权限
    local perms=$(stat -c "%a" .env.local 2>/dev/null || stat -f "%A" .env.local 2>/dev/null)
    if [ "$perms" != "600" ] && [ "$perms" != "0600" ]; then
        log_warning ".env.local 文件权限不安全: $perms"
        log_info "建议执行: chmod 600 ${DEPLOY_DIR}/.env.local"
    fi
    
    log_success "配置文件检查通过"
    
    # 创建数据卷
    create_volumes
    
    # 使用 docker compose 启动（会自动读取 env_file）
    log_info "启动容器..."
    docker compose -f docker-compose.prod.yml up -d
    
    log_success "容器启动完成"
}

# 启动服务
start_service() {
    log_info "=== 启动应用服务 ==="
    echo
    
    check_root "start"
    check_docker
    
    # 检查并配置 .env.local
    check_and_configure_env
    
    # 显示使用的镜像信息
    log_info "使用镜像: $FULL_IMAGE_NAME"
    
    if ! pull_image; then
        log_error "镜像拉取失败，无法启动服务"
        exit 1
    fi
    
    stop_old_container
    start_container
    
    # 等待服务启动
    sleep 3
    
    # 检查容器状态
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo
        log_success "=== 服务启动成功 ==="
        log_info "容器名称: $CONTAINER_NAME"
        log_info "镜像版本: $FULL_IMAGE_NAME"
        log_info "访问地址: http://$(curl -s ifconfig.me):3000"
        echo
        log_info "查看日志: $0 logs"
        log_info "查看状态: $0 status"
    else
        log_error "服务启动失败"
        log_info "查看日志: docker logs $CONTAINER_NAME"
        exit 1
    fi
}

# 更新服务到最新版本
update_service() {
    log_info "=== 更新应用到最新版本 ==="
    echo
    
    check_root "update"
    check_docker
    
    # 检查并配置 .env.local
    check_and_configure_env
    
    # 强制使用 latest 标签
    local update_image="${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    log_info "步骤 1/3: 检查镜像更新..."
    log_info "目标镜像: $update_image"
    
    # 检查是否有更新
    local need_update=false
    if check_image_update "$update_image"; then
        need_update=true
        log_info "发现新版本镜像"
    else
        log_info "镜像已是最新版本"
    fi
    
    if [ "$need_update" = true ]; then
        log_info "步骤 2/3: 开始更新..."
        
        # 备份当前配置
        log_info "创建自动备份..."
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_DIR="${PROJECT_ROOT}/backups"
        mkdir -p "$BACKUP_DIR"
        
        # 简单备份配置文件
        tar czf "${BACKUP_DIR}/auto_backup_${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT" deploy 2>/dev/null || true
        
        # 拉取新镜像
        if ! pull_image "$update_image"; then
            log_error "更新失败：无法拉取新镜像"
            exit 1
        fi
        
        # 停止旧容器
        stop_old_container
        
        # 使用新镜像启动
        log_info "步骤 3/3: 启动服务..."
        FULL_IMAGE_NAME="$update_image" start_container
        
        # 等待服务启动
        sleep 5
        
        # 检查容器状态
        if docker ps | grep -q "$CONTAINER_NAME"; then
            echo
            log_success "=== 更新成功 ==="
            log_info "新版本: $update_image"
            log_info "备份位置: ${BACKUP_DIR}/auto_backup_${TIMESTAMP}.tar.gz"
            echo
            log_info "查看日志: $0 logs"
            
            # 清理旧镜像
            log_info "清理旧镜像..."
            docker image prune -f
        else
            log_error "更新失败：服务启动异常"
            log_info "查看日志: docker logs $CONTAINER_NAME"
            log_info "回滚备份: $0 restore ${BACKUP_DIR}/auto_backup_${TIMESTAMP}.tar.gz"
            exit 1
        fi
    else
        log_info "当前已是最新版本，无需更新"
    fi
}

# 同步配置文件（从 Git 仓库）
sync_config_files() {
    log_info "同步配置文件..."
    
    # 检查是否在 Git 仓库中
    if [ ! -d "${PROJECT_ROOT}/.git" ]; then
        log_warning "不在 Git 仓库中，跳过配置同步"
        log_info "建议：使用 git clone 部署项目以支持自动配置同步"
        return 0
    fi
    
    # 保存当前分支
    local current_branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    
    # 检查是否有本地修改
    if ! git -C "$PROJECT_ROOT" diff-index --quiet HEAD -- 2>/dev/null; then
        log_warning "检测到本地修改，创建备份..."
        local backup_branch="backup-$(date +%Y%m%d_%H%M%S)"
        git -C "$PROJECT_ROOT" stash save "Auto backup before update" 2>/dev/null || true
    fi
    
    # 拉取最新代码
    log_info "从远程仓库拉取最新配置..."
    if git -C "$PROJECT_ROOT" pull origin "$current_branch" 2>/dev/null; then
        log_success "配置文件同步成功"
        
        # 检查关键配置文件是否有变化
        if git -C "$PROJECT_ROOT" diff HEAD@{1} HEAD -- deploy/ > /dev/null 2>&1; then
            if [ $? -eq 0 ]; then
                # 标记配置已更新
                touch "${PROJECT_ROOT}/.config_updated"
                log_info "检测到配置文件变更"
            fi
        fi
    else
        log_warning "配置同步失败，将使用现有配置"
        log_info "可能原因：网络问题或本地修改冲突"
        log_info "手动同步：cd ${PROJECT_ROOT} && git pull"
    fi
}

# 停止服务
stop_service() {
    log_info "=== 停止应用服务 ==="
    echo
    
    check_root "stop"
    check_docker
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker stop "$CONTAINER_NAME"
        log_success "服务已停止"
    else
        log_warning "服务未运行"
    fi
}

# 重启服务
restart_service() {
    log_info "=== 重启应用服务 ==="
    echo
    
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
show_status() {
    log_info "=== 服务状态 ==="
    echo
    
    check_docker
    
    # Docker服务状态
    echo "🐳 Docker服务:"
    systemctl status docker --no-pager | head -3
    echo
    
    # 容器状态
    echo "📦 容器状态:"
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "  容器未运行"
    fi
    echo
    
    # Nginx状态
    echo "🌐 Nginx服务:"
    systemctl status nginx --no-pager | head -3
    echo
    
    # 防火墙状态
    echo "🔥 防火墙状态:"
    ufw status | head -10
    echo
    
    # 磁盘使用
    echo "💾 磁盘使用:"
    df -h / | tail -1
    echo
    
    # 内存使用
    echo "🧠 内存使用:"
    free -h | grep Mem
}

# 查看日志
show_logs() {
    check_docker
    
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "查看容器日志 (Ctrl+C 退出):"
        echo
        docker logs -f --tail 100 "$CONTAINER_NAME"
    else
        log_error "容器未运行"
        exit 1
    fi
}

# 清理旧日志
cleanup_logs() {
    log_info "=== 清理旧日志 ==="
    echo
    
    check_root "cleanup"
    check_docker
    
    log_info "注意: Docker 容器日志已自动管理（保留7个文件，每个最大50MB）"
    echo
    
    # 清理应用日志卷中的旧文件
    log_info "清理应用日志卷中的旧文件..."
    docker run --rm \
        -v unisearch-logs:/logs \
        alpine sh -c 'find /logs -name "*.log*" -type f -mtime +7 -delete && echo "已清理7天前的日志文件"'
    
    # 清理系统日志
    log_info "清理系统日志..."
    journalctl --vacuum-time=7d
    
    # 清理 Docker 系统缓存
    log_info "清理 Docker 系统缓存..."
    docker system prune -f --filter "until=168h"
    
    log_success "日志清理完成"
}

# 设置定时日志清理
setup_log_rotation() {
    log_info "=== 设置定时日志清理 ==="
    echo
    
    check_root "setup-log-rotation"
    
    # 创建日志清理脚本
    cat > /usr/local/bin/unisearch-log-cleanup.sh << 'EOF'
#!/bin/bash
# UniSearch 日志清理脚本

echo "$(date): 开始清理UniSearch日志..."

# 清理Docker日志
docker system prune -f --filter "until=168h" > /dev/null 2>&1

# 清理应用日志
docker run --rm \
    -v unisearch-logs:/logs \
    alpine sh -c 'find /logs -name "*.log*" -type f -mtime +7 -delete' > /dev/null 2>&1

# 清理系统日志
journalctl --vacuum-time=7d > /dev/null 2>&1

echo "$(date): UniSearch日志清理完成"
EOF
    
    chmod +x /usr/local/bin/unisearch-log-cleanup.sh
    
    # 添加定时任务（每天凌晨2点执行）
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/unisearch-log-cleanup.sh >> /var/log/unisearch-cleanup.log 2>&1") | crontab -
    
    log_success "定时日志清理已设置（每天凌晨2点执行）"
    log_info "清理脚本位置: /usr/local/bin/unisearch-log-cleanup.sh"
    log_info "清理日志位置: /var/log/unisearch-cleanup.log"
}

# 设置定时自动同步配置
setup_auto_sync() {
    log_info "=== 设置定时自动同步配置 ==="
    echo
    
    check_root "setup-auto-sync"
    
    # 检查同步脚本是否存在
    if [ ! -f "${SCRIPT_DIR}/sync-config.sh" ]; then
        log_error "同步脚本不存在: ${SCRIPT_DIR}/sync-config.sh"
        exit 1
    fi
    
    # 复制同步脚本到系统目录
    cp "${SCRIPT_DIR}/sync-config.sh" /usr/local/bin/unisearch-sync-config.sh
    chmod +x /usr/local/bin/unisearch-sync-config.sh
    
    # 创建包装脚本（设置正确的工作目录）
    cat > /usr/local/bin/unisearch-auto-sync.sh << EOF
#!/bin/bash
# UniSearch 自动同步包装脚本
cd ${PROJECT_ROOT}
/usr/local/bin/unisearch-sync-config.sh
EOF
    
    chmod +x /usr/local/bin/unisearch-auto-sync.sh
    
    # 添加定时任务（每小时执行一次）
    # 移除旧的定时任务
    crontab -l 2>/dev/null | grep -v "unisearch-auto-sync.sh" | crontab - 2>/dev/null || true
    
    # 添加新的定时任务
    (crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/unisearch-auto-sync.sh >> /var/log/unisearch-sync.log 2>&1") | crontab -
    
    log_success "定时自动同步已设置（每小时执行一次）"
    log_info "同步脚本位置: /usr/local/bin/unisearch-sync-config.sh"
    log_info "同步日志位置: /var/log/unisearch-sync.log"
    echo
    log_info "工作原理："
    log_info "  1. Watchtower 每小时检查并更新 Docker 镜像"
    log_info "  2. 定时任务每小时从 Git 仓库同步配置文件"
    log_info "  3. 如果配置有变化，自动重启服务应用新配置"
    echo
    log_warning "注意事项："
    log_info "  - 确保项目是通过 git clone 部署的"
    log_info "  - 确保服务器可以访问 Git 仓库"
    log_info "  - 本地修改可能会被覆盖，请提前备份"
}

# 手动同步配置
sync_config() {
    log_info "=== 手动同步配置 ==="
    echo
    
    check_root "sync"
    
    if [ -f "${SCRIPT_DIR}/sync-config.sh" ]; then
        "${SCRIPT_DIR}/sync-config.sh"
    else
        log_error "同步脚本不存在: ${SCRIPT_DIR}/sync-config.sh"
        exit 1
    fi
}

# ===== 备份相关函数 =====

# 备份数据
backup_data() {
    log_info "=== 数据备份 ==="
    echo
    
    check_root "backup"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="${PROJECT_ROOT}/backups"
    BACKUP_NAME="unisearch_backup_${TIMESTAMP}"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    
    mkdir -p "$BACKUP_PATH"
    
    # 备份配置文件
    log_info "备份配置文件..."
    cp -r "$DEPLOY_DIR" "${BACKUP_PATH}/"
    
    # 备份Nginx配置
    if [ -f "$NGINX_CONFIG" ]; then
        mkdir -p "${BACKUP_PATH}/nginx"
        cp "$NGINX_CONFIG" "${BACKUP_PATH}/nginx/"
    fi
    
    # 备份Docker数据卷
    log_info "备份Docker数据卷..."
    if docker volume ls | grep -q unisearch-cache; then
        docker run --rm \
            -v unisearch-cache:/data \
            -v "${BACKUP_PATH}":/backup \
            alpine tar czf /backup/cache.tar.gz -C /data .
    fi
    
    # 压缩备份
    log_info "压缩备份文件..."
    cd "$BACKUP_DIR"
    tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    echo
    log_success "备份完成: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log_info "备份大小: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
}

# 从备份恢复
restore_from_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        log_info "用法: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_info "=== 从备份恢复 ==="
    log_warning "此操作将覆盖当前配置，请确认!"
    read -p "继续? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消"
        exit 0
    fi
    
    check_root "restore"
    
    # 解压备份
    TEMP_DIR=$(mktemp -d)
    tar xzf "$backup_file" -C "$TEMP_DIR"
    
    # 恢复配置
    log_info "恢复配置文件..."
    cp -r "${TEMP_DIR}"/*/deploy/* "$DEPLOY_DIR/"
    
    # 恢复数据卷
    if [ -f "${TEMP_DIR}"/*/cache.tar.gz ]; then
        log_info "恢复数据卷..."
        docker run --rm \
            -v unisearch-cache:/data \
            -v "${TEMP_DIR}":/backup \
            alpine tar xzf /backup/*/cache.tar.gz -C /data
    fi
    
    # 清理临时文件
    rm -rf "$TEMP_DIR"
    
    log_success "恢复完成"
    log_info "请运行 '$0 restart' 重启服务"
}

# ===== 主函数 =====

main() {
    local command="${1:-help}"
    
    case "$command" in
        init)
            init_server
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        update)
            update_service
            ;;
        sync)
            sync_config
            ;;
        setup-auto-sync)
            setup_auto_sync
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        cleanup)
            cleanup_logs
            ;;
        setup-log-rotation)
            setup_log_rotation
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_from_backup "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
