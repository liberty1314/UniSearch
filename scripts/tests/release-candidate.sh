#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== 发布候选: 本地质量检查 =="
"$ROOT_DIR/scripts/tests/local-quality.sh"

echo "== 发布候选: Playwright mock E2E =="
(cd "$ROOT_DIR/frontend" && pnpm run frontend:e2e:mock)

echo "== 发布候选: 真实搜索 smoke =="
"$ROOT_DIR/scripts/tests/real-search-smoke.sh"

if [ "${UNISEARCH_REAL_E2E:-0}" = "1" ]; then
  echo "== 发布候选: Playwright 真实后端 E2E =="
  (cd "$ROOT_DIR/frontend" && pnpm run frontend:e2e:real)
else
  echo "== 跳过 Playwright 真实后端 E2E（设置 UNISEARCH_REAL_E2E=1 可启用）=="
fi

echo "== 发布候选: Docker smoke =="
"$ROOT_DIR/scripts/tests/docker-smoke.sh"

echo "== 发布候选: Redis/MySQL 集成环境 =="
"$ROOT_DIR/scripts/tests/integration-env.sh"

echo "== 发布候选验证完成 =="
