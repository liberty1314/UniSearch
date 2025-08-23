#!/bin/bash

# UniSearch Docker 测试脚本
# 用于测试 Docker 配置是否正确

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 测试 Docker 环境
test_docker_environment() {
    print_step "测试 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        return 1
    fi
    
    print_message "Docker 版本: $(docker --version)"
    print_message "Docker Compose 版本: $(docker-compose --version)"
    return 0
}

# 测试 Dockerfile 语法
test_dockerfiles() {
    print_step "测试 Dockerfile 语法..."
    
    # 测试前端 Dockerfile
    if [ -f "frontend/Dockerfile" ]; then
        print_message "前端 Dockerfile 存在"
        if docker build --dry-run -f frontend/Dockerfile frontend/ > /dev/null 2>&1; then
            print_message "前端 Dockerfile 语法正确"
        else
            print_warning "前端 Dockerfile 语法可能有问题"
        fi
    else
        print_error "前端 Dockerfile 不存在"
        return 1
    fi
    
    # 测试后端 Dockerfile
    if [ -f "backend/Dockerfile" ]; then
        print_message "后端 Dockerfile 存在"
        if docker build --dry-run -f backend/Dockerfile backend/ > /dev/null 2>&1; then
            print_message "后端 Dockerfile 语法正确"
        else
            print_warning "后端 Dockerfile 语法可能有问题"
        fi
    else
        print_error "后端 Dockerfile 不存在"
        return 1
    fi
    
    return 0
}

# 测试 docker-compose 配置
test_docker_compose() {
    print_step "测试 Docker Compose 配置..."
    
    # 测试开发环境配置
    if [ -f "docker-compose.yml" ]; then
        print_message "开发环境 docker-compose.yml 存在"
        if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
            print_message "开发环境配置语法正确"
        else
            print_warning "开发环境配置语法可能有问题"
        fi
    else
        print_error "开发环境 docker-compose.yml 不存在"
        return 1
    fi
    
    # 测试生产环境配置
    if [ -f "docker-compose.prod.yml" ]; then
        print_message "生产环境 docker-compose.prod.yml 存在"
        if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
            print_message "生产环境配置语法正确"
        else
            print_warning "生产环境配置语法可能有问题"
        fi
    else
        print_error "生产环境 docker-compose.prod.yml 不存在"
        return 1
    fi
    
    return 0
}

# 测试网络配置
test_network_config() {
    print_step "测试网络配置..."
    
    # 检查前端 nginx 配置
    if [ -f "frontend/nginx.conf" ]; then
        print_message "前端 nginx.conf 存在"
        
        # 检查是否包含必要的配置
        if grep -q "proxy_pass.*backend:8888" frontend/nginx.conf; then
            print_message "API 代理配置正确"
        else
            print_warning "API 代理配置可能有问题"
        fi
        
        if grep -q "try_files.*index.html" frontend/nginx.conf; then
            print_message "前端路由配置正确"
        else
            print_warning "前端路由配置可能有问题"
        fi
    else
        print_error "前端 nginx.conf 不存在"
        return 1
    fi
    
    return 0
}

# 测试脚本权限
test_script_permissions() {
    print_step "测试脚本权限..."
    
    local scripts=("docker-build.sh" "docker-deploy.sh")
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                print_message "$script 有执行权限"
            else
                print_warning "$script 没有执行权限"
                chmod +x "$script"
                print_message "已添加执行权限"
            fi
        else
            print_error "$script 不存在"
            return 1
        fi
    done
    
    return 0
}

# 运行所有测试
run_all_tests() {
    print_step "开始运行所有测试..."
    
    local tests=(
        "test_docker_environment"
        "test_dockerfiles"
        "test_docker_compose"
        "test_network_config"
        "test_script_permissions"
    )
    
    local passed=0
    local total=${#tests[@]}
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed++))
        fi
    done
    
    echo ""
    print_step "测试结果汇总："
    print_message "通过: $passed/$total"
    
    if [ $passed -eq $total ]; then
        print_message "🎉 所有测试通过！Docker 配置正确。"
        return 0
    else
        print_warning "⚠️  部分测试失败，请检查配置。"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    echo "UniSearch Docker 测试脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [命令]"
    echo ""
    echo "命令:"
    echo "  test        运行所有测试（默认）"
    echo "  docker      测试 Docker 环境"
    echo "  files       测试 Dockerfile"
    echo "  compose     测试 Docker Compose 配置"
    echo "  network     测试网络配置"
    echo "  scripts     测试脚本权限"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 test      # 运行所有测试"
    echo "  $0 docker    # 仅测试 Docker 环境"
    echo "  $0 help      # 显示帮助信息"
}

# 主函数
main() {
    local command=${1:-test}
    
    case $command in
        "test")
            run_all_tests
            ;;
        "docker")
            test_docker_environment
            ;;
        "files")
            test_dockerfiles
            ;;
        "compose")
            test_docker_compose
            ;;
        "network")
            test_network_config
            ;;
        "scripts")
            test_script_permissions
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
