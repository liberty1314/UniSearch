# 注册功能防刷（反恶意注册）设计方案

> 目标：治理生产环境的恶意批量注册，通过多层限制降低机器注册的可行性与成本，同时不误伤正常用户。

## 1. 背景与问题

生产环境出现恶意批量注册。审阅当前实现后，注册接口 `POST /api/auth/register` 存在以下可被利用的弱点：

| # | 弱点 | 位置 | 影响 |
|---|------|------|------|
| W1 | 限流 key 为 `IP + username` 拼接，同一 IP 换不同用户名即产生不同 key，各自独立计数 | `backend/api/rate_limiter.go:81-90`、`registerRateLimitKeyResolver:110-125` | 同一 IP 可高频注册海量不同账号，注册限流形同虚设 |
| W2 | 限流器为纯内存实现（`map + sync.Mutex`），非 Redis | `rate_limiter.go:16-30` | 多实例部署时各实例独立计数，且进程重启即清零，攻击者可借重启/负载均衡绕过 |
| W3 | 无任何人机验证（图形/滑块/邮箱/短信验证码） | 全局缺失 | 脚本可无成本自动化注册 |
| W4 | 注册接口在公开白名单中，且注册即自动登录发 Token | `middleware.go` `isPublicPath`、`auth_controller.go` | 攻击面完全暴露，注册成功即获得可用账号 |
| W5 | 缺少 IP 维度的独立总量限制与全局注册总量熔断 | 全局缺失 | 无法在遭遇分布式注册时兜底 |
| W6 | 无任何 IP 封禁 / 黑名单能力，管理员无法处置确认作恶的 IP | 全局缺失（无 model/service/后台入口） | 对顽固攻击源只能靠限流"降速"，窗口过后攻击者可继续；无长时封堵与人工干预手段 |

其中 **W1 是当前最严重的漏洞**：限流以 `IP|username` 整体为 key，导致"同 IP 不同用户名"绕过了注册频率限制。

> 说明：系统当前**完全没有任何 IP 存储、黑名单或封禁能力**（已确认无相关表/逻辑），限流器仅是内存态的"临时降速"，窗口滑过即恢复。本次新增的 IP 自动封禁（L1.5）需从零构建持久化 + 后台管理能力。

## 2. 设计目标

- **有效性**：显著提升批量注册成本，单 IP / 单网段的注册速率被硬性约束。
- **不误伤**：正常用户（含 NAT / 校园网 / 公司出口共享 IP 场景）注册体验基本无感。
- **可运维**：限制阈值可配置、可通过后台开关快速调整；具备可观测性（日志/指标）。
- **可回退**：所有新增限制均可通过配置或系统开关关闭，出现误杀可快速止血。
- **渐进式**：分阶段落地，先堵住最严重的 W1/W2，再引入人机验证。

## 3. 方案总览（分层防护）

```
请求进入
  │
  ├─ L0 已有：Body 大小限制 / bcrypt / 用户枚举防护（保留）
  │
  ├─ L1  IP 维度限流（修复 W1）——按纯 IP 计数，不再拼接 username
  │
  ├─ L1.5 IP 自动封禁 + 后台管理（修复 W6）——同 IP 短时注册过多则封禁，命中即拒绝
  │
  ├─ L2  限流状态落 Redis（修复 W2）——多实例共享、重启不丢
  │
  ├─ L3  人机验证（修复 W3）——图形/滑块验证码，注册必过
  │
  ├─ L4  全局注册熔断（修复 W5）——单位时间全站注册总量上限，超限临时关闭注册
  │
  └─ L5  注册开关（已有）——管理员一键关停（应急兜底）
```

落地优先级：**L1 > L1.5 > L2 > L4 > L3 > 监控**（L1/L1.5/L2 见效快、风险低，优先上线；L3 涉及前端与体验，单独排期）。

> L1 与 L1.5 的分工：L1 是"降速"（超限只临时拒绝当前请求，窗口过后自动恢复）；L1.5 是"封禁"（对确认高频作恶的 IP 记录到持久化名单，在封禁时长内一律拒绝，并支持后台人工增删查）。两者互补——L1 挡日常突发，L1.5 处置顽固攻击源。

---

## 4. 详细设计

### L1：修复限流 key —— 改为 IP 维度独立计数（P0，必做）

**问题**：`registerRateLimitKeyResolver` 把 username 拼进 key，导致同 IP 不同用户名各自独立限流。

**方案**：注册限流改为**双维度**，任一超限即拒绝：

1. **IP 维度**（新增，核心）：key 仅为 `ClientIP`，不含 username。这样同一 IP 无论换多少用户名，都受同一计数器约束。
2. **IP+username 维度**（保留原有）：防止针对单一目标用户名的撞注册。

建议阈值（可配置）：

| 维度 | 窗口 | 上限 | 说明 |
|------|------|------|------|
| IP | 1 分钟 | 5 次 | 短时突发防护 |
| IP | 1 小时 | 20 次 | 中长期总量约束，抑制慢速刷号 |

> NAT/共享出口场景：1 小时 20 次对正常用户足够（正常人极少 1 小时内注册 20 个账号），同时能挡住脚本。阈值以配置暴露，上线后按监控数据调优。

**实现要点**：
- 在 `rate_limiter.go` 新增按纯 IP 计数的限流器实例，例如：
  ```go
  signupIPPerMinuteRateLimiter = NewRateLimiter(5, time.Minute)
  signupIPPerHourRateLimiter   = NewRateLimiter(20, time.Hour)
  ```
- `registerRateLimitMiddleware` 中依次检查：IP/分钟、IP/小时、IP+username/分钟（保留原 `signupRateLimiter`）。任一不通过即 `denyAuthEntryRateLimit`。
- `ClientIP` 依赖 Gin 的 `TrustedProxies` 配置正确，否则反代场景下取到的是网关 IP。**必须确认 `router` 已正确设置可信代理**（否则所有请求同一 IP，L1 会误伤全部用户）。这是 L1 上线前的强制检查项。

**正确获取真实 IP（前置依赖）**：
- 确认生产反向代理（Nginx/网关）透传 `X-Forwarded-For`；
- Gin 侧设置 `engine.SetTrustedProxies([...])` 或 `TrustedPlatform`，保证 `c.ClientIP()` 取到的是客户端真实 IP 而非反代 IP。

### L1.5：IP 自动封禁 + 后台管理（P0/P1，本次新增重点）

**问题（W6）**：L1 限流只是"临时降速"——超限仅拒绝当前请求，窗口滑过后攻击者可继续。对已确认作恶的 IP，缺少"持续封堵 + 人工处置"手段。系统当前**完全没有 IP 存储/黑名单/封禁能力**，需从零构建。

**方案**：在限流之上增加一层可持久化、可后台管理的 IP 封禁。分两部分：

#### (1) 自动封禁触发

- 复用 L1 的 IP 维度计数：当某 IP 在**触发窗口**内注册请求（或被限流拒绝）次数超过**封禁阈值**时，自动将该 IP 写入封禁名单，设定**封禁时长**。
- 建议默认值（均可配置）：
  | 参数 | 默认 | 说明 |
  |------|------|------|
  | 触发窗口 | 10 分钟 | 统计作恶行为的时间窗 |
  | 封禁阈值 | 30 次 | 窗口内注册请求数超过即封禁 |
  | 封禁时长 | 24 小时 | 自动封禁的默认时长，到期自动解封 |
- 触发阈值应**明显高于 L1 的正常限流阈值**（L1 已挡住日常突发），确保只有持续、明显的攻击行为才升级为封禁，降低误封。

#### (2) 封禁命中拦截（中间件）

- 新增全局中间件（挂在 `router.go` 全局中间件链，位于限流器同层或之前），对每个请求用 `c.ClientIP()` 查封禁名单：命中且未过期则直接 `403` 拒绝，返回统一提示（如"您的访问已被限制，如有疑问请联系管理员"）。
- **命中检查必须高性能**：封禁名单加载到内存/Redis，避免每请求查库。推荐 Redis key `banned_ip:{ip}` + TTL（到期自动消失，天然实现自动解封），DB 作为持久化与后台管理的数据源；服务启动时从 DB 预热到 Redis。
- 中间件作用范围：至少覆盖注册/登录等公开入口；是否对全站生效由配置决定（全站生效防护更强，但误封影响面更大，默认建议仅覆盖 auth 相关公开接口）。

#### (3) 数据模型

新建 `backend/model/banned_ip.go`（加入 `database/migration.go` 的 `AutoMigrate` 列表；本项目迁移通过独立 `cmd/migrate` 执行，不随启动自动迁移）：

```go
type BannedIP struct {
    ID        uint       `gorm:"primaryKey" json:"id"`
    IP        string     `gorm:"size:64;not null;uniqueIndex" json:"ip"`
    Reason    string     `gorm:"size:255;not null;default:''" json:"reason"`     // 封禁原因（自动/手动）
    Source    string     `gorm:"size:32;not null;default:'auto'" json:"source"`  // auto | manual
    ExpiresAt *time.Time `json:"expires_at"`                                     // 为空表示永久封禁
    CreatedBy string     `gorm:"size:64;not null;default:''" json:"created_by"`  // 手动封禁时记录管理员
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}
```

#### (4) 后台管理

仿现有 `AdminTag`（`model` + 独立 `service` + 包级 handler 注入 + `/api/admin` 路由）与 `AdminUsersView`（前端列表+对话框）模式：

- **后端**：
  - `backend/service/banned_ip_service.go`：`List / Create / Delete / (可选)Update`，写操作同步更新 Redis 缓存。
  - `backend/api/banned_ip_handler.go`：包级 service + `SetBannedIPService()` 注入。
  - `router_admin.go` 下 `admin.Group("/banned-ips")` 注册 CRUD，天然受 `JWTMiddleware + AdminMiddleware` 保护。
  - `router_deps.go` / `bootstrap/app.go` 增加依赖装配。
- **管理能力**：查看封禁列表（IP/原因/来源/到期时间/分页/搜索）、手动封禁（支持永久或指定时长）、手动解封（删除记录并清 Redis）。
- **前端**：`lib/adminRoute.ts` 加 view id、`Sidebar.tsx` 加导航项、`Admin.tsx` 懒加载+条件渲染，新建 `BannedIPView.tsx`（仿 `AdminUsersView.tsx`：统计卡 + 表格 + 搜索 + 封禁/解封对话框）。

**开关与回退**：新增 `SIGNUP_AUTOBAN_ENABLED`（system_settings，见配置表；默认可先关，观察监控后再开启自动封禁），关闭时仅保留 L1 限流与手动封禁能力。误封时管理员可后台一键解封。

### L2：限流状态落 Redis（P0/P1）

**问题**：内存限流多实例不共享、重启清零。

**方案**：将限流计数迁移到 Redis（项目已引入 `github.com/redis/go-redis/v9`，配置 `REDIS_*` 已存在）。

- 采用**固定窗口 + 原子计数**（简单可靠）：
  - key：`ratelimit:signup:ip:{ip}:{yyyymmddHHmm}`（分钟窗口）、`...:{yyyymmddHH}`（小时窗口）。
  - 操作：`INCR` + 首次 `EXPIRE`（窗口时长）。`INCR` 返回值 > 阈值即拒绝。
  - 可用 Lua 脚本保证 `INCR`+`EXPIRE` 原子性，避免 key 无过期时间的泄漏。
- 定义 `RateLimiterStore` 接口，内存实现（现状）与 Redis 实现均满足：
  ```go
  type RateLimiterStore interface {
      Allow(ctx, key string, limit int, window time.Duration) (bool, time.Duration, error)
  }
  ```
- **降级策略**：Redis 不可用时，回退到内存限流器（当前实现），保证注册不因缓存故障而全挂；同时打点告警。降级期间安全性下降，接受此权衡（可用性优先），并记录日志。

> 若近期不部署多实例、也不频繁重启，L2 可延后；但只要生产是多副本或经常发版，L2 必须与 L1 同步落地，否则 L1 效果被稀释。

### L3：人机验证 / 验证码（P1）

**问题**：无人机验证，脚本零成本注册。

**候选方案对比**：

| 方案 | 拦截力 | 用户体验 | 成本/依赖 | 建议 |
|------|--------|----------|-----------|------|
| 图形验证码（自建，如 base64Captcha） | 中 | 中（需输入） | 低，无第三方 | 起步可选，纯本地无外部依赖 |
| 滑块/行为验证码（自建或开源） | 中高 | 好 | 中 | 体验优先时选 |
| Cloudflare Turnstile / hCaptcha | 高 | 好（多数无感） | 依赖第三方、需公网 | 推荐，若可接入外部服务 |
| Google reCAPTCHA v3 | 高 | 无感（打分） | 依赖 Google，国内可用性存疑 | 视部署地域决定 |

**推荐**：优先 **Cloudflare Turnstile**（无感、拦截强、免费）；若因合规/网络无法引入第三方，则用**自建图形验证码**（Go 侧 base64Captcha 生成，验证码 ID + 答案存 Redis 短 TTL）。

**接入流程（以 Turnstile 为例）**：
1. 前端 `RegisterPage.tsx` 注册表单嵌入验证组件，提交时带上 token。
2. `RegisterRequest` 增加字段 `captcha_token`（`binding:"required"`，受开关控制）。
3. 后端在 `Register` 控制器/中间件中先校验 token（服务端向验证服务校验），失败返回 400。
4. 校验通过再进入既有注册逻辑。

**开关**：新增系统设置 `EnableSignupCaptcha`（默认 false，灰度开启），可后台一键切换；关闭时后端不强制校验、前端不渲染。

### L4：全局注册熔断（P2，兜底）

**问题**：分布式 IP 注册（代理池/肉鸡）可绕过单 IP 限制。

**方案**：全站单位时间注册成功总量阈值。

- Redis 计数 `ratelimit:signup:global:{yyyymmddHH}`，每次注册成功 `INCR`。
- 超过阈值（如 200/小时，按业务实际调）时，**临时进入熔断态**：新注册直接拒绝并返回"注册繁忙，请稍后再试"，持续时长可配置（如 10 分钟）。
- 熔断触发写告警日志/指标，通知管理员介入（可结合 L5 手动关停）。
- 阈值需结合正常业务峰值设定，避免误伤（先观察监控再定值）。

### L5：注册开关（已有，应急兜底）

已实现 `EnableUserAuth` / `EnableUserSignup`（`system_settings`），管理员可后台一键关停注册。作为遭遇大规模攻击时的**最后手段**保留，无需改动。

---

## 5. 配置项设计

新增配置（`.env` / `config` + 部分入 `system_settings` 便于后台热调）：

| 配置 | 载体 | 默认 | 说明 |
|------|------|------|------|
| `SIGNUP_IP_LIMIT_PER_MIN` | config/env | 5 | IP 每分钟注册上限 |
| `SIGNUP_IP_LIMIT_PER_HOUR` | config/env | 20 | IP 每小时注册上限 |
| `SIGNUP_RATE_LIMIT_USE_REDIS` | config/env | true | 是否用 Redis 存限流状态 |
| `SIGNUP_AUTOBAN_ENABLED` | system_settings | true | 是否启用 IP 自动封禁 |
| `SIGNUP_AUTOBAN_THRESHOLD` | system_settings | 30 | 触发自动封禁的阈值（次） |
| `SIGNUP_AUTOBAN_WINDOW_MIN` | system_settings | 10 | 触发窗口（分钟） |
| `SIGNUP_AUTOBAN_DURATION_MIN` | system_settings | 1440 | 默认封禁时长（分钟，0=永久） |
| `EnableSignupCaptcha` | system_settings | false | 是否强制注册验证码 |
| `SignupCaptchaProvider` | system_settings/env | turnstile | 验证码提供方 |
| `SIGNUP_GLOBAL_LIMIT_PER_HOUR` | config/env | 200 | 全站每小时注册熔断阈值 |

> 阈值型配置尽量走 `system_settings`，让管理员在后台 `AccountAccessSettingsPanel` 中调整，无需重新发版。

## 6. 可观测性

- **日志**：注册被限流时记录 `IP、维度、命中的限流器、retryAfter`；熔断触发单独告警级别日志。
- **指标**（若已有 metrics 体系）：`signup_attempt_total`、`signup_blocked_total{reason=ip_min|ip_hour|captcha|global}`、`signup_success_total`。
- **告警**：`signup_blocked_total` 突增或熔断触发时通知管理员。

## 7. 分阶段落地计划

| 阶段 | 内容 | 优先级 | 风险 | 可回退 |
|------|------|--------|------|--------|
| P0-a | 确认并修正 `TrustedProxies`，保证 `ClientIP` 真实 | 最高 | 低 | 配置回退 |
| P0-b | L1：注册限流改 IP 维度双窗口（修复 W1） | 最高 | 低 | 阈值调大/关限流 |
| P0-c | L1.5：IP 自动封禁 + 后台管理（修复 W6） | 高 | 中 | `SIGNUP_AUTOBAN_ENABLED=false` / 后台解封 |
| P1-a | L2：限流状态落 Redis + 降级（修复 W2） | 高 | 中 | 回退内存实现 |
| P1-b | L3：接入验证码（默认关，灰度开）（修复 W3） | 高 | 中（前端体验） | `EnableSignupCaptcha=false` |
| P2 | L4：全局注册熔断（修复 W5） | 中 | 中 | 阈值调大/关熔断 |
| 持续 | 监控指标 + 告警 | 中 | 低 | — |

**应急建议**：在 P0 上线前，如攻击正在发生，可先用 L5（后台关闭注册）止血，或在反代层对注册接口临时加 IP 限流（如 Nginx `limit_req`）作为临时兜底。

## 8. 影响的文件（预估）

- `backend/api/rate_limiter.go`：新增 IP 维度限流器、Redis store 接口与实现、注册中间件多维度校验；IP/小时超限时触发 L1.5 自动封禁。
- `backend/model/banned_ip.go`（新建）：`BannedIP` 模型，加入 `database/migration.go` 的 `AutoMigrate` 列表。
- `backend/service/banned_ip_service.go`（新建）：封禁名单 CRUD + Redis 缓存同步 + 启动预热。
- `backend/api/banned_ip_handler.go`（新建）：后台封禁管理 handler；`router_admin.go` 注册 `/admin/banned-ips` CRUD；`router.go` 注入 + 全局命中中间件；`router_deps.go`、`bootstrap/app.go` 装配。
- `frontend/src/lib/adminRoute.ts`、`Sidebar.tsx`、`pages/Admin.tsx`、新建 `BannedIPView.tsx`：后台 IP 封禁管理页。
- `backend/api/router.go`（或初始化处）：确认 `SetTrustedProxies`。
- `backend/config/*`：新增限流/验证码/熔断相关配置项。
- `backend/api/controller/auth_controller.go`：`RegisterRequest` 增加 `captcha_token`，注册前校验验证码。
- `backend/service/auth_service.go`：注册成功计入全局熔断计数（或在控制器层）。
- `backend/model/system_settings.go` + `system_settings_service.go`：新增 `EnableSignupCaptcha` 等设置项。
- 前端 `frontend/src/pages/RegisterPage.tsx`、`authService.ts`、`AccountAccessSettingsPanel.tsx`：验证码组件、请求字段、后台开关。

## 9. 权衡与注意事项

- **共享出口 IP**：IP 限流对 NAT/校园网可能误伤，故用"较宽的小时窗口 + 分钟突发限制"组合，并将阈值做成可配置，上线后按监控调优。验证码作为进一步区分人机的手段，可降低对 IP 阈值的依赖。
- **Redis 依赖**：引入 Redis 限流后，Redis 故障需降级到内存并告警，避免注册全挂。
- **第三方验证码**：Turnstile/reCAPTCHA 依赖公网与外部服务，需评估部署地域网络可达性与合规；不可用时以自建图形验证码兜底。
- **可信代理配置错误的风险**：若 `TrustedProxies` 配置不当，`ClientIP` 会取成反代 IP，导致所有用户共用一个计数器被集体限流——L1 上线前必须验证真实 IP 获取正确。
```
