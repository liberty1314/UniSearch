#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== 发布候选: 本地质量检查 =="
"$ROOT_DIR/scripts/tests/local-quality.sh"

echo "== 发布候选: Docker smoke =="
"$ROOT_DIR/scripts/tests/docker-smoke.sh"

echo "== 发布候选: Redis/MySQL 集成环境 =="
"$ROOT_DIR/scripts/tests/integration-env.sh"

echo "== 发布候选: Playwright E2E =="
(cd "$ROOT_DIR/frontend" && pnpm exec playwright test)

echo "== 发布候选验证完成 =="
