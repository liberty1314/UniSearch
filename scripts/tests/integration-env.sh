#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_ID="${UNISEARCH_INTEGRATION_RUN_ID:-$(date +%s)}"
MYSQL_CONTAINER="unisearch-it-mysql-${RUN_ID}"
REDIS_CONTAINER="unisearch-it-redis-${RUN_ID}"
MYSQL_PORT="${UNISEARCH_IT_MYSQL_PORT:-3307}"
REDIS_PORT="${UNISEARCH_IT_REDIS_PORT:-6380}"

source "$ROOT_DIR/scripts/tests/lib/docker-preflight.sh"

require_docker_daemon

cleanup() {
  docker rm -f "$MYSQL_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== 集成环境: 启动 MySQL 与 Redis =="
docker run -d \
  --name "$MYSQL_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=unisearch \
  -e TZ=Asia/Shanghai \
  -p "127.0.0.1:${MYSQL_PORT}:3306" \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci \
  --default-authentication-plugin=mysql_native_password >/dev/null

docker run -d \
  --name "$REDIS_CONTAINER" \
  -p "127.0.0.1:${REDIS_PORT}:6379" \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru >/dev/null

echo "== 集成环境: 等待 MySQL 就绪 =="
for _ in {1..60}; do
  if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -proot --silent >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -proot --silent >/dev/null

echo "== 集成环境: 等待 Redis 就绪 =="
for _ in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli ping | grep -q PONG; then
    break
  fi
  sleep 1
done
docker exec "$REDIS_CONTAINER" redis-cli ping | grep -q PONG

echo "== 集成环境: 执行数据库迁移 =="
(
  cd "$ROOT_DIR/backend"
  DB_HOST=127.0.0.1 \
  DB_PORT="$MYSQL_PORT" \
  DB_USER=root \
  DB_PASSWORD=root \
  DB_NAME=unisearch \
  REDIS_HOST=127.0.0.1 \
  REDIS_PORT="$REDIS_PORT" \
  REDIS_PASSWORD= \
  REDIS_DB=0 \
  REDIS_TTL=3600 \
  go run ./cmd/migrate
)

echo "== 集成环境验证完成 =="
