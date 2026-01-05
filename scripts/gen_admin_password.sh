#!/bin/bash

# 生成管理员密码哈希值的脚本
# 用法: ./scripts/gen_admin_password.sh [密码]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}用法: $0 <密码>${NC}"
    echo -e "${YELLOW}示例: $0 mySecurePassword123${NC}"
    exit 1
fi

PASSWORD="$1"

# 检查密码长度
if [ ${#PASSWORD} -lt 6 ]; then
    echo -e "${RED}错误: 密码长度至少为 6 个字符${NC}"
    exit 1
fi

echo -e "${GREEN}正在生成密码哈希...${NC}"

# 进入 backend 目录并生成哈希
cd "$(dirname "$0")/../backend"

# 创建临时 Go 文件
cat > /tmp/gen_hash_temp.go << 'EOF'
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
HASH=$(go run /tmp/gen_hash_temp.go "$PASSWORD")

# 清理临时文件
rm -f /tmp/gen_hash_temp.go

echo ""
echo -e "${GREEN}✓ 密码哈希生成成功！${NC}"
echo ""
echo -e "${YELLOW}请将以下内容添加到你的环境变量配置中：${NC}"
echo ""
echo -e "${GREEN}ADMIN_PASSWORD_HASH=$HASH${NC}"
echo ""
echo -e "${YELLOW}部署步骤：${NC}"
echo "1. 编辑 deploy/env.prod 文件"
echo "2. 找到 ADMIN_PASSWORD_HASH 配置项"
echo "3. 替换为上面生成的哈希值"
echo "4. 重新部署服务"
echo ""
