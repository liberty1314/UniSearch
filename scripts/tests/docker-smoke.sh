#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${UNISEARCH_SMOKE_IMAGE:-unisearch:smoke}"
SMOKE_ID="${UNISEARCH_SMOKE_ID:-$$}"
NETWORK_NAME="unisearch-smoke-${SMOKE_ID}"
MYSQL_CONTAINER="unisearch-smoke-mysql-${SMOKE_ID}"
REDIS_CONTAINER="unisearch-smoke-redis-${SMOKE_ID}"
APP_CONTAINER="unisearch-smoke-app-${SMOKE_ID}"
MYSQL_ROOT_PASSWORD=""
MYSQL_MIGRATION_USER="unisearch_smoke_migrate"
MYSQL_MIGRATION_PASSWORD=""
MYSQL_RUNTIME_USER="unisearch_smoke_runtime"
MYSQL_RUNTIME_PASSWORD=""
REDIS_PASSWORD=""
AUTH_JWT_SECRET=""
RESOURCE_PUBLIC_ID_SECRET=""
SECRET_MASTER_KEY=""
INITIAL_ADMIN_PASSWORD=""

source "$ROOT_DIR/scripts/tests/lib/docker-preflight.sh"

require_docker_daemon
if ! command -v openssl >/dev/null 2>&1; then
  echo "缺少 openssl，无法生成 Docker smoke 临时凭据" >&2
  exit 1
fi

MYSQL_ROOT_PASSWORD="$(openssl rand -hex 24)"
MYSQL_MIGRATION_PASSWORD="$(openssl rand -hex 24)"
MYSQL_RUNTIME_PASSWORD="$(openssl rand -hex 24)"
REDIS_PASSWORD="$(openssl rand -hex 24)"
AUTH_JWT_SECRET="$(openssl rand -hex 32)"
RESOURCE_PUBLIC_ID_SECRET="$(openssl rand -hex 32)"
SECRET_MASTER_KEY="$(openssl rand -hex 32)"
INITIAL_ADMIN_PASSWORD="SmokeA1!$(openssl rand -hex 16)"

cleanup() {
  docker rm -f "$APP_CONTAINER" "$MYSQL_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== Docker smoke: 构建镜像 =="
docker build -t "$IMAGE_NAME" "$ROOT_DIR"

echo "== Docker smoke: 验证默认用户 =="
uid="$(docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c 'id -u')"
if [ "$uid" != "10001" ]; then
  echo "镜像默认 UID 必须为 10001，实际为 $uid" >&2
  exit 1
fi

echo "== Docker smoke: 验证运行目录权限 =="
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c '
  test -w /app/cache
  test -w /app/logs
  test -w /tmp/nginx
  test -w /tmp/supervisor
  test ! -w /app/backend/unisearch
  test ! -w /app/backend/unisearch-migrate
  test ! -w /usr/share/nginx/html/index.html
'

echo "== Docker smoke: 验证后端二进制 =="
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c 'test -x /app/backend/unisearch'

echo "== Docker smoke: 验证迁移二进制 =="
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c 'test -x /app/backend/unisearch-migrate && /app/backend/unisearch-migrate -help >/dev/null'

echo "== Docker smoke: 验证 Nginx 配置和镜像端口 =="
docker run --rm --entrypoint nginx "$IMAGE_NAME" -t
if ! docker image inspect "$IMAGE_NAME" --format '{{json .Config.ExposedPorts}}' | grep -q '8080/tcp'; then
  echo "镜像必须暴露 8080/tcp" >&2
  exit 1
fi

echo "== Docker smoke: 启动隔离数据服务 =="
docker network create "$NETWORK_NAME" >/dev/null
docker run -d \
  --name "$MYSQL_CONTAINER" \
  --network "$NETWORK_NAME" \
  --network-alias mysql \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci \
  --default-authentication-plugin=mysql_native_password >/dev/null

docker run -d \
  --name "$REDIS_CONTAINER" \
  --network "$NETWORK_NAME" \
  --network-alias redis \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  redis:7-alpine \
  sh -c 'redis-server --appendonly no --requirepass "$REDIS_PASSWORD"' >/dev/null

echo "== Docker smoke: 等待数据服务就绪 =="
for _ in {1..60}; do
  if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null

echo "== Docker smoke: 创建迁移账号与运行账号 =="
docker exec -i "$MYSQL_CONTAINER" mysql -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" >/dev/null 2>&1 <<SQL
CREATE USER '${MYSQL_MIGRATION_USER}'@'%' IDENTIFIED BY '${MYSQL_MIGRATION_PASSWORD}';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
ON \`unisearch\`.* TO '${MYSQL_MIGRATION_USER}'@'%';
CREATE USER '${MYSQL_RUNTIME_USER}'@'%' IDENTIFIED BY '${MYSQL_RUNTIME_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE
ON \`unisearch\`.* TO '${MYSQL_RUNTIME_USER}'@'%';
SQL

for _ in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG; then
    break
  fi
  sleep 1
done
docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping | grep -q PONG

echo "== Docker smoke: 使用迁移账号显式执行数据库迁移 =="
docker run --rm \
  --network "$NETWORK_NAME" \
  --entrypoint /app/backend/unisearch-migrate \
  -e APP_ENV=production \
  -e ALLOWED_ORIGINS=https://search.example.com \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e DB_USER="$MYSQL_MIGRATION_USER" \
  -e DB_PASSWORD="$MYSQL_MIGRATION_PASSWORD" \
  -e DB_NAME=unisearch \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e AUTH_JWT_SECRET="$AUTH_JWT_SECRET" \
  -e RESOURCE_PUBLIC_ID_SECRET="$RESOURCE_PUBLIC_ID_SECRET" \
  -e SECRET_MASTER_KEY="$SECRET_MASTER_KEY" \
  -e SECRET_BACKEND=environment \
  -e INITIAL_ADMIN_USERNAME=docker_smoke_admin \
  -e INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
  -e ENABLED_PLUGINS= \
  "$IMAGE_NAME" >/dev/null

echo "== Docker smoke: 启动非 root 应用容器 =="
docker run -d \
  --name "$APP_CONTAINER" \
  --network "$NETWORK_NAME" \
  -p "127.0.0.1::8080" \
  -e APP_ENV=production \
  -e ALLOWED_ORIGINS=https://search.example.com \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e DB_USER="$MYSQL_RUNTIME_USER" \
  -e DB_PASSWORD="$MYSQL_RUNTIME_PASSWORD" \
  -e DB_NAME=unisearch \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e AUTH_JWT_SECRET="$AUTH_JWT_SECRET" \
  -e RESOURCE_PUBLIC_ID_SECRET="$RESOURCE_PUBLIC_ID_SECRET" \
  -e SECRET_MASTER_KEY="$SECRET_MASTER_KEY" \
  -e SECRET_BACKEND=environment \
  -e INITIAL_ADMIN_USERNAME=docker_smoke_admin \
  -e INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
  -e ENABLED_PLUGINS= \
  "$IMAGE_NAME" >/dev/null

published_address="$(docker port "$APP_CONTAINER" 8080/tcp)"
if [[ "$published_address" != 127.0.0.1:* ]]; then
  echo "应用端口必须只绑定到 127.0.0.1，实际为 $published_address" >&2
  exit 1
fi
base_url="http://${published_address}"

echo "== Docker smoke: 等待前后端健康检查 =="
for _ in {1..60}; do
  if curl --silent --show-error --fail --max-time 2 "$base_url/health" >/dev/null 2>&1 \
    && curl --silent --show-error --fail --max-time 2 "$base_url/api/health" >/dev/null 2>&1; then
    break
  fi
  if ! docker inspect "$APP_CONTAINER" --format '{{.State.Running}}' | grep -q true; then
    docker logs "$APP_CONTAINER" >&2
    echo "应用容器在健康检查前退出" >&2
    exit 1
  fi
  sleep 2
done
curl --silent --show-error --fail --max-time 5 "$base_url/health" >/dev/null
curl --silent --show-error --fail --max-time 5 "$base_url/api/health" >/dev/null

echo "== Docker smoke: 验证运行进程和日志权限 =="
docker exec "$APP_CONTAINER" /bin/sh -c '
  found_backend=0
  found_nginx=0
  for process_dir in /proc/[0-9]*; do
    executable="$(readlink "$process_dir/exe" 2>/dev/null || true)"
    case "$executable" in
      /app/backend/unisearch)
        found_backend=1
        ;;
      /usr/sbin/nginx)
        found_nginx=1
        ;;
      *)
        continue
        ;;
    esac
    process_uid="$(awk "/^Uid:/ { print \$2 }" "$process_dir/status")"
    if [ "$process_uid" = "0" ]; then
      echo "Nginx 或后端进程不能以 root 运行" >&2
      exit 1
    fi
  done
  test "$found_backend" = "1"
  test "$found_nginx" = "1"
  test "$(stat -c %a /app/logs/nginx-access.log)" = "600"
  test "$(stat -c %a /app/logs/nginx-error.log)" = "600"
'

echo "== Docker smoke 完成 =="
