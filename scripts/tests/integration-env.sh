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
MYSQL_MIGRATION_USER="unisearch_migrate"
MYSQL_RUNTIME_USER="unisearch_runtime"
MYSQL_ROOT_PASSWORD=""
MYSQL_MIGRATION_PASSWORD=""
MYSQL_RUNTIME_PASSWORD=""
REDIS_PASSWORD=""
OLD_SECRET_MASTER_KEY=""
NEW_SECRET_MASTER_KEY=""
THIRD_SECRET_MASTER_KEY=""
TMDB_TEST_SECRET=""
UNMIGRATED_DB="unisearch_unmigrated"
DEVICE_FINGERPRINT="integration-device-${RUN_ID}"
LEGACY_REFRESH_TOKEN="legacy-plaintext-token-${RUN_ID}"
TMP_DIR="$(mktemp -d)"
APP_BINARY="$TMP_DIR/unisearch-integration"
APP_LOG="$TMP_DIR/backend.log"
UNMIGRATED_LOG="$TMP_DIR/unmigrated.log"
LOGIN_HEADERS="$TMP_DIR/login.headers"
LOGIN_BODY="$TMP_DIR/login.json"
LOGIN_COOKIES="$TMP_DIR/login.cookies"
REFRESH_HEADERS="$TMP_DIR/refresh.headers"
REFRESH_BODY="$TMP_DIR/refresh.json"
REFRESH_COOKIES="$TMP_DIR/refresh.cookies"
REPLAY_BODY="$TMP_DIR/replay.json"
LEGACY_BODY="$TMP_DIR/legacy.json"
TMDB_UPDATE_BODY="$TMP_DIR/tmdb-update.json"
TMDB_GET_BODY="$TMP_DIR/tmdb-get.json"
ROTATION_STDERR="$TMP_DIR/rotation.stderr"
WRONG_ROTATION_STDERR="$TMP_DIR/wrong-rotation.stderr"
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
  if [ "$status" -ne 0 ] && [ -s "$UNMIGRATED_LOG" ]; then
    echo "== 集成环境: 缺迁移启动日志 ==" >&2
    tail -n 120 "$UNMIGRATED_LOG" >&2 || true
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

run_backend_command_as() {
  local db_user="$1"
  local db_password="$2"
  local secret_master_key="${SECRET_MASTER_KEY_OVERRIDE:-$OLD_SECRET_MASTER_KEY}"
  local new_secret_master_key="${NEW_SECRET_MASTER_KEY_OVERRIDE:-}"
  shift 2

  (
    cd "$ROOT_DIR/backend"
    APP_ENV=development \
    PORT="$APP_PORT" \
    DB_HOST=127.0.0.1 \
    DB_PORT="$MYSQL_PORT" \
    DB_USER="$db_user" \
    DB_PASSWORD="$db_password" \
    DB_NAME="${DB_NAME:-unisearch}" \
    REDIS_HOST=127.0.0.1 \
    REDIS_PORT="$REDIS_PORT" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    REDIS_DB=0 \
    REDIS_TTL=3600 \
    AUTH_JWT_SECRET=integration-jwt-secret-value-at-least-32-chars \
    RESOURCE_PUBLIC_ID_SECRET=integration-resource-id-secret-at-least-32-chars \
    SECRET_BACKEND=database \
    SECRET_MASTER_KEY="$secret_master_key" \
    NEW_SECRET_MASTER_KEY="$new_secret_master_key" \
    INITIAL_ADMIN_USERNAME="$INITIAL_ADMIN_USERNAME" \
    INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
    HOT_RANKING_PRELOAD_ENABLED=false \
    exec "$@"
  )
}

mysql_exec_as() {
  local db_user="$1"
  local db_password="$2"
  local db_name="$3"
  local query="$4"
  if [ -n "$db_name" ]; then
    docker exec "$MYSQL_CONTAINER" mysql \
      -h 127.0.0.1 -u"$db_user" -p"$db_password" "$db_name" \
      -e "$query" 2>/dev/null
    return
  fi

  docker exec "$MYSQL_CONTAINER" mysql \
    -h 127.0.0.1 -u"$db_user" -p"$db_password" \
    -e "$query" 2>/dev/null
}

mysql_scalar_as() {
  local db_user="$1"
  local db_password="$2"
  local db_name="$3"
  local query="$4"

  docker exec "$MYSQL_CONTAINER" mysql \
    --batch --skip-column-names \
    -h 127.0.0.1 -u"$db_user" -p"$db_password" "$db_name" \
    -e "$query" 2>/dev/null
}

mysql_scalar() {
  mysql_scalar_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch "$1"
}

assert_mysql_command_fails() {
  local db_user="$1"
  local db_password="$2"
  local db_name="$3"
  local query="$4"
  local message="$5"

  if mysql_exec_as "$db_user" "$db_password" "$db_name" "$query" >/dev/null 2>&1; then
    echo "$message" >&2
    exit 1
  fi
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

assert_text_excludes_values() {
  local content="$1"
  local message="$2"
  shift 2
  local sensitive_value
  for sensitive_value in "$@"; do
    if [ -n "$sensitive_value" ] && [[ "$content" == *"$sensitive_value"* ]]; then
      echo "$message" >&2
      exit 1
    fi
  done
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

stop_backend() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill "$APP_PID" >/dev/null 2>&1
    wait "$APP_PID" >/dev/null 2>&1 || true
  fi
  APP_PID=""
}

start_backend_with_master_key() {
  local master_key="$1"
  : >"$APP_LOG"
  SECRET_MASTER_KEY_OVERRIDE="$master_key" run_backend_command_as \
    "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" \
    "$APP_BINARY" >"$APP_LOG" 2>&1 &
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
}

require_command curl
require_command go
require_command jq
require_command openssl

MYSQL_ROOT_PASSWORD="$(openssl rand -hex 24)"
MYSQL_MIGRATION_PASSWORD="$(openssl rand -hex 24)"
MYSQL_RUNTIME_PASSWORD="$(openssl rand -hex 24)"
REDIS_PASSWORD="$(openssl rand -hex 24)"
OLD_SECRET_MASTER_KEY="$(openssl rand -hex 32)"
NEW_SECRET_MASTER_KEY="$(openssl rand -hex 32)"
THIRD_SECRET_MASTER_KEY="$(openssl rand -hex 32)"
TMDB_TEST_SECRET="$(openssl rand -hex 24)"

echo "== 集成环境: 启动 MySQL 与 Redis =="
docker run -d \
  --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
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

echo "== 集成环境: 创建迁移账号与运行账号 =="
docker exec -i "$MYSQL_CONTAINER" mysql -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" >/dev/null 2>&1 <<SQL
CREATE USER '${MYSQL_MIGRATION_USER}'@'%' IDENTIFIED BY '${MYSQL_MIGRATION_PASSWORD}';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
ON \`unisearch\`.* TO '${MYSQL_MIGRATION_USER}'@'%';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
ON \`${UNMIGRATED_DB}\`.* TO '${MYSQL_MIGRATION_USER}'@'%';
CREATE USER '${MYSQL_RUNTIME_USER}'@'%' IDENTIFIED BY '${MYSQL_RUNTIME_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE
ON \`unisearch\`.* TO '${MYSQL_RUNTIME_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE
ON \`${UNMIGRATED_DB}\`.* TO '${MYSQL_RUNTIME_USER}'@'%';
SQL

echo "== 集成环境: 等待 Redis 就绪 =="
for _ in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG; then
    break
  fi
  sleep 1
done
docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG

echo "== 集成环境: 执行数据库迁移 =="
run_backend_command_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" go run ./cmd/migrate

echo "== 集成环境: 验证迁移账号和运行账号最小权限 =="
mysql_exec_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" unisearch \
  "CREATE TABLE runtime_privilege_probe (id BIGINT PRIMARY KEY, probe_value VARCHAR(32) NOT NULL);" >/dev/null
mysql_exec_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "INSERT INTO runtime_privilege_probe (id, probe_value) VALUES (1, 'created');" >/dev/null
mysql_exec_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "UPDATE runtime_privilege_probe SET probe_value = 'updated' WHERE id = 1;" >/dev/null
assert_equals "updated" "$(mysql_scalar "SELECT probe_value FROM runtime_privilege_probe WHERE id = 1;")" "运行账号 DML 校验失败"
mysql_exec_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "DELETE FROM runtime_privilege_probe WHERE id = 1;" >/dev/null
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM runtime_privilege_probe;")" "运行账号删除探针记录失败"
assert_mysql_command_fails "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "CREATE TABLE runtime_create_denied (id BIGINT PRIMARY KEY);" \
  "运行账号不应具有 CREATE TABLE 权限"
assert_mysql_command_fails "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "ALTER TABLE runtime_privilege_probe ADD COLUMN forbidden_column BIGINT;" \
  "运行账号不应具有 ALTER TABLE 权限"
assert_mysql_command_fails "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" unisearch \
  "DROP TABLE runtime_privilege_probe;" \
  "运行账号不应具有 DROP TABLE 权限"

echo "== 集成环境: 创建旧刷新令牌原文夹具 =="
mysql_exec_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" unisearch "
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
run_backend_command_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" \
  go run ./cmd/migrate -migrate-refresh-token-sessions
assert_equals "1" "$(mysql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refresh_token_sessions';")" "摘要刷新会话表不存在"
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_tokens;")" "旧刷新令牌原文未清空"
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM refresh_token_sessions WHERE CHAR_LENGTH(token_digest) <> 64;")" "摘要长度校验失败"

echo "== 集成环境: 构建并启动后端 =="
(cd "$ROOT_DIR/backend" && go build -o "$APP_BINARY" .)

echo "== 集成环境: 验证缺失迁移时应用失败关闭 =="
mysql_exec_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" "" \
  "CREATE DATABASE ${UNMIGRATED_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null
set +e
DB_NAME="$UNMIGRATED_DB" run_backend_command_as \
  "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" "$APP_BINARY" >"$UNMIGRATED_LOG" 2>&1
unmigrated_status=$?
set -e
if [ "$unmigrated_status" -eq 0 ]; then
  echo "缺少迁移的应用必须在健康检查前退出" >&2
  exit 1
fi
if ! grep -q "数据库结构未完成迁移" "$UNMIGRATED_LOG" || ! grep -q "unisearch-migrate" "$UNMIGRATED_LOG"; then
  echo "缺少迁移的失败日志必须包含结构错误和迁移命令提示" >&2
  exit 1
fi
assert_equals "0" "$(mysql_scalar_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" "$UNMIGRATED_DB" \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();")" "缺迁移启动不得创建业务表"

start_backend_with_master_key "$OLD_SECRET_MASTER_KEY"

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
ACCESS_TOKEN="$(jq -r '.data.access_token' "$LOGIN_BODY")"

echo "== 集成环境: 写入第二条数据库密钥 =="
tmdb_update_status="$(request_status "$TMDB_UPDATE_BODY" \
  --request PUT \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  --header "Content-Type: application/json" \
  --data "{\"tmdb_read_access_token\":\"${TMDB_TEST_SECRET}\"}" \
  "$API_BASE_URL/api/admin/system-settings/tmdb")"
assert_equals "200" "$tmdb_update_status" "写入 TMDB 测试密钥失败"
jq -e '.configured == true and .source == "secret_manager"' "$TMDB_UPDATE_BODY" >/dev/null
if grep -Fq "$TMDB_TEST_SECRET" "$TMDB_UPDATE_BODY"; then
  echo "TMDB 更新响应不得包含完整密钥" >&2
  exit 1
fi

echo "== 集成环境: 停止旧主密钥后端并执行原子轮换 =="
stop_backend
assert_equals "2" "$(mysql_scalar "SELECT COUNT(*) FROM secrets;")" "主密钥轮换前密钥记录数异常"
rotation_output="$(
  SECRET_MASTER_KEY_OVERRIDE="$OLD_SECRET_MASTER_KEY" \
  NEW_SECRET_MASTER_KEY_OVERRIDE="$NEW_SECRET_MASTER_KEY" \
    run_backend_command_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" \
    go run ./cmd/rotate-master-key -confirm=rotate-database-master-key \
    2>"$ROTATION_STDERR"
)"
if [[ "$rotation_output" != *"主密钥重加密完成，已更新 2 条密钥记录"* ]]; then
  echo "主密钥轮换输出缺少更新数量" >&2
  exit 1
fi
assert_text_excludes_values "$rotation_output" "主密钥轮换输出包含敏感测试材料" \
  "$OLD_SECRET_MASTER_KEY" "$NEW_SECRET_MASTER_KEY" "$THIRD_SECRET_MASTER_KEY" "$TMDB_TEST_SECRET"
rotated_first_ciphertext="$(mysql_scalar "SELECT value FROM secrets ORDER BY id LIMIT 1;")"
rotated_second_ciphertext="$(mysql_scalar "SELECT value FROM secrets ORDER BY id LIMIT 1 OFFSET 1;")"
rotation_stderr="$(<"$ROTATION_STDERR")"
assert_text_excludes_values "$rotation_stderr" "主密钥轮换 stderr 包含敏感材料或密文 SQL" \
  "$OLD_SECRET_MASTER_KEY" "$NEW_SECRET_MASTER_KEY" "$THIRD_SECRET_MASTER_KEY" "$TMDB_TEST_SECRET" \
  "$rotated_first_ciphertext" "$rotated_second_ciphertext" 'UPDATE `secrets`' 'FROM `secrets`'

echo "== 集成环境: 使用新主密钥重启并读取 TMDB 状态 =="
start_backend_with_master_key "$NEW_SECRET_MASTER_KEY"
: >"$LOGIN_HEADERS"
: >"$LOGIN_BODY"
: >"$LOGIN_COOKIES"
login_status="$(request_status "$LOGIN_BODY" \
  --dump-header "$LOGIN_HEADERS" \
  --cookie-jar "$LOGIN_COOKIES" \
  --request POST \
  --header "Content-Type: application/json" \
  --data "{\"username\":\"${INITIAL_ADMIN_USERNAME}\",\"password\":\"${INITIAL_ADMIN_PASSWORD}\",\"remember_me\":true,\"device_fingerprint\":\"${DEVICE_FINGERPRINT}\"}" \
  "$API_BASE_URL/api/auth/login")"
assert_equals "200" "$login_status" "新主密钥重启后登录失败"
ACCESS_TOKEN="$(jq -r '.data.access_token' "$LOGIN_BODY")"
tmdb_get_status="$(request_status "$TMDB_GET_BODY" \
  --request GET \
  --header "Authorization: Bearer ${ACCESS_TOKEN}" \
  "$API_BASE_URL/api/admin/system-settings/tmdb")"
assert_equals "200" "$tmdb_get_status" "新主密钥读取 TMDB 状态失败"
jq -e '.configured == true and .source == "secret_manager"' "$TMDB_GET_BODY" >/dev/null
if grep -Fq "$TMDB_TEST_SECRET" "$TMDB_GET_BODY"; then
  echo "TMDB 查询响应不得包含完整密钥" >&2
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

echo "== 集成环境: 验证旧主密钥失败且密文不变 =="
stop_backend
rotated_ciphertext_digest="$(mysql_scalar "SELECT SHA2(GROUP_CONCAT(CONCAT(id, ':', value) ORDER BY id SEPARATOR '|'), 256) FROM secrets;")"
set +e
wrong_rotation_output="$(
  SECRET_MASTER_KEY_OVERRIDE="$OLD_SECRET_MASTER_KEY" \
  NEW_SECRET_MASTER_KEY_OVERRIDE="$THIRD_SECRET_MASTER_KEY" \
    run_backend_command_as "$MYSQL_RUNTIME_USER" "$MYSQL_RUNTIME_PASSWORD" \
    go run ./cmd/rotate-master-key -confirm=rotate-database-master-key \
    2>"$WRONG_ROTATION_STDERR"
)"
wrong_rotation_status=$?
set -e
wrong_rotation_stderr="$(<"$WRONG_ROTATION_STDERR")"
wrong_rotation_combined="${wrong_rotation_output}${wrong_rotation_stderr}"
if [ "$wrong_rotation_status" -eq 0 ]; then
  echo "旧主密钥不得再次轮换已更新密文" >&2
  exit 1
fi
if [[ "$wrong_rotation_combined" != *"密钥记录"* || "$wrong_rotation_combined" != *"解密失败"* ]]; then
  echo "旧主密钥失败输出缺少记录 ID 和错误类别" >&2
  exit 1
fi
assert_text_excludes_values "$wrong_rotation_combined" "旧主密钥失败输出包含敏感材料或密文 SQL" \
  "$OLD_SECRET_MASTER_KEY" "$NEW_SECRET_MASTER_KEY" "$THIRD_SECRET_MASTER_KEY" "$TMDB_TEST_SECRET" \
  "$rotated_first_ciphertext" "$rotated_second_ciphertext" 'UPDATE `secrets`' 'FROM `secrets`'
assert_equals "$rotated_ciphertext_digest" \
  "$(mysql_scalar "SELECT SHA2(GROUP_CONCAT(CONCAT(id, ':', value) ORDER BY id SEPARATOR '|'), 256) FROM secrets;")" \
  "旧主密钥失败后密文发生变化"

echo "== 集成环境: 删除已清空的旧刷新令牌表 =="
run_backend_command_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" \
  go run ./cmd/migrate -drop-legacy-refresh-tokens
assert_equals "0" "$(mysql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'refresh_tokens';")" "旧刷新令牌表删除失败"

echo "== 集成环境: 清理权限探针表 =="
mysql_exec_as "$MYSQL_MIGRATION_USER" "$MYSQL_MIGRATION_PASSWORD" unisearch \
  "DROP TABLE runtime_privilege_probe;" >/dev/null

echo "== 集成环境验证完成 =="
