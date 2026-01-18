# 生产环境部署指南

本目录包含生产环境部署所需的配置文件和说明文档。

## 📁 文件说明

- `docker-compose.prod.yml` - 生产环境 Docker Compose 配置文件
- `.env.production.example` - 生产环境配置模板
- `README.md` - 本文档

## 🚀 快速开始

### 1. 准备配置文件

```bash
# 复制配置模板
cp deploy/.env.production.example deploy/.env.production

# 编辑配置文件，修改所有必需的配置项
vim deploy/.env.production
```

**必须修改的配置项：**
- `DB_PASSWORD` - 数据库密码（使用强密码）
- `ADMIN_PASSWORD_HASH` - 管理员密码哈希
- `REFRESH_TOKEN_ENCRYPT_KEY` - 刷新令牌加密密钥
- `DOMAIN` - 你的域名
- `FULL_IMAGE_NAME` - Docker 镜像名称和版本

### 2. 生成密钥和密码

```bash
# 生成管理员密码哈希
./scripts/gen_admin_password.sh "your_admin_password"

# 生成刷新令牌加密密钥
openssl rand -base64 32
```

### 3. 创建数据目录

```bash
# 创建数据持久化目录
sudo mkdir -p /data/mysql
sudo mkdir -p /data/backend/cache
sudo mkdir -p /data/backend/data

# 设置权限
sudo chown -R $USER:$USER /data
```

### 4. 部署应用

```bash
# 使用部署脚本（推荐）
./scripts/deploy.sh

# 或手动部署
cd deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 5. 验证部署

```bash
# 查看容器状态
docker-compose -f deploy/docker-compose.prod.yml ps

# 查看日志
docker-compose -f deploy/docker-compose.prod.yml logs -f

# 健康检查
curl http://localhost:8888/api/health
```

## 🔧 配置说明

### 资源限制

生产环境配置了以下资源限制：

| 服务 | CPU 限制 | 内存限制 | CPU 预留 | 内存预留 |
|------|---------|---------|---------|---------|
| MySQL | 2 核 | 2GB | 1 核 | 1GB |
| Backend | 1 核 | 512MB | 0.5 核 | 256MB |
| Frontend | 0.5 核 | 256MB | 0.25 核 | 128MB |
| Nginx | 0.5 核 | 256MB | 0.25 核 | 128MB |

根据实际负载情况，可以在 `docker-compose.prod.yml` 中调整这些限制。

### 重启策略

所有服务都配置了 `restart: unless-stopped` 策略：
- 容器异常退出时自动重启
- 手动停止的容器不会自动重启
- 系统重启后自动启动容器

### 健康检查

所有服务都配置了健康检查：
- **MySQL**: 每 10 秒检查一次，启动后 30 秒开始检查
- **Backend**: 每 30 秒检查一次，启动后 20 秒开始检查
- **Frontend**: 每 30 秒检查一次，启动后 10 秒开始检查
- **Nginx**: 每 30 秒检查一次

### 数据持久化

生产环境使用绑定挂载而非命名卷：

```yaml
volumes:
  - /data/mysql:/var/lib/mysql              # MySQL 数据
  - /data/backend/cache:/app/cache          # 后端缓存
  - /data/backend/data:/app/data            # 后端数据
```

**优点：**
- 便于备份和迁移
- 可以直接访问数据文件
- 更好的性能监控

### MySQL 性能优化

生产环境配置了以下 MySQL 优化参数：

```yaml
command:
  - --max_connections=500                    # 最大连接数
  - --innodb_buffer_pool_size=1G            # InnoDB 缓冲池大小
  - --innodb_log_file_size=256M             # 日志文件大小
  - --slow_query_log=1                      # 启用慢查询日志
  - --long_query_time=2                     # 慢查询阈值（秒）
```

## 🔐 安全建议

### 1. 密码和密钥安全

- ✅ 使用强随机密码（至少 16 字符，包含大小写字母、数字、特殊字符）
- ✅ 定期更换密码和密钥（建议每 3-6 个月）
- ✅ 不要将 `.env.production` 提交到版本控制系统
- ✅ 限制配置文件访问权限：`chmod 600 deploy/.env.production`

### 2. 网络安全

```bash
# 配置防火墙（UFW）
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 限制 MySQL 端口访问（仅容器内部访问）
# 不要在 docker-compose.prod.yml 中暴露 MySQL 端口到宿主机
```

### 3. SSL/TLS 配置

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d unisearchso.xyz -d www.unisearchso.xyz

# 自动续期
sudo certbot renew --dry-run
```

### 4. 容器安全

- ✅ 使用官方镜像或可信镜像源
- ✅ 定期更新镜像和依赖
- ✅ 使用非 root 用户运行容器（在 Dockerfile 中配置）
- ✅ 限制容器权限和资源

## 📊 监控和日志

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f deploy/docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f deploy/docker-compose.prod.yml logs -f backend

# 查看最近 100 行日志
docker-compose -f deploy/docker-compose.prod.yml logs --tail=100 backend
```

### 监控容器状态

```bash
# 查看容器状态
docker-compose -f deploy/docker-compose.prod.yml ps

# 查看资源使用情况
docker stats

# 查看容器详细信息
docker inspect unisearch-backend-prod
```

### 日志收集（可选）

可以集成以下日志收集工具：
- **ELK Stack** (Elasticsearch + Logstash + Kibana)
- **Loki + Grafana**
- **Fluentd**

## 🔄 更新和维护

### 更新应用

```bash
# 方式 1: 使用部署脚本（推荐）
./scripts/deploy.sh

# 方式 2: 手动更新
cd deploy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 自动更新（Watchtower）

生产环境配置了 Watchtower 服务，可以自动检查并更新容器：

- **检查频率**: 每天凌晨 2 点
- **更新策略**: 只更新带有特定标签的容器
- **清理策略**: 自动清理旧镜像

如果不需要自动更新，可以在 `docker-compose.prod.yml` 中注释掉 `watchtower` 服务。

### 备份数据

```bash
# 备份 MySQL 数据
docker exec unisearch-mysql-prod mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} > backup_$(date +%Y%m%d).sql

# 备份数据目录
sudo tar -czf backup_$(date +%Y%m%d).tar.gz /data

# 定期备份（添加到 crontab）
0 2 * * * /path/to/backup_script.sh
```

### 恢复数据

```bash
# 恢复 MySQL 数据
docker exec -i unisearch-mysql-prod mysql -u root -p${DB_PASSWORD} ${DB_NAME} < backup_20240101.sql

# 恢复数据目录
sudo tar -xzf backup_20240101.tar.gz -C /
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker-compose -f deploy/docker-compose.prod.yml logs backend

# 查看容器状态
docker-compose -f deploy/docker-compose.prod.yml ps

# 检查配置文件
docker-compose -f deploy/docker-compose.prod.yml config
```

### 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker-compose -f deploy/docker-compose.prod.yml ps mysql

# 检查 MySQL 日志
docker-compose -f deploy/docker-compose.prod.yml logs mysql

# 测试数据库连接
docker exec -it unisearch-mysql-prod mysql -u root -p
```

### 性能问题

```bash
# 查看资源使用情况
docker stats

# 查看 MySQL 慢查询日志
docker exec unisearch-mysql-prod cat /var/lib/mysql/slow.log

# 调整资源限制
# 编辑 docker-compose.prod.yml 中的 deploy.resources 配置
```

## 📞 支持

如有问题，请：
1. 查看日志：`docker-compose -f deploy/docker-compose.prod.yml logs`
2. 检查配置：`docker-compose -f deploy/docker-compose.prod.yml config`
3. 查看文档：`docs/` 目录
4. 提交 Issue：GitHub Issues

## 📝 变更日志

### v1.0.0 (2024-01-01)
- ✅ 初始生产环境配置
- ✅ 添加资源限制和健康检查
- ✅ 配置数据持久化
- ✅ 添加 Watchtower 自动更新
- ✅ 优化 MySQL 性能参数
