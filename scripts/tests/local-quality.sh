#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== 本地质量: 安全基础门禁 =="
"$ROOT_DIR/scripts/tests/security-gate.sh"

echo "== 本地质量: 真实搜索 smoke =="
"$ROOT_DIR/scripts/tests/real-search-smoke.sh"

echo "== 本地质量检查完成 =="
