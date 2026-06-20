#!/usr/bin/env bash
set -u -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log_info() { echo "[INFO] $1"; }
log_success() { echo "[✓] $1"; }
log_warning() { echo "[⚠] $1"; }

if ! command -v mysql >/dev/null 2>&1; then
  log_warning "未找到 mysql 客户端，跳过测试数据清理"
  exit 0
fi

set +u
set -a
[ -f "$ROOT_DIR/.env" ] && source "$ROOT_DIR/.env"
[ -f "$ROOT_DIR/.env.local" ] && source "$ROOT_DIR/.env.local"
set +a
set -u

db_host="${DB_HOST:-localhost}"
db_port="${DB_PORT:-3306}"
db_user="${DB_USER:-root}"
db_password="${DB_PASSWORD:-root}"
db_name="${DB_NAME:-unisearch}"

escape_sql() {
  printf "%s" "$1" | sed "s/'/''/g"
}

build_exact_user_filter() {
  local first=1
  local filter=""
  for username in "$@"; do
    [ -z "$username" ] && continue
    local escaped
    escaped="$(escape_sql "$username")"
    if [ "$first" -eq 1 ]; then
      filter="username = '$escaped'"
      first=0
    else
      filter="$filter OR username = '$escaped'"
    fi
  done
  printf "%s" "$filter"
}

if [ "$#" -gt 0 ]; then
  user_filter="$(build_exact_user_filter "$@")"
else
  user_filter="username LIKE 'codexqa\\_%'"
fi

if [ -z "$user_filter" ]; then
  log_info "未提供测试用户名，跳过清理"
  exit 0
fi

sql=$(cat <<SQL
CREATE TEMPORARY TABLE IF NOT EXISTS codexqa_cleanup_user_ids (id BIGINT PRIMARY KEY, username VARCHAR(128));
DELETE FROM codexqa_cleanup_user_ids;
INSERT INTO codexqa_cleanup_user_ids (id, username)
  SELECT id, username FROM users WHERE $user_filter;
DELETE FROM user_login_daily_stats WHERE user_id IN (SELECT id FROM codexqa_cleanup_user_ids);
DELETE FROM refresh_tokens WHERE username IN (SELECT username FROM codexqa_cleanup_user_ids);
DELETE FROM users WHERE id IN (SELECT id FROM codexqa_cleanup_user_ids);
SELECT username FROM codexqa_cleanup_user_ids ORDER BY username;
SQL
)

log_info "清理测试数据: $user_filter"
if cleaned_users=$(mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_password" "$db_name" --batch --skip-column-names -e "$sql" 2>/dev/null); then
  if [ -n "$cleaned_users" ]; then
    log_success "已清理测试用户: $(echo "$cleaned_users" | paste -sd ',' -)"
  else
    log_info "没有发现需要清理的 codexqa 测试用户"
  fi
  exit 0
fi

log_warning "测试数据清理失败，请按需手动清理匹配用户: $user_filter"
exit 0
