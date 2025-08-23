# UniSearch Docker 部署指南

本文档介绍如何使用 Docker 部署 UniSearch 应用，包括前端和后端服务。

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

### 一键部署

```bash
# 克隆项目
git clone <your-repo-url>
cd UniSearch

# 给脚本添加执行权限
chmod +x docker-build.sh docker-deploy.sh

# 构建并启动开发环境
./docker-deploy.sh dev

# 或者构建并启动生产环境
./docker-deploy.sh prod
```

## 📁 项目结构

```
UniSearch/
├── frontend/                 # 前端应用
│   ├── Dockerfile           # 前端 Docker 配置
│   ├── nginx.conf           # Nginx 配置
│   └── .dockerignore        # Docker 忽略文件
├── backend/                  # 后端应用
│   ├── Dockerfile           # 后端 Docker 配置
│   └── docker-compose.yml   # 后端独立部署配置
├── docker-compose.yml       # 开发环境配置
├── docker-compose.prod.yml  # 生产环境配置
├── docker-build.sh          # 构建脚本
├── docker-deploy.sh         # 部署脚本
└── DOCKER_README.md         # 本文档
```

## 🛠️ 构建镜像

### 构建所有镜像

```bash
./docker-build.sh build
```

### 仅构建前端镜像

```bash
./docker-build.sh frontend
```

### 仅构建后端镜像

```bash
./docker-build.sh backend
```

### 清理镜像

```bash
./docker-build.sh clean
```

## 🚀 部署服务

### 开发环境

```bash
# 启动开发环境
./docker-deploy.sh dev

# 查看状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 停止服务
./docker-deploy.sh stop
```

**开发环境端口映射：**
- 前端：http://localhost:3000
- 后端：http://localhost:8888

### 生产环境

```bash
# 启动生产环境
./docker-deploy.sh prod

# 查看状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 停止服务
./docker-deploy.sh stop
```

**生产环境端口映射：**
- 前端：http://localhost:80
- 后端：http://localhost:8888

## 🔧 配置说明

### 前端配置

前端使用 Nginx 作为 Web 服务器，主要特性：

- **静态文件服务**：提供 React 应用的静态文件
- **API 代理**：将 `/api/*` 请求代理到后端服务
- **路由支持**：支持 React Router 的 HTML5 History API
- **Gzip 压缩**：自动压缩静态资源
- **缓存策略**：静态资源长期缓存，HTML 文件不缓存
- **安全头**：添加基本的安全响应头

### 后端配置

后端使用 Go 语言，主要特性：

- **缓存支持**：Redis 或内存缓存
- **异步插件**：支持异步搜索插件
- **健康检查**：内置健康检查端点
- **日志记录**：结构化日志输出
- **配置管理**：环境变量配置

### 网络配置

- **容器网络**：使用自定义桥接网络 `unisearch-network`
- **服务发现**：前端通过服务名 `backend` 访问后端
- **端口映射**：前端 80 端口，后端 8888 端口

## 📊 监控和日志

### 查看服务状态

```bash
./docker-deploy.sh status
```

### 查看日志

```bash
# 查看所有服务日志
./docker-deploy.sh logs

# 查看特定服务日志
./docker-deploy.sh logs frontend
./docker-deploy.sh logs backend
```

### 健康检查

- **前端健康检查**：`/health` 端点
- **后端健康检查**：`/api/health` 端点
- **检查间隔**：30秒
- **超时时间**：5秒
- **重试次数**：3次

## 🔒 安全配置

### 前端安全头

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 后端安全

- 环境变量配置
- 端口限制
- 网络隔离

## 📈 性能优化

### 前端优化

- **多阶段构建**：减少最终镜像大小
- **Nginx 配置**：Gzip 压缩、静态资源缓存
- **资源优化**：CSS/JS 文件长期缓存

### 后端优化

- **资源限制**：内存和 CPU 限制
- **缓存策略**：可配置的缓存 TTL
- **异步处理**：后台任务处理

## 🚨 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :8888
   ```

2. **容器启动失败**
   ```bash
   # 查看容器日志
   docker logs unisearch-frontend
   docker logs unisearch-backend
   ```

3. **网络连接问题**
   ```bash
   # 检查网络
   docker network ls
   docker network inspect unisearch-network
   ```

### 清理资源

```bash
# 清理所有 Docker 资源
./docker-deploy.sh cleanup

# 或者手动清理
docker-compose down -v
docker system prune -f
```

## 🔄 更新部署

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建镜像
./docker-build.sh build

# 重启服务
./docker-deploy.sh restart
```

### 滚动更新

```bash
# 停止旧服务
./docker-deploy.sh stop

# 启动新服务
./docker-deploy.sh prod
```

## 📚 高级配置

### 自定义 Nginx 配置

编辑 `frontend/nginx.conf` 文件，然后重新构建前端镜像：

```bash
./docker-build.sh frontend
./docker-deploy.sh restart
```

### 环境变量配置

在 `docker-compose.yml` 或 `docker-compose.prod.yml` 中添加环境变量：

```yaml
environment:
  - NODE_ENV=production
  - API_BASE_URL=http://backend:8888
```

### 数据持久化

后端缓存和日志数据会自动持久化到 Docker 卷中：

```bash
# 查看卷
docker volume ls | grep unisearch

# 备份数据
docker run --rm -v unisearch-backend-cache:/data -v $(pwd):/backup alpine tar czf /backup/backend-cache.tar.gz -C /data .
```

## 🤝 贡献

如果您在使用过程中遇到问题或有改进建议，请：

1. 检查本文档的故障排除部分
2. 查看 GitHub Issues
3. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。
