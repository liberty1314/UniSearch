#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export GOCACHE="$ROOT_DIR/.cache/go-build"
mkdir -p "$GOCACHE"

echo "== 后端测试 =="
(cd "$ROOT_DIR/backend" && go test ./...)

echo "== 前端类型检查 =="
(cd "$ROOT_DIR/frontend" && pnpm run check)

echo "== 前端静态检查 =="
(cd "$ROOT_DIR/frontend" && pnpm run lint)

echo "== 前端单元测试 =="
(cd "$ROOT_DIR/frontend" && pnpm exec vitest run)

echo "== 本地质量检查完成 =="
