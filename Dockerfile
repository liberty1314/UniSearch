# ============================================
# 阶段 1: 构建后端 (Go)
# ============================================
FROM golang:1.24-alpine AS backend-builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app/backend

# 复制依赖文件并下载
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# 复制后端源代码并构建
COPY backend/ ./
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -ldflags="-s -w -extldflags '-static'" -o unisearch .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -ldflags="-s -w -extldflags '-static'" -o unisearch-migrate ./cmd/migrate

# ============================================
# 阶段 2: 构建前端 (Node.js + pnpm)
# ============================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# ============================================
# 阶段 3: 生产运行环境 (Nginx + 后端)
# ============================================
FROM nginx:alpine

RUN apk add --no-cache ca-certificates tzdata curl supervisor

RUN mkdir -p /app/backend /app/cache /var/log/supervisor

# 从构建阶段复制产物
COPY --from=backend-builder /app/backend/unisearch /app/backend/unisearch
COPY --from=backend-builder /app/backend/unisearch-migrate /app/backend/unisearch-migrate
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# 复制配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# 设置环境变量
ENV PORT=8888 \
    TZ=Asia/Shanghai \
    ASYNC_PLUGIN_ENABLED=true \
    ASYNC_RESPONSE_TIMEOUT=4 \
    ASYNC_MAX_BACKGROUND_WORKERS=20 \
    ASYNC_MAX_BACKGROUND_TASKS=100 \
    ASYNC_CACHE_TTL_HOURS=1 \
    ENABLED_PLUGINS=labi,shandian,muou,wanou,hunhepan,pansearch,panta,susu,thepiratebay,ouge,erxiao,clmao,u3c3,javdb,jutoushe,nyaa,xinjuc,aikanzy,quark4k,quarksoo,huban,panwiki,panyq,sidhub

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
