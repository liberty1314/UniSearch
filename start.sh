#!/bin/bash

# UniSearch 项目启动脚本
# 用于同时启动前端和后端服务

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

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口未被占用
    fi
}

# 等待端口可用
wait_for_port() {
    local port=$1
    local timeout=${2:-30}  # 默认30秒超时
    local count=0
    
    log_info "等待端口 $port 启动..."
    
    while [ $count -lt $timeout ]; do
        if check_port $port; then
            log_success "端口 $port 已启动"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo
    log_error "等待端口 $port 启动超时 ($timeout 秒)"
    return 1
}

# 检查必要的命令是否存在
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v go &> /dev/null; then
        log_error "Go 未安装或不在 PATH 中"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装或不在 PATH 中"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查项目目录
check_directories() {
    log_info "检查项目目录..."
    
    if [ ! -d "backend" ]; then
        log_error "backend 目录不存在"
        exit 1
    fi
    
    if [ ! -d "frontend" ]; then
        log_error "frontend 目录不存在"
        exit 1
    fi
    
    if [ ! -f "backend/main.go" ]; then
        log_error "backend/main.go 文件不存在"
        exit 1
    fi
    
    if [ ! -f "frontend/package.json" ]; then
        log_error "frontend/package.json 文件不存在"
        exit 1
    fi
    
    log_success "项目目录检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    # 创建日志目录
    if [ ! -d "logs" ]; then
        mkdir -p logs
        log_info "创建 logs/ 目录"
    fi
    
    # 创建PID目录
    if [ ! -d "pids" ]; then
        mkdir -p pids
        log_info "创建 pids/ 目录"
    fi
    
    log_success "目录创建完成"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    # 检查后端端口是否已被占用
    if check_port 8888; then
        log_warning "端口 8888 已被占用，可能后端服务已在运行"
        read -p "是否继续启动？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消启动"
            exit 0
        fi
    fi
    
    cd backend
    
    # 检查 go.mod 文件
    if [ ! -f "go.mod" ]; then
        log_error "go.mod 文件不存在，请先初始化 Go 模块"
        exit 1
    fi
    
    # 下载依赖
    log_info "下载 Go 依赖..."
    go mod download
    
    # 启动后端服务（后台运行）
    log_info "启动 Go 后端服务 (端口 8888)..."
    nohup go run main.go > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../pids/backend.pid
    
    cd ..
    
    # 等待后端服务启动
    if wait_for_port 8888 30; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
    else
        log_error "后端服务启动失败"
        # 清理进程
        if [ -f "pids/backend.pid" ]; then
            kill $(cat pids/backend.pid) 2>/dev/null || true
            rm -f pids/backend.pid
        fi
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    # 检查前端端口是否已被占用
    if check_port 5173; then
        log_warning "端口 5173 已被占用，可能前端服务已在运行"
        read -p "是否继续启动？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消启动"
            exit 0
        fi
    fi
    
    cd frontend
    
    # 安装依赖
    log_info "安装前端依赖..."
    pnpm install
    
    # 启动前端服务（后台运行）
    log_info "启动前端开发服务器 (端口 5173)..."
    nohup pnpm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../pids/frontend.pid
    
    cd ..
    
    # 等待前端服务启动
    if wait_for_port 5173 30; then
        log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
    else
        log_error "前端服务启动失败"
        # 清理进程
        if [ -f "pids/frontend.pid" ]; then
            kill $(cat pids/frontend.pid) 2>/dev/null || true
            rm -f pids/frontend.pid
        fi
        exit 1
    fi
}

# 显示服务状态
show_status() {
    echo
    log_success "=== UniSearch 服务启动完成 ==="
    echo
    echo "后端服务: http://localhost:8888"
    echo "前端服务: http://localhost:5173"
    echo
    echo "日志文件:"
    echo "  后端日志: $(pwd)/logs/backend.log"
    echo "  前端日志: $(pwd)/logs/frontend.log"
    echo
    echo "PID 文件:"
    echo "  后端 PID: $(pwd)/pids/backend.pid"
    echo "  前端 PID: $(pwd)/pids/frontend.pid"
    echo
    echo "使用 './stop.sh' 停止所有服务"
    echo "使用 'tail -f logs/backend.log' 查看后端日志"
    echo "使用 'tail -f logs/frontend.log' 查看前端日志"
    echo
}

# 清理函数
cleanup() {
    log_warning "接收到中断信号，正在清理..."
    
    if [ -f "pids/backend.pid" ]; then
        kill $(cat pids/backend.pid) 2>/dev/null || true
        rm -f pids/backend.pid
    fi
    
    if [ -f "pids/frontend.pid" ]; then
        kill $(cat pids/frontend.pid) 2>/dev/null || true
        rm -f pids/frontend.pid
    fi
    
    log_info "清理完成"
    exit 1
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    echo
    log_info "=== UniSearch 项目启动脚本 ==="
    echo
    
    # 检查依赖和目录
    check_dependencies
    check_directories
    create_directories
    
    # 启动服务
    start_backend
    start_frontend
    
    # 显示状态
    show_status
}

# 执行主函数
main "$@"