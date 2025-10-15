# UniSearch 脚本使用指南

> 💡 **项目已完成脚本整合**: 从22个脚本精简为4个核心脚本，提升可维护性和易用性。

## 概述

UniSearch 项目提供了4个核心脚本，简化了从本地开发到生产部署的整个流程。

## 脚本列表

### 本地开发脚本

1. **start.sh** - 启动本地开发环境
2. **stop.sh** - 停止本地开发环境

### 云服务器脚本

3. **deploy.sh** - 服务器部署和管理
4. **ssl.sh** - SSL证书管理

---

## 详细使用说明

### 1. start.sh - 启动本地开发环境

**功能：** 同时启动前端和后端服务，用于本地开发

**用法：**
```bash
./scripts/start.sh
```

**工作流程：**
1. 检查依赖（Go、pnpm）
2. 检查端口占用（8888、5173）
3. 启动后端服务（端口8888）
4. 等待后端启动完成
5. 启动前端服务（端口5173）
6. 显示访问地址

**访问地址：**
- 前端：http://localhost:5173
- 后端：http://localhost:8888

---

### 2. stop.sh - 停止本地开发环境

**功能：** 优雅停止所有前后端服务

**用法：**
```bash
./scripts/stop.sh
```

**工作流程：**
1. 停止前端和后端进程
2. 清理PID文件
3. 备份日志文件
4. 验证服务已停止

---

### 3. deploy.sh - 服务器部署和管理

**功能：** 云服务器上的完整部署和管理

**用法：**
```bash
sudo ./scripts/deploy.sh <command>
```

**命令列表：**

#### init - 初始化服务器环境

```bash
sudo ./scripts/deploy.sh init
```

**功能：**
- 更新系统包
- 安装Docker和Docker Compose
- 安装Nginx
- 配置UFW防火墙（开放22、80、443、8080端口）
- 配置Nginx反向代理

**首次部署时必须运行！**

**说明：**
- Docker安装使用清华大学镜像源（mirrors.tuna.tsinghua.edu.cn）
- 适用于Ubuntu 24.04 LTS系统
- 自动安装docker-buildx-plugin和docker-compose-plugin

#### start - 启动服务

```bash
sudo ./scripts/deploy.sh start
```

**功能：**
- 拉取最新Docker镜像
- 停止旧容器
- 启动新容器
- 验证服务状态

#### stop - 停止服务

```bash
sudo ./scripts/deploy.sh stop
```

#### restart - 重启服务

```bash
sudo ./scripts/deploy.sh restart
```

#### status - 查看服务状态

```bash
sudo ./scripts/deploy.sh status
```

**显示信息：**
- Docker服务状态
- 容器运行状态
- Nginx服务状态
- 防火墙状态
- 磁盘和内存使用

#### logs - 查看日志

```bash
sudo ./scripts/deploy.sh logs
```

**显示：** 实时容器日志（Ctrl+C退出）

#### cleanup - 清理旧日志

```bash
sudo ./scripts/deploy.sh cleanup
```

**功能：**
- 清理7天前的Docker容器日志
- 清理应用日志卷中的旧文件
- 清理系统日志（journalctl）

**适用场景：** 手动清理日志，释放磁盘空间

#### setup-log-rotation - 设置定时日志清理

```bash
sudo ./scripts/deploy.sh setup-log-rotation
```

**功能：**
- 创建自动日志清理脚本
- 设置每天凌晨2点自动执行
- 清理日志记录到 `/var/log/unisearch-cleanup.log`

**推荐：** 首次部署后运行，实现自动化日志管理

#### backup - 备份数据

```bash
sudo ./scripts/deploy.sh backup
```

**备份内容：**
- 配置文件（deploy/目录）
- Nginx配置
- Docker数据卷

**备份位置：** `项目根目录/backups/`

#### restore - 从备份恢复

```bash
sudo ./scripts/deploy.sh restore <backup_file>
```

**示例：**
```bash
sudo ./scripts/deploy.sh restore backups/unisearch_backup_20250114.tar.gz
```

---

### 4. ssl.sh - SSL证书管理

**功能：** SSL证书申请和管理（整合备案相关功能）

**用法：**
```bash
sudo ./scripts/ssl.sh <command>
```

**命令列表：**

#### check - 检查备案状态

```bash
sudo ./scripts/ssl.sh check
```

**功能：**
- 测试80端口可访问性
- 判断域名是否已备案
- 提供相应的建议

**适用场景：** 部署前检查是否可以申请SSL证书

#### temp - 临时8080端口部署

```bash
sudo ./scripts/ssl.sh temp
```

**功能：**
- 配置Nginx监听8080端口
- 开放防火墙8080端口
- 提供临时访问地址

**适用场景：** 域名未备案期间的临时访问方案

**访问地址：**
- http://服务器IP:8080
- http://域名:8080

#### apply - 申请SSL证书（HTTP验证）

```bash
sudo ./scripts/ssl.sh apply
```

**功能：**
- 检查备案状态
- 准备ACME验证目录
- 配置Nginx支持验证
- 申请Let's Encrypt证书
- 配置HTTPS
- 设置证书自动续期

**前提条件：** 域名已完成ICP备案（中国大陆服务器）

**证书信息：**
- 颁发者：Let's Encrypt
- 有效期：90天
- 自动续期：已配置（每天凌晨3点检查）

#### dns - 申请SSL证书（DNS验证）

```bash
sudo ./scripts/ssl.sh dns
```

**功能：**
- 使用DNS-01验证方式
- 不需要80端口
- 手动添加DNS TXT记录
- 配置HTTPS

**适用场景：**
- 80端口不可用
- 域名未备案但需要HTTPS

**注意事项：**
- 续期需要手动操作
- 需要再次添加DNS TXT记录

#### renew - 手动续期证书

```bash
sudo ./scripts/ssl.sh renew
```

**功能：**
- 强制续期证书
- 重载Nginx配置
- 显示证书信息

---

## 部署流程示例

### 场景1：国内服务器 + 已备案域名

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：设置定时日志清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation

# 步骤4：申请SSL证书
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
```

### 场景2：国内服务器 + 未备案域名

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：设置定时日志清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation

# 步骤4：临时8080部署
sudo ./scripts/ssl.sh temp

# 临时访问：http://your-ip:8080

# 步骤5：提交ICP备案申请

# 步骤6：备案完成后申请SSL
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
```

### 场景3：海外服务器（无需备案）

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：申请SSL证书
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
```

---

## 常见问题

### Q1: deploy.sh必须使用root用户吗？

**A:** 是的，因为需要安装软件包、配置系统服务和防火墙。

### Q2: SSL证书多久续期一次？

**A:** Let's Encrypt证书有效期90天，脚本已配置自动续期（每天凌晨3点检查）。

### Q3: 如何查看备份文件？

**A:** 
```bash
ls -lh backups/
```

### Q4: 如何修改默认配置？

**A:** 
- deploy.sh：修改 `deploy/` 目录下的配置文件
- ssl.sh：修改脚本内的DOMAIN变量

### Q5: 日志占用磁盘空间过多怎么办？

**A:** 
```bash
# 手动清理日志
sudo ./scripts/deploy.sh cleanup

# 设置定时清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation
```

### Q6: 如何查看日志收集状态？

**A:** 
```bash
# 查看 logspout 容器状态
docker ps | grep logspout

# 查看收集的日志
docker exec unisearch-logspout ls -la /logs/

# 查看日志清理记录
sudo tail -f /var/log/unisearch-cleanup.log
```

---

## 配置文件位置

所有配置文件存放在 `deploy/` 目录：

```
deploy/
├── docker-compose.prod.yml    # Docker Compose配置
├── env.prod                    # 环境变量
└── nginx/
    ├── http.conf              # HTTP配置
    └── https.conf             # HTTPS配置
```

---

## 日志位置

### 本地开发日志
- `logs/backend_*.log` - 后端日志
- `logs/frontend_*.log` - 前端日志

### 服务器日志
- `/var/log/nginx/unisearch_access.log` - Nginx访问日志
- `/var/log/nginx/unisearch_error.log` - Nginx错误日志
- `docker logs unisearch` - 容器日志
- `/var/log/unisearch-cleanup.log` - 日志清理记录

### 日志收集和轮转
- **logspout 服务**：自动收集所有容器日志
- **日志轮转**：每个文件最大1MB，保留7个文件
- **定时清理**：每天凌晨2点自动清理7天前的日志
- **手动清理**：`sudo ./scripts/deploy.sh cleanup`

---

## 故障排查

### 服务启动失败

```bash
# 查看容器日志
docker logs unisearch

# 查看Nginx日志
sudo tail -f /var/log/nginx/unisearch_error.log

# 检查端口占用
sudo netstat -tulpn | grep -E ':(80|443|3000|8888)'
```

### SSL证书申请失败

```bash
# 检查备案状态
sudo ./scripts/ssl.sh check

# 查看Certbot日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# 检查DNS解析
nslookup your-domain.com
```

---

## 脚本整合说明

### 整合优势

本项目已完成脚本整合，从原来的22个脚本精简为4个核心脚本：

**1. 简化维护**
- 从22个脚本减少到4个
- 相关功能集中管理
- 减少代码重复

**2. 提升易用性**
- 清晰的命令结构
- 统一的参数格式
- 详细的帮助信息

**3. 增强功能**
- 支持多种部署场景
- 整合备案相关流程
- 统一配置管理

**4. 更好的组织**
- 按使用场景分类
- 配置文件集中存放
- 文档更加完善

### 脚本整合来源

**deploy.sh 整合了：**
- server-init.sh（初始化逻辑）
- deploy-production.sh（部署逻辑）
- monitor-logs.sh（日志监控）
- backup.sh（备份逻辑）
- fix-port-conflict.sh（端口冲突修复）
- log-cleanup.sh（日志清理）
- log-rotation-setup.sh（日志轮转设置）

**ssl.sh 整合了：**
- enable-ssl-after-beian.sh（备案后SSL）
- deploy-port-8080.sh（临时8080）
- ssl-dns-challenge.sh（DNS验证）
- setup-ssl.sh（SSL配置）
- final-ssl-fix.sh（SSL修复）
- fix-certbot-webroot.sh（Certbot配置）
- apply-ssl-cert.sh（证书申请）
- 以及其他所有SSL相关脚本

---

## 更多帮助

- 备案指南：[docs/ICP_BEIAN_GUIDE.md](ICP_BEIAN_GUIDE.md)
- 项目README：[README.md](../README.md)

