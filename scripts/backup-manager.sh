#!/bin/bash

# ==============================================================================
# UniSearch 备份管理系统
# ==============================================================================
# 功能：统一管理备份、恢复、状态检查和定时任务配置
# 用法: sudo ./scripts/backup-manager.sh
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 配置
BACKUP_BASE_DIR="${BACKUP_PATH:-/opt/unisearch/backup}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="/var/log/unisearch/backup.log"
MYSQL_CONTAINER="unisearch-mysql"
REDIS_CONTAINER="unisearch-redis"

# 获取脚本目录和项目目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[✗]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_step() { echo -e "${CYAN}[→]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

# 检查权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 加载环境变量
load_env() {
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    else
        log_error "环境配置文件不存在: $ENV_FILE"
        exit 1
    fi
}

# ==============================================================================
# 备份功能
# ==============================================================================
do_backup() {
    local backup_type="${1:-incremental}"
    local date_format=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$BACKUP_BASE_DIR/$date_format"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        执行备份 (类型: $backup_type)                    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 创建备份目录
    log_step "创建备份目录: $backup_dir"
    mkdir -p "$backup_dir"
    
    cat > "$backup_dir/backup_info.txt" << EOF
备份类型: $backup_type
备份时间: $(date '+%Y-%m-%d %H:%M:%S')
数据库: $DB_NAME
主机: $(hostname)
EOF
    
    # 备份 MySQL
    log_step "备份 MySQL 数据库..."
    local mysql_backup="$backup_dir/mysql_${backup_type}_${date_format}.sql"
    local mysql_cnf="/tmp/mysql_backup_$$.cnf"
    
    cat > "$mysql_cnf" << EOF
[client]
user=${DB_USER}
password=${DB_PASSWORD}
EOF
    chmod 600 "$mysql_cnf"
    docker cp "$mysql_cnf" "$MYSQL_CONTAINER:/tmp/my.cnf"
    
    if docker exec "$MYSQL_CONTAINER" mysqldump \
        --defaults-extra-file=/tmp/my.cnf \
        --single-transaction --quick --lock-tables=false \
        --routines --triggers --events \
        "$DB_NAME" > "$mysql_backup" 2>&1; then
        
        docker exec "$MYSQL_CONTAINER" rm -f /tmp/my.cnf
        rm -f "$mysql_cnf"
        
        if [ -s "$mysql_backup" ] && grep -q "CREATE TABLE" "$mysql_backup"; then
            gzip "$mysql_backup"
            local size=$(du -h "${mysql_backup}.gz" | cut -f1)
            log_success "MySQL 备份完成 (大小: $size)"
            echo "MySQL 备份: $(basename ${mysql_backup}.gz) ($size)" >> "$backup_dir/backup_info.txt"
        else
            log_error "MySQL 备份文件无效"
            rm -f "$mysql_backup"
        fi
    else
        log_error "MySQL 备份失败"
        docker exec "$MYSQL_CONTAINER" rm -f /tmp/my.cnf 2>/dev/null
        rm -f "$mysql_cnf"
    fi
    
    # 备份 Redis
    log_step "备份 Redis 数据..."
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE 2>/dev/null || true
    else
        docker exec "$REDIS_CONTAINER" redis-cli BGSAVE 2>/dev/null || true
    fi
    sleep 3
    
    local redis_backup="$backup_dir/redis_${date_format}.rdb"
    docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$redis_backup" 2>/dev/null || {
        log_warning "Redis 备份文件不存在"
    }
    
    if [ -f "$redis_backup" ]; then
        gzip "$redis_backup"
        local size=$(du -h "${redis_backup}.gz" | cut -f1)
        log_success "Redis 备份完成 (大小: $size)"
        echo "Redis 备份: $(basename ${redis_backup}.gz) ($size)" >> "$backup_dir/backup_info.txt"
    fi

    # 备份 Volumes
    log_step "备份 Docker Volumes..."
    if docker volume ls | grep -q "unisearch_mysql_data"; then
        docker run --rm -v unisearch_mysql_data:/data -v "$backup_dir:/backup" \
            alpine tar czf "/backup/mysql_volume_${date_format}.tar.gz" -C /data . 2>/dev/null
        local size=$(du -h "$backup_dir/mysql_volume_${date_format}.tar.gz" | cut -f1)
        log_success "MySQL Volume 备份完成 (大小: $size)"
        echo "MySQL Volume: mysql_volume_${date_format}.tar.gz ($size)" >> "$backup_dir/backup_info.txt"
    fi
    
    if docker volume ls | grep -q "unisearch_redis_data"; then
        docker run --rm -v unisearch_redis_data:/data -v "$backup_dir:/backup" \
            alpine tar czf "/backup/redis_volume_${date_format}.tar.gz" -C /data . 2>/dev/null
        local size=$(du -h "$backup_dir/redis_volume_${date_format}.tar.gz" | cut -f1)
        log_success "Redis Volume 备份完成 (大小: $size)"
        echo "Redis Volume: redis_volume_${date_format}.tar.gz ($size)" >> "$backup_dir/backup_info.txt"
    fi
    
    # 备份配置文件
    log_step "备份配置文件..."
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$backup_dir/env.production.backup"
        log_success "配置文件备份完成"
        echo "配置文件: env.production.backup" >> "$backup_dir/backup_info.txt"
    fi
    
    # 清理过期备份
    log_step "清理过期备份（保留 $BACKUP_RETENTION_DAYS 天）..."
    local deleted_count=0
    while IFS= read -r old_backup; do
        if [ -d "$old_backup" ]; then
            rm -rf "$old_backup"
            deleted_count=$((deleted_count + 1))
        fi
    done < <(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +$BACKUP_RETENTION_DAYS)
    
    if [ $deleted_count -gt 0 ]; then
        log_success "已清理 $deleted_count 个过期备份"
    fi
    
    # 显示摘要
    echo ""
    log_success "备份完成！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  备份摘要"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "备份目录: $backup_dir"
    echo "总大小: $(du -sh "$backup_dir" | cut -f1)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    logger -t unisearch-backup "备份完成: $backup_dir (类型: $backup_type)"
}

# ==============================================================================
# 恢复功能
# ==============================================================================
do_restore() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        备份恢复                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 列出可用备份
    log_info "可用的备份目录:"
    echo ""
    ls -1t "$BACKUP_BASE_DIR" 2>/dev/null | grep "^[0-9]" | head -10 | nl
    echo ""
    
    read -p "请输入要恢复的备份目录名称（或输入 q 退出）: " backup_name
    
    if [ "$backup_name" = "q" ] || [ -z "$backup_name" ]; then
        log_info "操作已取消"
        return
    fi
    
    local backup_dir="$BACKUP_BASE_DIR/$backup_name"
    
    if [ ! -d "$backup_dir" ]; then
        log_error "备份目录不存在: $backup_dir"
        return
    fi
    
    # 显示备份信息
    if [ -f "$backup_dir/backup_info.txt" ]; then
        echo ""
        log_info "备份信息:"
        cat "$backup_dir/backup_info.txt" | sed 's/^/  /'
        echo ""
    fi
    
    # 确认操作
    log_warning "此操作将覆盖当前数据库和 Redis 数据！"
    read -p "确认要恢复此备份吗？(yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "操作已取消"
        return
    fi
    
    echo ""
    
    # 恢复 MySQL
    log_step "恢复 MySQL 数据库..."
    local mysql_backup=$(find "$backup_dir" -name "mysql_*.sql.gz" | head -1)
    
    if [ -z "$mysql_backup" ]; then
        log_error "未找到 MySQL 备份文件"
    else
        if zcat "$mysql_backup" | docker exec -i "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null; then
            log_success "MySQL 数据库恢复成功"
        else
            log_error "MySQL 数据库恢复失败"
        fi
    fi
    
    # 恢复 Redis
    log_step "恢复 Redis 数据..."
    local redis_backup=$(find "$backup_dir" -name "redis_*.rdb.gz" | head -1)
    
    if [ -z "$redis_backup" ]; then
        log_warning "未找到 Redis 备份文件"
    else
        if [ -n "$REDIS_PASSWORD" ]; then
            docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning CONFIG SET save "" 2>/dev/null
        else
            docker exec "$REDIS_CONTAINER" redis-cli CONFIG SET save "" 2>/dev/null
        fi
        
        local temp_rdb="/tmp/restore_dump.rdb"
        zcat "$redis_backup" > "$temp_rdb"
        docker cp "$temp_rdb" "$REDIS_CONTAINER:/data/dump.rdb"
        rm -f "$temp_rdb"
        
        log_info "重启 Redis 容器..."
        docker restart "$REDIS_CONTAINER" > /dev/null
        sleep 3
        
        log_success "Redis 数据恢复成功"
    fi
    
    echo ""
    log_success "备份恢复完成！"
    echo ""
}

# ==============================================================================
# 状态检查功能
# ==============================================================================
check_status() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        备份状态检查                                      ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 检查备份目录
    echo -e "${CYAN}[1] 备份目录状态${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -d "$BACKUP_BASE_DIR" ]; then
        echo -e "${GREEN}✓${NC} 备份目录存在: $BACKUP_BASE_DIR"
        
        local backup_count=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d | wc -l)
        backup_count=$((backup_count - 1))
        echo -e "${GREEN}✓${NC} 备份总数: $backup_count"
        
        local total_size=$(du -sh "$BACKUP_BASE_DIR" 2>/dev/null | cut -f1)
        echo -e "${GREEN}✓${NC} 总占用空间: $total_size"
        
        local latest_backup=$(ls -t "$BACKUP_BASE_DIR" | head -1)
        if [ -n "$latest_backup" ]; then
            echo -e "${GREEN}✓${NC} 最新备份: $latest_backup"
            
            if [ -f "$BACKUP_BASE_DIR/$latest_backup/backup_info.txt" ]; then
                echo ""
                echo "最新备份详情:"
                cat "$BACKUP_BASE_DIR/$latest_backup/backup_info.txt" | sed 's/^/  /'
            fi
        fi
    else
        echo -e "${RED}✗${NC} 备份目录不存在: $BACKUP_BASE_DIR"
    fi
    
    echo ""
    
    # 检查定时任务
    echo -e "${CYAN}[2] 定时任务状态${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if crontab -l 2>/dev/null | grep -q "backup-manager.sh"; then
        echo -e "${GREEN}✓${NC} 定时任务已配置"
        echo ""
        echo "定时任务列表:"
        crontab -l 2>/dev/null | grep "backup-manager.sh" | sed 's/^/  /'
    else
        echo -e "${RED}✗${NC} 定时任务未配置"
    fi
    
    echo ""
    
    # 检查日志文件
    echo -e "${CYAN}[3] 备份日志状态${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -f "$LOG_FILE" ]; then
        echo -e "${GREEN}✓${NC} 日志文件存在: $LOG_FILE"
        local log_size=$(du -h "$LOG_FILE" | cut -f1)
        echo -e "${GREEN}✓${NC} 日志大小: $log_size"
        
        echo ""
        echo "最近 5 条备份记录:"
        grep "备份完成" "$LOG_FILE" 2>/dev/null | tail -5 | sed 's/^/  /' || echo "  暂无备份记录"
    else
        echo -e "${YELLOW}⚠${NC} 日志文件不存在"
    fi
    
    echo ""
    
    # 检查容器状态
    echo -e "${CYAN}[4] 容器状态${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
        echo -e "${GREEN}✓${NC} MySQL 容器运行中"
    else
        echo -e "${RED}✗${NC} MySQL 容器未运行"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        echo -e "${GREEN}✓${NC} Redis 容器运行中"
    else
        echo -e "${RED}✗${NC} Redis 容器未运行"
    fi
    
    echo ""
    
    # 检查磁盘空间
    echo -e "${CYAN}[5] 磁盘空间${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    df -h "$BACKUP_BASE_DIR" 2>/dev/null | tail -1 | awk '{
        printf "可用空间: %s / %s (使用率: %s)\n", $4, $2, $5
        usage = substr($5, 1, length($5)-1)
        if (usage > 90) {
            printf "\033[0;31m✗\033[0m 警告：磁盘使用率过高！\n"
        } else if (usage > 80) {
            printf "\033[1;33m⚠\033[0m 提示：磁盘使用率较高\n"
        } else {
            printf "\033[0;32m✓\033[0m 磁盘空间充足\n"
        }
    }'
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ==============================================================================
# 定时任务配置功能
# ==============================================================================
setup_cron() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        配置定时任务                                      ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    log_info "当前脚本路径: $SCRIPT_DIR/backup-manager.sh"
    echo ""
    
    # 创建日志目录
    log_step "创建日志目录..."
    mkdir -p /var/log/unisearch
    touch "$LOG_FILE"
    log_success "日志目录已创建"
    
    # 配置定时任务
    log_step "配置定时任务..."
    
    # 检查是否已存在
    if crontab -l 2>/dev/null | grep -q "backup-manager.sh"; then
        log_warning "定时任务已存在，将更新配置"
        crontab -l 2>/dev/null | grep -v "backup-manager.sh" | crontab -
    fi
    
    # 添加新的定时任务
    (crontab -l 2>/dev/null; echo "# UniSearch 自动备份任务") | crontab -
    (crontab -l 2>/dev/null; echo "0 2 * * * $SCRIPT_DIR/backup-manager.sh --backup incremental >> $LOG_FILE 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * 0 $SCRIPT_DIR/backup-manager.sh --backup full >> $LOG_FILE 2>&1") | crontab -
    
    log_success "定时任务配置完成"
    
    echo ""
    echo "定时任务列表:"
    crontab -l 2>/dev/null | grep "backup-manager.sh" | sed 's/^/  /'
    
    # 配置日志轮转
    log_step "配置日志轮转..."
    cat > /etc/logrotate.d/unisearch-backup << 'EOF'
/var/log/unisearch/backup.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
}
EOF
    
    log_success "日志轮转配置完成"
    
    echo ""
    log_success "定时任务配置完成！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  配置摘要"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "增量备份: 每天凌晨 2:00"
    echo "完整备份: 每周日凌晨 3:00"
    echo "日志文件: $LOG_FILE"
    echo "日志保留: 30 天"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ==============================================================================
# 主菜单
# ==============================================================================
show_menu() {
    clear
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║        UniSearch 备份管理系统                           ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}1.${NC} 执行增量备份"
    echo "  ${CYAN}2.${NC} 执行完整备份"
    echo "  ${CYAN}3.${NC} 恢复备份"
    echo "  ${CYAN}4.${NC} 查看备份状态"
    echo "  ${CYAN}5.${NC} 配置定时任务"
    echo "  ${CYAN}6.${NC} 查看备份列表"
    echo "  ${CYAN}0.${NC} 退出"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

list_backups() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        备份列表                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ ! -d "$BACKUP_BASE_DIR" ] || [ -z "$(ls -A $BACKUP_BASE_DIR 2>/dev/null)" ]; then
        log_warning "暂无备份"
        return
    fi
    
    echo "最近 20 个备份:"
    echo ""
    printf "%-5s %-20s %-15s %-10s\n" "序号" "备份时间" "类型" "大小"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local count=1
    for backup_dir in $(ls -1t "$BACKUP_BASE_DIR" 2>/dev/null | grep "^[0-9]" | head -20); do
        local backup_path="$BACKUP_BASE_DIR/$backup_dir"
        local size=$(du -sh "$backup_path" 2>/dev/null | cut -f1)
        local backup_type="增量"
        
        if [ -f "$backup_path/backup_info.txt" ]; then
            if grep -q "full" "$backup_path/backup_info.txt"; then
                backup_type="完整"
            fi
        fi
        
        printf "%-5s %-20s %-15s %-10s\n" "$count" "$backup_dir" "$backup_type" "$size"
        count=$((count + 1))
    done
    
    echo ""
}

# ==============================================================================
# 主程序
# ==============================================================================
main() {
    check_root
    load_env
    
    # 命令行参数处理（用于定时任务）
    if [ "$1" = "--backup" ]; then
        do_backup "${2:-incremental}"
        exit 0
    fi
    
    # 交互式菜单
    while true; do
        show_menu
        read -p "请选择操作 [0-6]: " choice
        
        case $choice in
            1)
                do_backup "incremental"
                read -p "按回车键继续..."
                ;;
            2)
                do_backup "full"
                read -p "按回车键继续..."
                ;;
            3)
                do_restore
                read -p "按回车键继续..."
                ;;
            4)
                check_status
                read -p "按回车键继续..."
                ;;
            5)
                setup_cron
                read -p "按回车键继续..."
                ;;
            6)
                list_backups
                read -p "按回车键继续..."
                ;;
            0)
                echo ""
                log_info "退出备份管理系统"
                echo ""
                exit 0
                ;;
            *)
                log_error "无效的选择，请重新输入"
                sleep 2
                ;;
        esac
    done
}

# 执行主程序
main "$@"
