#!/bin/bash

# UniSearch 配置文件同步脚本
# 用于在 Watchtower 更新镜像后自动同步配置文件
# 用法: ./sync-config.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 记录日志到文件
LOG_FILE="/var/log/unisearch-sync.log"
log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 主函数
main() {
    log_info "=== UniSearch 配置同步开始 ==="
    log_to_file "配置同步开始"
    
    # 检查是否在 Git 仓库中
    if [ ! -d "${PROJECT_ROOT}/.git" ]; then
        log_warning "不在 Git 仓库中，无法自动同步配置"
        log_to_file "警告：不在 Git 仓库中"
        exit 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # 获取当前分支
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    log_info "当前分支: $current_branch"
    
    # 获取更新前的 commit
    old_commit=$(git rev-parse HEAD)
    
    # 拉取最新代码
    log_info "从远程仓库拉取最新配置..."
    if git pull origin "$current_branch" 2>&1 | tee -a "$LOG_FILE"; then
        new_commit=$(git rev-parse HEAD)
        
        if [ "$old_commit" != "$new_commit" ]; then
            log_success "配置文件已更新"
            log_to_file "配置更新成功: $old_commit -> $new_commit"
            
            # 检查 deploy 目录是否有变化
            if git diff "$old_commit" "$new_commit" --name-only | grep -q "^deploy/"; then
                log_info "检测到 deploy 目录变更，需要重启服务"
                log_to_file "检测到配置变更，准备重启服务"
                
                # 重启服务
                if [ -f "${SCRIPT_DIR}/deploy.sh" ]; then
                    log_info "重启服务..."
                    "${SCRIPT_DIR}/deploy.sh" restart >> "$LOG_FILE" 2>&1
                    log_success "服务已重启"
                    log_to_file "服务重启成功"
                else
                    log_warning "未找到 deploy.sh，请手动重启服务"
                    log_to_file "警告：未找到 deploy.sh"
                fi
            else
                log_info "配置文件无变化，无需重启"
                log_to_file "配置无变化"
            fi
        else
            log_info "配置文件已是最新版本"
            log_to_file "配置已是最新"
        fi
    else
        log_error "配置同步失败"
        log_to_file "错误：配置同步失败"
        exit 1
    fi
    
    log_success "=== 配置同步完成 ==="
    log_to_file "配置同步完成"
}

# 执行主函数
main "$@"
