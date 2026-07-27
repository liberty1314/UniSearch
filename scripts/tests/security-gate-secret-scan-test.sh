#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/unisearch-security-gate-test.XXXXXX")"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

mkdir -p "$TMP_ROOT/scripts/tests"
cp "$ROOT_DIR/scripts/tests/security-gate.sh" "$TMP_ROOT/scripts/tests/security-gate.sh"
cp "$ROOT_DIR/.gitleaks.toml" "$TMP_ROOT/.gitleaks.toml"

git -C "$TMP_ROOT" init --quiet
git -C "$TMP_ROOT" config user.name "安全门禁测试"
git -C "$TMP_ROOT" config user.email "security-gate-test@example.invalid"

if ! command -v openssl >/dev/null 2>&1; then
  echo "缺少 openssl，无法生成安全门禁测试夹具" >&2
  exit 1
fi

printf '%s\n' '基线内容' >"$TMP_ROOT/fixture.txt"
git -C "$TMP_ROOT" add fixture.txt
git -C "$TMP_ROOT" commit --quiet -m "test: 创建安全门禁夹具"

secret_value="$(openssl rand -hex 32)"
printf 'API_KEY=%s\n' "$secret_value" >"$TMP_ROOT/fixture.txt"
git -C "$TMP_ROOT" add fixture.txt
printf '%s\n' '工作目录已经清理秘密' >"$TMP_ROOT/fixture.txt"

set +e
scan_output="$(UNISEARCH_SECURITY_GATE_SCAN_ONLY=1 "$TMP_ROOT/scripts/tests/security-gate.sh" 2>&1)"
scan_status=$?
set -e

if [ "$scan_status" -eq 0 ]; then
  printf '%s\n' "$scan_output" >&2
  echo "暂存区含秘密时，扫描必须返回非零" >&2
  exit 1
fi
if [[ "$scan_output" != *"索引状态=1，工作目录状态=0"* ]]; then
  printf '%s\n' "$scan_output" >&2
  echo "扫描必须分别报告 Git 索引与工作目录状态" >&2
  exit 1
fi

git -C "$TMP_ROOT" add fixture.txt
UNISEARCH_SECURITY_GATE_SCAN_ONLY=1 "$TMP_ROOT/scripts/tests/security-gate.sh" >/dev/null

echo "安全门禁秘密快照测试通过"
