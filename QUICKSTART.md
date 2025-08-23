# 🚀 UniSearch Docker 快速启动指南

## ⚡ 5分钟快速部署

### 1. 前置检查
```bash
# 检查 Docker 是否安装
docker --version
docker-compose --version
```

### 2. 一键启动
```bash
# 给脚本添加执行权限
chmod +x docker-build.sh docker-deploy.sh test-docker.sh

# 测试 Docker 配置
./test-docker.sh

# 启动开发环境
./docker-deploy.sh dev
```

### 3. 访问应用
- 🌐 前端界面：http://localhost:3000
- 🔌 后端API：http://localhost:8888

## 🔧 常用命令

### 构建镜像
```bash
# 构建所有镜像
./docker-build.sh build

# 仅构建前端
./docker-build.sh frontend

# 仅构建后端
./docker-build.sh backend
```

### 管理服务
```bash
# 启动开发环境
./docker-deploy.sh dev

# 启动生产环境
./docker-deploy.sh prod

# 查看状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs

# 停止服务
./docker-deploy.sh stop

# 重启服务
./docker-deploy.sh restart
```

### 清理资源
```bash
# 清理所有资源
./docker-deploy.sh cleanup

# 或者使用构建脚本
./docker-build.sh clean
```

## 📋 环境说明

### 开发环境 (dev)
- 前端端口：3000
- 后端端口：8888
- 适合开发和测试

### 生产环境 (prod)
- 前端端口：80
- 后端端口：8888
- 包含资源限制和优化配置

## 🚨 故障排除

### 端口被占用
```bash
# 检查端口占用
lsof -i :3000
lsof -i :8888

# 停止占用端口的进程
kill -9 <PID>
```

### 容器启动失败
```bash
# 查看容器日志
./docker-deploy.sh logs frontend
./docker-deploy.sh logs backend

# 检查容器状态
./docker-deploy.sh status
```

### 网络问题
```bash
# 检查网络
docker network ls
docker network inspect unisearch-network

# 重启网络
docker network rm unisearch-network
./docker-deploy.sh restart
```

## 📚 更多信息

- 📖 详细文档：查看 [DOCKER_README.md](./DOCKER_README.md)
- 🐛 问题反馈：提交 GitHub Issue
- 💡 功能建议：提交 Pull Request

## 🎯 下一步

1. ✅ 完成 Docker 部署
2. 🔍 测试应用功能
3. 🚀 部署到生产环境
4. 📊 配置监控和日志
5. 🔒 配置 SSL 证书

---

**提示**：首次启动可能需要几分钟来构建镜像，请耐心等待！
