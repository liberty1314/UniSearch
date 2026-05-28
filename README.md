# UniSearch

一个高性能多源聚合网盘资源搜索平台，支持 40+ 搜索插件、多云盘平台覆盖、用户管理与 API Key 系统。使用 Go (Gin)、React、TypeScript 和 MySQL 构建。

## 功能特性

### 聚合搜索引擎

- 40+ 搜索插件并发执行，覆盖主流网盘和资源站
- 支持百度网盘、阿里云盘、夸克网盘、天翼云盘、迅雷网盘、115 网盘、中国移动云盘等
- 异步插件系统：快速响应 + 后台持续聚合，搜索结果实时追加
- 来源筛选：按云盘类型过滤搜索结果
- Redis 缓存加速，重复搜索即时返回

### 热门内容页

- 新增 `/hot` 页面，基于 TMDB 数据展示电影、电视剧、动漫三类热门内容
- 支持每日、每周、每月、每年四种维度切换
- 支持从热门内容卡片一键跳转到站内搜索结果页
- 每日、每周使用 TMDB 趋势口径；每月、每年使用 TMDB 热门口径

### 插件管理

- 插件热管理：在线启用/停用/添加/测试插件
- 自定义插件：支持通过 URL 添加自定义搜索源
- 健康检测：插件连通性测试与状态持久化
- 批量操作：批量启停、批量测试

### 用户与权限

- 用户注册/登录（JWT + 刷新令牌）
- RBAC 角色管理（管理员/普通用户）
- API Key 系统：支持按日搜索配额、有效期控制
- 批量创建/导出/延期 API Key

### 管理后台

- 数据统计仪表盘
- 用户管理（创建、编辑、角色分配）
- 系统设置（站点配置、公告管理）
- Telegram 频道管理
- 插件与频道工作区

## 技术栈

### 前端

- React 18 + TypeScript + Vite
- React Router
- Tailwind CSS v3
- Framer Motion / GSAP 动画
- Zustand 状态管理
- shadcn/ui 组件库

### 后端

- Go 1.24 + Gin 框架
- MySQL 8.0 (GORM)
- Redis 7 缓存
- JWT 认证 + 刷新令牌
- 插件化架构（40+ 内置插件）
- Nginx 反向代理（Docker 部署）
- Supervisor 进程管理（Docker 部署）

## 本地质量检查

执行以下命令完成后端测试、后端构建、前端类型检查、前端 lint、前端单元测试与前端生产构建：

```bash
scripts/tests/local-quality.sh
```

前端生产构建默认不生成 sourcemap，减少静态产物体积。若需要为线上问题定位生成 hidden sourcemap，可执行：

```bash
cd frontend && VITE_ENABLE_SOURCEMAP=1 ./node_modules/.bin/vite build
```

如果运行环境禁止本地端口监听，后端中依赖 `httptest.NewServer` 的测试会失败，应切换到允许本地监听的开发环境执行，或优先改造对应测试以使用可注入 HTTP 客户端。

## 部署

### Docker 单容器部署（推荐）

项目提供多阶段构建的 Dockerfile，将前端、后端、Nginx 打包在一个容器内，外部只需提供 MySQL 和 Redis 服务。

#### 1. 克隆仓库

```bash
git clone <仓库地址>
cd UniSearch
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少配置以下必填项：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=unisearch

# 认证密钥（必须修改为强随机字符串）
AUTH_JWT_SECRET=你的随机密钥至少32位
SECRET_MASTER_KEY=你的随机主密钥至少32位
REFRESH_TOKEN_ENCRYPT_KEY=你的32字节加密密钥

# Redis 配置（可选，不配置时系统自动降级运行）
REDIS_HOST=localhost
REDIS_PORT=6379

# TMDB 热门内容页（启用 /hot 必填，推荐二选一）

# 推荐：使用 Read Access Token
TMDB_READ_ACCESS_TOKEN=你的_tmdb_read_access_token
TMDB_API_KEY=

# 兼容：如果你只有 v3 API Key，也可以反过来这样配置
# TMDB_READ_ACCESS_TOKEN=
# TMDB_API_KEY=你的_tmdb_api_key
```

> 密钥生成方式：`openssl rand -base64 32`

> 正常配置建议使用 `TMDB_READ_ACCESS_TOKEN`。`TMDB_API_KEY` 仅作为兼容回退方案使用，二者最好只配置一个。

#### 3. 构建镜像

```bash
docker build -t unisearch:latest .
```

#### 4. 启动服务

```bash
docker compose up -d
```

#### 5. 访问应用

浏览器打开 `http://你的服务器IP`（默认 80 端口）

#### 6. 登录

- 用户名：`admin`
- 密码：`admin123`
- 首次登录后请立即修改密码

#### 数据持久化

`docker-compose.yml` 默认挂载以下数据卷：

| 容器路径 | 说明 |
| --- | --- |
| `/app/cache` | 搜索缓存目录 |

MySQL 和 Redis 数据通过各自服务的 Docker 卷持久化。

#### 日志查看

```bash
# 实时查看日志
docker compose logs -f

# 查看最近 100 行
docker compose logs --tail 100
```

#### 常用运维命令

```bash
# 查看服务状态
docker compose ps

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 重新构建并启动（代码更新后）
docker build -t unisearch:latest . && docker compose up -d
```

#### 自定义端口

修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:80"  # 将外部端口改为 8080
```

#### 反向代理（Nginx 示例）

如需通过域名 + HTTPS 访问，在宿主机 Nginx 中添加：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Zeabur 部署

[Zeabur](https://zeabur.com) 是一个无需配置服务器的云平台，支持一键部署。

1. 在 Zeabur 创建项目，添加 **MySQL** 服务
2. 选择「从 Git 仓库部署」，输入仓库地址
3. 配置环境变量：

   | Key | Value | 说明 |
   |-----|-------|------|
   | `DB_HOST` | `${MYSQL_HOST}` | 引用 Zeabur MySQL 变量 |
   | `DB_PORT` | `${MYSQL_PORT}` | 引用 Zeabur MySQL 变量 |
   | `DB_USER` | `${MYSQL_USERNAME}` | 引用 Zeabur MySQL 变量 |
   | `DB_PASSWORD` | `${MYSQL_PASSWORD}` | 引用 Zeabur MySQL 变量 |
   | `DB_NAME` | `unisearch` | 数据库名，首次启动自动创建 |
   | `AUTH_JWT_SECRET` | `你的随机密钥` | `openssl rand -base64 32` |
   | `SECRET_MASTER_KEY` | `你的随机主密钥` | `openssl rand -base64 32` |
   | `REFRESH_TOKEN_ENCRYPT_KEY` | `你的加密密钥` | `openssl rand -base64 32` |

4. 在「网络」中配置端口 `80` 并生成域名
5. （可选）添加 Redis 服务并配置 Redis 相关变量

> **⚠️ 重要提示：** 不要设置 `PORT` 变量。本项目架构为 Nginx(80) + 后端(8888) 内部代理，`PORT` 会覆盖后端端口导致代理失败。

> **数据库自动创建：** 后端启动时会自动创建 `DB_NAME` 指定的数据库（如果不存在），无需手动建库。

#### Zeabur 环境变量模板

点击「编辑原始环境变量」，粘贴以下内容后修改密钥值：

```env
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTH_JWT_SECRET=请替换为随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
REFRESH_TOKEN_ENCRYPT_KEY=请替换为随机加密密钥
CHANNELS=SharePanBaidu,tianyifc,yunpanxunlei,BaiduCloudDisk,shareAliyun,Aliyun_4K_Movies,ali_yppan,bdbdndn11,yunpanx,yp123pan,bsbdbfjfjff,txtyzy,peccxinpd,gotopan,PanjClub,baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,ucwpzy,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,Q_dongman,yoyokuakeduanju,TG654TG,QukanMovie,yeqingjie_GJG666,movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,duan_ju,QuarkFree,yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,Netdisk_Movies,yunpanquark,ciliziyuanku
```

<details>
<summary>含 Redis 的完整模板（点击展开）</summary>

```env
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTH_JWT_SECRET=请替换为随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
REFRESH_TOKEN_ENCRYPT_KEY=请替换为随机加密密钥
CHANNELS=SharePanBaidu,tianyifc,yunpanxunlei,BaiduCloudDisk,shareAliyun,Aliyun_4K_Movies,ali_yppan,bdbdndn11,yunpanx,yp123pan,bsbdbfjfjff,txtyzy,peccxinpd,gotopan,PanjClub,baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,ucwpzy,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,Q_dongman,yoyokuakeduanju,TG654TG,QukanMovie,yeqingjie_GJG666,movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,duan_ju,QuarkFree,yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,Netdisk_Movies,yunpanquark,ciliziyuanku
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
```

</details>

> 密钥生成方式：`openssl rand -base64 32`

详细步骤请参考 [Zeabur 部署教程](docs/zeabur-deploy.md)。

---

### 本地开发

#### 1. 前置条件

- Go 1.24+
- Node.js 18+
- pnpm
- MySQL 8.0
- Redis 7（可选）

#### 2. 启动后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 配置数据库连接
go run .
```

#### 3. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

#### 4. 访问应用

- 前端：http://localhost:5173
- 后端 API：http://localhost:8888

#### 启动脚本

```bash
# Docker 菜单式启动
bash scripts/docker.sh

# 本地菜单式启动
bash scripts/local.sh
```

## 环境变量

完整环境变量列表请参考 [`.env.example`](.env.example)，以下为核心配置项：

### 数据库（必填）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | MySQL 主机 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | MySQL 用户名 | `root` |
| `DB_PASSWORD` | MySQL 密码 | — |
| `DB_NAME` | 数据库名 | `unisearch` |

### 认证（必填）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AUTH_JWT_SECRET` | JWT 签名密钥 | — |
| `SECRET_MASTER_KEY` | 密钥管理主密钥 | — |
| `REFRESH_TOKEN_ENCRYPT_KEY` | 刷新令牌加密密钥 | — |
| `AUTH_TOKEN_EXPIRY` | JWT 有效期（小时） | `24` |

### Redis（可选）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | — |
| `REDIS_TTL` | 缓存过期时间（秒） | `3600` |

### 搜索配置（可选）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENABLED_PLUGINS` | 启用的插件列表 | 全部内置插件 |
| `CONCURRENCY` | 并发搜索数 | `50` |
| `ASYNC_PLUGIN_ENABLED` | 启用异步插件 | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | 异步响应超时（秒） | `4` |

## 项目结构

```
.
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   │   ├── admin/         # 管理后台组件
│   │   │   ├── account/       # 账号中心组件
│   │   │   ├── home/          # 首页组件
│   │   │   └── ui/            # 通用 UI 组件
│   │   ├── pages/             # 页面视图
│   │   ├── routes/            # 路由配置
│   │   ├── services/          # API 服务
│   │   ├── stores/            # Zustand 状态管理
│   │   └── lib/               # 工具函数
│   └── package.json
├── backend/                   # Go 后端应用
│   ├── api/                   # HTTP 处理器与路由
│   ├── config/                # 配置管理
│   ├── database/              # 数据库初始化与迁移（支持自动建库）
│   ├── model/                 # 数据模型
│   ├── plugin/                # 搜索插件（40+）
│   ├── service/               # 业务服务
│   ├── util/                  # 工具函数
│   ├── main.go                # 入口文件
│   ├── go.mod
│   └── go.sum
├── docs/                      # 项目文档
│   └── zeabur-deploy.md       # Zeabur 部署教程
├── scripts/                   # 运维脚本
├── Dockerfile                 # 多阶段构建（单容器：前端+后端+Nginx）
├── docker-compose.yml         # 容器编排（app + MySQL + Redis）
├── nginx.conf                 # 容器内 Nginx 配置（API 代理 + 静态文件）
├── supervisord.conf           # 容器内进程管理（Nginx + Go 后端）
└── .env.example               # 环境变量模板
```

## 故障排除

### Docker 部署问题

**容器启动失败：**
```bash
docker compose logs
```

**数据库连接失败：**
确认 MySQL 服务已启动，检查 `DB_HOST` 配置是否正确。Docker Compose 环境中应使用服务名 `mysql`。

**Redis 连接失败：**
Redis 为可选依赖，连接失败时系统自动降级运行（无缓存），不影响核心搜索功能。

### Zeabur 部署问题

**`Unknown database 'unisearch'`：**
后端已支持自动创建数据库。如仍出现此错误，请确认 MySQL 服务已完全启动后重新部署主应用。

**后端反复重启（exit status 1）：**
检查 Zeabur 控制台的 Runtime Logs，常见原因：
1. MySQL 服务未就绪 — 等待 MySQL 完全启动后重新部署
2. `PORT` 环境变量冲突 — 删除 Zeabur 主应用中的 `PORT` 变量，让 Dockerfile 默认值 `8888` 生效
3. 认证密钥未配置 — 确认 `AUTH_JWT_SECRET`、`SECRET_MASTER_KEY`、`REFRESH_TOKEN_ENCRYPT_KEY` 已设置

**Nginx 502 Bad Gateway：**
通常是后端未启动或端口不匹配。确认没有设置 `PORT` 环境变量（或设为 `8888`），本项目使用 Nginx(80) → 后端(8888) 的内部代理。

### 本地开发端口占用

```bash
# 后端（8888）
lsof -ti:8888 | xargs kill -9

# 前端（5173）
lsof -ti:5173 | xargs kill -9
```

### 搜索无结果

1. 检查插件是否已启用：管理后台 → 插件管理
2. 检查插件健康状态：运行插件测试
3. 查看后端日志确认插件请求是否超时

## License

ISC
