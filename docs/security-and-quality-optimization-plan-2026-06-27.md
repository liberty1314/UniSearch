# UniSearch 安全与质量优化方案

生成时间：2026-06-27  
来源报告：`docs/security-and-quality-audit-2026-06-27.md`  
目标：基于审计结果制定可执行优化路线，先消除公网生产阻断风险，再提升系统稳定性、用户体验与运维可控性。

## 总体目标

本方案把当前问题分为三期处理：

- 第一阶段：发布阻断修复。目标是让项目达到“可进入公网生产验收”的最低安全基线。
- 第二阶段：风险收敛。目标是降低滥用、信息泄露、资源耗尽和配置误用风险。
- 第三阶段：体验与运维增强。目标是让用户状态、错误提示、依赖治理和部署流程更稳定可持续。

建议先完成第一阶段再做任何公网暴露或生产发布。

## 优先级总览

| 优先级 | 问题 | 处理阶段 | 验收结果 |
| --- | --- | --- | --- |
| P0 | 微博插件 Web 管理路由未鉴权 | 第一阶段 | 匿名访问不可操作插件管理动作 |
| P0 | 默认管理员 `admin/admin` | 第一阶段 | 生产环境无法自动创建固定弱口令管理员 |
| P0 | 关键密钥漏配使用临时值 | 第一阶段 | 生产环境缺少密钥时启动失败 |
| P0 | 前端依赖存在 critical/high 漏洞 | 第一阶段 | `pnpm audit --audit-level high` 通过 |
| P0 | Docker Compose 暴露 MySQL/Redis 弱默认配置 | 第一阶段 | 生产配置不暴露数据服务且无弱默认凭据 |
| P1 | CORS 全开放 | 第二阶段 | 生产环境只允许白名单来源 |
| P1 | 登录限流完整读取 body | 第二阶段 | 认证入口具备小体积请求限制 |
| P1 | TMDB 管理接口回显完整令牌 | 第二阶段 | 接口只返回配置状态和掩码 |
| P1 | 搜索请求边界不足 | 第二阶段 | 关键字、ext、插件数量、并发均有上限 |
| P1 | refresh token 存 localStorage | 第三阶段 | refresh token 迁移或完成风险缓解 |
| P1 | Nginx 缺少安全响应头 | 第三阶段 | 响应头基线生效 |

## 第一阶段：发布阻断修复

### 1. 插件 Web 路由纳入统一认证

目标：
- 所有插件 Web 管理入口必须经过登录与管理员权限校验。
- 微博插件 `/weibo/:param` 不再作为匿名可操作管理入口。

建议改动：
- 修改 `backend/api/router.go` 的 `registerPluginWebRoutes`，改为传入受保护分组，例如：
  - `/api/admin/plugin-web/:pluginName/*path`
  - 或 `/api/admin/plugins/:pluginName/web/*path`
- 调整 `plugin.PluginWithWebHandler` 的使用约束，插件只能注册到已受保护的 `RouterGroup`。
- 微博插件保留管理页面能力，但迁移到后台路径。
- 微博插件 POST action 增加二次校验：
  - 当前用户必须为管理员。
  - action 使用白名单。
  - 对 `refresh_qrcode`、`check_login`、`test_search` 增加频率限制。
  - 为关键动作写入审计日志。

测试要求：
- 匿名请求旧 `/weibo/:param` 返回 404、401 或跳转到登录，不得执行 action。
- 非管理员请求插件 Web action 返回 403。
- 管理员请求 `get_status`、`refresh_qrcode`、`set_user_ids`、`logout` 正常。
- 既有微博搜索功能不受影响。

验收命令：
- `cd backend && go test ./api ./plugin/weibo`
- `cd backend && go test ./...`

### 2. 移除生产默认管理员弱口令

目标：
- 生产环境不再自动创建固定 `admin/admin`。
- 首次初始化必须显式提供管理员账号和强密码。

建议改动：
- 为应用增加环境模式配置，例如 `APP_ENV=development|production`。
- 修改 `backend/database/seed.go` 和 `backend/service/auth_service.go`：
  - 开发环境可保留便捷初始化，但日志不得输出明文密码。
  - 生产环境必须读取 `INITIAL_ADMIN_USERNAME` 与 `INITIAL_ADMIN_PASSWORD`。
  - 生产环境缺少初始管理员配置时启动失败。
  - 初始密码复用现有密码校验规则，并增加强度要求。
- 增加启动日志，明确“已使用显式初始管理员配置”。

测试要求：
- 生产环境无初始管理员配置时返回错误。
- 生产环境提供强密码时创建管理员。
- 开发环境仍可本地初始化，但不输出明文密码。
- 已存在管理员时不重复创建。

验收命令：
- `cd backend && go test ./database ./service`
- `cd backend && go test ./...`

### 3. 关键密钥配置改为生产强校验

目标：
- 生产环境缺少 `AUTH_JWT_SECRET`、`REFRESH_TOKEN_ENCRYPT_KEY`、`SECRET_MASTER_KEY` 时启动失败。
- 开发环境自动生成值必须使用强随机数，且只用于当前进程。

建议改动：
- 在 `backend/config/config_auth.go` 中集中增加密钥校验函数。
- 对生产环境执行：
  - 必填校验。
  - 最小长度校验。
  - 禁止占位符值。
  - 禁止多个密钥使用同一个值。
- 开发环境自动生成使用 `crypto/rand` + base64。
- 启动日志只输出“已配置/未配置”，不输出密钥内容。

测试要求：
- 生产环境缺少任一关键密钥时配置加载失败。
- 生产环境使用占位符密钥时配置加载失败。
- 生产环境多个密钥重复时配置加载失败。
- 开发环境未设置密钥时可启动，并生成随机值。

验收命令：
- `cd backend && go test ./config`
- `cd backend && go test ./...`

### 4. 前端依赖漏洞升级

目标：
- 消除 critical/high 级依赖漏洞。
- 发布前至少让 high 级 audit 门禁通过。

建议改动：
- 升级运行时依赖：
  - `axios` 升至包含 DoS/Header Injection 修复的版本。
  - `react-router` / `react-router-dom` 升至包含 XSS/CSRF 修复的版本。
- 升级开发与构建依赖：
  - `vitest` 升至至少 `4.1.0`。
  - `vite`、`rollup`、`undici`、`js-yaml`、`glob`、`minimatch` 等传递依赖通过 lockfile 解析到修复版本。
- 升级后重点回归：
  - 路由跳转。
  - 管理端路由守卫。
  - 登录与 token 刷新。
  - 搜索页和资源详情页。

测试要求：
- 前端 lint、类型检查、单测通过。
- audit 至少在 high 级别通过。
- 如 moderate 暂无法清零，记录剩余项、影响范围和升级阻塞原因。

验收命令：
- `cd frontend && pnpm install`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm audit --audit-level high`

### 5. 拆分开发与生产 Docker Compose 配置

目标：
- 生产配置不暴露 MySQL/Redis 到宿主机。
- 生产环境不使用 root 数据库用户、空 Redis 密码或弱默认密码。

建议改动：
- 保留当前 `docker-compose.yml` 作为开发用途，或明确重命名为 `docker-compose.dev.yml`。
- 新增生产配置模板，例如 `docker-compose.prod.example.yml`：
  - MySQL 不映射 `3306:3306`。
  - Redis 不映射 `6379:6379`。
  - 应用使用专用数据库账号。
  - Redis 启用密码。
  - 所有密码从环境变量或 secret 文件读取。
- 更新 `.env.example`：
  - 不提供可直接复用的弱默认值。
  - 标注生产必填项。
- 当前本机 `.env` 中出现过的密钥和第三方 token 应立即轮换。

测试要求：
- 开发 compose 可正常启动。
- 生产 compose 配置校验通过。
- 应用容器可通过内部网络访问 MySQL/Redis。
- 宿主机默认无法直接访问 MySQL/Redis 端口。

验收命令：
- `docker compose config`
- `docker compose -f docker-compose.prod.example.yml config`
- `cd backend && go test ./...`

## 第二阶段：风险收敛

### 6. CORS 白名单化

目标：
- 生产环境不再使用 `Access-Control-Allow-Origin: *`。

建议改动：
- 新增配置 `ALLOWED_ORIGINS`，支持逗号分隔。
- 开发环境默认允许 localhost 常用端口。
- 生产环境必须显式配置正式域名。
- 对不在白名单的 Origin 不返回 CORS 允许头。

测试要求：
- 白名单来源请求通过。
- 非白名单来源不返回允许头。
- 无 Origin 的同源或服务端请求不受影响。

验收命令：
- `cd backend && go test ./api`

### 7. 请求体大小与认证入口限流优化

目标：
- 登录、注册、刷新令牌等入口在读取 body 前有小体积限制。
- 降低大请求造成内存压力的风险。

建议改动：
- 增加 Gin 中间件，对 `/api/auth/*` 设置较小 body 上限，例如 16KB。
- 对 `/api/search` 设置合理上限，例如 128KB 或按实际 ext 需求调整。
- `rate_limiter.go` 的 `readRequestBody` 改为有限读取。
- 对 JSON 解析失败保留统一错误响应。

测试要求：
- 正常登录、注册、刷新通过。
- 超过限制的 body 返回 413 或明确错误。
- 限流 key 仍能按 IP + 用户名生效。

验收命令：
- `cd backend && go test ./api`
- `cd backend && go test ./...`

### 8. TMDB 令牌不再回显完整值

目标：
- 管理接口不返回完整 TMDB token。

建议改动：
- 后端 `GetTMDBAdminSettingsHandler` 和 `UpdateTMDBAdminSettingsHandler` 返回：
  - `configured`
  - `source`
  - `updated_at`
  - `token_preview`，例如只显示末 4 位
- 前端系统设置页：
  - 加载时只显示掩码摘要。
  - 保存成功后清空输入框。
  - 提示“已更新”，不展示完整令牌。

测试要求：
- GET 接口不包含 `read_access_token` 完整字段。
- PUT 接口不回显完整 token。
- 前端保存后 UI 显示掩码状态。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test -- systemSettingsService useSystemSettingsController`

### 9. 搜索请求边界与插件并发修正

目标：
- 搜索入口具备明确参数上限。
- 插件并发计算符合“请求并发不超过全局上限”的语义。
- SeedHub 自定义 base URL 不形成内网访问风险。

建议改动：
- 在搜索请求规范化阶段增加限制：
  - `keyword` 最大长度。
  - `plugins` 最大数量。
  - `channels` 最大数量。
  - `cloud_types` 最大数量。
  - `ext` 最大序列化长度和允许键白名单。
- 修正 `calculatePluginWorkerCount`：
  - 应取 `min(concurrency, AsyncMaxBackgroundWorkers, pluginCount)`。
- SeedHub `sidhub_base_url`：
  - 仅允许后台运行时配置使用。
  - 限制协议为 HTTPS。
  - 拒绝 localhost、内网地址、link-local、metadata 地址。
  - 可选：增加域名白名单配置。

测试要求：
- 超长 keyword 返回 400。
- 过多 plugins/channels 返回 400。
- 请求并发小于全局并发时，不被提升。
- SeedHub base URL 对内网地址返回错误。
- 合法 SeedHub base URL 仍可使用。

验收命令：
- `cd backend && go test ./api ./service ./plugin/sidhub`
- `cd backend && go test ./...`

## 第三阶段：体验与运维增强

### 10. refresh token 存储策略优化

目标：
- 降低浏览器脚本读取 refresh token 的风险。

推荐路线：
- 最优方案：refresh token 迁移到 `HttpOnly + Secure + SameSite` Cookie。
- 过渡方案：
  - 缩短 refresh token 生命周期。
  - refresh token 每次使用后旋转。
  - 绑定设备指纹。
  - 增加异常撤销。
  - 增加 CSP 降低 XSS 成功率。

测试要求：
- 登录、刷新、退出流程正常。
- refresh token 失效后自动跳转登录。
- 多标签页刷新仍保持单飞逻辑。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test -- authStore authRefreshManager useAutoRefreshToken`

### 11. Nginx 安全响应头基线

目标：
- 增加浏览器端基础防护。

建议响应头：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` 按实际能力最小化。
- `Content-Security-Policy` 分阶段上线：
  - 第一版先使用 report-only 观察。
  - 第二版再强制执行。

测试要求：
- 首页、搜索页、后台页响应包含安全头。
- 资源图片、字体、接口请求不被 CSP 误伤。
- 第三方图片和外链打开流程正常。

验收命令：
- `docker compose config`
- 本地启动后执行 `curl -I http://localhost/`
- `cd frontend && pnpm e2e:mock`

### 12. 管理端角色状态重新确认

目标：
- 管理页面不只依赖 localStorage 中的 `isAdmin`。

建议改动：
- 进入 `/admin` 时调用 `/api/user/me` 或 token validate 接口确认角色。
- 本地 `isAdmin` 仅用于导航展示，不作为页面级唯一判断。
- 401/403 时统一清理状态并跳转管理员登录页。

测试要求：
- 伪造本地 `isAdmin=true` 但无有效 token 时无法进入后台数据页。
- 普通用户访问后台跳转管理员登录。
- 管理员刷新页面后仍能进入后台。

验收命令：
- `cd frontend && pnpm test -- RouteGuards useAdminPageController`
- `cd frontend && pnpm test`

### 13. 错误响应与日志治理

目标：
- 用户看到稳定、可理解的错误。
- 服务端保留足够排查信息，但不向前端暴露内部细节。

建议改动：
- 建立错误码表，例如：
  - `PLUGIN_WEB_UNAUTHORIZED`
  - `SEARCH_REQUEST_TOO_LARGE`
  - `TMDB_TOKEN_UPDATE_FAILED`
  - `PLUGIN_UPSTREAM_TIMEOUT`
- handler 对外返回错误码和简短中文消息。
- 详细错误写结构化日志，包含 `request_id`。
- 前端根据错误码展示用户友好提示。

测试要求：
- 上游失败不泄露内部 URL、配置名或堆栈。
- 日志可通过 request_id 关联。
- 前端 toast 文案稳定。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test`

### 14. 依赖与发布门禁常态化

目标：
- 依赖漏洞不再积累到发布前集中爆发。

建议改动：
- 本地发布检查固定为：
  - `cd backend && go test ./...`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm check`
  - `cd frontend && pnpm test`
  - `cd frontend && pnpm audit --audit-level high`
- 安装并纳入 Go 漏洞扫描：
  - `govulncheck ./...`
- 每月固定依赖维护窗口。
- high/critical 漏洞必须阻断发布。

验收要求：
- 发布前所有命令有记录。
- high/critical 漏洞为 0。
- moderate 漏洞必须有风险说明和修复计划。

## 推荐实施顺序

1. 微博插件 Web 路由鉴权。
2. 默认管理员和生产密钥强校验。
3. 前端依赖升级。
4. 生产 Docker Compose 模板与 `.env.example` 收敛。
5. CORS 白名单与请求体大小限制。
6. TMDB token 掩码化。
7. 搜索参数边界、插件并发、SeedHub base URL 限制。
8. refresh token 存储策略优化。
9. Nginx 安全头和 CSP。
10. 管理端角色重新确认。
11. 错误响应治理。
12. 发布门禁常态化。

## 完整验收清单

发布前必须全部满足：

- 匿名用户无法访问或操作任何插件 Web 管理接口。
- 生产环境不会创建固定弱口令管理员。
- 生产环境缺少关键密钥会启动失败。
- `.env` 中出现过的真实密钥和第三方 token 已轮换。
- 前端 high/critical audit 漏洞清零。
- MySQL/Redis 生产配置不暴露到宿主机公网端口。
- Redis 生产配置启用认证。
- CORS 生产配置为白名单。
- 登录、注册、刷新令牌接口具备小 body 限制。
- TMDB 管理接口不回显完整 token。
- 搜索入口具备参数上限。
- SeedHub 自定义 base URL 不允许访问内网地址。
- Nginx 输出基础安全响应头。
- 后端测试、前端 lint、类型检查、单测全部通过。

## 回滚策略

- 插件 Web 路由迁移：保留旧路径短期 301 到后台路径，但旧路径不得执行 POST action。
- 默认管理员调整：若生产启动失败，回滚方式是补齐初始管理员环境变量，不应恢复 `admin/admin`。
- 密钥强校验：若启动失败，补齐密钥；不要恢复临时密钥。
- 依赖升级：若前端行为异常，按 lockfile 回退单个依赖版本，并保留漏洞说明。
- Docker 配置：生产配置独立文件，开发配置不影响生产回滚。
- CORS 与 CSP：CSP 可先使用 report-only，CORS 白名单变更保留紧急域名配置开关。

## 交付物建议

每个阶段完成后输出：

- 代码改动。
- 测试结果。
- 发布风险说明。
- 运维配置变更说明。
- 回滚说明。
- 更新后的审计状态表。

