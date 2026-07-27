#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_ID="${UNISEARCH_INTEGRATION_RUN_ID:-$(date +%s)}"
MYSQL_CONTAINER="unisearch-it-mysql-${RUN_ID}"
REDIS_CONTAINER="unisearch-it-redis-${RUN_ID}"
MYSQL_PORT="${UNISEARCH_IT_MYSQL_PORT:-3307}"
REDIS_PORT="${UNISEARCH_IT_REDIS_PORT:-6380}"
APP_PORT="${UNISEARCH_IT_APP_PORT:-18888}"
API_BASE_URL="http://127.0.0.1:${APP_PORT}"
INITIAL_ADMIN_USERNAME="integration_admin"
INITIAL_ADMIN_PASSWORD="Integration!Admin2026"
MYSQL_APP_USER="unisearch_integration"
MYSQL_ROOT_PASSWORD=""
MYSQL_APP_PASSWORD=""
REDIS_PASSWORD=""
DEVICE_FINGERPRINT="integration-device-${RUN_ID}"
LEGACY_REFRESH_TOKEN="legacy-plaintext-token-${RUN_ID}"
TMP_DIR="$(mktemp -d)"
APP_BINARY="$TMP_DIR/unisearch-integration"
APP_LOG="$TMP_DIR/backend.log"
LOGIN_HEADERS="$TMP_DIR/login.headers"
LOGIN_BODY="$TMP_DIR/login.json"
LOGIN_COOKIES="$TMP_DIR/login.cookies"
REFRESH_HEADERS="$TMP_DIR/refresh.headers"
REFRESH_BODY="$TMP_DIR/refresh.json"
REFRESH_COOKIES="$TMP_DIR/refresh.cookies"
REPLAY_BODY="$TMP_DIR/replay.json"
LEGACY_BODY="$TMP_DIR/legacy.json"
APP_PID=""

if [[ ! "$RUN_ID" =~ ^[A-Za-z0-9_.-]+$ ]]; then
  echo "UNISEARCH_INTEGRATION_RUN_ID 只能包含字母、数字、点、下划线和连字符" >&2
  exit 1
fi

source "$ROOT_DIR/scripts/tests/lib/docker-preflight.sh"

require_docker_daemon

cleanup() {
  local status=$?
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill "$APP_PID" >/dev/null 2>&1 || true
    wait "$APP_PID" >/dev/null 2>&1 || true
  fi
  if [ "$status" -ne 0 ] && [ -s "$APP_LOG" ]; then
    echo "== 集成环境: 后端失败日志 ==" >&2
    tail -n 120 "$APP_LOG" >&2 || true
  fi
  docker rm -f "$MYSQL_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
  return "$status"
}
trap cleanup EXIT

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "缺少必要命令: $command_name" >&2
    exit 1
  fi
}

run_backend_command() {
  (
    cd "$ROOT_DIR/backend"
    APP_ENV=development \
    PORT="$APP_PORT" \
    DB_HOST=127.0.0.1 \
    DB_PORT="$MYSQL_PORT" \
    DB_USER="$MYSQL_APP_USER" \
    DB_PASSWORD="$MYSQL_APP_PASSWORD" \
    DB_NAME=unisearch \
    REDIS_HOST=127.0.0.1 \
    REDIS_PORT="$REDIS_PORT" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    REDIS_DB=0 \
    REDIS_TTL=3600 \
    AUTH_JWT_SECRET=integration-jwt-secret-value-at-least-32-chars \
    RESOURCE_PUBLIC_ID_SECRET=integration-resource-id-secret-at-least-32-chars \
    SECRET_MASTER_KEY=integration-master-secret-value-at-least-32-chars \
    INITIAL_ADMIN_USERNAME="$INITIAL_ADMIN_USERNAME" \
    INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
    HOT_RANKING_PRELOAD_ENABLED=false \
    exec "$@"
  )
}

mysql_scalar() {
  docker exec "$MYSQL_CONTAINER" mysql \
    --batch --skip-column-names \
    -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" unisearch \
    -e "$1" 2>/dev/null
}

assert_equals() {
  local want="$1"
  local got="$2"
  local message="$3"
  if [ "$got" != "$want" ]; then
    echo "$message，期望 $want，实际 $got" >&2
    exit 1
  fi
}

request_status() {
  local output_file="$1"
  shift
  curl --silent --show-error --output "$output_file" --write-out "%{http_code}" \
    --max-time 15 "$@"
}

extract_refresh_cookie() {
  local cookie_file="$1"
  awk '$6 == "refresh_token" { print $7 }' "$cookie_file" | tail -n 1
}

require_command curl
require_command go
require_command jq
require_command openssl

MYSQL_ROOT_PASSWORD="$(openssl rand -hex 24)"
MYSQL_APP_PASSWORD="$(openssl rand -hex 24)"
REDIS_PASSWORD="$(openssl rand -hex 24)"

echo "== 集成环境: 启动 MySQL 与 Redis =="
docker run -d \
  --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -e MYSQL_DATABASE=unisearch \
  -e MYSQL_USER="$MYSQL_APP_USER" \
  -e MYSQL_PASSWORD="$MYSQL_APP_PASSWORD" \
  -e TZ=Asia/Shanghai \
  -p "127.0.0.1:${MYSQL_PORT}:3306" \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci \
  --default-authentication-plugin=mysql_native_password >/dev/null

docker run -d \
  --name "$REDIS_CONTAINER" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -p "127.0.0.1:${REDIS_PORT}:6379" \
  redis:7-alpine \
  sh -c 'redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass "$REDIS_PASSWORD"' >/dev/null

echo "== 集成环境: 等待 MySQL 就绪 =="
for _ in {1..60}; do
  if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null

echo "== 集成环境: 等待 Redis 就绪 =="
for _ in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG; then
    break
  fi
  sleep 1
done
docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG

echo "== 集成环境: 执行数据库迁移 =="
run_backend_command go run ./cmd/migrate

echo "== 集成环境: 创建旧刷新令牌原文夹具 =="
docker exec "$MYSQL_CONTAINER" mysql -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" unisearch -e "
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO refresh_tokens (token, username, expires_at, is_revoked)
VALUES ('${LEGACY_REFRESH_TOKEN}', '${INITIAL_ADMIN_USERNAME}', DATE_ADD(NOW(), INTERVAL 1 DAY), FALSE);
" >/dev/null
assert_equals "1" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_tokens;")" "旧刷新令牌夹具创建失败"

echo "== 集成环境: 执行刷新会话摘要迁移 =="
run_backend_command go run ./cmd/migrate -migrate-refresh-token-sessions
assert_equals "1" "$(mysql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refresh_token_sessions';")" "摘要刷新会话表不存在"
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_tokens;")" "旧刷新令牌原文未清空"
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_token_sessions WHERE CHAR_LENGTH(token_digest) <> 64;")" "摘要长度校验失败"

echo "== 集成环境: 构建并启动后端 =="
(cd "$ROOT_DIR/backend" && go build -o "$APP_BINARY" .)
run_backend_command "$APP_BINARY" >"$APP_LOG" 2>&1 &
APP_PID=$!

for _ in {1..60}; do
  if curl --silent --show-error --fail --max-time 2 "$API_BASE_URL/api/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$APP_PID" >/dev/null 2>&1; then
    echo "后端在健康检查前退出" >&2
    exit 1
  fi
  sleep 1
done
curl --silent --show-error --fail --max-time 5 "$API_BASE_URL/api/health" >/dev/null

echo "== 集成环境: 验证旧 Cookie 已失效 =="
legacy_status="$(request_status "$LEGACY_BODY" \
  --request POST \
  --header "Content-Type: application/json" \
  --cookie "refresh_token=${LEGACY_REFRESH_TOKEN}" \
  --data "{\"device_fingerprint\":\"${DEVICE_FINGERPRINT}\"}" \
  "$API_BASE_URL/api/auth/refresh")"
assert_equals "401" "$legacy_status" "旧 Cookie 应被拒绝"

echo "== 集成环境: 验证新记住登录 =="
login_status="$(request_status "$LOGIN_BODY" \
  --dump-header "$LOGIN_HEADERS" \
  --cookie-jar "$LOGIN_COOKIES" \
  --request POST \
  --header "Content-Type: application/json" \
  --data "{\"username\":\"${INITIAL_ADMIN_USERNAME}\",\"password\":\"${INITIAL_ADMIN_PASSWORD}\",\"remember_me\":true,\"device_fingerprint\":\"${DEVICE_FINGERPRINT}\"}" \
  "$API_BASE_URL/api/auth/login")"
assert_equals "200" "$login_status" "新会话登录失败"
jq -e '.data.access_token | type == "string" and length > 0' "$LOGIN_BODY" >/dev/null
if jq -e 'has("refresh_token") or (.data | type == "object" and has("refresh_token"))' "$LOGIN_BODY" >/dev/null; then
  echo "登录响应正文不得包含刷新令牌" >&2
  exit 1
fi
if ! grep -qi '^Set-Cookie: refresh_token=.*HttpOnly.*SameSite=Strict' "$LOGIN_HEADERS"; then
  echo "登录响应缺少 HttpOnly、SameSite=Strict 刷新 Cookie" >&2
  exit 1
fi
LOGIN_REFRESH_TOKEN="$(extract_refresh_cookie "$LOGIN_COOKIES")"
if [ "${#LOGIN_REFRESH_TOKEN}" -lt 40 ]; then
  echo "登录未签发高熵刷新 Cookie" >&2
  exit 1
fi
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_token_sessions WHERE CHAR_LENGTH(token_digest) <> 64 OR token_digest = '${LOGIN_REFRESH_TOKEN}';")" "数据库保存了非法摘要或原始令牌"

echo "== 集成环境: 验证刷新令牌单次轮转 =="
refresh_status="$(request_status "$REFRESH_BODY" \
  --dump-header "$REFRESH_HEADERS" \
  --cookie "$LOGIN_COOKIES" \
  --cookie-jar "$REFRESH_COOKIES" \
  --request POST \
  --header "Content-Type: application/json" \
  --data "{\"device_fingerprint\":\"${DEVICE_FINGERPRINT}\"}" \
  "$API_BASE_URL/api/auth/refresh")"
assert_equals "200" "$refresh_status" "新刷新令牌首次轮转失败"
jq -e '.access_token | type == "string" and length > 0' "$REFRESH_BODY" >/dev/null
ROTATED_REFRESH_TOKEN="$(extract_refresh_cookie "$REFRESH_COOKIES")"
if [ "${#ROTATED_REFRESH_TOKEN}" -lt 40 ] || [ "$ROTATED_REFRESH_TOKEN" = "$LOGIN_REFRESH_TOKEN" ]; then
  echo "刷新令牌轮转未生成新的高熵 Cookie" >&2
  exit 1
fi

echo "== 集成环境: 验证旧轮转 Cookie 重放被拒绝 =="
replay_status="$(request_status "$REPLAY_BODY" \
  --request POST \
  --header "Content-Type: application/json" \
  --cookie "refresh_token=${LOGIN_REFRESH_TOKEN}" \
  --data "{\"device_fingerprint\":\"${DEVICE_FINGERPRINT}\"}" \
  "$API_BASE_URL/api/auth/refresh")"
assert_equals "401" "$replay_status" "旧轮转 Cookie 重放应被拒绝"
jq -e '.code == "REFRESH_TOKEN_REUSE_DETECTED"' "$REPLAY_BODY" >/dev/null

echo "== 集成环境: 删除已清空的旧刷新令牌表 =="
run_backend_command go run ./cmd/migrate -drop-legacy-refresh-tokens
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refresh_tokens';")" "旧刷新令牌表删除失败"

echo "== 集成环境验证完成 =="
