#!/bin/bash

# UniSearch SSL证书管理脚本
# 整合备案检查、临时部署、SSL申请和续期功能
# 用法: ./ssl.sh [command]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"

# 配置变量
DOMAIN="unisearchso.xyz"
WEBROOT="/var/www/certbot"
NGINX_CONFIG="/etc/nginx/sites-available/unisearch"
NGINX_ENABLED="/etc/nginx/sites-enabled/unisearch"
CONTAINER_NAME="unisearch"

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
UniSearch SSL证书管理脚本

用法: $0 <command>

命令:
  check     检查域名备案状态（80端口可访问性）
  temp      临时8080端口部署（备案期间使用）
  apply     申请SSL证书（HTTP验证，需已备案）
  dns       使用DNS验证申请证书（无需80端口）
  renew     手动续期证书
  help      显示此帮助信息

示例:
  $0 check        # 检查备案状态
  $0 temp         # 备案期间使用8080端口
  $0 apply        # 备案完成后申请证书
  $0 dns          # 使用DNS验证申请证书

说明:
  - 中国大陆服务器需要ICP备案才能使用80/443端口
  - 备案期间可使用临时8080端口访问
  - 备案完成后使用HTTP验证申请证书
  - DNS验证方式不需要80端口，但续期需手动操作

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

# ===== 备案检查 =====

check_beian_status() {
    log_info "=== 检查域名备案状态 ==="
    echo
    
    log_info "检查80端口可访问性..."
    
    # 临时配置Nginx监听80端口
    cat > /tmp/nginx_test.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF
    
    cp /tmp/nginx_test.conf /etc/nginx/sites-available/test
    ln -sf /etc/nginx/sites-available/test /etc/nginx/sites-enabled/test
    nginx -t && systemctl reload nginx
    
    # 测试外网访问
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN || echo "000")
    
    # 清理测试配置
    rm -f /etc/nginx/sites-enabled/test /etc/nginx/sites-available/test
    systemctl reload nginx
    
    echo
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "✅ 80端口可访问，域名已备案"
        log_info "下一步: 运行 '$0 apply' 申请SSL证书"
        return 0
    else
        log_error "❌ 80端口不可访问 (HTTP $HTTP_CODE)"
        log_warning "域名可能未备案或备案未生效"
        echo
        log_info "临时解决方案:"
        log_info "  1. 运行 '$0 temp' 使用8080端口临时访问"
        log_info "  2. 提交ICP备案申请（详见文档 docs/ICP_BEIAN_GUIDE.md）"
        log_info "  3. 备案完成后再运行 '$0 apply' 申请SSL证书"
        return 1
    fi
}

# ===== 临时8080端口部署 =====

deploy_temp_8080() {
    log_info "=== 临时8080端口部署（备案期间） ==="
    echo
    
    check_root "temp"
    
    log_warning "此方案仅用于备案期间临时访问"
    log_info "访问地址需要加端口号: http://域名:8080"
    echo
    
    # 配置Nginx监听8080
    cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 8080;
    server_name unisearchso.xyz www.unisearchso.xyz _;
    
    # 日志
    access_log /var/log/nginx/unisearch_access.log;
    error_log /var/log/nginx/unisearch_error.log;
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8888/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # 前端代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
    
    # 启用配置
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # 测试并重载
    nginx -t && systemctl reload nginx
    
    # 开放8080端口
    ufw allow 8080/tcp comment 'HTTP-Alt' 2>/dev/null || true
    
    echo
    log_success "=== 临时部署完成 ==="
    echo
    SERVER_IP=$(curl -s ifconfig.me)
    echo "访问地址:"
    echo "  http://${SERVER_IP}:8080"
    echo "  http://${DOMAIN}:8080"
    echo
    log_info "备案完成后运行 '$0 apply' 切换到HTTPS"
}

# ===== HTTP验证申请证书 =====

apply_ssl_http() {
    log_info "=== 申请SSL证书（HTTP验证） ==="
    echo
    
    check_root "apply"
    
    # 先检查备案状态
    log_info "检查备案状态..."
    if ! timeout 5 curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
        log_error "80端口无法访问，请先完成备案"
        log_info "运行 '$0 check' 检查备案状态"
        exit 1
    fi
    
    log_success "80端口可访问，继续申请证书"
    echo
    
    # 安装Certbot（如果未安装）
    if ! command -v certbot &> /dev/null; then
        log_info "安装Certbot..."
        snap install core && snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot
    fi
    
    # 准备webroot目录
    log_info "准备验证目录..."
    mkdir -p "${WEBROOT}/.well-known/acme-challenge"
    chmod -R 755 "$WEBROOT"
    
    # 配置Nginx支持ACME验证
    log_info "配置Nginx..."
    cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80;
    server_name unisearchso.xyz www.unisearchso.xyz;
    
    # ACME验证
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        allow all;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8888/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # 前端代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
    
    ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
    nginx -t && systemctl reload nginx
    
    # 申请证书
    log_info "申请SSL证书..."
    certbot certonly --webroot \
        -w "$WEBROOT" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "admin@$DOMAIN" \
        --preferred-challenges http
    
    if [ $? -ne 0 ]; then
        log_error "SSL证书申请失败"
        exit 1
    fi
    
    log_success "SSL证书申请成功！"
    
    # 配置HTTPS
    log_info "配置HTTPS..."
    
    # 检查HTTPS配置文件是否存在
    if [ -f "${DEPLOY_DIR}/nginx/https.conf" ]; then
        cp "${DEPLOY_DIR}/nginx/https.conf" "$NGINX_CONFIG"
    else
        # 使用内置配置
        cat > "$NGINX_CONFIG" << 'EOF'
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name unisearchso.xyz www.unisearchso.xyz;
    
    # ACME验证（续期需要）
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    
    # 重定向到HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name unisearchso.xyz www.unisearchso.xyz;
    
    # SSL证书
    ssl_certificate /etc/letsencrypt/live/unisearchso.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/unisearchso.xyz/privkey.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # 日志
    access_log /var/log/nginx/unisearch_ssl_access.log;
    error_log /var/log/nginx/unisearch_ssl_error.log;
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8888/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    # 前端代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
    fi
    
    nginx -t && systemctl reload nginx
    
    # 配置自动续期
    log_info "配置证书自动续期..."
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
        log_success "自动续期任务已配置（每天凌晨3点）"
    fi
    
    echo
    log_success "=== SSL配置完成！ ==="
    echo
    echo "✅ 访问地址:"
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
    echo
    echo "📋 证书信息:"
    echo "   颁发者: Let's Encrypt"
    echo "   有效期: 90天"
    echo "   自动续期: 已配置"
    echo
}

# ===== DNS验证申请证书 =====

apply_ssl_dns() {
    log_info "=== 申请SSL证书（DNS验证） ==="
    echo
    
    check_root "dns"
    
    log_warning "此方法适用于80端口不可用的情况"
    log_info "需要手动添加DNS TXT记录"
    echo
    
    # 安装Certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装Certbot..."
        snap install core && snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot
    fi
    
    # 使用DNS验证
    log_info "开始DNS验证流程..."
    echo
    certbot certonly --manual \
        --preferred-challenges dns \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --agree-tos \
        --email "admin@$DOMAIN" \
        --no-eff-email
    
    if [ $? -eq 0 ]; then
        log_success "证书申请成功！"
        
        # 配置HTTPS（仅HTTPS，因为80端口可能不可用）
        cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name unisearchso.xyz www.unisearchso.xyz;
    
    # SSL证书
    ssl_certificate /etc/letsencrypt/live/unisearchso.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/unisearchso.xyz/privkey.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志
    access_log /var/log/nginx/unisearch_ssl_access.log;
    error_log /var/log/nginx/unisearch_ssl_error.log;
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8888/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    # 前端代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
        
        ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"
        nginx -t && systemctl reload nginx
        
        echo
        log_success "=== HTTPS配置完成！ ==="
        echo
        echo "访问地址: https://$DOMAIN"
        echo
        log_warning "注意："
        echo "  - DNS验证方式的证书续期需要手动操作"
        echo "  - 续期时需要再次添加DNS TXT记录"
        echo "  - 建议备案后改用HTTP验证方式"
    else
        log_error "证书申请失败"
    fi
}

# ===== 手动续期证书 =====

renew_certificate() {
    log_info "=== 手动续期SSL证书 ==="
    echo
    
    check_root "renew"
    
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot未安装"
        exit 1
    fi
    
    log_info "开始续期..."
    certbot renew --force-renewal
    
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        log_success "证书续期成功！"
        
        # 显示证书信息
        certbot certificates
    else
        log_error "证书续期失败"
    fi
}

# ===== 主函数 =====

main() {
    local command="${1:-help}"
    
    case "$command" in
        check)
            check_beian_status
            ;;
        temp)
            deploy_temp_8080
            ;;
        apply)
            apply_ssl_http
            ;;
        dns)
            apply_ssl_dns
            ;;
        renew)
            renew_certificate
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

