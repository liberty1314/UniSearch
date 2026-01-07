#!/bin/bash

# UniSearch 项目停止脚本
# 用于停止所有前端和后端服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查进程是否存在
check_process() {
    local pid=$1
    if ps -p $pid > /dev/null 2>&1; then
        return 0  # 进程存在
    else
        return 1  # 进程不存在
    fi
}

# 强制终止进程
force_kill_process() {
    local pid=$1
    local name=$2
    
    if check_process $pid; then
        log_warning "强制终止 $name 进程 (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
        
        if check_process $pid; then
            log_error "无法终止 $name 进程 (PID: $pid)"
            return 1
        else
            log_success "$name 进程已终止"
            return 0
        fi
    else
        log_info "$name 进程 (PID: $pid) 已不存在"
        return 0
    fi
}

# 优雅停止进程
graceful_stop_process() {
    local pid=$1
    local name=$2
    local timeout=${3:-10}  # 默认10秒超时
    
    if ! check_process $pid; then
        log_info "$name 进程 (PID: $pid) 已不存在"
        return 0
    fi
    
    log_info "正在停止 $name 进程 (PID: $pid)..."
    
    # 发送 SIGTERM 信号
    kill -TERM $pid 2>/dev/null || true
    
    # 等待进程优雅退出
    local count=0
    while [ $count -lt $timeout ]; do
        if ! check_process $pid; then
            log_success "$name 进程已优雅停止"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo
    log_warning "$name 进程未在 $timeout 秒内停止，将强制终止"
    force_kill_process $pid "$name"
}

# PID 文件路径
BACKEND_PID_FILE="pids/backend.pid"
FRONTEND_PID_FILE="pids/frontend.pid"

# 日志文件路径
BACKEND_LOG_FILE="logs/backend.log"
FRONTEND_LOG_FILE="logs/frontend.log"

# 通过PID文件停止服务
stop_service_by_pid() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        log_info "从 $pid_file 读取到 $service_name PID: $pid"
        
        if graceful_stop_process $pid "$service_name"; then
            rm -f "$pid_file"
            log_success "已删除 $pid_file"
        else
            log_error "停止 $service_name 失败"
            return 1
        fi
    else
        log_warning "$pid_file 文件不存在，$service_name 可能未通过脚本启动"
    fi
}

# 通过端口停止服务
stop_service_by_port() {
    local port=$1
    local service_name=$2
    
    log_info "检查端口 $port 上的 $service_name 服务..."
    
    # 查找占用端口的进程
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        log_info "端口 $port 上没有运行的服务"
        return 0
    fi
    
    for pid in $pids; do
        log_info "发现端口 $port 上的进程 (PID: $pid)"
        graceful_stop_process $pid "$service_name (端口 $port)"
    done
}

# 停止所有Go进程（后端相关）
stop_go_processes() {
    log_info "检查 Go 相关进程..."
    
    # 查找所有包含 main.go 的 Go 进程
    local go_pids=$(pgrep -f "go.*main.go" 2>/dev/null || true)
    
    if [ -z "$go_pids" ]; then
        log_info "没有发现 Go 相关进程"
        return 0
    fi
    
    for pid in $go_pids; do
        local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
        log_info "发现 Go 进程 (PID: $pid): $cmd"
        graceful_stop_process $pid "Go 进程"
    done
}

# 停止所有Node.js/pnpm进程（前端相关）
stop_node_processes() {
    log_info "检查 Node.js/pnpm 相关进程..."
    
    # 查找所有 pnpm run dev 进程
    local pnpm_pids=$(pgrep -f "pnpm.*run.*dev" 2>/dev/null || true)
    
    if [ -n "$pnpm_pids" ]; then
        for pid in $pnpm_pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
            log_info "发现 pnpm 进程 (PID: $pid): $cmd"
            graceful_stop_process $pid "pnpm 进程"
        done
    fi
    
    # 查找所有 Vite 开发服务器进程
    local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
    
    if [ -n "$vite_pids" ]; then
        for pid in $vite_pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
            # 过滤掉当前脚本进程
            if [[ "$cmd" != *"stop.sh"* ]]; then
                log_info "发现 Vite 进程 (PID: $pid): $cmd"
                graceful_stop_process $pid "Vite 进程"
            fi
        done
    fi
    
    if [ -z "$pnpm_pids" ] && [ -z "$vite_pids" ]; then
        log_info "没有发现 Node.js/pnpm 相关进程"
    fi
}

# 清理日志文件
cleanup_logs() {
    log_info "清理日志文件..."
    
    # 备份日志文件（如果存在）
    if [ -f "$BACKEND_LOG_FILE" ]; then
        BACKUP_FILE="logs/backend_$(date +%Y%m%d_%H%M%S).log"
        mv "$BACKEND_LOG_FILE" "$BACKUP_FILE"
        log_info "后端日志已备份为: $BACKUP_FILE"
    fi
    
    if [ -f "$FRONTEND_LOG_FILE" ]; then
        BACKUP_FILE="logs/frontend_$(date +%Y%m%d_%H%M%S).log"
        mv "$FRONTEND_LOG_FILE" "$BACKUP_FILE"
        log_info "前端日志已备份为: $BACKUP_FILE"
    fi
    
    log_success "日志清理完成"
}

# 验证服务是否已停止
verify_services_stopped() {
    log_info "验证服务是否已停止..."
    
    local backend_running=false
    local frontend_running=false
    
    # 检查后端端口
    if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 8888 仍有服务在运行"
        backend_running=true
    else
        log_success "端口 8888 已释放"
    fi
    
    # 检查前端端口
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 5173 仍有服务在运行"
        frontend_running=true
    else
        log_success "端口 5173 已释放"
    fi
    
    if [ "$backend_running" = true ] || [ "$frontend_running" = true ]; then
        log_error "部分服务仍在运行，请手动检查"
        return 1
    else
        log_success "所有服务已成功停止"
        return 0
    fi
}

# 显示停止状态
show_stop_status() {
    echo
    log_success "=== UniSearch 服务停止完成 ==="
    echo
    
    # 显示当前端口状态
    echo "端口状态检查:"
    echo "  后端端口 8888: $(lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1 && echo '占用' || echo '空闲')"
    echo "  前端端口 5173: $(lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 && echo '占用' || echo '空闲')"
    echo
    
    # 显示备份的日志文件
    local backup_logs=$(ls *.log.* 2>/dev/null || true)
    if [ -n "$backup_logs" ]; then
        echo "备份的日志文件:"
        for log in $backup_logs; do
            echo "  $log"
        done
        echo
    fi
    
    echo "使用 './start.sh' 重新启动所有服务"
    echo
}

# 主函数
main() {
    echo
    log_info "=== UniSearch 项目停止脚本 ==="
    echo
    
    # 通过PID文件停止服务
    stop_service_by_pid "backend.pid" "后端服务"
    stop_service_by_pid "frontend.pid" "前端服务"
    
    # 通过端口停止服务（备用方法）
    stop_service_by_port 8888 "后端服务"
    stop_service_by_port 5173 "前端服务"
    
    # 停止所有相关进程
    stop_go_processes
    stop_node_processes
    
    # 清理日志文件
    cleanup_logs
    
    # 验证服务是否已停止
    verify_services_stopped
    
    # 显示停止状态
    show_stop_status
}

# 执行主函数
main "$@"