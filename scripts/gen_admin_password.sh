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
    
    # 所有日志输出到 stderr，避免污染返回值
    log_info "正在生成密码哈希..." >&2
    
    # 创建临时工作目录
    TEMP_DIR="/tmp/gen_hash_$$"
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # 配置 Go 代理（使用国内镜像）
    export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
    export GOSUMDB=sum.golang.google.cn
    
    # 创建 Go 模块
    log_info "初始化 Go 模块..." >&2
    cat > go.mod << 'EOF'
module gen_hash

go 1.22
EOF
    
    # 创建主程序文件
    cat > main.go << 'EOF'
package main

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "用法: go run main.go <密码>\n")
		os.Exit(1)
	}
	
	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "生成哈希失败: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Println(string(hash))
}
EOF
    
    # 初始化依赖（自动生成 go.sum）
    log_info "下载依赖包（使用国内镜像）..." >&2
    go mod tidy 2>&1 | grep -v "finding module" | grep -v "go: downloading" >&2 || true
    
    # 生成哈希（只捕获标准输出）
    log_info "生成密码哈希..." >&2
    HASH=$(go run main.go "$password" 2>&1 | grep '^\$2[ab]\$' | head -1)
    local exit_code=$?
    
    # 清理临时目录
    cd /tmp
    rm -rf "$TEMP_DIR"
    
    # 验证哈希值格式（bcrypt 哈希以 $2a$ 或 $2b$ 开头）
    if [ $exit_code -ne 0 ] || [ -z "$HASH" ] || [[ ! "$HASH" =~ ^\$2[ab]\$ ]]; then
        log_error "密码哈希生成失败" >&2
        
        # 重新运行以显示错误信息
        mkdir -p "$TEMP_DIR"
        cd "$TEMP_DIR"
        
        export GOPROXY=https://goproxy.cn,https://goproxy.io,direct
        export GOSUMDB=sum.golang.google.cn
        
        cat > go.mod << 'EOF'
module gen_hash
go 1.22
EOF
        cat > main.go << 'EOF'
package main
import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)
func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "用法: go run main.go <密码>\n")
		os.Exit(1)
	}
	password := os.Args[1]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "生成哈希失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(hash))
}
EOF
        echo "" >&2
        log_error "详细错误信息：" >&2
        go mod tidy >&2
        go run main.go "$password" >&2
        cd /tmp
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # 只输出哈希值到 stdout
    echo "$HASH"
}

# 显示结果
show_result() {
    local hash="$1"
    
    echo ""
    log_success "密码哈希生成成功！"
    echo ""
    echo -e "${GREEN}ADMIN_PASSWORD_HASH='$hash'${NC}"
    echo ""
}

# 自动配置密码到 .env.local
auto_configure_password() {
    local hash="$1"
    
    echo ""
    read -p "是否自动配置密码到 deploy/.env.local? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已跳过自动配置"
        echo ""
        log_warning "手动配置步骤："
        echo "1. 编辑配置文件: vi deploy/.env.local"
        echo "2. 添加配置（注意单引号）:"
        echo -e "   ${GREEN}ADMIN_PASSWORD_HASH='$hash'${NC}"
        echo "3. 设置文件权限: chmod 600 deploy/.env.local"
        echo "4. 重启服务: sudo ./scripts/deploy.sh restart"
        echo ""
        return 0
    fi
    
    # 获取项目根目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    DEPLOY_DIR="${PROJECT_ROOT}/deploy"
    ENV_LOCAL="${DEPLOY_DIR}/.env.local"
    ENV_PROD="${DEPLOY_DIR}/env.prod"
    
    # 检查 deploy 目录是否存在
    if [ ! -d "$DEPLOY_DIR" ]; then
        log_error "deploy 目录不存在: $DEPLOY_DIR"
        return 1
    fi
    
    # 检查 .env.local 是否存在
    if [ ! -f "$ENV_LOCAL" ]; then
        log_info ".env.local 不存在，从 env.prod 创建..."
        
        if [ ! -f "$ENV_PROD" ]; then
            log_error "env.prod 文件不存在: $ENV_PROD"
            return 1
        fi
        
        cp "$ENV_PROD" "$ENV_LOCAL"
        log_success ".env.local 创建成功"
    fi
    
    # 配置密码哈希
    log_info "配置密码哈希到 .env.local..."
    
    # 检查是否已存在 ADMIN_PASSWORD_HASH 配置
    if grep -q "^ADMIN_PASSWORD_HASH=" "$ENV_LOCAL"; then
        # 删除旧配置行，添加新配置
        grep -v "^ADMIN_PASSWORD_HASH=" "$ENV_LOCAL" > "${ENV_LOCAL}.tmp"
        mv "${ENV_LOCAL}.tmp" "$ENV_LOCAL"
        echo "ADMIN_PASSWORD_HASH='${hash}'" >> "$ENV_LOCAL"
        log_success "密码哈希已更新"
    else
        # 添加新配置
        echo "" >> "$ENV_LOCAL"
        echo "# 管理员密码哈希（自动配置）" >> "$ENV_LOCAL"
        echo "ADMIN_PASSWORD_HASH='${hash}'" >> "$ENV_LOCAL"
        log_success "密码哈希已添加"
    fi
    
    # 设置文件权限
    chmod 600 "$ENV_LOCAL"
    log_success "文件权限已设置为 600"
    
    echo ""
    log_success "密码配置完成！"
    log_info "配置文件: $ENV_LOCAL"
    echo ""
    log_warning "下一步："
    echo "  重启服务: sudo ./scripts/deploy.sh restart"
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
    
    # 自动配置密码
    auto_configure_password "$HASH"
}

# 执行主函数
main "$@"
