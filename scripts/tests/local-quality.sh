#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export GOCACHE="$ROOT_DIR/.cache/go-build"
mkdir -p "$GOCACHE"

echo "== 后端测试 =="
(cd "$ROOT_DIR/backend" && go test ./...)

echo "== 后端 race 测试 =="
"$ROOT_DIR/scripts/tests/backend-race.sh"

echo "== 后端构建 =="
(cd "$ROOT_DIR/backend" && go build ./...)

echo "== 前端类型检查 =="
(cd "$ROOT_DIR/frontend" && ./node_modules/.bin/tsc -b --noEmit)

echo "== 前端静态检查 =="
(cd "$ROOT_DIR/frontend" && ./node_modules/.bin/eslint .)

echo "== 前端聚焦测试 =="
"$ROOT_DIR/scripts/tests/frontend-focused.sh"

echo "== 前端单元测试 =="
(cd "$ROOT_DIR/frontend" && ./node_modules/.bin/vitest run)

echo "== 前端生产构建 =="
(cd "$ROOT_DIR/frontend" && ./node_modules/.bin/vite build)

if [ "${UNISEARCH_REAL_SEARCH_SMOKE:-0}" = "1" ]; then
  echo "== 真实搜索 smoke =="
  "$ROOT_DIR/scripts/tests/real-search-smoke.sh"
else
  echo "== 跳过真实搜索 smoke（设置 UNISEARCH_REAL_SEARCH_SMOKE=1 可启用）=="
fi

echo "== 本地质量检查完成 =="
