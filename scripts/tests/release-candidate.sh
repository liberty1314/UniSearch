#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ "${UNISEARCH_REAL_E2E:-0}" != "1" ]; then
  echo "发布候选必须设置 UNISEARCH_REAL_E2E=1" >&2
  exit 1
fi
if [ -z "${UNISEARCH_API_BASE_URL:-}" ]; then
  echo "发布候选必须设置 UNISEARCH_API_BASE_URL" >&2
  exit 1
fi
go_bin="$(go env GOBIN)"
if [ -z "$go_bin" ]; then
  go_bin="$(go env GOPATH)/bin"
fi
export PATH="$go_bin:$PATH"
for command_name in docker openssl go pnpm gitleaks govulncheck; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "发布候选缺少必要命令: $command_name" >&2
    exit 1
  fi
done

echo "== 发布候选: 安全基础门禁 =="
"$ROOT_DIR/scripts/tests/security-gate.sh"

echo "== 发布候选: Playwright mock E2E =="
(cd "$ROOT_DIR/frontend" && pnpm run e2e:mock)

echo "== 发布候选: Playwright 真实后端 E2E =="
(cd "$ROOT_DIR/frontend" && pnpm run e2e:real)

echo "== 发布候选: 真实搜索 smoke =="
"$ROOT_DIR/scripts/tests/real-search-smoke.sh"

echo "== 发布候选: Docker smoke =="
"$ROOT_DIR/scripts/tests/docker-smoke.sh"

echo "== 发布候选: TLS 终止与 loopback smoke =="
"$ROOT_DIR/scripts/tests/tls-proxy-smoke.sh"

echo "== 发布候选: Redis/MySQL 与刷新会话破坏性迁移演练 =="
"$ROOT_DIR/scripts/tests/integration-env.sh"

echo "== 发布候选验证完成 =="
