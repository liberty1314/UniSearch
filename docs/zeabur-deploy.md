# UniSearch — Zeabur 部署教程

本文档详细介绍如何在 [Zeabur](https://zeabur.com) 上部署 UniSearch。

## 架构说明

UniSearch 在 Zeabur 上的部署由三个服务组成：

```
┌─────────────────────────────────────────────┐
│                Zeabur 项目                   │
│                                             │
│  ┌───────────┐  ┌─────────┐  ┌───────────┐ │
│  │ unisearch │  │  MySQL  │  │   Redis   │ │
│  │  (主应用)  │→│ (必需)   │  │  (可选)   │ │
│  │           │  │         │  │           │ │
│  │ Nginx:80  │  │  :3306  │  │  :6379    │ │
│  │ Go:8888   │  │         │  │           │ │
│  └───────────┘  └─────────┘  └───────────┘ │
│       ↑                                     │
│   公网域名                                   │
│  xxx.zeabur.app                             │
└─────────────────────────────────────────────┘
```

- **主应用**：单容器，内含 Nginx（端口 80）+ Go 后端（端口 8888），Nginx 反向代理 API 请求
- **MySQL**：必需，存储用户、插件状态、系统配置等数据
- **Redis**：可选，用于搜索结果缓存，未配置时系统自动降级运行

## 一、创建项目

1. 登录 [Zeabur 控制台](https://dash.zeabur.com)
2. 点击「创建新项目」
3. 选择服务器区域（推荐 Tokyo 或 Hong Kong）

## 二、部署 MySQL 服务

1. 点击「新建服务」→「Marketplace」
2. 搜索并选择 **MySQL**
3. 等待服务状态变为绿色（运行中）
4. 点击 MySQL 服务 →「环境变量」，添加用户变量：

```
MYSQL_DATABASE=unisearch
```

> 这会让 MySQL 初始化时自动创建 `unisearch` 数据库。如果未设置也没关系，后端启动时会自动创建。

## 三、部署 Redis 服务（可选）

Redis 用于缓存搜索结果，加速重复查询。不部署 Redis 时系统正常运行，仅无缓存。

1. 点击「新建服务」→「Marketplace」
2. 搜索并选择 **Redis**
3. 等待服务启动完成

## 四、部署主应用

1. 点击「新建服务」→「Git（从源代码部署）」
2. 选择仓库或输入仓库地址
3. Zeabur 会自动检测 `Dockerfile` 并开始构建
4. 等待构建完成（首次构建约 3-5 分钟）

## 五、配置环境变量

点击主应用服务 →「环境变量」→「编辑原始环境变量」，粘贴以下模板。

### 基础模板（仅 MySQL）

```env
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTH_JWT_SECRET=请替换为随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
REFRESH_TOKEN_ENCRYPT_KEY=请替换为随机加密密钥
```

### 完整模板（MySQL + Redis）

```env
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTH_JWT_SECRET=请替换为随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
REFRESH_TOKEN_ENCRYPT_KEY=请替换为随机加密密钥
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
```

### 密钥生成

在终端执行以下命令生成随机密钥，分别替换模板中的三个 `请替换为...` 值：

```bash
# 生成 AUTH_JWT_SECRET
openssl rand -base64 32

# 生成 SECRET_MASTER_KEY
openssl rand -base64 32

# 生成 REFRESH_TOKEN_ENCRYPT_KEY
openssl rand -base64 32
```

### 变量说明

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `DB_HOST` | ✅ | MySQL 主机，使用 `${MYSQL_HOST}` 引用 Zeabur 变量 |
| `DB_PORT` | ✅ | MySQL 端口，使用 `${MYSQL_PORT}` 引用 Zeabur 变量 |
| `DB_USER` | ✅ | MySQL 用户名，使用 `${MYSQL_USERNAME}` 引用 Zeabur 变量 |
| `DB_PASSWORD` | ✅ | MySQL 密码，使用 `${MYSQL_PASSWORD}` 引用 Zeabur 变量 |
| `DB_NAME` | ✅ | 数据库名称，首次启动时自动创建 |
| `AUTH_JWT_SECRET` | ✅ | JWT 签名密钥，至少 32 位随机字符串 |
| `SECRET_MASTER_KEY` | ✅ | 密钥管理主密钥，至少 32 位随机字符串 |
| `REFRESH_TOKEN_ENCRYPT_KEY` | ✅ | 刷新令牌加密密钥，至少 32 位随机字符串 |
| `REDIS_HOST` | ❌ | Redis 主机，使用 `${REDIS_HOST}` 引用 Zeabur 变量 |
| `REDIS_PORT` | ❌ | Redis 端口，使用 `${REDIS_PORT}` 引用 Zeabur 变量 |
| `REDIS_PASSWORD` | ❌ | Redis 密码，使用 `${REDIS_PASSWORD}` 引用 Zeabur 变量 |

### 其他可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ENABLED_PLUGINS` | 全部 | 启用的插件列表（逗号分隔），如 `labi,shandian,pansearch` |
| `API_KEY_ENABLED` | `false` | 启用 API Key 认证 |
| `CONCURRENCY` | 自动 | 并发搜索数（默认根据插件数自动计算） |
| `PLUGIN_TIMEOUT` | `30` | 插件超时时间（秒） |
| `ASYNC_PLUGIN_ENABLED` | `true` | 启用异步插件（快速响应 + 后台聚合） |
| `ASYNC_RESPONSE_TIMEOUT` | `4` | 异步响应超时（秒） |

完整环境变量列表请参考项目根目录 [.env.example](../.env.example)。

### ⚠️ 注意事项

**不要设置 `PORT` 变量。** 本项目使用 Nginx(80) + Go 后端(8888) 的容器内部代理架构。如果设置了 `PORT`（如 `PORT=${WEB_PORT}`），会覆盖后端监听端口，导致 Nginx 代理到 8888 失败。如果 Zeabur 自动添加了 `PORT` 变量，请删除它。

## 六、配置网络

1. 点击主应用服务 →「网络」
2. 添加端口 `80`（HTTP）
3. 点击「生成域名」获取公网访问地址（如 `xxx.zeabur.app`）

> 如需自定义域名，在域名设置中添加，并在 DNS 服务商配置 CNAME 记录指向 Zeabur 提供的地址。

## 七、重新部署

配置完环境变量和网络后：

1. 确认 MySQL 服务状态为绿色（运行中）
2. 点击主应用 →「服务状态」→「重新部署」
3. 等待部署完成（约 1-2 分钟）

## 八、访问与登录

部署完成后，访问生成的域名。

**默认登录信息：**

| 项目 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

> ⚠️ 首次登录后请立即在账号中心修改密码。

## 故障排除

### 后端反复重启（exit status 1）

查看 Runtime Logs，按错误信息对照：

| 日志关键词 | 原因 | 解决方案 |
|-----------|------|---------|
| `Unknown database` | 数据库不存在 | 确认 MySQL 已完全启动后重新部署 |
| `数据库连接失败` | MySQL 连接参数错误 | 检查 `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD` |
| `未找到 .env 文件` | 正常提示 | 这是警告非错误，系统会使用环境变量 |

### Nginx 502 Bad Gateway

后端未启动或端口不匹配：
- 确认未设置 `PORT` 环境变量（或设为 `8888`）
- 查看 Runtime Logs 确认后端是否正常启动

### Redis 连接失败

Redis 为可选依赖，连接失败时系统自动降级（无缓存），不影响核心搜索功能。如需启用：
- 确认已添加 Redis 服务且状态为绿色
- 确认已配置 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`

### 构建失败

- 确认仓库中存在 `Dockerfile`
- 查看 Build Logs 中的具体错误信息
- 常见原因：Go 依赖下载超时（重新触发构建即可）
