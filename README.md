# UniSearch - 网盘资源聚合搜索系统

<div align="center">

[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

一个高性能的网盘资源聚合搜索系统，支持多渠道搜索、智能缓存和异步插件架构

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术架构](#-技术架构) • [开发文档](#-开发文档)

</div>

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

### 👥 用户管理系统

- **用户认证**
  - 用户注册/登录
  - JWT Token 认证（Access Token + Refresh Token）
  - "记住我"功能（30天自动登录）
  - 设备指纹验证
  - API Key 登录支持

- **权限管理**
  - 管理员/普通用户角色
  - 基于角色的访问控制
  - API Key 绑定与管理

### 🛡️ 管理后台

- **用户管理**
  - 用户列表查看与搜索
  - 创建、编辑、删除用户
  - 批量修改用户角色
  - 用户状态管理（启用/禁用）
  - 密码重置功能

- **API Key 管理**
  - API Key 生成与删除
  - 批量创建和延长有效期
  - 使用统计与限额管理
  - 每日搜索次数限制
  - 过期状态监控

- **插件管理**
  - 可视化插件管理界面
  - 动态添加/编辑/删除插件
  - 插件连通性测试
  - 优先级设置

- **系统设置**
  - 用户认证功能开关
  - 实时配置更新
  - 可视化设置界面
  - 配置状态预览

- **系统监控**
  - 插件状态监控
  - 系统信息查看
  - 统计数据展示

### 🎨 用户体验

- **现代化 UI 设计**
  - Apple 风格界面设计
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

- **框架**: Go 1.24.1+ + Gin Web Framework
- **数据库**: MySQL 8.0 + GORM ORM
- **认证**: JWT Token + Bcrypt 密码加密
- **特性**: 
  - 并发搜索引擎（Goroutine + Channel）
  - 异步插件系统（BaseAsyncPlugin）
  - 二级缓存系统（GOB 序列化）
  - 工作池管理（util/pool）
  - 用户权限体系（管理员/普通用户）
  - API Key 管理与绑定

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
                     │    JWT Auth + Admin Middleware │
                     └────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┬─────────────┐
                ▼                 ▼                 ▼             ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  用户管理    │  │  TG频道搜索  │  │  插件搜索    │  │  缓存层     │
        │  (AuthService)│  │              │  │              │  │             │
        └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
                │                 │                 │                 │
                ▼                 │                 │         ┌───────┴───────┐
        ┌──────────────┐          │                 │         │               │
        │  API Key管理 │          │                 │    ┌────────┐    ┌────────┐
        │(APIKeyService)│          └─────────────────┴───▶│ 内存缓存│    │磁盘缓存│
        └──────────────┘                                  └────────┘    └────────┘
                │
                ├──────────────┐
                ▼              ▼
        ┌──────────────┐  ┌──────────────┐
        │  系统设置    │  │  MySQL 8.0   │
        │(SettingsService)│  │  (GORM ORM)  │
        └──────────────┘  └──────────────┘
                              │
                              ├─ users 表
                              ├─ api_keys 表
                              └─ system_settings 表
```

---

## 🚀 快速开始

### 环境要求

- **Go**: 1.24.1 或更高版本
- **Node.js**: 18 或更高版本
- **pnpm**: 最新版本
- **MySQL**: 8.0 或更高版本
- **Docker** (可选): 用于容器化部署

### 本地开发

#### 方式一：使用启动脚本（推荐）

```bash
# 克隆项目
git clone https://github.com/fish2018/UniSearch.git
cd UniSearch

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息
# 如需本地覆盖，不要直接改容器默认值，新增 .env.local 即可

# 启动 MySQL 数据库
# macOS: brew install mysql && brew services start mysql
# Ubuntu: sudo apt install mysql-server && sudo systemctl start mysql

# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS unisearch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 启动所有服务（前端 + 后端）
./scripts/local.sh

# 停止所有服务
# 按 Ctrl+C 停止
```

**启动脚本功能：**
- ✅ 自动检查依赖和端口占用
- ✅ 自动检查 MySQL 连接
- ✅ 自动执行数据库迁移
- ✅ 并行启动前后端服务
- ✅ 实时显示服务状态
- ✅ 支持 `.env.local` 覆盖本地开发配置

**首次启动说明：**
- 系统会自动创建数据库表结构
- 自动创建默认管理员账户（admin/admin）
- 自动创建默认系统设置

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
- 🛡️ 管理后台: http://localhost:5173/admin/login

### Docker 部署

```bash
# 使用 Docker Compose 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### CI 检查

仓库级 CI 会在干净环境中统一执行以下命令：

```bash
cd backend && go test ./...
cd frontend && pnpm run lint
cd frontend && pnpm run check
cd frontend && pnpm test --run
cd frontend && pnpm run build
```

建议在提交前本地先跑一遍，确保与 CI 结果一致。

---

## 📁 项目结构

```
UniSearch/
├── backend/                    # Go 后端服务
│   ├── main.go                # 主程序入口
│   ├── api/                   # API 路由和处理器
│   │   ├── controller/        # 控制器层
│   │   ├── middleware/        # 中间件
│   │   └── router.go          # 路由配置
│   ├── config/                # 配置管理
│   ├── database/              # 数据库层
│   │   ├── connection.go      # 数据库连接
│   │   ├── migration.go       # 数据库迁移
│   │   └── seed.go            # 默认数据初始化
│   ├── model/                 # 数据模型
│   ├── plugin/                # 搜索插件
│   ├── service/               # 业务逻辑层
│   └── util/                  # 工具库
│
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # UI 组件
│   │   ├── stores/           # 状态管理
│   │   ├── services/         # API 服务
│   │   └── lib/              # 工具函数
│   └── package.json
│
├── docs/                      # 项目文档
│   ├── api_reference.md      # API 接口文档
│   ├── admin_guide.md        # 管理后台使用指南
│   └── readme_2604.md        # 开发日志
│
├── scripts/                   # 自动化脚本
│   ├── local.sh              # 本地开发启动
│   ├── build.sh              # Docker 镜像构建
│   └── deploy.sh             # 服务器部署管理
│
├── docker-compose.yml         # 本地开发 Docker 配置
└── README.md                  # 本文档
```

---

## 📚 开发文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [管理后台使用指南](docs/admin_guide.md) | 管理后台功能详解和操作指南 |
| [API 接口文档](docs/api_reference.md) | 完整的 API 接口文档 |
| [开发日志](docs/readme_2604.md) | 2026年04月开发记录 |

### 快速链接

- **用户认证 API**: 注册、登录、Token 验证
- **管理员 API**: 用户管理、API Key 管理、系统设置
- **插件管理 API**: 创建、更新、删除、测试插件
- **搜索 API**: 网盘资源搜索接口

---

## ❓ 常见问题

### 本地开发

**Q: MySQL 连接失败怎么办？**

A: 请检查以下几点：
1. 确认 MySQL 服务已启动
2. 检查 `.env` 文件中的数据库配置是否正确
3. 确认数据库已创建：`CREATE DATABASE unisearch;`

**Q: 忘记管理员密码怎么办？**

A: 可以通过数据库直接重置：
```sql
-- 默认密码是 "admin"，对应的哈希值
UPDATE users SET password_hash='$2a$10$...' WHERE username='admin';
```

**Q: 端口被占用怎么办？**

A: 启动脚本会自动检测端口占用，您可以选择：
- 停止占用端口的程序
- 修改 `.env` 文件中的端口号

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

<div align="center">

**Made with ❤️ by UniSearch Team**

[返回顶部](#unisearch---网盘资源聚合搜索系统)

</div>
