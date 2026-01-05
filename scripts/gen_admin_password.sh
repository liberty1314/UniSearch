#!/bin/bash

# 生成管理员密码哈希值的脚本
# 用法: ./scripts/gen_admin_password.sh [密码]

set -e

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

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
            OS_VERSION=$VERSION_ID
        else
            OS="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    
    echo "$OS"
}

# 检查 Go 是否已安装
check_go() {
    if command -v go &> /dev/null; then
        GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        log_success "检测到 Go 环境: $GO_VERSION"
        return 0
    else
        return 1
    fi
}

# 安装 Go - Ubuntu/Debian
install_go_ubuntu() {
    log_info "在 Ubuntu/Debian 系统上安装 Go..."
    
    # 获取最新的 Go 版本
    GO_VERSION="1.22.0"
    GO_TARBALL="go${GO_VERSION}.linux-amd64.tar.gz"
    
    log_info "下载 Go ${GO_VERSION}..."
    cd /tmp
    wget -q --show-progress "https://go.dev/dl/${GO_TARBALL}" || {
        log_error "下载失败，尝试使用国内镜像..."
        wget -q --show-progress "https://golang.google.cn/dl/${GO_TARBALL}"
    }
    
    log_info "安装 Go..."
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf "$GO_TARBALL"
    rm -f "$GO_TARBALL"
    
    # 配置环境变量
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        echo 'export GOPATH=$HOME/go' >> ~/.bashrc
        echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
    fi
    
    # 立即生效
    export PATH=$PATH:/usr/local/go/bin
    export GOPATH=$HOME/go
    
    log_success "Go 安装完成！"
    go version
}

# 安装 Go - CentOS/RHEL/Fedora
install_go_centos() {
    log_info "在 CentOS/RHEL/Fedora 系统上安装 Go..."
    
    GO_VERSION="1.22.0"
    GO_TARBALL="go${GO_VERSION}.linux-amd64.tar.gz"
    
    log_info "下载 Go ${GO_VERSION}..."
    cd /tmp
    curl -LO "https://go.dev/dl/${GO_TARBALL}" || {
        log_error "下载失败，尝试使用国内镜像..."
        curl -LO "https://golang.google.cn/dl/${GO_TARBALL}"
    }
    
    log_info "安装 Go..."
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf "$GO_TARBALL"
    rm -f "$GO_TARBALL"
    
    # 配置环境变量
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        echo 'export GOPATH=$HOME/go' >> ~/.bashrc
        echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
    fi
    
    # 立即生效
    export PATH=$PATH:/usr/local/go/bin
    export GOPATH=$HOME/go
    
    log_success "Go 安装完成！"
    go version
}

# 安装 Go - macOS
install_go_macos() {
    log_info "在 macOS 系统上安装 Go..."
    
    if command -v brew &> /dev/null; then
        log_info "使用 Homebrew 安装 Go..."
        brew install go
        log_success "Go 安装完成！"
        go version
    else
        log_warning "未检测到 Homebrew"
        log_info "请选择安装方式："
        echo "  1. 安装 Homebrew 后自动安装 Go（推荐）"
        echo "  2. 手动下载安装包"
        read -p "请选择 (1/2): " choice
        
        case $choice in
            1)
                log_info "安装 Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                log_info "使用 Homebrew 安装 Go..."
                brew install go
                log_success "Go 安装完成！"
                go version
                ;;
            2)
                log_info "请访问以下网址下载 macOS 安装包："
                echo "  https://go.dev/dl/"
                echo "  或国内镜像: https://golang.google.cn/dl/"
                log_info "下载后双击 .pkg 文件进行安装"
                exit 1
                ;;
            *)
                log_error "无效的选择"
                exit 1
                ;;
        esac
    fi
}

# 安装 Go - Windows (Git Bash/MSYS2)
install_go_windows() {
    log_info "在 Windows 系统上安装 Go..."
    log_info "请访问以下网址下载 Windows 安装包："
    echo "  https://go.dev/dl/"
    echo "  或国内镜像: https://golang.google.cn/dl/"
    log_info "下载后双击 .msi 文件进行安装"
    log_info "安装完成后，请重新打开终端并再次运行此脚本"
    exit 1
}

# 提示安装 Go
prompt_install_go() {
    local os_type=$(detect_os)
    
    log_warning "未检测到 Go 环境"
    log_info "此脚本需要 Go 来生成 bcrypt 密码哈希"
    echo ""
    
    read -p "是否现在安装 Go? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消安装"
        log_info "您可以手动安装 Go 后再运行此脚本"
        log_info "官方网站: https://go.dev/dl/"
        log_info "国内镜像: https://golang.google.cn/dl/"
        exit 1
    fi
    
    echo ""
    log_info "检测到操作系统: $os_type"
    echo ""
    
    case $os_type in
        ubuntu|debian)
            install_go_ubuntu
            ;;
        centos|rhel|fedora)
            install_go_centos
            ;;
        macos)
            install_go_macos
            ;;
        windows)
            install_go_windows
            ;;
        *)
            log_error "不支持的操作系统: $os_type"
            log_info "请手动安装 Go: https://go.dev/dl/"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Go 环境配置完成！"
    echo ""
}

# 生成密码哈希
generate_hash() {
    local password="$1"
    
    log_info "正在生成密码哈希..."
    
    # 进入 backend 目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR/../backend"
    
    # 创建临时 Go 文件
    TEMP_GO_FILE="/tmp/gen_hash_temp_$$.go"
    cat > "$TEMP_GO_FILE" << 'EOF'
package main

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("用法: go run gen_hash.go <密码>")
		os.Exit(1)
	}
	
	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("生成哈希失败:", err)
		os.Exit(1)
	}
	
	fmt.Println(string(hash))
}
EOF
    
    # 生成哈希
    HASH=$(go run "$TEMP_GO_FILE" "$password" 2>&1)
    local exit_code=$?
    
    # 清理临时文件
    rm -f "$TEMP_GO_FILE"
    
    if [ $exit_code -ne 0 ]; then
        log_error "密码哈希生成失败"
        echo "$HASH"
        exit 1
    fi
    
    echo "$HASH"
}

# 显示结果
show_result() {
    local hash="$1"
    
    echo ""
    log_success "密码哈希生成成功！"
    echo ""
    log_warning "请将以下内容添加到 deploy/.env.local 文件中："
    echo ""
    echo -e "${GREEN}ADMIN_PASSWORD_HASH='$hash'${NC}"
    echo ""
    log_error "⚠️  重要提示：必须使用单引号包裹密码哈希！"
    log_warning "   这样可以防止 \$ 符号被 Shell 转义"
    echo ""
    log_info "部署步骤："
    echo "1. 编辑配置文件: vi deploy/.env.local"
    echo "2. 添加配置（注意单引号）:"
    echo -e "   ${GREEN}ADMIN_PASSWORD_HASH='$hash'${NC}"
    echo "3. 设置文件权限: chmod 600 deploy/.env.local"
    echo "4. 重启服务: sudo ./scripts/deploy.sh restart"
    echo ""
}

# ===== 主函数 =====

main() {
    # 检查参数
    if [ $# -eq 0 ]; then
        log_error "缺少密码参数"
        echo ""
        echo "用法: $0 <密码>"
        echo "示例: $0 mySecurePassword123"
        echo ""
        exit 1
    fi
    
    PASSWORD="$1"
    
    # 检查密码长度
    if [ ${#PASSWORD} -lt 6 ]; then
        log_error "密码长度至少为 6 个字符"
        exit 1
    fi
    
    # 检查 Go 环境
    if ! check_go; then
        prompt_install_go
        
        # 再次检查 Go 是否安装成功
        if ! check_go; then
            log_error "Go 安装失败或未正确配置"
            log_info "请手动安装 Go 后重试"
            exit 1
        fi
    fi
    
    echo ""
    
    # 生成密码哈希
    HASH=$(generate_hash "$PASSWORD")
    
    # 显示结果
    show_result "$HASH"
}

# 执行主函数
main "$@"
