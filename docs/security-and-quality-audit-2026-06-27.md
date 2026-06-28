# UniSearch 安全与质量审计报告

生成时间：2026-06-27 22:10:01 CST  
审计范围：后端 Go/Gin API、插件体系、前端 React/Vite、认证状态、部署配置、依赖供应链与用户关键路径。  
审计性质：本地静态审计 + 本地测试验证；未进行公网渗透、真实账号攻击或破坏性压测。

## 结论

当前项目功能测试和前端静态检查通过，但不建议直接以现状暴露到公网生产环境。主要阻断项是：微博插件 Web 管理路由未纳入统一认证、默认管理员与默认密钥策略不安全、前端依赖存在大量已知漏洞、Docker Compose 暴露数据库与 Redis 并使用弱默认凭据。

综合评分：72/100  
建议：退回修复后再进入公网生产验收。

评分拆分：
- 代码质量：82/100。整体模块边界清晰，测试覆盖较多，但存在并发控制语义反直觉、错误信息外泄和请求大小控制不一致问题。
- 安全基线：55/100。认证主链路存在，但插件 Web 面、部署默认值、依赖漏洞和密钥生命周期存在明显短板。
- 用户体验：78/100。常规搜索、管理端、公告与资源打开链路较完整，但登录状态可信度、错误提示、外部依赖失败时的可解释性仍需加强。
- 运维可控性：62/100。有 Docker、Nginx、健康检查和测试，但缺少生产闸门、依赖漏洞阻断、密钥轮换与边界访问策略。

## 已执行验证

- `cd backend && go test ./...`：通过。
- `cd frontend && pnpm lint`：通过。
- `cd frontend && pnpm check`：通过。
- `cd frontend && pnpm audit --audit-level moderate`：失败，发现 79 个漏洞，含 1 个 critical、39 个 high、33 个 moderate、6 个 low。
- `govulncheck`：本机未安装，未完成 Go 依赖漏洞扫描。

## 高优先级问题

### P0-1 微博插件 Web 管理路由未受统一认证保护

证据：
- `backend/api/router.go:69-78` 将插件 Web 路由注册到根路由分组 `r.Group("")`，未包裹 `JWTMiddleware()` 或 `AdminMiddleware()`。
- `backend/plugin/weibo/weibo.go:469-472` 注册 `/weibo/:param` 的 GET/POST。
- `backend/plugin/weibo/weibo.go:633-645` 允许 POST action 执行 `get_status`、`refresh_qrcode`、`logout`、`set_user_ids`、`test_search`、`check_login`。
- `backend/plugin/weibo/weibo.go:651-713` 在访问状态时可自动创建用户记录并生成二维码。
- `backend/plugin/weibo/weibo.go:741-759` 可清空登录态。
- `backend/plugin/weibo/weibo.go:822-870` 可修改用户 ID 列表。

影响：
- 未授权访问者可以触发微博登录二维码创建、修改插件配置态、执行测试搜索或登出已有会话。
- 如果微博插件启用且服务对公网开放，攻击者可消耗外部请求额度、扰乱插件账号状态，并可能影响已配置的微博搜索能力。

修复建议：
- 插件 Web 路由默认挂载到 `/api/admin/plugins/:name/web` 或独立受保护分组。
- `PluginWithWebHandler` 注册入口强制传入已认证的 `RouterGroup`，插件不应自行暴露裸根路由。
- 对微博插件每个 action 增加权限校验、CSRF/一次性 nonce、请求频率限制与审计日志。
- 对 `param/hash` 增加不可猜测的服务器端绑定，而不是仅靠 URL hash 标识状态。

### P0-2 默认管理员 `admin/admin` 可被自动创建

证据：
- `backend/database/seed.go:17-71` 在没有管理员时创建 `admin/admin`，并在日志输出默认账号。
- `backend/service/auth_service.go` 中也存在创建默认管理员的同类逻辑。

影响：
- 首次部署、测试环境误暴露或数据卷重建时，默认弱口令可能成为直接接管后台的入口。
- 日志中打印默认凭据会增加运维平台、容器日志和第三方日志采集的泄露面。

修复建议：
- 生产模式下禁止自动创建固定默认管理员。
- 首次启动改为要求 `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`，且密码必须通过强度校验。
- 如果仍保留开发模式默认值，必须绑定 `APP_ENV=development` 并在生产模式启动时 fail fast。
- 去掉日志中的明文默认凭据提示。

### P0-3 生产密钥漏配时会退回临时时间戳派生值

证据：
- `backend/config/config_auth.go:103-115`：`AUTH_JWT_SECRET` 未配置时使用 `unisearch-default-secret-<unix>`。
- `backend/config/config_auth.go:202-210`：`REFRESH_TOKEN_ENCRYPT_KEY` 未配置时使用时间戳派生临时密钥。
- `backend/config/config_auth.go:228-235`：`SECRET_MASTER_KEY` 未配置时使用时间戳派生临时密钥。

影响：
- 重启后密钥变化会让现有令牌和加密数据失效，造成用户被动登出或密钥管理不可恢复。
- 时间戳派生值不满足生产密钥强度要求。
- 漏配不会阻断启动，容易让部署缺陷进入生产。

修复建议：
- 生产模式下缺少 `AUTH_JWT_SECRET`、`REFRESH_TOKEN_ENCRYPT_KEY`、`SECRET_MASTER_KEY` 必须启动失败。
- 开发模式可自动生成，但应使用 `crypto/rand`，并明确标注仅开发环境。
- 密钥长度、格式和唯一性在启动阶段校验。

### P0-4 前端依赖存在大量已知漏洞

证据：
- `frontend/package.json` 中当前关键版本包括 `axios ^1.7.9`、`react-router-dom ^7.3.0`、`vite ^6.3.5`、`vitest ^4.0.18`。
- `pnpm audit --audit-level moderate` 失败，报告 79 个漏洞：1 critical、39 high、33 moderate、6 low。
- 重点漏洞包括 Vitest UI 任意文件读/执行、React Router 多个 XSS/CSRF 类漏洞、Axios DoS/Header Injection、Rollup 任意文件写入、Vite/undici/js-yaml/minimatch/glob 相关漏洞。

影响：
- 运行时依赖 `axios`、`react-router-dom` 直接进入浏览器应用风险面。
- `vite`、`vitest`、`rollup` 等主要为开发/构建风险，但会影响 CI、开发机和构建供应链。

修复建议：
- 升级 `axios` 至至少 `1.16.0`。
- 升级 `react-router` / `react-router-dom` 至包含当前公告修复的版本。
- 升级 `vitest` 至至少 `4.1.0`，升级 `rollup`、`vite`、`undici` 等传递依赖。
- 在 CI/本地发布门禁中加入 `pnpm audit --audit-level high`，并对 moderate 建立定期清零计划。

### P0-5 Docker Compose 暴露数据库和 Redis 且使用弱默认凭据

证据：
- `docker-compose.yml:16-18` 应用容器环境中使用 `DB_USER=root`、`DB_PASSWORD=root`。
- `docker-compose.yml:45-49` MySQL 映射 `3306:3306`，root 密码为 `root`。
- `docker-compose.yml:71-77` Redis 映射 `6379:6379`，未设置密码。

影响：
- 如果 compose 文件用于公网或不可信局域网，数据库和缓存服务可被直接探测。
- Redis 无认证暴露会导致缓存读取、写入、清空或被利用执行高危操作。
- MySQL root 默认弱口令会导致数据完全泄露或被篡改。

修复建议：
- 默认不向宿主机映射 MySQL/Redis 端口，只保留内部 Docker 网络访问。
- 禁止 root 作为应用数据库用户，创建最小权限账号。
- Redis 强制设置密码或仅监听内部网络。
- 生产 compose 使用独立文件，不继承开发弱默认值。

## 中优先级问题

### P1-1 CORS 当前全开放

证据：
- `backend/api/middleware.go:51-56` 设置 `Access-Control-Allow-Origin: *`，并允许 `Authorization` 请求头。

影响：
- 项目主要使用 Authorization header，CSRF 风险低于 Cookie 模式，但全开放 CORS 会放大被盗 token 的跨源利用面。
- 浏览器端任何来源都可构造带 Authorization header 的 API 请求。

修复建议：
- 增加 `ALLOWED_ORIGINS` 配置。
- 生产模式仅允许正式域名和必要的管理域名。
- 根据是否启用凭据、是否开放第三方 API 分别配置 CORS 策略。

### P1-2 登录限流会完整读取请求体

证据：
- `backend/api/rate_limiter.go:79-91` 使用 `io.ReadAll(c.Request.Body)` 读取完整 body 后再解析用户名。

影响：
- 在 Gin handler 或 Nginx body 限制之前，超大请求可能造成额外内存压力。
- 如果后端绕过 Nginx 直接暴露，DoS 风险更明显。

修复建议：
- 在后端入口使用 `http.MaxBytesReader` 或 Gin 中间件统一限制 body 大小。
- 登录、注册、刷新令牌接口设置更小的 JSON body 上限，例如 16KB。
- 限流 key 可先按 IP 限制，再在有限 body 内提取用户名。

### P1-3 TMDB 管理接口返回完整令牌

证据：
- `backend/api/system_settings_handler.go:170-175` 查询接口返回 `read_access_token`。
- `backend/api/system_settings_handler.go:224-230` 更新接口也回显完整 `read_access_token`。

影响：
- 管理员页面、浏览器插件、前端日志、网络代理或截图更容易暴露 TMDB 令牌。
- 令牌展示需求通常只需要“已配置/来源/更新时间/末尾掩码”，不需要完整值。

修复建议：
- GET/PUT 响应只返回 `configured`、`source`、`updated_at` 和掩码值。
- 令牌更新接口只接收新值，不回显完整值。
- 前端输入框保存后清空，只显示掩码摘要。

### P1-4 搜索请求边界与资源成本控制不足

证据：
- `backend/api/search_request_parser.go` 解析 `kw`、`plugins`、`channels`、`ext`、`filter` 时未对关键字长度、数组数量和 ext 体积做明确限制。
- `backend/service/search_executor.go:295-320` 插件并发计算中，当全局 `AsyncMaxBackgroundWorkers` 大于请求并发时，会把 `effectiveWorkers` 提升到更大值。
- `backend/plugin/sidhub/sidhub.go:1608-1615` 支持通过 `ext["sidhub_base_url"]` 覆盖 SeedHub 基础地址。

影响：
- 已登录用户可以通过长关键字、大 ext、较多插件组合放大 CPU、内存和外部请求成本。
- 自定义 SeedHub base URL 在管理员或扩展参数可控时，具备 SSRF 类风险，需要明确边界。
- 并发计算语义反直觉，可能让“低并发请求”实际使用全局更高并发。

修复建议：
- 搜索入口统一限制 keyword 长度、plugins/channels 数量、ext JSON 大小和嵌套深度。
- 插件并发应取 `min(requestConcurrency, asyncMaxBackgroundWorkers, pluginCount)`。
- SeedHub 自定义 base URL 仅允许管理员配置，并限制为 HTTPS 公网域名白名单，禁止内网、localhost、link-local、metadata 地址。
- 为搜索接口增加用户级/全局级速率限制和并发占用配额。

### P1-5 前端 refresh token 持久化在 localStorage

证据：
- `frontend/src/stores/authStore.ts:24-70` 使用 zustand persist 保存 `refreshToken` 到 `auth-storage`。

影响：
- 一旦出现 XSS 或第三方脚本污染，refresh token 可被读取并长期复用。
- 当前 ReactMarkdown 未启用 raw HTML，暂未看到公告 HTML 注入，但依赖漏洞和未来功能变化仍会影响此风险面。

修复建议：
- 优先改为 HttpOnly、Secure、SameSite Cookie 持有 refresh token。
- 如果继续使用 localStorage，应缩短 refresh token 生命周期、绑定设备指纹、增加旋转和异常撤销。
- 增加 CSP，避免任意脚本执行扩大影响。

### P1-6 Nginx 缺少安全响应头

证据：
- `nginx.conf:40-88` 配置了代理、缓存和健康检查，但未设置 CSP、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy 等响应头。

影响：
- 浏览器端对 XSS、点击劫持、MIME sniffing 和跨来源信息泄露的默认防护不足。

修复建议：
- 增加基础安全头，并根据前端实际外链、图片、字体、API 需要调整 CSP。
- 对管理端考虑更严格的 `frame-ancestors 'none'`。

## 低优先级与质量缺陷

### P2-1 前端管理员路由依赖本地 `isAdmin` 状态

证据：
- `frontend/src/routes/RouteGuards.tsx` 使用本地 store 的 `isAdmin` 决定是否进入管理员页面。

影响：
- 不是后端越权，因为 `/api/admin` 仍有 JWT + AdminMiddleware。
- 用户可能短暂进入管理 UI 后再被接口 401/403 打回，体验不一致。

修复建议：
- 管理端入口加载时调用 `/api/user/me` 或 token validate 重新确认角色。
- 本地 `isAdmin` 只作为乐观 UI，不作为页面级唯一判断。

### P2-2 部分错误响应拼接底层错误

证据：
- TMDB、插件和搜索相关 handler 多处将 `err.Error()` 拼入响应。

影响：
- 可能暴露内部状态、上游地址、配置类型或解析细节。

修复建议：
- 对用户返回稳定错误码和泛化消息。
- 详细错误写服务端日志，附 request_id 便于排查。

### P2-3 本地 `.env` 存在真实形态密钥与密码

证据：
- `.env` 被 `.gitignore` 忽略，未被 Git 跟踪。
- 当前工作区 `.env` 中存在真实形态数据库密码、Redis 密码、JWT/主密钥/刷新令牌密钥和 TMDB API Key。

影响：
- 不是仓库提交泄露，但在共享机器、备份、日志采集、截图或容器挂载时仍有泄露风险。

修复建议：
- 轮换当前 `.env` 中出现过的所有密钥和第三方 token。
- 用本机密钥管理器或部署平台 secret 管理，减少长期明文 `.env`。
- 保持 `.env.example` 仅放占位符。

## 系统角度检查结果

认证与授权：
- 主 API 的 `/api/admin` 分组有 JWT 与管理员中间件保护。
- 搜索接口要求登录。
- 插件 Web 路由绕过了主认证链路，是当前最严重的授权缺口。

数据与密钥：
- 数据库、刷新令牌、JWT 和 TMDB 管理具备基本结构。
- 默认管理员、临时密钥、完整令牌回显和本地明文 `.env` 让密钥生命周期不达生产要求。

外部请求与插件：
- 大部分插件使用固定外部站点和超时机制。
- SeedHub 自定义 base URL、微博插件管理动作和大量插件并发使 SSRF、滥用和可用性风险需要收敛。

部署与边界：
- Nginx 有 body size、gzip、代理与健康检查。
- Docker Compose 当前更像开发配置，不满足公网生产隔离要求。
- 安全响应头和 CORS 白名单缺失。

依赖供应链：
- 前端 audit 已失败，必须作为发布阻断项。
- Go 测试通过，但缺少 `govulncheck` 证据。

## 用户角度检查结果

普通用户：
- 搜索链路需要登录，基本可控。
- 若 refresh token 被本地脚本读取，账号可被长期冒用。
- 搜索失败、插件超时和上游解析失败时，用户可能收到较泛或暴露内部细节的错误。

管理员：
- 后台 API 权限控制较完整。
- 管理员页面可显示完整 TMDB token，截图或浏览器环境泄露风险较高。
- Docker 默认弱凭据和默认管理员会让管理员误以为部署可直接上线。

匿名访问者：
- 按主 API 看，匿名只能访问部分公开设置、热门榜单、公告等。
- 如果微博插件启用，匿名访问者可直接访问 `/weibo/:param` 并操作插件 Web 管理动作。

## 修复路线图

第一阶段，发布阻断修复：
- 将所有插件 Web 路由纳入认证与管理员授权，优先修微博插件。
- 移除生产默认管理员 `admin/admin`，改为首次启动强制配置。
- 生产模式缺少关键密钥时启动失败。
- 升级前端关键漏洞依赖并让 `pnpm audit --audit-level high` 通过。
- 修改 Docker Compose 生产配置：不暴露 MySQL/Redis、禁用 root 弱口令、Redis 设置认证。

第二阶段，风险收敛：
- CORS 改为白名单。
- TMDB 管理接口不再返回完整令牌。
- 后端统一请求体大小限制，搜索参数增加长度、数量、嵌套深度限制。
- 搜索接口增加用户级速率限制和并发占用配额。
- SeedHub 自定义 base URL 加白名单和内网地址拦截。

第三阶段，体验和运维增强：
- refresh token 迁移到 HttpOnly Cookie 或缩短 localStorage token 生命周期。
- Nginx 增加安全响应头和 CSP。
- 管理端进入时重新拉取用户角色，避免仅信任本地 `isAdmin`。
- 安装并纳入 `govulncheck`，同时保留 `go test ./...`、`pnpm lint`、`pnpm check`、`pnpm audit` 作为本地发布检查。

## 残余风险与未覆盖范围

- 未进行真实公网渗透测试、暴力破解测试、浏览器自动化 E2E 或高并发压测。
- 未完整验证每个第三方插件目标站点的 HTML 解析异常与上游反爬变化。
- 未运行 Go 依赖漏洞扫描，因为本机未安装 `govulncheck`。
- 本报告没有修改业务代码，仅给出审计结论和修复建议。

