# 注册功能防刷 —— 开发计划

> 配套设计方案见 [design_register_anti_abuse.md](./design_register_anti_abuse.md)。
> 本文档把方案拆解为可执行的开发任务，标注顺序、依赖、验收标准与回退方式，供排期与逐步实现使用。

## 0. 总体安排

| 迭代 | 交付内容 | 对应设计层 | 修复弱点 | 依赖 | 建议节奏 |
|------|----------|-----------|----------|------|----------|
| M0 | 前置：可信代理 / 真实 IP 校正 | 前置依赖 | —（L1/L1.5 前提） | 无 | 优先，独立可上 |
| M1 | 注册限流改 IP 维度双窗口 | L1 | W1 | M0 | 紧随 M0 |
| M2 | IP 自动封禁 + 后台管理 | L1.5 | W6 | M1 | 紧随 M1 |
| M3 | 限流 / 封禁状态落 Redis + 降级 | L2 | W2 | M1、M2 | 多实例前必做 |
| M4 | 注册人机验证（验证码） | L3 | W3 | 无强依赖 | 单独排期 |
| M5 | 全局注册熔断 | L4 | W5 | M3（Redis） | 兜底 |
| M6 | 可观测性：日志 + 指标 + 告警 | 第 6 节 | — | 贯穿各迭代 | 持续 |

原则：每个迭代都能**独立上线并独立回退**；后端先行、前端跟进；所有新增限制默认可通过配置或开关关闭。

---

## M0：可信代理 / 真实 IP 校正（前置，最高优先）

**目标**：确保 `c.ClientIP()` 返回的是客户端真实 IP，而不是反向代理（Nginx/网关）的 IP。这是 L1、L1.5 生效且不误伤的硬前提。

### 任务
- [x] M0-1 复核 `backend/api/router.go` 的 Gin engine 是否调用了 `SetTrustedProxies`；确认当前信任范围。（原先未调用，Gin 默认信任所有代理，存在 XFF 伪造风险）
- [x] M0-2 检查 `nginx.conf` 是否正确透传 `X-Forwarded-For` / `X-Real-IP`。（已确认 `location /api/` 设置了 `X-Real-IP $remote_addr` 与 `X-Forwarded-For $proxy_add_x_forwarded_for`）
- [x] M0-3 按生产拓扑设置可信代理网段（仅信任内网反代 IP）。（新增 `TRUSTED_PROXIES` 环境变量 + `config.TrustedProxies` + `applyTrustedProxies()`；未配置时默认仅信任回环 `127.0.0.1`/`::1`，因 Nginx 反代自本机）
- [x] M0-4 `LoggerMiddleware`（`middleware.go:154`）已记录 `clientIP := c.ClientIP()`，可在预发直接观察解析出的真实 IP，无需额外临时代码。

> 实现落点：`backend/config/config.go`（`TrustedProxies` 字段 + `Init` 装配）、`backend/config/config_env.go`（`getTrustedProxies` 读 `TRUSTED_PROXIES`）、`backend/api/router.go`（`applyTrustedProxies`）。
> 生产部署注意：若反代不在本机（独立网关/多层代理），必须显式配置 `TRUSTED_PROXIES` 为反代网段，否则 `ClientIP()` 会取成反代 IP。

### 验收标准
- 从不同公网 IP 请求，后端日志中的 `ClientIP` 与真实来源一致，而非固定的反代 IP。
- 伪造 `X-Forwarded-For` 头无法篡改被信任的 `ClientIP`（信任边界之外的头被忽略）。

### 风险与回退
- **风险**：可信代理配置错误会导致所有请求解析成同一 IP，L1/L1.5 上线后集体误伤。**M0 未验证通过前，禁止上线 M1/M2。**
- **回退**：纯配置改动，回退配置即可。

---

## M1：注册限流改 IP 维度双窗口（L1 / 修复 W1）

**目标**：注册限流不再以 `IP|username` 整体为 key，改为按纯 IP 计数的双窗口（分钟 + 小时），任一超限即拒绝；同时保留原 `IP+username` 维度防撞注册。

### 后端任务
- [x] M1-1 在 `backend/config/*` 新增配置项并读取默认值：
  - `SIGNUP_IP_LIMIT_PER_MIN`（默认 5）
  - `SIGNUP_IP_LIMIT_PER_HOUR`（默认 20）
- [x] M1-2 `backend/api/rate_limiter.go` 新增按纯 IP 计数的限流器实例（`signupIPPerMinuteRateLimiter` / `signupIPPerHourRateLimiter`），并提供 `InitSignupRateLimiters(perMin, perHour)` 在 `SetupRouter` 内按配置重建。
- [x] M1-3 改造 `registerRateLimitMiddleware`：依次检查 IP/分钟、IP/小时、IP+username/分钟（保留原 `signupRateLimiter`），任一不通过即 `denyAuthEntryRateLimit`。
- [x] M1-4 保留 `registerRateLimitKeyResolver` 解析 username 的能力（仅用于 IP+username 维度），但 IP 维度 key 只用 `c.ClientIP()`。
- [x] M1-5 新增 `backend/api/rate_limiter_test.go`：覆盖"同 IP 不同用户名超分钟阈值被 429""不同 IP 隔离""小时窗超限被 429"三个用例，全部通过。

### 验收标准
- 单元/集成测试：同一 IP 用**不同用户名**连续注册，超过分钟阈值即被 429（验证 W1 已封堵）。
- 同一 IP 一小时内累计超过小时阈值被 429。
- 不同 IP 互不影响；正常单用户注册（低频）不受影响。

### 风险与回退
- **风险**：共享出口 IP（NAT/校园网）可能误伤 —— 已用"分钟突发 + 较宽小时窗"组合缓解，阈值可配。
- **回退**：把阈值调大，或临时关闭 IP 维度检查（保留原有 `IP+username` 逻辑）。

---

## M2：IP 自动封禁 + 后台管理（L1.5 / 修复 W6）

**目标**：在限流之上增加一层可持久化、可后台管理的 IP 封禁。同一 IP 触发窗口内注册请求过多则自动封禁；命中封禁名单的请求直接 403；管理员可后台查看、手动封禁、手动解封。

> 依赖 M1（复用其 IP 维度计数）。可先只做手动封禁 + 命中拦截，再补自动封禁触发。

### 后端任务

**数据模型与迁移**
- [x] M2-1 新建 `backend/model/banned_ip.go`，定义 `BannedIP`（字段见设计方案 §L1.5(3)：`IP` 唯一索引、`Reason`、`Source` auto|manual、`ExpiresAt` 可空=永久、`CreatedBy`）+ `TableName()`。
- [x] M2-2 将 `BannedIP` 加入 `backend/database/migration.go` 的 `AutoMigrate` 列表（迁移通过独立 `cmd/migrate` 执行，不随启动自动迁移）。

**Service 层**（仿 `AdminTagService`：`db *gorm.DB` + `New...(db)`）
- [x] M2-3 新建 `backend/service/banned_ip_service.go`：`List / Ban / Unban / UnbanByID / IsBanned / WarmUp`。
  - 说明：M2 阶段命中检查用**进程内缓存（RWMutex 保护的 map）+ DB 持久化**，`WarmUp` 从 DB 预热到内存。Redis 化推迟到 M3（届时替换缓存后端）。已附单元测试 `banned_ip_service_test.go`（手动封禁/解封/过期/预热跳过过期/分页）。
- [x] M2-4 自动封禁触发逻辑：`rate_limiter.go` 的 `maybeAutobanSignupIP`，在 IP/小时窗口超限时调用；`signupAutobanTracker` 统计触发窗口内请求，超阈值写入封禁（`source=auto`）。受 `SignupAutobanEnabled` 开关控制。

**命中拦截中间件**
- [x] M2-5 新增 `SignupBanGuardMiddleware`：用 `c.ClientIP()` 调 `IsBanned`，命中返回 403 统一提示。已挂在 `router_auth.go` 的 `/auth` 组（覆盖注册/登录等公开入口）。

**后台管理接口**（仿 `admin_tag_handler.go` 包级 service 注入模式）
- [x] M2-6 新建 `backend/api/banned_ip_handler.go`：包级 `bannedIPService` + `SetBannedIPService()` 注入；实现 List / Create / Delete handler。
- [x] M2-7 `backend/api/router_admin.go` 注册 `admin.Group("/banned-ips")` 的 CRUD 路由（天然受 `JWTMiddleware + AdminMiddleware` 保护）。
- [x] M2-8 `router_deps.go` 加字段、`router.go` 加 `SetBannedIPService(...)` + `InitSignupAutoban(...)`、`bootstrap/app.go` 构造 service 并注入、启动时调 `WarmUp()`。

**配置**（入 `system_settings`，支持后台热调）
- [x] M2-9 自动封禁四项配置落 `system_settings`（`backend/model/system_settings.go` + `system_settings_service.go` 默认值/更新逻辑 + `system_settings_handler.go` 请求/响应映射）：
  - `signup_autoban_enabled`（默认 true）
  - `signup_autoban_threshold`（默认 30）
  - `signup_autoban_window_min`（默认 10）
  - `signup_autoban_duration_min`（默认 1440，0=永久）
  - 通过 `GET/PUT /api/admin/system-settings` 读写，支持后台热调：更新后 `UpdateSystemSettingsHandler` 调用 `InitSignupAutoban` 即时重建触发器，无需重启。启动时 `SetupRouter` 从设置读取初始值。

### 前端任务（仿 `AdminUsersView`）
- [x] M2-10 `frontend/src/lib/adminRoute.ts` 新增 view id `banned_ip_management`。
- [x] M2-11 `frontend/src/components/admin/Sidebar.tsx` 加导航项「IP 封禁」（图标 `ShieldBan`）。
- [x] M2-12 `frontend/src/pages/Admin.tsx` 加懒加载 + `adminViewTitles` 标题 + 条件渲染。
- [x] M2-13 新建 `frontend/src/components/admin/BannedIPView.tsx`（仿 `AdminUsersView`：统计卡 + 表格 + 搜索 + 分页 + 封禁对话框 `BanIPDialog` + 解封 `ConfirmDialog`）+ `src/types/bannedIP.ts`。
- [x] M2-14 `src/services/bannedIPService.ts` 封装 `/api/admin/banned-ips` 的 list/create/delete 调用。类型检查与 lint 通过。
- [x] M2-15 后台系统设置面板（`AccountAccessSettingsPanel.tsx`）暴露自动封禁开关 + 三项阈值：开关即时切换，阈值用「保存防刷设置」批量提交；同步扩展 `systemSettingsService.ts` 类型/默认值与 `useSystemSettingsController.ts` 状态/handler。前端整体 `tsc -b && vite build` 通过。

### 验收标准
- 手动封禁某 IP 后，该 IP 请求注册/登录返回 403；解封后恢复。
- 自动封禁：脚本从同一 IP 高频注册，超过阈值后自动进入封禁名单，后续请求 403。
- 封禁到期（`ExpiresAt`）后自动解封（Redis TTL 到期 / DB 判断过期）。
- 后台列表可分页、搜索、手动增删；`source` 正确区分 auto/manual。
- `SIGNUP_AUTOBAN_ENABLED=false` 时不再自动封禁，手动封禁与命中拦截仍可用。

### 风险与回退
- **风险**：共享出口 IP 误封整段用户 —— 故封禁阈值明显高于 L1 限流阈值，且默认只覆盖 auth 接口。
- **风险**：命中检查每请求执行，需高性能 —— 走 Redis（`banned_ip:{ip}` + TTL），DB 仅持久化。
- **回退**：`SIGNUP_AUTOBAN_ENABLED=false` 关自动封禁；误封时后台一键解封。

---

## M3：限流 / 封禁状态落 Redis + 降级（L2 / 修复 W2）

**目标**：把限流计数与封禁命中从进程内存迁到 Redis，实现多实例共享、重启不丢；Redis 故障时降级回内存并告警。

> 项目已引入 `github.com/redis/go-redis/v9`，封装见 `backend/util/cache/redis_cache.go`，配置 `REDIS_*` 已存在。

### 后端任务
- [x] M3-1 新增配置 `SIGNUP_RATE_LIMIT_USE_REDIS`（默认 true，`config.go` + `config_env.go`）。
- [x] M3-2 定义 `RateLimiterStore` 接口（`backend/api/rate_limiter_store.go`）：`Allow(ctx, key, limit, window) (allowed, retryAfter)`。错误在实现内部处理并降级，不外抛，简化调用方。
- [x] M3-3 内存实现 `memoryRateLimiterStore`：按 `limit|window` 复用 `RateLimiter` 实例（保底 / 降级用）。附单测 `rate_limiter_store_test.go`。
- [x] M3-4 Redis 实现 `redisRateLimiterStore`：固定窗口原子计数，key 前缀 `ratelimit:`；Lua 脚本 `INCR`+`PEXPIRE`+`PTTL` 保证原子，避免无过期 key 泄漏（`redis_ratelimit.go` 的 `AllowFixedWindow`）。注册 IP 分钟/小时双窗口与自动封禁计数均走此 store。
- [~] M3-5 封禁**命中查询**暂仍走 M2 的进程内缓存 + DB 预热（`BannedIPService`），**未迁 Redis**。原因：命中检查是纯读、已是内存级，且多实例下各自 WarmUp + 写时更新本地缓存已足够；写入以 DB 为准。若后续要严格多实例即时一致，再迁 `banned_ip:{ip}` + TTL。自动封禁的**计数**（决定何时触发封禁）已走 Redis store。
- [x] M3-6 降级策略：`redisRateLimiterStore` 在 Redis 调用失败时回退内存实现，30 秒节流告警日志，恢复后自动切回并记日志。
- [x] M3-7 扩展 `redisClient` 接口新增 `Eval`；`redis_cache.go` 补 `AllowFixedWindow`/`IncrCounter`/`SetRawWithTTL`/`KeyExists`/`DeleteKey`/`Healthy`。测试桩 `fakeRedisClient` 同步补 `Eval`。

### 验收标准
- 多实例部署下，同一 IP 打到不同实例仍受同一 Redis 计数约束。
- 重启进程后限流/封禁状态不丢失。
- 手动停掉 Redis：注册不整体失败（降级到内存），且产生降级告警日志。

### 风险与回退
- **风险**：Redis 单点故障影响限流 —— 已用降级策略兜底（可用性优先，降级期间安全性下降并告警）。
- **回退**：`SIGNUP_RATE_LIMIT_USE_REDIS=false` 切回纯内存实现。

---

## M4：注册人机验证 / 验证码（L3 / 修复 W3）

**目标**：注册接入人机验证，默认关闭、灰度开启。推荐 Cloudflare Turnstile（无感），受合规/网络限制时用自建图形验证码兜底。

### 后端任务
- [x] M4-1 `system_settings` 新增 `EnableSignupCaptcha`（默认 false）、`SignupCaptchaProvider`（默认 turnstile）。默认创建/更新逻辑 + handler GET/PUT 映射均已补齐。
- [x] M4-2 `controller.RegisterRequest` 增加 `captcha_token` 字段（无 `binding:required`，由开关决定是否强制）。
- [x] M4-3 注册前校验 captcha token：新建 `service/captcha_service.go`（`Verify(ctx, provider, token, remoteIP)`，Turnstile 调 Cloudflare siteverify）。开关开启时 token 空或校验失败返回 400，关闭时跳过。附 `captcha_service_test.go`（success/fail/token空/secret缺失/不支持provider 五用例）。
- [~] M4-4（自建图形验证码）**未做**：采用 Cloudflare Turnstile 无感方案，密钥走 env（`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`）。自建图形验证码作为备选保留，本次未实现。

### 前端任务
- [x] M4-5 `RegisterPage.tsx` 按开关渲染 `TurnstileWidget`（新建），提交时带 `captcha_token`，失败后清空 token（Turnstile 单次有效）。
- [x] M4-6 `authService.ts` + `types/auth.ts` 的 `register`/`RegisterRequest` 带上可选 `captcha_token`。
- [x] M4-7 `AccountAccessSettingsPanel.tsx` + `SystemSettingsView.tsx` + `useSystemSettingsController.ts` 暴露验证码开关（provider 固定 turnstile）。

### 验收标准
- 开关开启：无有效 token 的注册请求被拒（400）；正常人可通过验证完成注册。
- 开关关闭：前端不渲染验证组件，后端不校验，行为同现状。

### 风险与回退
- **风险**：第三方验证服务不可达影响注册 —— 后续如需可补自建图形验证码兜底。
- **回退**：`EnableSignupCaptcha=false` 一键关闭。
- **前置**：生产需配置 `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`；未配 secret 时校验会因配置缺失报错，故灰度开启前务必先配好密钥。

---

## M5：全局注册熔断（L4 / 修复 W5）

**目标**：应对分布式代理池刷号，设置全站单位时间注册成功总量上限，超限临时熔断。

> 依赖 M3（Redis 全局计数）。

### 后端任务
- [x] M5-1 新增配置 `SIGNUP_GLOBAL_LIMIT_PER_HOUR`（默认 0=关闭）+ `SIGNUP_CIRCUIT_BREAK_MIN`（熔断持续分钟，默认 10）。落 `config.go` + `config_env.go`。
- [x] M5-2 每次注册成功计数：`signup_circuit_breaker.go` 的 `recordSuccess` 走 Redis `IncrCounter`（key `signup:global:count:{yyyymmddHH}`，TTL 1 小时），Redis 不可用时降级到进程内小时窗口计数。
- [x] M5-3 超阈值进入熔断态：`SignupCircuitBreakerMiddleware` 挂在注册限流之后、控制器之前；熔断态（Redis key `signup:global:open` + TTL / 内存 `memOpenUntil`）直接返回 503「注册繁忙，请稍后再试」；成功计数依据 `c.Next()` 后响应 200 判定。
- [x] M5-4 熔断触发写 `安全:` 级别日志。指标接入 M6 的 `recordSignupBlocked("global")`。已附内存降级单测 `signup_circuit_breaker_test.go`。

> 说明：默认 `SIGNUP_GLOBAL_LIMIT_PER_HOUR=0` 即关闭熔断（避免误伤），需按业务峰值显式设阈值后启用。

### 验收标准
- 模拟全站高频注册，累计成功数超阈值后进入熔断，新注册被拒；熔断时长过后自动恢复。
- 熔断触发产生告警日志。

### 风险与回退
- **风险**：阈值过低误伤业务高峰 —— 先按监控设定并观察后再收紧。
- **回退**：阈值调大或关闭熔断。

---

## M6：可观测性（贯穿各迭代）

**目标**：为限流、封禁、熔断提供日志、指标与告警，便于阈值调优与攻击发现。

### 任务
- [x] M6-1 日志：限流/封禁/熔断触发点均有即时日志（自动封禁、熔断触发为 `安全:` 级别，含 IP 与原因）。
- [x] M6-2 指标：`signup_observability.go` 用进程内原子计数器实现 `signup_attempt_total`、`signup_success_total`、`signup_blocked_{ip_min|ip_hour|ip_username|autoban|banned|global|captcha}`；`SignupMetricsSnapshot()` 可供健康检查/后台读取。
- [x] M6-3 汇总告警：`StartSignupMetricsReporter`（默认 5 分钟）在拦截数增长时输出汇总日志，便于阈值调优与攻击发现；已在 `SetupRouter` 启动。

> 说明：项目暂无 Prometheus/OTel 体系，M6 采用进程内计数器 + 周期汇总日志的轻量方案。若后续接入 metrics 体系，`SignupMetricsSnapshot()` 可直接作为数据源导出。

### 验收标准
- 一次攻击演练能在日志/指标中清晰看到被拦截的维度与数量。

---

## 应急预案（开发未完成前）

若攻击正在发生、M1/M2 尚未上线，可临时止血：
1. 后台关闭注册开关（`EnableUserSignup` / `EnableUserAuth`，已有能力）。
2. 在反代层对 `/api/auth/register` 临时加 IP 限流（如 Nginx `limit_req`）。

## 建议实现顺序

1. **M0**（可信代理校正）—— 前提，务必先验证通过。
2. **M1**（IP 维度限流）—— 见效最快、风险最低，直接封堵 W1。
3. **M2**（IP 自动封禁 + 后台）—— 本次新增重点，处置顽固攻击源。
4. **M3**（Redis 化）—— 多实例/频繁发版环境必做。
5. **M4 / M5 / M6** —— 按体验排期与监控数据推进。
