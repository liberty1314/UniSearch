#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export GOCACHE="$ROOT_DIR/.cache/go-build"
mkdir -p "$GOCACHE"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少 $1，安全门禁无法继续" >&2
    exit 1
  fi
}

require_command gitleaks
require_command git

scan_git_index() {
  local scan_root scan_status
  scan_root="$(mktemp -d "${TMPDIR:-/tmp}/unisearch-gitleaks-index.XXXXXX")"

  (cd "$ROOT_DIR" && git checkout-index --all --force --prefix="$scan_root/")
  if gitleaks dir --redact --config "$ROOT_DIR/.gitleaks.toml" "$scan_root"; then
    scan_status=0
  else
    scan_status=$?
  fi
  find "$scan_root" -depth -delete
  return "$scan_status"
}

scan_git_worktree() {
  local scan_root source_path target_path scan_status
  scan_root="$(mktemp -d "${TMPDIR:-/tmp}/unisearch-gitleaks.XXXXXX")"

  while IFS= read -r -d '' relative_path; do
    source_path="$ROOT_DIR/$relative_path"
    if [ ! -f "$source_path" ]; then
      continue
    fi
    target_path="$scan_root/$relative_path"
    mkdir -p "$(dirname "$target_path")"
    cp -p "$source_path" "$target_path"
  done < <(cd "$ROOT_DIR" && git ls-files --cached --others --exclude-standard -z)

  if gitleaks dir --redact --config "$ROOT_DIR/.gitleaks.toml" "$scan_root"; then
    scan_status=0
  else
    scan_status=$?
  fi
  find "$scan_root" -depth -delete
  return "$scan_status"
}

scan_git_delivery_set() {
  local index_scan_status=0 worktree_scan_status=0

  echo "== 安全门禁: Git 索引秘密扫描 =="
  if scan_git_index; then
    index_scan_status=0
  else
    index_scan_status=$?
  fi

  echo "== 安全门禁: Git 工作目录秘密扫描 =="
  if scan_git_worktree; then
    worktree_scan_status=0
  else
    worktree_scan_status=$?
  fi

  if [ "$index_scan_status" -ne 0 ] || [ "$worktree_scan_status" -ne 0 ]; then
    echo "Git 工作集秘密扫描未通过：索引状态=${index_scan_status}，工作目录状态=${worktree_scan_status}" >&2
    return 1
  fi

  echo "Git 工作集秘密扫描通过：索引状态=0，工作目录状态=0"
}

if [ "${UNISEARCH_SECURITY_GATE_SCAN_ONLY:-0}" = "1" ]; then
  scan_git_delivery_set
  exit 0
fi

require_command go
go_bin="$(go env GOBIN)"
if [ -z "$go_bin" ]; then
  go_bin="$(go env GOPATH)/bin"
fi
export PATH="$go_bin:$PATH"

require_command govulncheck
require_command openssl
require_command pnpm

echo "== 安全门禁: 容器自动迁移入口测试 =="
"$ROOT_DIR/scripts/tests/docker-entrypoint-test.sh"

echo "== 安全门禁: 后端全量测试 =="
(cd "$ROOT_DIR/backend" && go test ./... -count=1)

echo "== 安全门禁: 后端 race 测试 =="
"$ROOT_DIR/scripts/tests/backend-race.sh"

echo "== 安全门禁: Go 静态检查 =="
(cd "$ROOT_DIR/backend" && go vet ./...)

echo "== 安全门禁: Go 可达漏洞扫描 =="
(cd "$ROOT_DIR/backend" && govulncheck ./...)

echo "== 安全门禁: 前端生产依赖审计 =="
pnpm --dir "$ROOT_DIR/frontend" audit --prod --audit-level high

echo "== 安全门禁: 前端单元测试 =="
pnpm --dir "$ROOT_DIR/frontend" test -- --run

echo "== 安全门禁: 前端类型检查 =="
pnpm --dir "$ROOT_DIR/frontend" run check

echo "== 安全门禁: 前端静态检查 =="
pnpm --dir "$ROOT_DIR/frontend" run lint

echo "== 安全门禁: 前端生产构建 =="
pnpm --dir "$ROOT_DIR/frontend" run build

echo "== 安全门禁: Git 未暂存差异格式检查 =="
(cd "$ROOT_DIR" && git diff --check)

echo "== 安全门禁: Git 暂存差异格式检查 =="
(cd "$ROOT_DIR" && git diff --cached --check)

echo "== 安全门禁: Git 秘密快照回归测试 =="
"$ROOT_DIR/scripts/tests/security-gate-secret-scan-test.sh"

history_scan_status=0
workset_scan_status=0

echo "== 安全门禁: Git 历史秘密扫描 =="
if gitleaks git --redact --config "$ROOT_DIR/.gitleaks.toml" "$ROOT_DIR"; then
  history_scan_status=0
else
  history_scan_status=$?
fi

echo "== 安全门禁: Git 工作集双快照扫描 =="
if scan_git_delivery_set; then
  workset_scan_status=0
else
  workset_scan_status=$?
fi

if [ "$history_scan_status" -ne 0 ] || [ "$workset_scan_status" -ne 0 ]; then
  echo "秘密扫描未通过：历史状态=${history_scan_status}，工作集状态=${workset_scan_status}" >&2
  exit 1
fi

echo "== 安全门禁完成 =="
