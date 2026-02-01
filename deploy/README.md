# UniSearch 生产环境部署指南

## 📋 目录结构

```
deploy/
├── docker-compose.prod.yml  # 生产环境 Docker Compose 配置
├── env.prod                 # 生产环境变量配置模板
├── .env.local              # 本地敏感配置（需手动创建，不提交到 Git）
├── nginx/                  # Nginx 配置文件
│   ├── http.conf          # HTTP 配置
│   ├── https.conf         # HTTPS 配置
│   └── monitor.conf       # 监控配置
└── README.md              # 本文档
```

## 🚀 快速部署

### 1. 准备工作

#### 1.1 服务器要求
- 操作系统: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- CPU: 2核心以上
- 内存: 4GB 以上
- 磁盘: 20GB 以上可用空间
- Docker: 20.10+
- Docker Compose: 2.0+

#### 1.2 安装 Docker 和 Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 2. 配置环境变量

#### 2.1 复制配置模板

```bash
cd deploy
cp env.prod .env
```

#### 2.2 修改必要配置

编辑 `.env` 文件，**必须修改**以下配置项：

```bash
# 数据库密码（必须修改）
DB_PASSWORD=your_secure_password_here

# 域名配置（如果有域名）
DOMAIN=your-domain.com
WWW_DOMAIN=www.your-domain.com

# Docker 镜像配置
DOCKER_USERNAME=liberty159
IMAGE_NAME=unisearch
VERSION=latest
```

#### 2.3 配置敏感信息（推荐）

为了安全，建议将敏感配置单独存储在 `.env.local` 文件中：

```bash
# 创建本地敏感配置文件
touch .env.local
chmod 600 .env.local
```

在 `.env.local` 中添加：

```bash
# 数据库密码
DB_PASSWORD=your_secure_password_here

# 管理员密码哈希
# 生成方法: cd .. && go run gen_hash.go "你的密码"
ADMIN_PASSWORD_HASH=$2a$10$...

# 刷新令牌加密密钥
# 生成方法: openssl rand -base64 32
REFRESH_TOKEN_ENCRYPT_KEY=your_32_byte_random_key_here
```

### 3. 创建数据目录

```bash
# 创建数据持久化目录
sudo mkdir -p /data/mysql
sudo mkdir -p /data/backend/cache
sudo mkdir -p /data/backend/data

# 设置权限
sudo chown -R 999:999 /data/mysql  # MySQL 容器使用 UID 999
sudo chmod -R 755 /data/backend
```

### 4. 启动服务

```bash
# 进入部署目录
cd deploy

# 拉取最新镜像
docker compose -f docker-compose.prod.yml pull

# 启动服务（后台运行）
docker compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

### 5. 验证部署

```bash
# 检查容器状态
docker ps

# 检查后端健康状态
curl http://localhost:8888/api/health

# 检查前端访问
curl http://localhost:3000
```

## 🔧 常用运维命令

### 服务管理

```bash
# 启动服务
docker compose -f docker-compose.prod.yml up -d

# 停止服务
docker compose -f docker-compose.prod.yml down

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看实时日志
docker compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f mysql
```

### 更新部署

```bash
# 拉取最新镜像
docker compose -f docker-compose.prod.yml pull

# 重新创建并启动容器
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 清理旧镜像
docker image prune -f
```

### 数据备份

```bash
# 备份 MySQL 数据库
docker exec unisearch-mysql-prod mysqldump -uroot -p${DB_PASSWORD} unisearch > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份后端缓存和数据
tar -czf backend_data_$(date +%Y%m%d_%H%M%S).tar.gz /data/backend/
```

### 数据恢复

```bash
# 恢复 MySQL 数据库
docker exec -i unisearch-mysql-prod mysql -uroot -p${DB_PASSWORD} unisearch < backup.sql

# 恢复后端数据
tar -xzf backend_data_backup.tar.gz -C /
```

## 🔐 安全配置

### 1. 修改默认密码

```bash
# 生成管理员密码哈希
cd ..
go run gen_hash.go "your_new_password"

# 将生成的哈希值更新到 .env.local 中的 ADMIN_PASSWORD_HASH
```

### 2. 生成加密密钥

```bash
# 生成刷新令牌加密密钥
openssl rand -base64 32

# 将生成的密钥更新到 .env.local 中的 REFRESH_TOKEN_ENCRYPT_KEY
```

### 3. 配置防火墙

```bash
# 安装 UFW
sudo apt install ufw

# 允许必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 4. 配置 SSL 证书（可选）

如果需要 HTTPS 访问，可以使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 证书会自动保存到 /etc/letsencrypt/live/your-domain.com/
```

## 📊 监控和日志

### 查看容器资源使用

```bash
# 查看所有容器资源使用情况
docker stats

# 查看特定容器
docker stats unisearch-app-prod unisearch-mysql-prod
```

### 查看应用日志

```bash
# 查看后端日志
docker compose -f docker-compose.prod.yml logs -f app

# 查看数据库日志
docker compose -f docker-compose.prod.yml logs -f mysql

# 查看最近 100 行日志
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

### 进入容器调试

```bash
# 进入应用容器
docker exec -it unisearch-app-prod sh

# 进入数据库容器
docker exec -it unisearch-mysql-prod bash

# 连接 MySQL 数据库
docker exec -it unisearch-mysql-prod mysql -uroot -p${DB_PASSWORD} unisearch
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker compose -f docker-compose.prod.yml logs

# 检查配置文件语法
docker compose -f docker-compose.prod.yml config

# 检查端口占用
sudo netstat -tulpn | grep -E '3000|8888|3306'
```

### 数据库连接失败

```bash
# 检查数据库容器状态
docker ps | grep mysql

# 检查数据库健康状态
docker inspect unisearch-mysql-prod | grep -A 10 Health

# 测试数据库连接
docker exec -it unisearch-mysql-prod mysql -uroot -p${DB_PASSWORD} -e "SELECT 1"
```

### 应用无法访问

```bash
# 检查应用容器状态
docker ps | grep app

# 检查应用健康状态
curl http://localhost:8888/api/health

# 检查网络连接
docker network inspect unisearch-network-prod
```

## 📝 配置说明

### 环境变量说明

| 变量名 | 说明 | 默认值 | 是否必须 |
|--------|------|--------|----------|
| `DB_HOST` | 数据库主机 | `mysql` | 是 |
| `DB_PORT` | 数据库端口 | `3306` | 是 |
| `DB_USER` | 数据库用户 | `root` | 是 |
| `DB_PASSWORD` | 数据库密码 | - | **是（必须修改）** |
| `DB_NAME` | 数据库名称 | `unisearch` | 是 |
| `ADMIN_PASSWORD_HASH` | 管理员密码哈希 | - | **是（必须修改）** |
| `REFRESH_TOKEN_ENCRYPT_KEY` | 刷新令牌加密密钥 | - | **是（必须修改）** |
| `FRONTEND_PORT` | 前端端口 | `3000` | 否 |
| `BACKEND_PORT` | 后端端口 | `8888` | 否 |
| `CACHE_ENABLED` | 是否启用缓存 | `true` | 否 |
| `ASYNC_PLUGIN_ENABLED` | 是否启用异步插件 | `true` | 否 |

### 资源限制说明

生产环境配置了资源限制，确保服务稳定运行：

- **MySQL 容器**:
  - CPU 限制: 2核心
  - 内存限制: 2GB
  - 预留资源: 1核心 + 1GB 内存

- **应用容器**:
  - CPU 限制: 2核心
  - 内存限制: 1GB
  - 预留资源: 1核心 + 512MB 内存

## 🔄 自动更新（Watchtower）

生产环境配置了 Watchtower 自动更新服务：

- 每天凌晨 2 点检查镜像更新
- 自动拉取最新镜像并重启容器
- 自动清理旧镜像

如需禁用自动更新，可以停止 Watchtower 服务：

```bash
docker compose -f docker-compose.prod.yml stop watchtower
```

## 📞 技术支持

如遇到问题，请检查：

1. 容器日志: `docker compose -f docker-compose.prod.yml logs`
2. 系统资源: `docker stats`
3. 网络连接: `docker network inspect unisearch-network-prod`
4. 配置文件: `docker compose -f docker-compose.prod.yml config`

---

**最后更新**: 2026-02-01
