#!/bin/bash

# UniSearch 本地开发环境一键停止脚本
# 用于停止所有前端和后端开发服务器

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[→]${NC} $1"
}

# 打印横幅
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           UniSearch 本地开发环境停止脚本                  ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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

# 优雅停止进程
graceful_stop_process() {
    local pid=$1
    local name=$2
    local timeout=${3:-10}  # 默认10秒超时
    
    if ! check_process $pid; then
        log_info "$name (PID: $pid) 已不存在"
        return 0
    fi
    
    log_step "正在停止 $name (PID: $pid)..."
    
    # 发送 SIGTERM 信号
    kill -TERM $pid 2>/dev/null || true
    
    # 等待进程优雅退出
    local count=0
    while [ $count -lt $timeout ]; do
        if ! check_process $pid; then
            log_success "$name 已停止"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        printf "."
    done
    
    echo
    log_warning "$name 未在 $timeout 秒内停止，强制终止..."
    
    # 强制终止
    kill -9 $pid 2>/dev/null || true
    sleep 1
    
    if check_process $pid; then
        log_error "无法终止 $name (PID: $pid)"
        return 1
    else
        log_success "$name 已强制终止"
        return 0
    fi
}

# 通过 PID 文件停止服务
stop_service_by_pid() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        log_info "从 $pid_file 读取到 $service_name PID: $pid"
        
        if graceful_stop_process $pid "$service_name"; then
            rm -f "$pid_file"
            log_success "已删除 $pid_file"
            return 0
        else
            log_error "停止 $service_name 失败"
            return 1
        fi
    else
        log_warning "$pid_file 不存在，$service_name 可能未通过脚本启动"
        return 0
    fi
}

# 通过端口停止服务
stop_service_by_port() {
    local port=$1
    local service_name=$2
    
    log_step "检查端口 $port 上的 $service_name..."
    
    # 查找占用端口的进程
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        log_info "端口 $port 上没有运行的服务"
        return 0
    fi
    
    for pid in $pids; do
        local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
        log_info "发现端口 $port 上的进程 (PID: $pid)"
        log_info "  命令: $cmd"
        graceful_stop_process $pid "$service_name (端口 $port)"
    done
}

# 停止所有 Go 相关进程
stop_go_processes() {
    log_step "检查 Go 相关进程..."
    
    # 查找所有包含 main.go 的 Go 进程
    local go_pids=$(pgrep -f "go.*main.go" 2>/dev/null || true)
    
    if [ -z "$go_pids" ]; then
        log_info "没有发现 Go 相关进程"
        return 0
    fi
    
    for pid in $go_pids; do
        local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
        # 过滤掉当前脚本进程
        if [[ "$cmd" != *"local_stop.sh"* ]]; then
            log_info "发现 Go 进程 (PID: $pid)"
            graceful_stop_process $pid "Go 进程"
        fi
    done
}

# 停止所有 Node.js/pnpm 相关进程
stop_node_processes() {
    log_step "检查 Node.js/pnpm 相关进程..."
    
    local found_processes=false
    
    # 查找所有 pnpm run dev 进程
    local pnpm_pids=$(pgrep -f "pnpm.*run.*dev" 2>/dev/null || true)
    
    if [ -n "$pnpm_pids" ]; then
        found_processes=true
        for pid in $pnpm_pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
            log_info "发现 pnpm 进程 (PID: $pid)"
            graceful_stop_process $pid "pnpm 进程"
        done
    fi
    
    # 查找所有 Vite 开发服务器进程
    local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
    
    if [ -n "$vite_pids" ]; then
        for pid in $vite_pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
            # 过滤掉当前脚本进程
            if [[ "$cmd" != *"local_stop.sh"* ]]; then
                found_processes=true
                log_info "发现 Vite 进程 (PID: $pid)"
                graceful_stop_process $pid "Vite 进程"
            fi
        done
    fi
    
    # 查找所有 node 进程（端口 5173）
    local node_pids=$(lsof -ti:5173 2>/dev/null || true)
    
    if [ -n "$node_pids" ]; then
        for pid in $node_pids; do
            local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "未知命令")
            if [[ "$cmd" != *"local_stop.sh"* ]]; then
                found_processes=true
                log_info "发现 Node 进程 (PID: $pid) 占用端口 5173"
                graceful_stop_process $pid "Node 进程"
            fi
        done
    fi
    
    if [ "$found_processes" = false ]; then
        log_info "没有发现 Node.js/pnpm 相关进程"
    fi
}

# 清理 PID 文件
cleanup_pid_files() {
    log_step "清理 PID 文件..."
    
    local cleaned=false
    
    if [ -f "pids/backend.pid" ]; then
        rm -f pids/backend.pid
        log_info "已删除 pids/backend.pid"
        cleaned=true
    fi
    
    if [ -f "pids/frontend.pid" ]; then
        rm -f pids/frontend.pid
        log_info "已删除 pids/frontend.pid"
        cleaned=true
    fi
    
    if [ "$cleaned" = false ]; then
        log_info "没有需要清理的 PID 文件"
    else
        log_success "PID 文件清理完成"
    fi
}

# 备份日志文件
backup_logs() {
    log_step "备份日志文件..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backed_up=false
    
    # 备份后端日志
    if [ -f "logs/backend.log" ] && [ -s "logs/backend.log" ]; then
        local backup_file="logs/backend_${timestamp}.log"
        mv "logs/backend.log" "$backup_file"
        log_info "后端日志已备份: $backup_file"
        backed_up=true
    fi
    
    # 备份前端日志
    if [ -f "logs/frontend.log" ] && [ -s "logs/frontend.log" ]; then
        local backup_file="logs/frontend_${timestamp}.log"
        mv "logs/frontend.log" "$backup_file"
        log_info "前端日志已备份: $backup_file"
        backed_up=true
    fi
    
    if [ "$backed_up" = false ]; then
        log_info "没有需要备份的日志文件"
    else
        log_success "日志备份完成"
    fi
}

# 验证服务是否已停止
verify_services_stopped() {
    log_step "验证服务是否已停止..."
    
    local all_stopped=true
    
    # 检查后端端口
    if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 8888 仍有服务在运行"
        all_stopped=false
    else
        log_success "端口 8888 已释放"
    fi
    
    # 检查前端端口
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 5173 仍有服务在运行"
        all_stopped=false
    else
        log_success "端口 5173 已释放"
    fi
    
    if [ "$all_stopped" = true ]; then
        log_success "所有服务已成功停止"
        return 0
    else
        log_error "部分服务仍在运行"
        echo
        log_info "您可以尝试以下操作:"
        echo "  1. 手动查找并终止进程: lsof -ti:8888 或 lsof -ti:5173"
        echo "  2. 强制终止所有相关进程: pkill -f 'go.*main.go' 或 pkill -f 'vite'"
        return 1
    fi
}

# 显示停止状态
show_stop_status() {
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║              🛑 UniSearch 服务已停止                      ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}📊 端口状态:${NC}"
    
    # 检查后端端口
    if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "   ${RED}●${NC} 后端端口 8888: ${RED}占用${NC}"
    else
        echo -e "   ${GREEN}●${NC} 后端端口 8888: ${GREEN}空闲${NC}"
    fi
    
    # 检查前端端口
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "   ${RED}●${NC} 前端端口 5173: ${RED}占用${NC}"
    else
        echo -e "   ${GREEN}●${NC} 前端端口 5173: ${GREEN}空闲${NC}"
    fi
    
    echo
    
    # 显示备份的日志文件
    local backup_logs=$(ls logs/*_*.log 2>/dev/null | tail -5 || true)
    if [ -n "$backup_logs" ]; then
        echo -e "${CYAN}📝 最近的日志备份:${NC}"
        echo "$backup_logs" | while read log; do
            local size=$(du -h "$log" | cut -f1)
            echo -e "   ${YELLOW}●${NC} $log ($size)"
        done
        echo
    fi
    
    echo -e "${CYAN}💡 常用命令:${NC}"
    echo -e "   ${BLUE}●${NC} 重新启动服务: ./scripts/local_start.sh"
    echo -e "   ${BLUE}●${NC} 查看日志备份: ls -lh logs/"
    echo -e "   ${BLUE}●${NC} 清理日志备份: rm logs/*_*.log"
    echo
}

# 主函数
main() {
    # 打印横幅
    print_banner
    
    log_info "开始停止服务..."
    echo
    
    # 1. 通过 PID 文件停止服务
    stop_service_by_pid "pids/backend.pid" "后端服务"
    echo
    stop_service_by_pid "pids/frontend.pid" "前端服务"
    echo
    
    # 2. 通过端口停止服务（备用方法）
    stop_service_by_port 8888 "后端服务"
    echo
    stop_service_by_port 5173 "前端服务"
    echo
    
    # 3. 停止所有相关进程
    stop_go_processes
    echo
    stop_node_processes
    echo
    
    # 4. 清理 PID 文件
    cleanup_pid_files
    echo
    
    # 5. 备份日志文件
    backup_logs
    echo
    
    # 6. 验证服务是否已停止
    verify_services_stopped
    
    # 7. 显示停止状态
    show_stop_status
}

# 执行主函数
main "$@"
