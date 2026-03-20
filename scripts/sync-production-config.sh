#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env.production}"
NGINX_TEMPLATE_PATH="${NGINX_TEMPLATE_PATH:-$PROJECT_DIR/deploy/nginx/nginx.conf.template}"
NGINX_CONFIG_PATH="${NGINX_CONFIG_PATH:-$PROJECT_DIR/deploy/nginx/nginx.conf}"
NGINX_IMAGE="${NGINX_IMAGE:-nginx:alpine}"

log_info() { echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo "[✓] $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo "[✗] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2; }

load_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error "环境配置文件不存在: $ENV_FILE"
        exit 1
    fi

    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a

    APP_CONTAINER_NAME="${APP_CONTAINER_NAME:-${APP_CONTAINER:-unisearch-app}}"
    NGINX_CONTAINER_NAME="${NGINX_CONTAINER_NAME:-${NGINX_CONTAINER:-unisearch-nginx}}"
    DOCKER_NETWORK_NAME="${DOCKER_NETWORK_NAME:-${NETWORK_NAME:-unisearch_unisearch-network}}"
    SITE_DOMAIN="${SITE_DOMAIN:-${DOMAIN:-}}"
    SITE_WWW_DOMAIN="${SITE_WWW_DOMAIN:-${WWW_DOMAIN:-www.${SITE_DOMAIN}}}"
    SSL_CERT_PATH="${SSL_CERT_PATH:-}"
    SSL_KEY_PATH="${SSL_KEY_PATH:-}"
    NGINX_SSL_CERT_PATH="${NGINX_SSL_CERT_PATH:-/etc/nginx/ssl/fullchain.pem}"
    NGINX_SSL_KEY_PATH="${NGINX_SSL_KEY_PATH:-/etc/nginx/ssl/privkey.pem}"
    UPSTREAM_APP_HOST="${UPSTREAM_APP_HOST:-$APP_CONTAINER_NAME}"
    UPSTREAM_APP_PORT="${UPSTREAM_APP_PORT:-80}"
}

require_var() {
    local name="$1"
    if [ -z "${!name:-}" ]; then
        log_error "缺少必填配置: $name"
        exit 1
    fi
}

check_container_exists() {
    local container="$1"
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        log_error "目标容器不存在: $container"
        exit 1
    fi
}

validate_inputs() {
    require_var APP_CONTAINER_NAME
    require_var NGINX_CONTAINER_NAME
    require_var DOCKER_NETWORK_NAME
    require_var SITE_DOMAIN
    require_var SITE_WWW_DOMAIN
    require_var SSL_CERT_PATH
    require_var SSL_KEY_PATH
    require_var UPSTREAM_APP_HOST
    require_var UPSTREAM_APP_PORT

    if [ ! -f "$NGINX_TEMPLATE_PATH" ]; then
        log_error "Nginx 模板不存在: $NGINX_TEMPLATE_PATH"
        exit 1
    fi

    if [ ! -f "$SSL_CERT_PATH" ]; then
        log_error "SSL 证书文件不存在: $SSL_CERT_PATH"
        exit 1
    fi

    if [ ! -f "$SSL_KEY_PATH" ]; then
        log_error "SSL 私钥文件不存在: $SSL_KEY_PATH"
        exit 1
    fi

    if ! docker network inspect "$DOCKER_NETWORK_NAME" >/dev/null 2>&1; then
        log_error "Docker 网络不存在: $DOCKER_NETWORK_NAME"
        exit 1
    fi

    check_container_exists "$APP_CONTAINER_NAME"
    check_container_exists "$NGINX_CONTAINER_NAME"
}

render_config() {
    local content
    content="$(cat "$NGINX_TEMPLATE_PATH")"
    content="${content//\$\{SITE_DOMAIN\}/$SITE_DOMAIN}"
    content="${content//\$\{SITE_WWW_DOMAIN\}/$SITE_WWW_DOMAIN}"
    content="${content//\$\{NGINX_SSL_CERT_PATH\}/$NGINX_SSL_CERT_PATH}"
    content="${content//\$\{NGINX_SSL_KEY_PATH\}/$NGINX_SSL_KEY_PATH}"
    content="${content//\$\{UPSTREAM_APP_HOST\}/$UPSTREAM_APP_HOST}"
    content="${content//\$\{UPSTREAM_APP_PORT\}/$UPSTREAM_APP_PORT}"
    printf '%s\n' "$content"
}

validate_rendered_config() {
    local rendered_config="$1"

    docker run --rm \
        -v "$rendered_config:/etc/nginx/nginx.conf:ro" \
        -v "$SSL_CERT_PATH:$NGINX_SSL_CERT_PATH:ro" \
        -v "$SSL_KEY_PATH:$NGINX_SSL_KEY_PATH:ro" \
        "$NGINX_IMAGE" nginx -t >/dev/null
}

reload_nginx() {
    if docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER_NAME}$"; then
        docker exec "$NGINX_CONTAINER_NAME" nginx -s reload >/dev/null
        log_success "Nginx 配置已重载"
        return
    fi

    docker restart "$NGINX_CONTAINER_NAME" >/dev/null
    log_success "Nginx 容器已重启"
}

main() {
    load_env
    validate_inputs

    local tmp_config
    tmp_config="$(mktemp "${TMPDIR:-/tmp}/unisearch-nginx.XXXXXX")"
    trap "rm -f '$tmp_config'" EXIT

    render_config > "$tmp_config"
    validate_rendered_config "$tmp_config"

    mkdir -p "$(dirname "$NGINX_CONFIG_PATH")"
    cp "$tmp_config" "$NGINX_CONFIG_PATH"
    log_info "已生成 Nginx 配置: $NGINX_CONFIG_PATH"

    reload_nginx
}

main "$@"
