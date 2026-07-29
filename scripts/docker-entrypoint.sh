#!/bin/sh

set -eu

auto_migrate="${AUTO_MIGRATE:-true}"
migration_db_user="${MIGRATION_DB_USER:-${DB_USER:-}}"
migration_db_password="${MIGRATION_DB_PASSWORD:-${DB_PASSWORD:-}}"
migration_binary="${UNISEARCH_MIGRATION_BINARY:-/app/backend/unisearch-migrate}"
supervisor_binary="${UNISEARCH_SUPERVISOR_BINARY:-/usr/bin/supervisord}"
supervisor_config="${UNISEARCH_SUPERVISOR_CONFIG:-/etc/supervisord.conf}"

case "$auto_migrate" in
    true|1|yes|on)
        if [ -z "$migration_db_user" ] || [ -z "$migration_db_password" ]; then
            echo "自动数据库迁移已启用，但未配置迁移数据库凭据" >&2
            exit 64
        fi

        echo "正在执行数据库迁移..."
        DB_USER="$migration_db_user" \
        DB_PASSWORD="$migration_db_password" \
        "$migration_binary" -migrate-refresh-token-sessions
        echo "数据库迁移完成"
        ;;
    false|0|no|off)
        echo "已跳过自动数据库迁移（AUTO_MIGRATE=${auto_migrate}）"
        ;;
    *)
        echo "AUTO_MIGRATE 值无效，仅支持 true/false" >&2
        exit 64
        ;;
esac

# 迁移凭据只对迁移子进程可见，不传入长期运行的 Supervisor 和应用进程。
unset MIGRATION_DB_USER MIGRATION_DB_PASSWORD migration_db_user migration_db_password
unset UNISEARCH_MIGRATION_BINARY UNISEARCH_SUPERVISOR_BINARY UNISEARCH_SUPERVISOR_CONFIG

exec "$supervisor_binary" -c "$supervisor_config"
