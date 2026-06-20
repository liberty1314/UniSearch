#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE_URL="${UNISEARCH_API_BASE_URL:-http://localhost:8888}"
SMOKE_KEYWORD="${UNISEARCH_SMOKE_KEYWORD:-铁拳教育}"
SMOKE_PLUGINS="${UNISEARCH_SMOKE_PLUGINS:-sidhub}"
SMOKE_TIMEOUT="${UNISEARCH_SMOKE_TIMEOUT:-25}"

TMP_DIR="$(mktemp -d)"
REGISTER_BODY="$TMP_DIR/register.json"
REGISTER_RESPONSE="$TMP_DIR/register-response.json"
SEARCH_BODY="$TMP_DIR/search.json"
SEARCH_RESPONSE="$TMP_DIR/search-response.json"

USERNAME=""
PASSWORD="CodexQA${RANDOM}x9"

log_info() { echo "[INFO] $1"; }
log_success() { echo "[✓] $1"; }
log_warning() { echo "[⚠] $1"; }
log_error() { echo "[✗] $1" >&2; }

cleanup_user() {
  if [ -z "$USERNAME" ]; then
    return 0
  fi

  "$ROOT_DIR/scripts/tests/cleanup-test-data.sh" "$USERNAME" || log_warning "测试用户清理脚本执行失败: $USERNAME"
}

cleanup() {
  cleanup_user
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    log_error "缺少必要命令: $command_name"
    exit 1
  fi
}

request_json() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  local output_file="$4"
  shift 4

  local status
  if ! status=$(curl --silent --show-error --output "$output_file" --write-out "%{http_code}" \
    --max-time "$SMOKE_TIMEOUT" \
    --request "$method" \
    --header "Content-Type: application/json" \
    "$@" \
    --data @"$body_file" \
    "$url"); then
    log_error "请求超时或连接失败: $method $url"
    sed -n '1,20p' "$output_file" >&2 || true
    exit 1
  fi

  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    log_error "请求失败: $method $url 返回 HTTP $status"
    sed -n '1,20p' "$output_file" >&2 || true
    exit 1
  fi
}

build_register_body() {
  node - "$USERNAME" "$PASSWORD" > "$REGISTER_BODY" <<'NODE'
const [username, password] = process.argv.slice(2);
process.stdout.write(JSON.stringify({ username, password }));
NODE
}

build_search_body() {
  node - "$SMOKE_KEYWORD" "$SMOKE_PLUGINS" > "$SEARCH_BODY" <<'NODE'
const [keyword, pluginsText] = process.argv.slice(2);
const plugins = pluginsText.split(',').map((item) => item.trim()).filter(Boolean);
process.stdout.write(JSON.stringify({
  kw: keyword,
  src: 'plugin',
  plugins,
  refresh: true,
}));
NODE
}

extract_access_token() {
  node - "$REGISTER_RESPONSE" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const token = payload?.data?.access_token || payload?.data?.accessToken || '';
if (!token) {
  process.exit(1);
}
process.stdout.write(token);
NODE
}

validate_search_response() {
  node - "$SEARCH_RESPONSE" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const code = payload?.code;
const data = payload?.data;
const total = Number(data?.total || 0);
const resources = Array.isArray(data?.resources) ? data.resources.length : 0;
const warnings = Array.isArray(data?.warnings) ? data.warnings.length : 0;

if (!(code === 0 || code === 200) || !data) {
  console.error(`搜索响应不是成功格式: code=${code}`);
  process.exit(1);
}

if (total <= 0 && resources <= 0 && warnings <= 0) {
  console.error('搜索响应没有结果，也没有搜索源 warning，无法证明真实链路完成降级返回');
  process.exit(1);
}

console.log(`真实搜索完成: total=${total}, resources=${resources}, warnings=${warnings}`);
NODE
}

require_command curl
require_command node

log_info "检查后端健康接口: $API_BASE_URL/api/health"
if ! curl --silent --show-error --fail --max-time 5 "$API_BASE_URL/api/health" >/dev/null; then
  log_error "后端健康检查失败，请先启动本地后端服务"
  exit 1
fi

USERNAME="codexqa_$(date +%H%M%S)$(printf '%02d' $((RANDOM % 100)))"
build_register_body
build_search_body

log_info "注册一次性测试用户: $USERNAME"
request_json POST "$API_BASE_URL/api/auth/register" "$REGISTER_BODY" "$REGISTER_RESPONSE"

ACCESS_TOKEN="$(extract_access_token)"
log_success "测试用户注册并登录成功"

log_info "执行真实搜索 smoke: keyword=$SMOKE_KEYWORD, plugins=$SMOKE_PLUGINS, timeout=${SMOKE_TIMEOUT}s"
request_json POST "$API_BASE_URL/api/search" "$SEARCH_BODY" "$SEARCH_RESPONSE" \
  --header "Authorization: Bearer $ACCESS_TOKEN"

validate_search_response
log_success "真实搜索 smoke 通过"
