# UniSearch 脚本使用指南

> 💡 **项目已完成脚本整合**: 从22个脚本精简为6个核心脚本，提升可维护性和易用性。

## 概述

UniSearch 项目提供了6个核心脚本，简化了从本地开发到生产部署的整个流程。

## 脚本列表

### 本地开发脚本

1. **start.sh** - 启动本地开发环境
2. **stop.sh** - 停止本地开发环境

### 云服务器脚本

3. **build.sh** - 构建和发布Docker镜像
4. **deploy.sh** - 服务器部署和管理
5. **ssl.sh** - SSL证书管理
6. **monitor.sh** - 监控服务管理

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

**端口说明：**
- 本地开发使用 Vite 默认端口 5173
- Docker 部署使用 `.env` 中配置的 `FRONTEND_PORT=3000`
- 脚本会自动处理端口差异，无需手动修改

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
- 清理应用日志卷中的旧文件（7天前）
- 清理系统日志（journalctl，7天前）
- 清理Docker系统缓存

**适用场景：** 手动清理日志和缓存，释放磁盘空间

**注意：** Docker 容器日志已自动管理，无需手动清理

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

#### manual - 手动部署SSL证书

```bash
sudo ./scripts/ssl.sh manual
```

**功能：**
- 部署从1Panel等平台获取的SSL证书
- 自动安装证书文件到系统目录
- 更新Nginx配置为HTTPS
- 验证证书有效性

**适用场景：** 已从1Panel、阿里云、腾讯云等平台获取SSL证书

**使用步骤：**

1. **准备证书文件**
   ```bash
   # 将证书文件放到 deploy/nginx/ 目录
   cd /path/to/UniSearch/deploy/nginx/
   
   # 如果是压缩包，先解压
   unzip your-certificate.zip
   
   # 确保有以下文件：
   # - fullchain.pem（完整证书链）
   # - privkey.pem（私钥文件）
   ```

2. **上传到服务器**
   ```bash
   # 上传证书文件到服务器
   scp deploy/nginx/fullchain.pem root@your-server:/root/UniSearch/deploy/nginx/
   scp deploy/nginx/privkey.pem root@your-server:/root/UniSearch/deploy/nginx/
   ```

3. **部署证书**
   ```bash
   # SSH登录到服务器
   ssh root@your-server
   
   # 运行部署命令
   cd /root/UniSearch
   sudo ./scripts/ssl.sh manual
   ```

**证书信息：**
- 存储位置：`/etc/nginx/ssl/unisearchso.xyz/`
- 自动续期：不支持，需要手动重新部署
- 续期方法：证书过期前重新运行 `sudo ./scripts/ssl.sh manual`

#### renew - 手动续期证书

```bash
sudo ./scripts/ssl.sh renew
```

**功能：**
- 强制续期Let's Encrypt证书
- 重载Nginx配置
- 显示证书信息

**注意：** 仅适用于通过 `apply` 命令申请的证书

---

### 6. monitor.sh - 监控服务管理

**功能：** Uptime Kuma 可视化监控面板管理

**用法：**
```bash
sudo ./scripts/monitor.sh <command>
```

**命令列表：**

#### install - 安装监控服务

```bash
sudo ./scripts/monitor.sh install
```

**功能：**
- 配置防火墙开放监控端口（3001、8080）
- 配置Nginx反向代理
- 创建监控数据卷
- 启动Uptime Kuma容器
- 显示访问地址

**首次部署后运行！**

#### start - 启动监控服务

```bash
sudo ./scripts/monitor.sh start
```

**功能：**
- 启动Uptime Kuma容器
- 显示访问地址

#### stop - 停止监控服务

```bash
sudo ./scripts/monitor.sh stop
```

#### restart - 重启监控服务

```bash
sudo ./scripts/monitor.sh restart
```

#### status - 查看监控状态

```bash
sudo ./scripts/monitor.sh status
```

**显示信息：**
- 容器运行状态
- 端口监听情况
- 数据卷状态
- 访问地址

#### remove - 完全移除监控服务

```bash
sudo ./scripts/monitor.sh remove
```

**功能：**
- 停止并删除容器
- 删除数据卷（所有监控数据）
- 移除Nginx配置
- 关闭防火墙端口

**注意：** 此操作会删除所有监控数据！

---

### 监控面板配置

#### 访问地址

- **直接访问**：`http://服务器IP:3001`
- **Nginx代理**：`http://服务器IP:8080` 或 `http://域名:8080`

#### 首次配置步骤

1. **创建管理员账号**
   - 访问监控面板
   - 设置用户名和密码

2. **添加监控项目**

   **主应用健康检查：**
   - 类型：HTTP(s)
   - URL：`http://unisearch:3000/health`
   - 间隔：60秒

   **API健康检查：**
   - 类型：HTTP(s)
   - URL：`http://unisearch:8888/api/health`
   - 间隔：60秒

   **前端页面监控：**
   - 类型：HTTP(s)
   - URL：`http://unisearch:3000/`
   - 间隔：60秒

   **容器监控（可选）：**
   - 类型：Docker Container
   - 容器名：unisearch

3. **配置告警通知（可选）**
   - 邮件通知
   - Telegram通知
   - Webhook通知
   - 其他通知方式

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

# 步骤4：安装监控服务（推荐）
sudo ./scripts/monitor.sh install

# 步骤5：申请SSL证书
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
# 监控面板：http://your-domain:8080
```

### 场景2：国内服务器 + 未备案域名

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：设置定时日志清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation

# 步骤4：安装监控服务（推荐）
sudo ./scripts/monitor.sh install

# 步骤5：临时8080部署
sudo ./scripts/ssl.sh temp

# 临时访问：http://your-ip:8080
# 监控面板：http://your-ip:3001

# 步骤6：提交ICP备案申请

# 步骤7：备案完成后申请SSL
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
# 监控面板：http://your-domain:8080
```

### 场景3：海外服务器（无需备案）

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：设置定时日志清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation

# 步骤4：安装监控服务（推荐）
sudo ./scripts/monitor.sh install

# 步骤5：申请SSL证书
sudo ./scripts/ssl.sh apply

# 完成！访问 https://your-domain.com
# 监控面板：http://your-domain:8080
```

### 场景4：使用第三方SSL证书（1Panel等）

```bash
# 步骤1：服务器初始化
sudo ./scripts/deploy.sh init

# 步骤2：启动服务
sudo ./scripts/deploy.sh start

# 步骤3：设置定时日志清理（推荐）
sudo ./scripts/deploy.sh setup-log-rotation

# 步骤4：安装监控服务（推荐）
sudo ./scripts/monitor.sh install

# 步骤5：准备证书文件（在本地）
# - 从1Panel/阿里云/腾讯云下载证书
# - 解压到 deploy/nginx/ 目录
cd deploy/nginx/
unzip unisearchso.xyz.zip

# 步骤6：上传证书到服务器
scp fullchain.pem privkey.pem root@your-server:/root/UniSearch/deploy/nginx/

# 步骤7：部署SSL证书
ssh root@your-server
cd /root/UniSearch
sudo ./scripts/ssl.sh manual

# 完成！访问 https://your-domain.com
# 监控面板：http://your-domain:8080
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

### Q6: 如何查看容器日志？

**A:** 
```bash
# 查看主应用日志（实时）
sudo docker logs unisearch -f --tail 100

# 查看监控服务日志
sudo docker logs unisearch-watchtower --tail 50

# 查看日志清理记录
sudo tail -f /var/log/unisearch-cleanup.log

# 查看所有容器状态
sudo docker ps
```

### Q7: 如何访问监控面板？

**A:** 
```bash
# 查看监控服务状态
sudo ./scripts/monitor.sh status

# 访问地址：
# 直接访问：http://服务器IP:3001
# Nginx代理：http://服务器IP:8080 或 http://域名:8080
```

### Q8: 如何配置监控项目？

**A:** 首次访问监控面板需要创建管理员账号，然后添加监控项目：

1. **主应用**：HTTP(s) - `http://unisearch:3000/health`
2. **API接口**：HTTP(s) - `http://unisearch:8888/api/health`
3. **前端页面**：HTTP(s) - `http://unisearch:3000/`

可配置邮件、Telegram等告警通知。

### Q9: Docker 日志会占用多少磁盘空间？

**A:** Docker 日志已配置自动管理：
- 每个容器最多保留 7 个日志文件
- 每个文件最大 50MB
- 总计每个容器最多 350MB
- 旧日志自动压缩和删除

如需查看当前日志大小：
```bash
# 查看所有容器日志大小
sudo du -sh /var/lib/docker/containers/*/

# 查看特定容器日志大小
sudo docker inspect --format='{{.LogPath}}' unisearch | xargs sudo du -h
```

### Q10: 如何使用1Panel等平台的SSL证书？

**A:** 使用 `ssl.sh manual` 命令：

1. **获取证书文件**
   - 从1Panel/阿里云/腾讯云等平台下载证书
   - 解压后得到 `fullchain.pem` 和 `privkey.pem`

2. **部署证书**
   ```bash
   # 将证书文件放到 deploy/nginx/ 目录
   cd deploy/nginx/
   unzip your-certificate.zip
   
   # 上传到服务器并部署
   scp fullchain.pem privkey.pem root@your-server:/root/UniSearch/deploy/nginx/
   ssh root@your-server
   cd /root/UniSearch
   sudo ./scripts/ssl.sh manual
   ```

3. **续期证书**
   - 证书过期前重新获取新证书
   - 重复上述部署步骤

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

### Docker 日志管理
- **日志驱动**：json-file（Docker 内置）
- **自动轮转**：每个文件最大 50MB，保留 7 个文件
- **自动压缩**：旧日志文件自动压缩
- **存储位置**：`/var/lib/docker/containers/<container-id>/`
- **定时清理**：每天凌晨2点自动清理应用日志和系统日志
- **手动清理**：`sudo ./scripts/deploy.sh cleanup`

### 查看日志
```bash
# 查看实时日志
sudo docker logs unisearch -f --tail 100

# 查看历史日志
sudo docker logs unisearch --tail 500

# 查看特定时间段日志
sudo docker logs unisearch --since 2024-01-01 --until 2024-01-02
```

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

本项目已完成脚本整合，从原来的22个脚本精简为6个核心脚本：

**1. 简化维护**
- 从22个脚本减少到6个
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

**monitor.sh（新增）：**
- 独立的监控服务管理脚本
- 基于 Uptime Kuma 实现可视化监控
- 支持容器、API、网页监控
- 可配置多种告警通知方式

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

