# 构建阶段
# 使用 Go 1.24 版本（2025年2月发布的稳定版）
FROM golang:1.24-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache git ca-certificates tzdata

# 设置工作目录
WORKDIR /app

# 设置 Go 代理（使用国内镜像源，解决网络超时问题）
ENV GOPROXY=https://goproxy.cn,https://mirrors.aliyun.com/goproxy/,https://goproxy.io,direct

# 复制依赖文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建参数
ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

# 构建应用
# 使用静态编译，确保在不同环境下都能运行
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -extldflags '-static'" -o unisearch .

# 运行阶段
# 这一阶段会根据 buildx 的 --platform 参数选择正确的基础镜像 (例如 linux/arm64 会拉取 arm64/alpine)
FROM alpine:3.19

# 添加运行时依赖（包含 wget 用于健康检查）
RUN apk add --no-cache ca-certificates tzdata wget

# 创建缓存目录
RUN mkdir -p /app/cache

# 从构建阶段复制可执行文件
# buildx 会智能地从对应平台的 builder 中复制正确的可执行文件
COPY --from=builder /app/unisearch /app/unisearch

# 设置工作目录
WORKDIR /app

# 暴露端口（根据 API Key MySQL 迁移规格要求）
EXPOSE 8888

# 设置环境变量
ENV PORT=8888 \
    CACHE_PATH=/app/cache \
    CACHE_ENABLED=true \
    TZ=Asia/Shanghai \
    ASYNC_PLUGIN_ENABLED=true \
    ASYNC_RESPONSE_TIMEOUT=4 \
    ASYNC_MAX_BACKGROUND_WORKERS=20 \
    ASYNC_MAX_BACKGROUND_TASKS=100 \
    ASYNC_CACHE_TTL_HOURS=1 \
    DB_HOST=localhost \
    DB_PORT=3306 \
    DB_USER=root \
    DB_PASSWORD=root \
    DB_NAME=unisearch

# 构建参数
ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

# 添加镜像标签
LABEL org.opencontainers.image.title="PanSou" \
      org.opencontainers.image.description="高性能网盘资源搜索API服务" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.url="https://github.com/fish2018/unisearch" \
      org.opencontainers.image.source="https://github.com/fish2018/unisearch" \
      maintainer="fish2018"

# 健康检查（验证服务是否正常运行）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8888/api/health || exit 1

# 运行应用
CMD ["/app/unisearch"]
