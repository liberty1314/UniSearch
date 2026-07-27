#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${UNISEARCH_SMOKE_IMAGE:-unisearch:smoke}"
SMOKE_ID="${UNISEARCH_TLS_SMOKE_ID:-$$}"
APP_CONTAINER="unisearch-tls-app-${SMOKE_ID}"
PROXY_CONTAINER="unisearch-tls-proxy-${SMOKE_ID}"
TMP_DIR="$ROOT_DIR/.tmp/tls-smoke/$SMOKE_ID"

source "$ROOT_DIR/scripts/tests/lib/docker-preflight.sh"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少 $1，无法执行 TLS smoke" >&2
    exit 1
  fi
}

cleanup() {
  docker rm -f "$PROXY_CONTAINER" "$APP_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_command curl
require_command openssl
require_command rg
require_docker_daemon

if ! rg -q 'Strict-Transport-Security' "$ROOT_DIR/README.md" \
  || ! rg -q 'X-Forwarded-Proto=https' "$ROOT_DIR/README.md" \
  || ! rg -q '禁止.*开放.*8080' "$ROOT_DIR/README.md"; then
  echo "生产 TLS 终止、HSTS 与内部端口契约尚未完整记录" >&2
  exit 1
fi

if ! rg -Fq '127.0.0.1:${UNISEARCH_HTTP_PORT:-8080}:8080' "$ROOT_DIR/docker-compose.prod.example.yml"; then
  echo "生产模板必须只将应用 8080 绑定到 loopback" >&2
  exit 1
fi

mkdir -p "$TMP_DIR"
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
  -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
  -keyout "$TMP_DIR/localhost.key" \
  -out "$TMP_DIR/localhost.crt" >/dev/null 2>&1
chmod 0600 "$TMP_DIR/localhost.key"
chmod 0644 "$TMP_DIR/localhost.crt"

cat >"$TMP_DIR/echo.conf" <<'EOF'
pid /tmp/echo-nginx.pid;
events {}
http {
    access_log off;
    error_log /tmp/echo-nginx-error.log warn;
    client_body_temp_path /tmp/echo-client;
    proxy_temp_path /tmp/echo-proxy;
    fastcgi_temp_path /tmp/echo-fastcgi;
    uwsgi_temp_path /tmp/echo-uwsgi;
    scgi_temp_path /tmp/echo-scgi;
    server {
        listen 8888;
        location / {
            add_header X-Observed-Forwarded-Proto $http_x_forwarded_proto always;
            return 200 "healthy\n";
        }
    }
}
EOF

echo "== TLS smoke: 启动 loopback 应用 =="
docker run -d \
  --name "$APP_CONTAINER" \
  -p "127.0.0.1::8080" \
  -v "$TMP_DIR/echo.conf:/tmp/echo.conf:ro" \
  --entrypoint /bin/sh \
  "$IMAGE_NAME" \
  -c 'nginx -c /tmp/echo.conf && exec nginx -g "daemon off;"' >/dev/null

if ! docker inspect "$APP_CONTAINER" --format '{{.State.Running}}' | grep -q true; then
  docker logs "$APP_CONTAINER" >&2
  echo "TLS smoke 应用容器启动失败" >&2
  exit 1
fi

app_address="$(docker port "$APP_CONTAINER" 8080/tcp)"
if [[ "$app_address" != 127.0.0.1:* ]]; then
  echo "应用端口必须只绑定到 127.0.0.1，实际为 $app_address" >&2
  exit 1
fi
app_port="${app_address##*:}"

for _ in {1..30}; do
  if curl --silent --show-error --fail --max-time 2 "http://$app_address/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl --silent --show-error --fail --max-time 5 "http://$app_address/health" >/dev/null

lan_ip="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$lan_ip" ]; then
  echo "无法取得非 loopback 宿主机地址" >&2
  exit 1
fi
if curl --noproxy '*' --silent --show-error --fail --connect-timeout 2 "http://${lan_ip}:${app_port}/health" >/dev/null 2>&1; then
  echo "应用 HTTP 端口可从非 loopback 地址直接访问" >&2
  exit 1
fi

cat >"$TMP_DIR/nginx.conf" <<EOF
events {}
http {
    server {
        listen 443 ssl;
        server_name localhost;
        ssl_certificate /etc/nginx/tls/localhost.crt;
        ssl_certificate_key /etc/nginx/tls/localhost.key;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            proxy_pass http://host.docker.internal:${app_port};
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
EOF

echo "== TLS smoke: 启动临时 TLS 终止代理 =="
docker run -d \
  --name "$PROXY_CONTAINER" \
  --add-host host.docker.internal:host-gateway \
  -p "127.0.0.1::443" \
  -v "$TMP_DIR/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$TMP_DIR/localhost.crt:/etc/nginx/tls/localhost.crt:ro" \
  -v "$TMP_DIR/localhost.key:/etc/nginx/tls/localhost.key:ro" \
  nginx:alpine >/dev/null

tls_address="$(docker port "$PROXY_CONTAINER" 443/tcp)"
if [[ "$tls_address" != 127.0.0.1:* ]]; then
  echo "TLS 代理必须只绑定到 127.0.0.1，实际为 $tls_address" >&2
  exit 1
fi
tls_port="${tls_address##*:}"

for _ in {1..30}; do
  if curl --insecure --silent --show-error --fail --max-time 2 \
    --resolve "localhost:${tls_port}:127.0.0.1" \
    "https://localhost:${tls_port}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl --insecure --silent --show-error --fail --max-time 5 \
  --resolve "localhost:${tls_port}:127.0.0.1" \
  --dump-header "$TMP_DIR/headers.txt" \
  "https://localhost:${tls_port}/api/health" >/dev/null

if ! rg -qi '^Strict-Transport-Security: max-age=31536000; includeSubDomains' "$TMP_DIR/headers.txt"; then
  echo "TLS 响应缺少 HSTS" >&2
  exit 1
fi
if ! rg -qi '^X-Observed-Forwarded-Proto: https' "$TMP_DIR/headers.txt"; then
  echo "应用上游未收到 X-Forwarded-Proto=https" >&2
  exit 1
fi

echo "== TLS smoke 完成 =="
