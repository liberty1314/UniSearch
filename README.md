# UniSearch

一个高性能多源聚合网盘资源搜索平台，默认启用 24 个搜索插件，支持多云盘平台覆盖、用户管理与账号体系。使用 Go (Gin)、React、TypeScript 和 MySQL 构建。

## 功能特性

### 聚合搜索引擎

- 24 个默认搜索插件并发执行，覆盖主流网盘和资源站
- 支持百度网盘、阿里云盘、夸克网盘、天翼云盘、迅雷网盘、115 网盘、中国移动云盘等
- 异步插件系统：快速响应 + 后台持续聚合，搜索结果实时追加
- 来源筛选：按云盘类型过滤搜索结果
- Redis 缓存加速，重复搜索即时返回

### 热门内容页

- 新增 `/trending` 页面，基于 TMDB 数据展示电影、电视剧、动漫三类热门内容
- 支持每日、每周、每月、每年四种维度切换
- 支持从热门内容卡片一键跳转到站内搜索结果页
- 每日、每周使用 TMDB 趋势口径；每月、每年使用 TMDB 热门口径

### 插件管理

- 插件热管理：在线查看、启用、停用、测试源码注册的内置插件
- 内置插件：新增搜索源必须编写 Go 插件并在 `backend/main.go` 空导入注册
- 健康检测：插件连通性测试与状态持久化
- 批量操作：批量启停、批量测试

### 用户与权限

- 用户注册/登录（JWT + 刷新令牌，注册成功后自动登录）
- RBAC 角色管理（管理员/普通用户）
- 账号体系：支持用户注册登录、角色管理和刷新令牌
- 管理后台：集中维护用户、系统配置和站点运营状态

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

- Go 1.25 + Gin 框架
- MySQL 8.0 (GORM)
- Redis 7 缓存
- JWT 认证 + 刷新令牌
- 插件化架构（默认启用 24 个内置插件）
- Nginx 反向代理（Docker 部署）
- Supervisor 进程管理（Docker 部署）

## 本地质量检查

常用验证入口如下：

```bash
# 后端并发敏感路径，适合修改缓存、搜索、Redis 相关逻辑后先跑
scripts/tests/backend-race.sh

# 前端核心慢测和性能相关路径，适合修改路由、搜索、管理页交互后先跑
scripts/tests/frontend-focused.sh

# 容器启动入口快速回归，验证自动迁移、失败阻断和凭据清理
scripts/tests/docker-entrypoint-test.sh
```

提交前先执行基础安全门禁。它覆盖后端全量测试、race、vet、可达漏洞、前端生产依赖审计、单测、类型、lint、构建、Git 历史/工作区秘密扫描和差异检查：

```bash
scripts/tests/security-gate.sh
```

完整本地质量脚本复用上述门禁，并在其后执行真实搜索 smoke，不重复运行基础命令：

```bash
scripts/tests/local-quality.sh
```

真实搜索 smoke 会注册一次性 `codexqa_*` 用户，携带登录 token 调用本地 `/api/search`，默认验证 `铁拳教育 + sidhub` 插件搜索在 25 秒上限内完成。它要求本地后端、数据库和外部插件站点均可访问；若安装了 `mysql` 客户端，脚本会在结束时清理测试用户。

验证分层矩阵：

| 入口 | 默认是否触网 | 用途 | 前置条件 |
| --- | --- | --- | --- |
| `scripts/tests/security-gate.sh` | 否 | 不可跳过的测试、漏洞、依赖、秘密与差异基础门禁 | Go、pnpm、govulncheck、Gitleaks |
| `scripts/tests/docker-entrypoint-test.sh` | 否 | 快速验证容器启动前自动迁移及失败阻断行为 | Bash、基础 Unix 命令 |
| `scripts/tests/local-quality.sh` | 是 | 复用安全门禁后执行真实登录态搜索 smoke | 基础门禁依赖、本地后端、数据库、外部插件站点可访问 |
| `scripts/tests/real-search-smoke.sh` | 是 | 单独验证 `/api/search` 真实链路不会卡死 | 本地后端监听 `UNISEARCH_API_BASE_URL`，数据库可写 |
| `scripts/tests/release-candidate.sh` | 是 | 发布候选门禁，固定执行安全门禁、mock/真实 E2E、真实搜索、Docker、TLS 和迁移演练 | 本地 Docker、真实后端地址、数据库配置、外部插件站点可访问 |
| `cd frontend && pnpm run e2e:mock` | 否 | 前端 mock E2E，验证登录、搜索、后台等关键交互 | 可监听 Vite 端口 |
| `cd frontend && UNISEARCH_REAL_E2E=1 pnpm run e2e:real` | 是 | 真实后端 E2E，验证登录态搜索、结果展示和 warning 可见性 | 本地后端、数据库、外部插件站点可访问 |

发布候选验证直接复用安全基础门禁，并追加 mock E2E、真实后端 E2E、真实搜索、Docker、TLS 与临时 MySQL/Redis 迁移验证，所有阶段均不可跳过：

```bash
UNISEARCH_REAL_E2E=1 \
UNISEARCH_API_BASE_URL=http://127.0.0.1:8888 \
scripts/tests/release-candidate.sh
```

发布前安全门禁必须执行并留痕：

```bash
scripts/tests/security-gate.sh
```

任一 high/critical 漏洞、`govulncheck` 可达漏洞、Gitleaks 命中或本地测试失败都阻断发布。不得通过路径级忽略源码、部署文件、环境模板或 Git 历史来消除告警。

也可以按风险单独运行：

```bash
# 验证 Docker 镜像内主程序和迁移程序可执行
scripts/tests/docker-smoke.sh

# 验证真实登录态搜索链路，可通过 UNISEARCH_API_BASE_URL、UNISEARCH_SMOKE_KEYWORD、
# UNISEARCH_SMOKE_PLUGINS、UNISEARCH_SMOKE_TIMEOUT 覆盖默认值
scripts/tests/real-search-smoke.sh

# 清理 codexqa_* 测试用户、登录统计和刷新令牌
scripts/tests/cleanup-test-data.sh

# 启动临时 MySQL/Redis 并执行迁移
scripts/tests/integration-env.sh

# 运行前端 mock 端到端测试
cd frontend && pnpm run e2e:mock

# 显式运行真实后端 E2E
cd frontend && UNISEARCH_REAL_E2E=1 pnpm run e2e:real
```

任一脚本失败时先保留失败输出，优先单独重跑对应聚焦命令确认是否为稳定失败；稳定失败必须修复后再继续提交。

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
DB_USER=unisearch_runtime
DB_PASSWORD=运行账号密码
DB_NAME=unisearch

# 认证密钥（必须修改为强随机字符串）
AUTH_JWT_SECRET=你的随机密钥至少32位
RESOURCE_PUBLIC_ID_SECRET=你的独立公开资源ID密钥至少32位
SECRET_MASTER_KEY=你的随机主密钥至少32位

# 首次管理员（数据库尚无管理员时必填）
INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_PASSWORD=

# Redis 配置（可选，不配置时系统自动降级运行）
REDIS_HOST=localhost
REDIS_PORT=6379

# TMDB 热门内容页（启用 /trending 必填，推荐二选一）

# 推荐：使用 Read Access Token
TMDB_READ_ACCESS_TOKEN=你的_tmdb_read_access_token
TMDB_API_KEY=

# 兼容：如果你只有 v3 API Key，也可以反过来这样配置
# TMDB_READ_ACCESS_TOKEN=
# TMDB_API_KEY=你的_tmdb_api_key
```

> 密钥生成方式：`openssl rand -base64 32`。首次管理员密码可使用 `openssl rand -base64 24` 生成；用户名不得为 `admin` 或使用 `PLEASE_SET_` 占位值。`RESOURCE_PUBLIC_ID_SECRET` 必须独立保存且跨部署稳定；轮换会使已有资源详情 URL 失效。

> 正常配置建议使用 `TMDB_READ_ACCESS_TOKEN`。`TMDB_API_KEY` 仅作为兼容回退方案使用，二者最好只配置一个。

#### 3. 构建镜像

```bash
docker build -t unisearch:latest .
```

#### 4. 执行数据库迁移

生产数据库必须拆分为两个身份：迁移账号只用于启动前的 `unisearch-migrate`，可执行目标库的 DDL 和 DML；运行账号只授予 `SELECT`、`INSERT`、`UPDATE`、`DELETE`。镜像入口默认在 Supervisor 和 Nginx 启动前自动执行 `unisearch-migrate -migrate-refresh-token-sessions`，迁移失败时容器退出，主应用仍会在缺少迁移时拒绝启动。

先由数据库管理员创建两个账号。密码必须来自密码管理器或平台 Secret，不要直接写入仓库中的 SQL 文件：

```sql
CREATE USER 'unisearch_migrate'@'%' IDENTIFIED BY '<迁移账号随机密码>';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
ON `unisearch`.* TO 'unisearch_migrate'@'%';

CREATE USER 'unisearch_runtime'@'%' IDENTIFIED BY '<运行账号随机密码>';
GRANT SELECT, INSERT, UPDATE, DELETE
ON `unisearch`.* TO 'unisearch_runtime'@'%';
```

将 `.env` 中的 `DB_USER`、`DB_PASSWORD` 固定为运行账号，并在平台 Secret 中配置 `MIGRATION_DB_USER`、`MIGRATION_DB_PASSWORD`。容器入口只把迁移账号传给迁移子进程，迁移完成后会从长期运行的 Supervisor 环境中清除这两个变量：

```env
AUTO_MIGRATE=true
DB_USER=unisearch_runtime
DB_PASSWORD=<运行账号密码>
MIGRATION_DB_USER=unisearch_migrate
MIGRATION_DB_PASSWORD=<迁移账号密码>
```

如暂时没有独立迁移账号，入口会回退使用 `DB_USER`、`DB_PASSWORD`；生产环境不建议依赖此回退。设置 `AUTO_MIGRATE=false` 可在受控回滚或维护窗口中跳过入口迁移，但缺少结构时应用仍会退出。

迁移后使用运行账号验证 DML 可用，并确认 DDL 被 MySQL 拒绝：

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u unisearch_runtime -p "$DB_NAME" \
  -e "SELECT 1"

# 此命令必须非零退出；若成功，禁止启动应用并立即收回运行账号 DDL 权限。
mysql -h "$DB_HOST" -P "$DB_PORT" -u unisearch_runtime -p "$DB_NAME" \
  -e "CREATE TABLE runtime_ddl_probe (id BIGINT PRIMARY KEY)"
```

从仍使用 `refresh_tokens` 原文表的旧版本升级时，自动迁移会执行一次强制全部用户重新登录的破坏性迁移。必须按以下顺序执行：

以下所有手工迁移和清理命令都必须使用迁移账号，完成后立即清理临时环境变量；正常部署不再需要手动执行首次迁移。

1. 提前公告维护窗口和重新登录要求。
2. 备份业务数据库，停止所有旧版本应用实例，避免迁移期间继续写入旧会话。
3. 部署新镜像。容器入口会在启动 Supervisor/Nginx 前自动执行 `-migrate-refresh-token-sessions`；观察日志中的“数据库迁移完成”。

4. 等待入口迁移成功并启动新版本，确认旧 Cookie 请求 `POST /api/auth/refresh` 返回 401。
5. 使用新登录取得的 Cookie 完成一次刷新，确认登录和首次轮转均返回 200，旧轮转 Cookie 重放返回 401。
6. 验证窗口结束且所有实例均为新版本后，显式删除已清空的旧表：

   ```bash
   docker compose run --rm --no-deps \
     --entrypoint /app/backend/unisearch-migrate \
     -e DB_USER -e DB_PASSWORD app -drop-legacy-refresh-tokens
   ```

迁移后数据库只保存刷新令牌的 SHA-256 摘要，原始令牌仅存在于 HttpOnly Cookie。回滚只允许使用兼容 `refresh_token_sessions` 的修复镜像；禁止恢复旧 `refresh_tokens` 原文、旧加密密钥或迁移前会话。

如事件审批要求轮换数据库密钥主密钥，必须先确认当前镜像已包含获批的 `/app/backend/unisearch-rotate-master-key`，再进入停写窗口。当前镜像没有该产物时不得使用临时脚本替代。获批版本按以下顺序执行：停止应用写入、从终端交互读取新旧主密钥、运行原子重加密命令、把 Secret 管理器中的 `SECRET_MASTER_KEY` 更新为新值、启动应用并验证密钥可读，最后撤销旧值。

```bash
docker compose stop app
read -rsp "旧主密钥: " SECRET_MASTER_KEY && echo
read -rsp "新主密钥: " NEW_SECRET_MASTER_KEY && echo
export SECRET_MASTER_KEY NEW_SECRET_MASTER_KEY
docker compose run --rm --no-deps \
  --entrypoint /app/backend/unisearch-rotate-master-key \
  -e SECRET_MASTER_KEY -e NEW_SECRET_MASTER_KEY \
  app -confirm rotate-database-master-key
unset SECRET_MASTER_KEY NEW_SECRET_MASTER_KEY
```

禁止把 `NEW_SECRET_MASTER_KEY` 写入 Compose、环境模板、shell 历史、命令参数或日志。轮换失败时保持停写，不得切换运行时主密钥；恢复旧主密钥并使用原镜像回滚。

如需清理已经下线的旧表，确认备份后显式追加参数：

```bash
docker compose run --rm --no-deps \
  --entrypoint /app/backend/unisearch-migrate \
  -e DB_USER -e DB_PASSWORD app -drop-deprecated
```

如需清理已移除上游插件的历史数据，确认目标数据库备份后显式执行：

```bash
docker compose run --rm --no-deps \
  --entrypoint /app/backend/unisearch-migrate \
  -e DB_USER -e DB_PASSWORD app -purge-removed-plugins
```

该命令仅清理 `clmao`、`panta`、`panyq`、`xinjuc`、`ouge`、`wanou` 在插件状态、健康状态、运行配置、性能指标和错误日志表中的记录；不会在主应用启动时自动执行。

#### 5. 启动服务

```bash
docker compose up -d
```

#### 6. 访问应用

本机调试可打开 `http://127.0.0.1:8080`。生产环境不得直接暴露该 HTTP 端口，必须通过下方的 HTTPS 终止代理访问。

#### 7. 登录

首次管理员用户名和密码来自 `INITIAL_ADMIN_USERNAME`、`INITIAL_ADMIN_PASSWORD`。项目不提供默认登录凭据；数据库已有管理员时，迁移会跳过首次管理员创建。

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

# 执行数据库迁移
docker compose run --rm --no-deps \
  --entrypoint /app/backend/unisearch-migrate \
  -e DB_USER -e DB_PASSWORD app

# 停止服务
docker compose down

# 重新构建并启动（代码更新后）
docker build -t unisearch:latest .
docker compose run --rm --no-deps \
  --entrypoint /app/backend/unisearch-migrate \
  -e DB_USER -e DB_PASSWORD app
docker compose up -d
```

#### 自定义端口

通过 `UNISEARCH_HTTP_PORT` 修改宿主机 loopback 端口，容器内端口固定为 8080：

```yaml
ports:
  - "127.0.0.1:${UNISEARCH_HTTP_PORT:-8080}:8080"
```

#### 反向代理（Nginx 示例）

如需通过域名 + HTTPS 访问，在宿主机 Nginx 中添加：

- 应用端口只绑定 `127.0.0.1`，外部代理监听 443并管理证书。
- TLS 代理必须写入 HSTS，并固定传递 `X-Forwarded-Proto=https`。
- `ALLOWED_ORIGINS` 只填写实际 HTTPS 域名。
- 禁止防火墙开放应用 HTTP 端口 8080；公网只开放 TLS 代理端口。

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

### Zeabur 部署

[Zeabur](https://zeabur.com) 是一个无需配置服务器的云平台，支持一键部署。

1. 在 Zeabur 创建项目，添加 **MySQL** 和 **Redis** 服务
2. 选择「从 Git 仓库部署」，输入仓库地址
3. 配置环境变量：

   | Key | Value | 说明 |
   |-----|-------|------|
   | `APP_ENV` | `production` | 启用生产配置强校验和 Secure Cookie |
   | `ALLOWED_ORIGINS` | `https://实际生成的域名` | 只允许实际 HTTPS 来源；同时启用 Zeabur 默认域和自定义域时用英文逗号填写全部域名 |
   | `DB_HOST` | `${MYSQL_HOST}` | 引用 Zeabur MySQL 变量 |
   | `DB_PORT` | `${MYSQL_PORT}` | 引用 Zeabur MySQL 变量 |
   | `DB_USER` | `${MYSQL_USERNAME}` | 运行账号，仅授予 DML 权限 |
   | `DB_PASSWORD` | `${MYSQL_PASSWORD}` | 运行账号密码 |
   | `DB_NAME` | `unisearch` | 必须先由迁移任务创建并完成迁移 |
   | `REDIS_HOST` | `${REDIS_HOST}` | 引用 Zeabur Redis 变量 |
   | `REDIS_PORT` | `${REDIS_PORT}` | 引用 Zeabur Redis 变量 |
   | `REDIS_PASSWORD` | `${REDIS_PASSWORD}` | 生产环境必须使用 Redis 密码 |
   | `AUTH_JWT_SECRET` | `你的随机密钥` | `openssl rand -base64 32` |
   | `RESOURCE_PUBLIC_ID_SECRET` | `你的独立公开资源 ID 密钥` | `openssl rand -base64 32` |
   | `SECRET_MASTER_KEY` | `你的随机主密钥` | `openssl rand -base64 32` |
   | `INITIAL_ADMIN_USERNAME` | `自定义首次管理员用户名` | 不得为 `admin` 或占位值 |
   | `INITIAL_ADMIN_PASSWORD` | `随机强密码` | `openssl rand -base64 24` |
   | `AUTO_MIGRATE` | `true` | 容器启动前自动执行迁移；受控回滚时可设为 `false` |
   | `MIGRATION_DB_USER` | `独立迁移账号` | 生产环境建议与运行账号分离 |
   | `MIGRATION_DB_PASSWORD` | `迁移账号密码` | 仅存放在平台 Secret，不写入仓库 |

4. 在「网络」中配置容器端口 `8080` 并生成 HTTPS 域名
5. 确认平台 HTTPS 入口传递 `X-Forwarded-Proto=https`，再使用实际访问域名更新 `ALLOWED_ORIGINS`；例如同时保留默认域和自定义域时写成 `https://unisearch.zeabur.app,https://unisearchso.shop`

> **⚠️ 重要提示：** 不要设置 `PORT` 变量。本项目架构为 Nginx(8080) + 后端(8888) 内部代理，`PORT` 会覆盖后端端口导致代理失败。

> **数据库迁移：** 镜像入口默认在主应用启动前执行 `/app/backend/unisearch-migrate -migrate-refresh-token-sessions`。请为 `MIGRATION_DB_USER`、`MIGRATION_DB_PASSWORD` 配置具备目标库 DDL/DML 权限的独立账号；迁移成功后才会启动 Supervisor 和 Nginx。若迁移失败，容器会退出并在 Runtime Logs 中保留失败原因。

#### Zeabur 环境变量模板

点击「编辑原始环境变量」，粘贴以下内容后修改密钥值：

```env
APP_ENV=production
ALLOWED_ORIGINS=https://请替换为实际生成的域名
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTO_MIGRATE=true
MIGRATION_DB_USER=${MYSQL_USERNAME}
MIGRATION_DB_PASSWORD=${MYSQL_PASSWORD}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
AUTH_JWT_SECRET=请替换为随机密钥
RESOURCE_PUBLIC_ID_SECRET=请替换为独立随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_PASSWORD=
CHANNELS=SharePanBaidu,tianyifc,yunpanxunlei,BaiduCloudDisk,shareAliyun,Aliyun_4K_Movies,ali_yppan,bdbdndn11,yunpanx,yp123pan,bsbdbfjfjff,txtyzy,peccxinpd,gotopan,PanjClub,baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,ucwpzy,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,Q_dongman,yoyokuakeduanju,TG654TG,QukanMovie,yeqingjie_GJG666,movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,duan_ju,QuarkFree,yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,Netdisk_Movies,yunpanquark,ciliziyuanku,tgbokee,gokuapan,gimy115,WFYSFX03,tgsearchers6,sbsbsnsqq,kkxlzy,alyp_1,dianyingshare,WFYSFX02,cctv1211,liangxingzhinan,ammmziyuan,cili8888,jzmm_123pan,Q_dianying,domgmingapk,dianying4k,q_dianshiju,ucshare,godupan,peccxin,Movie888035,xlwpzy,zyywpzy,wydwpzy,gimy100,gimy115iso
ENABLED_PLUGINS=labi,shandian,muou,hunhepan,pansearch,susu,thepiratebay,u3c3,jutoushe,nyaa,aikanzy,quark4k,quarksoo,huban,panwiki,sidhub
```

<details>
<summary>含 Redis 的完整模板（点击展开）</summary>

```env
APP_ENV=production
ALLOWED_ORIGINS=https://请替换为实际生成的域名
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USER=${MYSQL_USERNAME}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=unisearch
AUTH_JWT_SECRET=请替换为随机密钥
RESOURCE_PUBLIC_ID_SECRET=请替换为独立随机密钥
SECRET_MASTER_KEY=请替换为随机主密钥
INITIAL_ADMIN_USERNAME=
INITIAL_ADMIN_PASSWORD=
CHANNELS=SharePanBaidu,tianyifc,yunpanxunlei,BaiduCloudDisk,shareAliyun,Aliyun_4K_Movies,ali_yppan,bdbdndn11,yunpanx,yp123pan,bsbdbfjfjff,txtyzy,peccxinpd,gotopan,PanjClub,baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,ucwpzy,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,Q_dongman,yoyokuakeduanju,TG654TG,QukanMovie,yeqingjie_GJG666,movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,duan_ju,QuarkFree,yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,Netdisk_Movies,yunpanquark,ciliziyuanku,tgbokee,gokuapan,gimy115,WFYSFX03,tgsearchers6,sbsbsnsqq,kkxlzy,alyp_1,dianyingshare,WFYSFX02,cctv1211,liangxingzhinan,ammmziyuan,cili8888,jzmm_123pan,Q_dianying,domgmingapk,dianying4k,q_dianshiju,ucshare,godupan,peccxin,Movie888035,xlwpzy,zyywpzy,wydwpzy,gimy100,gimy115iso
ENABLED_PLUGINS=labi,shandian,muou,hunhepan,pansearch,susu,thepiratebay,u3c3,jutoushe,nyaa,aikanzy,quark4k,quarksoo,huban,panwiki,sidhub
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
```

</details>

> 密钥生成方式：`openssl rand -base64 32`

#### Telegram 频道同步说明

- 根目录 [`.env.example`](.env.example) 是主应用运行时模板。
- [`deploy/.env.operations.example`](deploy/.env.operations.example) 是构建、发布、备份等运维脚本模板，不参与主应用运行时读取。

- `CHANNELS` 现在是初始化/空库兜底配置：启动时用于补齐数据库缺失频道，数据库没有启用频道时才会回退使用。
- `ENABLED_PLUGINS` 当前默认是 24 个内置插件的启动注册清单；Zeabur 可不设置该变量，镜像会使用同一份默认清单。
- 如需临时扩展内置插件，只需显式覆盖 `ENABLED_PLUGINS`；默认并发会按实际初始化配置自动推导。
- 插件中心已下线 URL 导入和自定义插件配置；新增插件需要在 `backend/plugin/<插件名>` 实现源码插件，在 `backend/main.go` 添加空导入，并通过 `ENABLED_PLUGINS` 控制启用。
- 已有部署更新环境变量后重启服务即可触发频道同步；后端启动时只会追加缺失频道，不会删除数据库中已有频道。
- 如需在不停机情况下补齐频道，可在管理后台的 Telegram 频道管理中批量导入同一组频道名称。

本节即为 Zeabur 部署教程，更新预发布环境时以这里的模板为准。

---

### 本地开发

#### 1. 前置条件

- Go 1.25+
- Node.js 18+
- pnpm
- MySQL 8.0
- Redis 7（可选）

#### 2. 启动后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 配置数据库连接
go run ./cmd/migrate
go run .
```

如需显式清理废弃表，确认备份后执行：

```bash
go run ./cmd/migrate -drop-deprecated
```

如需显式清理已移除上游插件的历史数据，确认数据库备份与目标环境后执行：

```bash
go run ./cmd/migrate -purge-removed-plugins
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

完整环境变量列表请参考 [`.env.example`](.env.example)，以下为核心配置项。

- 主应用运行时变量：根目录 [`.env.example`](.env.example)
- 构建、发布、备份等运维脚本变量：[deploy/.env.operations.example](deploy/.env.operations.example)

### 数据库（必填）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | MySQL 主机 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | 主应用 MySQL 运行账号，仅授予 DML 权限；迁移命令临时覆盖为迁移账号 | `root` |
| `DB_PASSWORD` | 当前数据库账号密码 | — |
| `DB_NAME` | 数据库名 | `unisearch` |

### 认证（必填）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AUTH_JWT_SECRET` | JWT 签名密钥 | — |
| `RESOURCE_PUBLIC_ID_SECRET` | 公开资源 ID 派生密钥，必须独立于 JWT 密钥 | — |
| `SECRET_MASTER_KEY` | 密钥管理主密钥 | — |
| `INITIAL_ADMIN_USERNAME` | 数据库无管理员时创建首次管理员的用户名，不得为 `admin` 或占位值 | — |
| `INITIAL_ADMIN_PASSWORD` | 数据库无管理员时创建首次管理员的密码，建议随机生成 | — |
| `AUTH_TOKEN_EXPIRY` | JWT 有效期（小时） | `24` |
| `REFRESH_TOKEN_TTL` | 摘要刷新会话有效期（小时） | `720` |
| `AUTH_USERNAME_MIN_LENGTH` | 用户名最小长度 | `3` |
| `AUTH_USERNAME_MAX_LENGTH` | 用户名最大长度 | `32` |
| `AUTH_PASSWORD_MIN_LENGTH` | 密码最小长度，新设置的密码不能包含空白字符 | `6` |
| `AUTH_PASSWORD_MAX_LENGTH` | 密码最大长度，新设置的密码不能包含空白字符 | `64` |

### Redis（可选）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | — |
| `REDIS_TTL` | 首次初始化后台缓存配置时的默认搜索缓存 TTL（秒） | `3600` |

### 后台缓存配置（推荐）

系统启动后，缓存策略以后台 `系统设置 -> 缓存配置` 为准，环境变量只作为首次初始化和兜底来源。当前默认策略如下：

- 搜索结果缓存 `3600` 秒。
- 热门榜单每天北京时间 `00:00` 自动预热。
- 预热覆盖 `56` 个有效组合。
- 每个组合预热并缓存前 `50` 条结果。
- 热门榜单缓存 TTL 为 `86400` 秒。

后台可直接调整以下配置项：

- 搜索缓存总开关、搜索缓存 TTL
- 写队列长度、写入 worker 数
- 热门榜单缓存开关、预热开关
- 预热时间、预热条数、预热并发、预热超时
- 立即预热热门榜单、清理热门榜单缓存

### 搜索配置（可选）

渐进式搜索由后台 `系统设置 -> 搜索体验` 的“启用渐进式搜索”统一控制，默认开启；关闭后搜索页直接使用普通搜索，`/api/search/progressive` 会返回禁用错误。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CHANNELS` | 初始化 Telegram 频道兜底列表 | 见部署模板 |
| `ENABLED_PLUGINS` | 启动注册默认插件清单 | 见部署模板 |
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
│   ├── plugin/                # 搜索插件（默认启用 24 个）
│   ├── service/               # 业务服务
│   ├── util/                  # 工具函数
│   ├── main.go                # 入口文件
│   ├── go.mod
│   └── go.sum
├── docs/                      # 项目文档
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
入口迁移不会创建数据库本身。请确认 Zeabur MySQL 服务已就绪，并配置 `MIGRATION_DB_USER`、`MIGRATION_DB_PASSWORD`；入口会在数据库存在后自动运行 `unisearch-migrate`。

**提示表不存在或首次管理员缺失：**
先配置 `INITIAL_ADMIN_USERNAME` 和 `INITIAL_ADMIN_PASSWORD`，并确认 `AUTO_MIGRATE=true`。重新部署后，入口会自动执行迁移并在成功后启动应用；数据库已有管理员时不需要保留首次管理员变量。若日志仍提示缺表，检查迁移账号是否具有目标库 DDL/DML 权限及数据库服务是否已就绪。

**后端反复重启（exit status 1）：**
检查 Zeabur 控制台的 Runtime Logs，常见原因：
1. MySQL 服务未就绪 — 等待 MySQL 完全启动后重新部署
2. `PORT` 环境变量冲突 — 删除 Zeabur 主应用中的 `PORT` 变量，让 Dockerfile 默认值 `8888` 生效
3. 认证密钥未配置 — 确认 `AUTH_JWT_SECRET`、`RESOURCE_PUBLIC_ID_SECRET`、`SECRET_MASTER_KEY` 已设置

**Nginx 502 Bad Gateway：**
通常是后端未启动或端口不匹配。确认没有设置 `PORT` 环境变量（或设为 `8888`），本项目使用 Nginx(8080) → 后端(8888) 的内部代理。

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
