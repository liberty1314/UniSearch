#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${UNISEARCH_SMOKE_IMAGE:-unisearch:smoke}"

source "$ROOT_DIR/scripts/tests/lib/docker-preflight.sh"

require_docker_daemon

echo "== Docker smoke: 构建镜像 =="
docker build -t "$IMAGE_NAME" "$ROOT_DIR"

echo "== Docker smoke: 验证后端二进制 =="
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c 'test -x /app/backend/unisearch'

echo "== Docker smoke: 验证迁移二进制 =="
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c 'test -x /app/backend/unisearch-migrate && /app/backend/unisearch-migrate -help >/dev/null'

echo "== Docker smoke 完成 =="
