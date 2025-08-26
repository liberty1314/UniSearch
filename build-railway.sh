#!/bin/bash

# UniSearch Railway部署镜像构建脚本
# 构建AMD64/Linux架构的Docker镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
IMAGE_NAME="unisearch"
TAG="latest"
REGISTRY=""
FULL_IMAGE_NAME=""

# 显示帮助信息
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --name NAME    镜像名称 (默认: unisearch)"
    echo "  -t, --tag TAG      镜像标签 (默认: latest)"
    echo "  -r, --registry REG 镜像仓库地址 (可选)"
    echo "  -h, --help         显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0                                    # 构建 unisearch:latest"
    echo "  $0 -n myapp -t v1.0                  # 构建 myapp:v1.0"
    echo "  $0 -r your-registry.com -n myapp     # 推送到指定仓库"
    echo ""
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: 未知参数 $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 设置完整镜像名称
if [[ -n "$REGISTRY" ]]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
fi

echo -e "${BLUE}🚀 开始构建UniSearch Railway部署镜像${NC}"
echo -e "${BLUE}镜像名称: ${FULL_IMAGE_NAME}${NC}"
echo -e "${BLUE}架构: AMD64/Linux${NC}"
echo ""

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker未运行，请启动Docker服务${NC}"
    exit 1
fi

# 检查必要文件
if [[ ! -f "Dockerfile.railway" ]]; then
    echo -e "${RED}❌ 找不到Dockerfile.railway文件${NC}"
    exit 1
fi

if [[ ! -d "frontend" ]] || [[ ! -d "backend" ]]; then
    echo -e "${RED}❌ 找不到frontend或backend目录${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 检查项目结构...${NC}"
echo "✅ 前端目录: frontend/"
echo "✅ 后端目录: backend/"
echo "✅ Dockerfile: Dockerfile.railway"
echo ""

# 清理旧的构建缓存
echo -e "${YELLOW}🧹 清理Docker构建缓存...${NC}"
docker builder prune -f

# 构建镜像
echo -e "${YELLOW}🔨 开始构建Docker镜像...${NC}"
echo "这可能需要几分钟时间，请耐心等待..."

if docker build \
    --platform linux/amd64 \
    --file Dockerfile.railway \
    --tag "${FULL_IMAGE_NAME}" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --progress=plain \
    .; then
    
    echo -e "${GREEN}✅ 镜像构建成功!${NC}"
else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

# 显示镜像信息
echo ""
echo -e "${BLUE}📊 镜像信息:${NC}"
docker images "${FULL_IMAGE_NAME}"

# 检查镜像大小
IMAGE_SIZE=$(docker images "${FULL_IMAGE_NAME}" --format "table {{.Size}}" | tail -n 1)
echo -e "${BLUE}镜像大小: ${IMAGE_SIZE}${NC}"

# 测试镜像
echo ""
echo -e "${YELLOW}🧪 测试镜像...${NC}"
if docker run --rm "${FULL_IMAGE_NAME}" nginx -v > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx测试通过${NC}"
else
    echo -e "${RED}❌ Nginx测试失败${NC}"
fi

if docker run --rm "${FULL_IMAGE_NAME}" /app/pansou --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端应用测试通过${NC}"
else
    echo -e "${YELLOW}⚠️  后端应用测试失败 (可能是正常的，因为需要参数)${NC}"
fi

# 如果指定了仓库，询问是否推送
if [[ -n "$REGISTRY" ]]; then
    echo ""
    echo -e "${YELLOW}📤 检测到仓库地址，是否推送镜像? (y/N)${NC}"
    read -r -p "请输入选择: " response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📤 推送镜像到 ${REGISTRY}...${NC}"
        if docker push "${FULL_IMAGE_NAME}"; then
            echo -e "${GREEN}✅ 镜像推送成功!${NC}"
        else
            echo -e "${RED}❌ 镜像推送失败${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}🎉 构建完成!${NC}"
echo ""
echo -e "${BLUE}下一步操作:${NC}"
echo "1. 在Railway中创建新项目"
echo "2. 选择 'Docker Image' 选项"
echo "3. 输入镜像名称: ${FULL_IMAGE_NAME}"
echo "4. 配置环境变量和端口"
echo "5. 部署服务"
echo ""
echo -e "${BLUE}Railway部署配置建议:${NC}"
echo "- 端口: 3000 (前端)"
echo "- 健康检查: /health"
echo "- 环境变量: 参考railway-env.txt文件"
