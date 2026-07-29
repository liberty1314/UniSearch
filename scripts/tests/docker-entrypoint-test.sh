#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENTRYPOINT="$ROOT_DIR/scripts/docker-entrypoint.sh"
TMP_DIR="$(mktemp -d)"
MIGRATE_BIN="$TMP_DIR/unisearch-migrate"
SUPERVISOR_BIN="$TMP_DIR/supervisord"
LOG_FILE="$TMP_DIR/entrypoint.log"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat >"$MIGRATE_BIN" <<'SH'
#!/bin/sh
printf 'migrate_args=%s\n' "$*" >>"$TEST_LOG_FILE"
printf 'migrate_db_user=%s\n' "$DB_USER" >>"$TEST_LOG_FILE"
printf 'migrate_db_password=%s\n' "$DB_PASSWORD" >>"$TEST_LOG_FILE"
exit "${TEST_MIGRATE_EXIT:-0}"
SH

cat >"$SUPERVISOR_BIN" <<'SH'
#!/bin/sh
printf 'supervisor_args=%s\n' "$*" >>"$TEST_LOG_FILE"
printf 'supervisor_db_user=%s\n' "$DB_USER" >>"$TEST_LOG_FILE"
printf 'supervisor_db_password=%s\n' "$DB_PASSWORD" >>"$TEST_LOG_FILE"
if [ -n "${MIGRATION_DB_USER+x}" ] || [ -n "${MIGRATION_DB_PASSWORD+x}" ]; then
  printf 'supervisor_migration_credentials=present\n' >>"$TEST_LOG_FILE"
  exit 91
fi
printf 'supervisor_migration_credentials=absent\n' >>"$TEST_LOG_FILE"
SH

chmod +x "$MIGRATE_BIN" "$SUPERVISOR_BIN"

run_entrypoint() {
  env \
    TEST_LOG_FILE="$LOG_FILE" \
    UNISEARCH_MIGRATION_BINARY="$MIGRATE_BIN" \
    UNISEARCH_SUPERVISOR_BINARY="$SUPERVISOR_BIN" \
    UNISEARCH_SUPERVISOR_CONFIG="$TMP_DIR/supervisord.conf" \
    DB_USER=runtime_user \
    DB_PASSWORD=runtime_password \
    "$@" \
    sh "$ENTRYPOINT"
}

assert_log_contains() {
  local expected=$1
  if ! grep -Fqx "$expected" "$LOG_FILE"; then
    echo "入口测试缺少日志: $expected" >&2
    cat "$LOG_FILE" >&2
    exit 1
  fi
}

echo "== 容器入口测试: 自动迁移成功后启动 Supervisor =="
: >"$LOG_FILE"
run_entrypoint \
  AUTO_MIGRATE=true \
  MIGRATION_DB_USER=migration_user \
  MIGRATION_DB_PASSWORD=migration_password
assert_log_contains "migrate_args=-migrate-refresh-token-sessions"
assert_log_contains "migrate_db_user=migration_user"
assert_log_contains "migrate_db_password=migration_password"
assert_log_contains "supervisor_args=-c $TMP_DIR/supervisord.conf"
assert_log_contains "supervisor_db_user=runtime_user"
assert_log_contains "supervisor_db_password=runtime_password"
assert_log_contains "supervisor_migration_credentials=absent"

echo "== 容器入口测试: 迁移失败时不得启动 Supervisor =="
: >"$LOG_FILE"
if run_entrypoint \
  AUTO_MIGRATE=true \
  MIGRATION_DB_USER=migration_user \
  MIGRATION_DB_PASSWORD=migration_password \
  TEST_MIGRATE_EXIT=23; then
  echo "迁移失败时入口必须返回非零" >&2
  exit 1
fi
if grep -q '^supervisor_args=' "$LOG_FILE"; then
  echo "迁移失败时不得启动 Supervisor" >&2
  exit 1
fi

echo "== 容器入口测试: 关闭自动迁移时直接启动 Supervisor =="
: >"$LOG_FILE"
run_entrypoint AUTO_MIGRATE=false
if grep -q '^migrate_args=' "$LOG_FILE"; then
  echo "AUTO_MIGRATE=false 时不得执行迁移" >&2
  exit 1
fi
assert_log_contains "supervisor_args=-c $TMP_DIR/supervisord.conf"

echo "== 容器入口测试: 无效开关值必须失败 =="
: >"$LOG_FILE"
if run_entrypoint AUTO_MIGRATE=invalid; then
  echo "无效 AUTO_MIGRATE 值必须返回非零" >&2
  exit 1
fi
if [ -s "$LOG_FILE" ]; then
  echo "无效开关值不得执行迁移或启动 Supervisor" >&2
  exit 1
fi

echo "== 容器入口测试: 缺少迁移凭据必须失败 =="
: >"$LOG_FILE"
if env \
  TEST_LOG_FILE="$LOG_FILE" \
  UNISEARCH_MIGRATION_BINARY="$MIGRATE_BIN" \
  UNISEARCH_SUPERVISOR_BINARY="$SUPERVISOR_BIN" \
  UNISEARCH_SUPERVISOR_CONFIG="$TMP_DIR/supervisord.conf" \
  AUTO_MIGRATE=true \
  sh "$ENTRYPOINT"; then
  echo "缺少迁移凭据时入口必须返回非零" >&2
  exit 1
fi
if [ -s "$LOG_FILE" ]; then
  echo "缺少迁移凭据时不得执行迁移或启动 Supervisor" >&2
  exit 1
fi

echo "== 容器入口测试完成 =="
