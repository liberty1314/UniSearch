# UniSearch - 网盘资源搜索系统

<div align="center">

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/fish2018/UniSearch/pulls)

一个高性能的网盘资源聚合搜索系统，支持多渠道搜索、智能缓存和异步插件架构

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-生产部署) • [开发文档](#-开发文档)

</div>

---

## 📖 目录

- [功能特性](#-功能特性)
- [技术架构](#-技术架构)
- [快速开始](#-快速开始)
  - [本地开发](#本地开发)
  - [Docker部署](#docker部署)
- [生产部署](#-生产部署)
- [项目结构](#-项目结构)
- [开发文档](#-开发文档)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)

---

## ✨ 功能特性

### 🚀 核心功能

- **多渠道聚合搜索**
  - 支持 Telegram 频道搜索（20+ 资源频道）
  - 21+ 网盘搜索插件（可扩展）
  - 智能结果去重与合并

- **高性能架构**
  - 异步插件系统（双级超时：4s/30s）
  - 二级缓存机制（分片内存 + 分片磁盘）
  - 并发搜索处理（工作池管理）
  - 支持 500+ 并发用户（8GB 内存）

- **智能结果优化**
  - 多维度排序算法（插件等级 + 时间新鲜度 + 关键词匹配）
  - 网盘类型自动识别与分类
  - 支持 12 种网盘类型识别

### 🎨 用户体验

- **现代化 UI 设计**
  - 苹果风格界面设计
  - 响应式布局（支持移动端）
  - 流畅动画与交互

- **搜索功能**
  - 实时搜索建议
  - 高级筛选（网盘类型、来源、时间）
  - 懒加载与无限滚动
  - 结果链接一键复制

### 📦 支持的网盘类型

| 网盘类型 | 识别码 | 网盘类型 | 识别码 |
|---------|--------|---------|--------|
| 百度网盘 | `baidu` | 阿里云盘 | `aliyun` |
| 夸克网盘 | `quark` | 天翼云盘 | `tianyi` |
| UC网盘 | `uc` | 移动云盘 | `mobile` |
| 115网盘 | `115` | PikPak | `pikpak` |
| 迅雷网盘 | `xunlei` | 123网盘 | `123` |
| 磁力链接 | `magnet` | 电驴链接 | `ed2k` |

---

## 🏗️ 技术架构

### 后端技术栈

- **框架**: Go 1.23 + Gin Web Framework
- **特性**: 
  - 并发搜索引擎（Goroutine + Channel）
  - 异步插件系统（BaseAsyncPlugin）
  - 二级缓存系统（GOB 序列化）
  - 工作池管理（util/pool）

### 前端技术栈

- **核心**: React 18 + TypeScript
- **UI**: Tailwind CSS + Motion Animation
- **状态管理**: Zustand
- **路由**: React Router v7
- **构建工具**: Vite 6

### 系统架构图

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   用户请求   │─────▶│  Nginx/CDN  │─────▶│  前端应用   │
└─────────────┘      └─────────────┘      └─────────────┘
                                                  │
                                                  ▼
                     ┌────────────────────────────────┐
                     │       API Gateway (Gin)        │
                     └────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  TG频道搜索  │  │  插件搜索    │  │  缓存层     │
        └──────────────┘  └──────────────┘  └──────────────┘
                │                 │                 │
                │                 │         ┌───────┴───────┐
                │                 │         │               │
                │                 │    ┌────────┐    ┌────────┐
                └─────────────────┴───▶│ 内存缓存│    │磁盘缓存│
                                       └────────┘    └────────┘
```

---

## 🚀 快速开始

### 环境要求

- **Go**: 1.23 或更高版本
- **Node.js**: 18 或更高版本
- **pnpm**: 最新版本
- **Docker** (可选): 用于容器化部署

### 本地开发

#### 方式一：使用启动脚本（推荐）

```bash
# 克隆项目
git clone https://github.com/fish2018/UniSearch.git
cd UniSearch

# 启动所有服务（前端 + 后端）
./scripts/start.sh

# 停止所有服务
./scripts/stop.sh
```

**启动脚本功能：**
- ✅ 自动检查依赖和端口占用
- ✅ 并行启动前后端服务
- ✅ 实时显示服务状态
- ✅ 生成日志文件（`logs/` 目录）

#### 方式二：手动启动

**启动后端：**
```bash
cd backend
go mod download
go run main.go
```

**启动前端：**
```bash
cd frontend
pnpm install
pnpm run dev
```

#### 访问地址

- 🌐 前端应用: http://localhost:5173
- 🔌 后端 API: http://localhost:8888
- 📊 健康检查: http://localhost:8888/api/health

### Docker部署

#### 本地开发环境

```bash
# 使用 Docker Compose 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 生产环境镜像

```bash
# 使用预构建镜像
docker run -d \
  --name unisearch \
  -p 3000:3000 \
  -p 8888:8888 \
  -v unisearch-cache:/app/cache \
  liberty159/unisearch:latest
```

---

## 🌐 生产部署

### ⚠️ 重要提示

**中国大陆服务器部署需要 ICP 备案！**

- 未备案域名无法使用 80/443 端口
- 备案周期：7-20 个工作日
- 详细指南：📖 [ICP备案完整指南](docs/ICP_BEIAN_GUIDE.md)

### 部署环境要求

| 项目 | 要求 |
|------|------|
| **操作系统** | Ubuntu 24.04 LTS (64-bit) |
| **内存** | 2GB+ |
| **磁盘** | 20GB+ |
| **网络** | 公网 IP + 域名 |
| **软件** | Docker + Docker Compose |

### 快速部署流程

#### 1️⃣ 构建 Docker 镜像（可选）

```bash
# 构建、推送并在本地运行（默认）
./scripts/build.sh

# 仅构建和推送，不在本地运行
./scripts/build.sh --no-run

# 自定义配置
./scripts/build.sh <username> <image> <version>

# 自定义配置且不在本地运行
./scripts/build.sh --no-run <username> <image> <version>
```

**构建脚本功能：**
- ✅ 多架构构建（linux/amd64, linux/arm64）
- ✅ 自动推送到 Docker Hub
- ✅ 验证镜像可用性（带重试机制）
- ✅ 自动拉取并在本地运行 latest 镜像
- ✅ 自动配置管理员密码

**本地运行信息：**
- 容器名称：`unisearch-local`
- 前端地址：http://localhost:3000
- 后端地址：http://localhost:8888
- 管理后台：http://localhost:3000/admin/login
- 默认密码：`admin123.com`

**注意事项：**
- 构建完成后，Docker Hub 可能需要 1-2 分钟同步镜像
- 如果验证失败，请等待片刻后使用验证脚本检查
- 即使验证失败，镜像通常已成功推送

#### 2️⃣ 服务器初始化

```bash
# 初始化服务器环境（首次部署必须执行）
sudo ./scripts/deploy.sh init
```

**初始化操作：**
- 安装 Docker 和 Docker Compose（使用清华镜像源）
- 安装并配置 Nginx
- 配置 UFW 防火墙
- 创建必要的目录和配置文件

#### 3️⃣ 配置管理员密码

**生成密码哈希：**
```bash
# 使用脚本生成密码哈希
./scripts/gen_admin_password.sh "你的密码"

# 示例输出：
# ✓ 密码哈希生成成功！
# ADMIN_PASSWORD_HASH=$2a$10$RGtHe7PyEsFfnffZ9JaxJeQ9LwoiSOGpJaxeo1kqtwfpHcVRPiFTS
```

**配置环境变量：**
```bash
# 编辑生产环境配置文件
vim deploy/env.prod

# 找到 ADMIN_PASSWORD_HASH 配置项，替换为生成的哈希值
ADMIN_PASSWORD_HASH=$2a$10$RGtHe7PyEsFfnffZ9JaxJeQ9LwoiSOGpJaxeo1kqtwfpHcVRPiFTS
```

**默认管理员账号：**
- 用户名：`admin`
- 密码：`admin123`（建议修改）

⚠️ **安全提示**：生产环境部署前，请务必修改默认密码！

#### 4️⃣ 启动服务

```bash
# 启动应用
sudo ./scripts/deploy.sh start

# 查看状态
sudo ./scripts/deploy.sh status

# 查看日志
sudo ./scripts/deploy.sh logs
```

#### 4️⃣ SSL 证书配置

**备案期间（临时访问）：**
```bash
# 使用 8080 端口临时部署
sudo ./scripts/ssl.sh temp

# 访问地址
http://your-ip:8080
http://your-domain.com:8080
```

**备案完成后（正式上线）：**
```bash
# 检查备案状态
sudo ./scripts/ssl.sh check

# 申请 Let's Encrypt SSL 证书
sudo ./scripts/ssl.sh apply

# 访问地址
https://your-domain.com
```

### 服务管理命令

```bash
# 启动服务
sudo ./scripts/deploy.sh start

# 停止服务
sudo ./scripts/deploy.sh stop

# 重启服务
sudo ./scripts/deploy.sh restart

# 查看状态
sudo ./scripts/deploy.sh status

# 查看日志
sudo ./scripts/deploy.sh logs

# 备份数据
sudo ./scripts/deploy.sh backup

# 从备份恢复
sudo ./scripts/deploy.sh restore <backup_file>
```

### SSL 证书管理

```bash
# 检查备案状态
sudo ./scripts/ssl.sh check

# 临时 8080 部署
sudo ./scripts/ssl.sh temp

# 申请证书（HTTP 验证）
sudo ./scripts/ssl.sh apply

# 申请证书（DNS 验证）
sudo ./scripts/ssl.sh dns

# 手动续期
sudo ./scripts/ssl.sh renew
```

### 部署架构

```
Internet
   │
   ▼
┌─────────────────────┐
│  Nginx (80/443)     │ ◀── SSL 证书（Let's Encrypt）
│  反向代理           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Docker Container   │
│  ┌─────────────────┐│
│  │ 前端 (3000)     ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ 后端 (8888)     ││
│  └─────────────────┘│
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  数据卷             │
│  - cache/          │
│  - logs/           │
└─────────────────────┘
```

---

## 📁 项目结构

```
UniSearch/
├── backend/                    # Go 后端服务
│   ├── main.go                # 主程序入口
│   ├── api/                   # API 路由和处理器
│   │   ├── handler.go         # 请求处理器
│   │   ├── middleware.go      # 中间件
│   │   └── router.go          # 路由配置
│   ├── config/                # 配置管理
│   ├── model/                 # 数据模型
│   ├── plugin/                # 搜索插件
│   │   ├── plugin.go          # 插件接口定义
│   │   ├── baseasyncplugin.go # 异步插件基类
│   │   ├── hdr4k/            # HDR4K 插件
│   │   ├── susu/             # SuSu 插件
│   │   └── ...               # 更多插件
│   ├── service/               # 业务逻辑层
│   │   ├── search_service.go # 搜索服务
│   │   └── cache_integration.go # 缓存集成
│   └── util/                  # 工具库
│       ├── cache/            # 缓存系统
│       └── pool/             # 工作池
│
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   └── Home.tsx      # 首页
│   │   ├── components/       # UI 组件
│   │   │   ├── SearchBox.tsx # 搜索框
│   │   │   ├── SearchResults.tsx # 结果展示
│   │   │   └── ...
│   │   ├── stores/           # 状态管理
│   │   ├── services/         # API 服务
│   │   └── lib/              # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── deploy/                    # 生产部署配置
│   ├── docker-compose.prod.yml
│   ├── env.prod
│   └── nginx/
│       ├── http.conf         # HTTP 配置
│       └── https.conf        # HTTPS 配置
│
├── scripts/                   # 自动化脚本
│   ├── start.sh              # 本地开发启动
│   ├── stop.sh               # 本地开发停止
│   ├── build.sh              # Docker 镜像构建
│   ├── deploy.sh             # 服务器部署管理
│   └── ssl.sh                # SSL 证书管理
│
├── docs/                      # 项目文档
│   ├── SCRIPTS_GUIDE.md      # 脚本使用指南
│   ├── ICP_BEIAN_GUIDE.md    # ICP备案指南
│   ├── 系统开发设计文档.md    # 系统设计文档
│   └── 插件开发指南.md        # 插件开发指南
│
├── docker-compose.yml         # 本地开发 Docker 配置
└── README.md                  # 本文档
```

---

## 📚 开发文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [脚本使用指南](docs/SCRIPTS_GUIDE.md) | 详细的脚本命令和使用说明 |
| [系统设计文档](docs/系统开发设计文档.md) | 架构设计和技术实现详解 |
| [插件开发指南](docs/插件开发指南.md) | 如何开发自定义搜索插件 |
| [ICP备案指南](docs/ICP_BEIAN_GUIDE.md) | 中国大陆服务器备案流程 |

### API 文档

#### 搜索接口

```http
GET/POST /api/search
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kw` | string | ✅ | 搜索关键词 |
| `channels` | string | ❌ | TG 频道列表（逗号分隔） |
| `plugins` | string | ❌ | 插件列表（逗号分隔） |
| `cloud_types` | string | ❌ | 网盘类型过滤 |
| `src` | string | ❌ | 数据来源：all/tg/plugin |
| `res` | string | ❌ | 结果类型：all/results/merge |
| `refresh` | bool | ❌ | 强制刷新缓存 |

**响应示例：**

```json
{
  "code": 200,
  "message": "搜索成功",
  "data": {
    "results": [
      {
        "title": "资源标题",
        "content": "资源描述",
        "link": "https://pan.baidu.com/s/xxxxx",
        "cloud_type": "baidu",
        "source": "susu",
        "time": "2025-01-15 10:30:00"
      }
    ],
    "cloud_groups": {
      "baidu": [...],
      "aliyun": [...]
    }
  }
}
```

#### 健康检查接口

```http
GET /api/health
```

**响应示例：**

```json
{
  "code": 200,
  "data": {
    "status": "healthy",
    "plugins": ["hdr4k", "susu", "pansearch", ...],
    "cache_enabled": true
  }
}
```

---

## ❓ 常见问题

### 本地开发

**Q: 端口被占用怎么办？**

A: 启动脚本会自动检测端口占用，您可以选择：
- 停止占用端口的程序
- 修改配置文件中的端口号

**Q: 依赖安装失败？**

A: 确保网络连接正常，可以尝试：
```bash
# Go 依赖
go env -w GOPROXY=https://goproxy.cn,direct
go mod download

# 前端依赖
pnpm install --registry=https://registry.npmmirror.com
```

### 生产部署

**Q: 域名未备案能否部署？**

A: 可以使用 8080 端口临时部署：
```bash
sudo ./scripts/ssl.sh temp
```
备案完成后再申请 SSL 证书。

**Q: SSL 证书自动续期吗？**

A: 是的。使用 HTTP 验证方式申请的证书会自动续期（每天凌晨 3 点检查）。

**Q: 如何修改配置？**

A: 修改 `deploy/env.prod` 文件，然后重启服务：
```bash
sudo ./scripts/deploy.sh restart
```

### 性能优化

**Q: 如何提高搜索速度？**

A: 系统已实现多项优化：
- 二级缓存机制（自动启用）
- 异步插件系统（并发搜索）
- 智能结果去重与合并

**Q: 缓存如何清理？**

A: 缓存会自动管理，也可以手动清理：
```bash
# 清理磁盘缓存
rm -rf backend/cache/*
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

### 开发插件

查看 [插件开发指南](docs/插件开发指南.md) 了解如何开发自定义搜索插件。

### 报告问题

发现 Bug 或有功能建议？请 [提交 Issue](https://github.com/fish2018/UniSearch/issues)。

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

## 🙏 致谢

感谢所有贡献者和开源社区的支持！

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️ Star！**

[返回顶部](#unisearch---网盘资源搜索系统)

</div>
