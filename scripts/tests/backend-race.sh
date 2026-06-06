#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export GOCACHE="$ROOT_DIR/.cache/go-build"
mkdir -p "$GOCACHE"

echo "== 后端 race 测试 =="
cd "$ROOT_DIR/backend"
go test -race ./service ./util/cache -count=1

echo "== 后端 race 测试完成 =="
