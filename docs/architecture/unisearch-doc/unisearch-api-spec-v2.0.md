# UniSearch API 接口文档 v2.0（前后端对齐）

**版本**：v2.0
**日期**：2026-09-30
**代码基线**：仓库 `https://github.com/liberty1314/UniSearch.git`，commit `4f54d88`
**路由来源**：`backend/api/router.go`、`router_auth.go`、`router_admin.go`、`router_announcement.go`、`router_health.go`（已逐行核对）
**用途**：前后端联调的唯一契约依据；与《开发计划》M1-B-01、M3-F-03 联动（OpenAPI 转正后以 `api/openapi/openapi.yaml` 为准）

---

## 1. 总览

### 1.1 Base URL 与版本策略

| 环境 | Base URL |
|---|---|
| 开发 | `http://localhost:8080/api` |
| 生产 | `https://<host>/api` |

- **现状**：全部接口挂载于 `/api`（无版本号）。
- **目标**（架构 §5.6，开发计划 M2/M3）：引入 `/api/v1`，旧 `/api/*` 路径保留兼容 1 个里程碑，M4 下线（已确认决策 D-6）。
- 前端 `apiClient` 的 `baseURL` 统一为 `/api`（`frontend/src/lib/api.ts:46`），版本切换时只改一处。

### 1.2 权限等级

| 标记 | 说明 |
|---|---|
| 公开 | 无需 token |
| 可选鉴权 | `SearchJWTMiddleware`：不带 token 可访问，携带有效 token 则绑定用户身份（审计、配额按用户记） |
| JWT | 需 `Authorization: Bearer <access_token>` |
| 管理员 | JWT + `role=admin`（`AdminMiddleware`） |

---

## 2. 认证与授权

### 2.1 Token 机制（现状，已核对 `controller/auth_controller.go`、`refresh_token_handler.go`）

- 登录成功返回 `access_token`（JWT，短期）+ `expires_at`（Unix 时间戳）。
- Refresh token 通过 httpOnly cookie 下发，刷新/吊销接口要求 **同源**（`EnforceSameOriginMiddleware`）。
- 改密 / 封禁 / 解禁时用户表的 `token_version` 自增，已签发 access token 批量失效。
- 登录限流：`loginRateLimitMiddleware`；注册限流 + 熔断：`registerRateLimitMiddleware` + `SignupCircuitBreakerMiddleware`；注册封禁检查：`SignupBanGuardMiddleware`。

### 2.2 统一登录（已确认决策 D-11）

- 前后台统一登录地址 `/login`，**不再设**“普通用户/管理员”切换按钮；身份由后端按账户 `role` 判断。
- 遗留接口 `POST /api/admin/login`、`POST /api/admin/login-remember` 标记为 **已废弃**，M4 下线（开发计划 M4-B-03），新代码一律使用 `POST /api/auth/login`。

---

## 3. 通用约定

### 3.1 成功响应

业务成功统一使用 `model.Response`（`backend/model/response.go:157`）：

```json
{ "code": 0, "message": "success", "data": { ... } }
```

### 3.2 错误响应（现状两套，M1-B-01 统一）

现状并存（已核对源码）：

1. `api/error_response.go`：`{ "code": <http状态码>, "message": "...", "error_code": "snake_case 稳定业务码", "request_id": "..." }`
2. `model.NewErrorResponse`：`{ "code": <业务码>, "message": "..." }`

**目标格式**（M1-B-01 实施）：`{ "code": <http语义码>, "message": "...", "error_code": "...", "data": null, "trace_id": "..." }`。
前端 `AppError` 按目标格式解析，兼容期同时兼容两套旧格式。

### 3.3 通用规则

- 时间字段：RFC3339 / ISO8601 字符串；`expires_at` 例外，为 Unix 秒时间戳。
- 分页：`page`（从 1 起）、`page_size`；列表响应含 `total`。
- 字符集 UTF-8；请求体大小受 `BodySizeLimitMiddleware` 限制，超限返回 413 `请求体过大`。
- 所有管理端写操作（POST/PUT/DELETE/PATCH）自动记操作审计（`AdminAuditMiddleware`），只读方法跳过。

---

## 4. 接口清单总表

### 4.1 认证 `/api/auth/*`

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 公开（限流+熔断） | 用户注册 |
| GET | `/api/auth/check-username` | 公开（限流） | 注册时用户名可用性检查 |
| POST | `/api/auth/login` | 公开（限流） | 登录（前后台统一入口） |
| GET | `/api/auth/validate` | JWT | 校验 token 有效性 |
| POST | `/api/auth/refresh` | 同源 | 刷新 access token |
| POST | `/api/auth/revoke` | 同源 | 吊销 refresh token |
| POST | `/api/auth/verify` | 公开 | 验证码/令牌核验 |
| POST | `/api/auth/logout` | 同源 | 退出登录 |
| POST | `/api/admin/login` | 公开 | ⚠️ 已废弃，用 `/api/auth/login` |
| POST | `/api/admin/login-remember` | 公开 | ⚠️ 已废弃，用 `/api/auth/login` |

### 4.2 用户 `/api/user/*`（JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/user/me` | 当前用户信息 |
| POST | `/api/user/change-password` | 修改密码 |

### 4.3 搜索与资源

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET/POST | `/api/search` | 可选鉴权 | 同步搜索 |
| POST | `/api/search/progressive` | 可选鉴权 | SSE 渐进式搜索（见 §9） |
| POST | `/api/resources/resolve` | 可选鉴权 | 资源链接按需解析 |
| POST | `/api/resources/scan-transfer/refresh` | 可选鉴权 | 扫码转存状态刷新 |

### 4.4 热榜与公告

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/hot` | 公开 | 热门榜单 |
| GET | `/api/announcements/active` | JWT | 生效中的公告（前台展示） |

### 4.5 公开接口

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/health` | 公开 | 健康检查（M4 拆分为 `/healthz` + `/readyz`） |
| GET | `/api/system-settings` | 公开 | 公开系统设置（前台读取开关类配置） |
| GET | `/api/system-settings/announcement-enabled` | 公开 | 公告功能总开关 |

### 4.6 管理端 `/api/admin/*`（JWT + 管理员）

用户管理（10）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/users` | 用户列表（分页/筛选） |
| GET | `/api/admin/users/stats` | 用户统计 |
| GET | `/api/admin/users/:id` | 用户详情 |
| POST | `/api/admin/users` | 创建用户 |
| PUT | `/api/admin/users/:id` | 更新用户 |
| POST | `/api/admin/users/:id/reset-password` | 重置密码 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| POST | `/api/admin/users/:id/status` | 启用/禁用 |
| POST | `/api/admin/users/batch-delete` | 批量删除 |
| POST | `/api/admin/users/batch-update-role` | 批量更新角色 |

系统与可观测（10）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/system-info` | 系统信息总览 |
| GET | `/api/admin/search-observability` | 搜索可观测数据 |
| GET | `/api/admin/resource-resolve/metrics` | 资源解析指标 |
| GET | `/api/admin/plugin-metrics` | 插件指标列表 |
| GET | `/api/admin/plugin-metrics/errors` | 插件错误日志 |
| GET | `/api/admin/plugin-metrics/realtime` | 插件实时指标 |
| GET | `/api/admin/channel-metrics` | 频道指标列表 |
| GET | `/api/admin/channel-metrics/errors` | 频道错误日志 |
| GET | `/api/admin/channel-metrics/realtime` | 频道实时指标 |
| GET | `/api/admin/plugin-center/catalog` | 插件中心目录 |

内容运营（11）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/admin/tags` | 标签列表 / 创建 |
| PUT/DELETE | `/api/admin/tags/:id` | 标签更新 / 删除 |
| GET/POST | `/api/admin/banned-ips` | 封禁 IP 列表 / 新增 |
| DELETE | `/api/admin/banned-ips/:id` | 解封 IP |
| GET/DELETE | `/api/admin/search-audit` | 搜索审计查询 / 清理 |
| GET/DELETE | `/api/admin/admin-audit` | 操作审计查询 / 清理 |

插件运维（5）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PUT | `/api/admin/plugins/:pluginName/config` | 插件运行时配置读取 / 保存 |
| POST | `/api/admin/plugins/:pluginName/test` | 插件连通性测试 |
| POST | `/api/admin/plugins/:pluginName/status` | 插件启用/禁用 |
| POST | `/api/admin/plugins/batch-status` | 批量启停 |

系统设置（10）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PUT | `/api/admin/system-settings` | 系统设置读取 / 更新 |
| GET/PUT | `/api/admin/system-settings/cache` | 缓存设置 |
| POST | `/api/admin/system-settings/cache/hot-ranking/preload` | 触发热榜预热 |
| DELETE | `/api/admin/system-settings/cache/hot-ranking` | 清空热榜缓存 |
| GET/PUT | `/api/admin/system-settings/runtime` | 运行时设置 |
| GET/PUT | `/api/admin/system-settings/tmdb` | TMDB 设置 |

TG 频道（8）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/admin/channels` | 频道列表 / 新增 |
| PUT | `/api/admin/channels/batch` | 批量更新 |
| POST | `/api/admin/channels/batch-status` | 批量启停 |
| POST | `/api/admin/channels/batch-delete` | 批量删除 |
| PUT/DELETE | `/api/admin/channels/:id` | 频道更新 / 删除 |
| POST | `/api/admin/channels/:name/test` | 频道连通性测试 |

公告管理（6，挂载于 `/api/announcements`，JWT + 管理员）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/announcements` | 公告列表（管理） |
| POST | `/api/announcements` | 创建公告 |
| GET/PUT/DELETE | `/api/announcements/:id` | 公告详情 / 更新 / 删除 |
| POST | `/api/announcements/:id/status` | 公告启用/禁用 |
| POST | `/api/system-settings/announcement-enabled` | 公告功能总开关（管理） |

---

## 5. 核心接口详解

### 5.1 POST /api/auth/register（注册）

请求体（已核对 `controller/auth_controller.go:35`）：

```json
{
  "username": "zhangsan",
  "password": "********",
  "captcha_token": "可选，人机验证令牌（是否必填由后台开关运行时决定）"
}
```

约束：`username` 必填（唯一，最大 32 字符）；`password` 必填。成功返回 `model.Response`（code=0）。

错误码示例：`username_taken`（用户名已存在）、`signup_disabled`（注册关闭/熔断中）、`invalid_captcha`。

### 5.2 POST /api/auth/login（登录）

请求体（已核对 `controller/auth_controller.go:42`）：

```json
{
  "username": "zhangsan",
  "password": "********",
  "remember_me": false,
  "device_fingerprint": "可选"
}
```

成功响应（已核对 `controller/auth_controller.go:50`）：

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_at": 1759291200,
    "username": "zhangsan",
    "user": {
      "id": 1,
      "username": "zhangsan",
      "role": "admin",
      "is_enabled": true,
      "last_login_at": "2026-09-30T08:00:00Z"
    }
  }
}
```

前端登录后：`access_token` 存内存（+ 可选持久化），后续请求带 `Authorization: Bearer`；`role` 决定头像菜单是否显示“管理后台”入口（D-12）。

### 5.3 GET /api/auth/check-username

- 查询参数：`?username=zhangsan`
- 返回：`{ "code": 0, "data": { "available": true } }`（字段以代码为准，见未核实项）

### 5.4 POST /api/auth/refresh · /revoke · /logout

- `/refresh`：同源 + httpOnly cookie，返回新的 `access_token` 与 `expires_at`。
- `/revoke`：吊销当前 refresh token。
- `/logout`：同源；返回 `{ "message": "退出成功" }`（已核对 `auth_handler.go:37`）。

### 5.5 GET/POST /api/search（同步搜索）

GET 查询参数（已核对 `search_request_parser.go:63`）：

| 参数 | 说明 |
|---|---|
| `kw` | 关键词（必填，最大 128 字符，按 rune 计） |
| `channels` | 逗号分隔的 TG 频道名 |
| `conc` | 并发数（可选整数） |
| `refresh` | `true` 强制刷新缓存 |
| `res` | 结果类型筛选 |
| `src` | 来源类型筛选 |
| `plugins` | 逗号分隔的插件名 |
| `cloud_types` | 逗号分隔的网盘类型（11 类） |
| `ext` | 扩展 JSON（白名单键：`sidhub_base_url`、`title_en`、`search`、`debug`；≤8192 字节，≤16 个键） |
| `filter` | 高级筛选 JSON |

POST 请求体为同名字段的 JSON 对象。

成功响应（已核对 `model/response.go:146`）：

```json
{
  "total": 128,
  "resources": [
    {
      "id": "res_001",
      "title": "流浪地球 2 (2023)",
      "description": "...",
      "source": { "type": "plugin", "id": "panwiki", "name": "盘Wiki" },
      "media_type": "movie",
      "target_type": "video",
      "links": [
        {
          "type": "quark",
          "url": "https://pan.quark.cn/s/xxxx",
          "password": "abcd",
          "access_mode": "public",
          "resolution": { "status": "pending", "token": "...", "expires_at": "..." }
        }
      ],
      "capabilities": { "...": true },
      "actions": [{ "...": "..." }],
      "tags": ["科幻"],
      "published_at": "2026-09-01T00:00:00Z"
    }
  ],
  "facets": {
    "cloud_types": { "quark": 40, "baidu": 30 },
    "source_types": { "plugin": 90, "tg": 38 },
    "media_types": { "movie": 100 },
    "target_types": { "video": 120 },
    "capabilities": {},
    "action_types": {}
  },
  "warnings": [{ "source": "weibo", "message": "请求超时，已跳过" }]
}
```

说明：
- 响应载体统一为 `ResourceObject`（`model/response.go:105`），`links` 为“统一资源协议”链接数组。
- `resolution.status=pending` 表示需调用 `POST /api/resources/resolve` 按需解析（token 有过期时间）。
- `warnings` 为非致命的搜索源失败，前端应弱提示而非报错。

### 5.6 GET /api/hot（热榜）

查询参数（已核对 `hot_ranking_handler.go:17`）：

| 参数 | 说明 |
|---|---|
| `mode` | 榜单模式（`NormalizeHotRankingMode` 归一化） |
| `period` | 时间维度：日/周/月 |
| `category` | 内容分类（D-10：**不按资源类型筛选**） |
| `sort_by` | 排序字段 |
| `date` / `week_start` / `month` / `year` | 时间锚点 |
| `page` / `page_size` | 分页 |

非法枚举值由 `Normalize*` 函数归一化为默认值，`ValidateHotRankingQuery` 兜底校验。

### 5.7 公告模型

`Announcement`（已核对 `model/announcement.go`）：

```json
{
  "id": 1,
  "title": "系统维护通知",
  "content": "Markdown 格式正文",
  "priority": "high",
  "start_time": "2026-10-01T00:00:00Z",
  "end_time": null,
  "is_enabled": true,
  "created_at": "...",
  "updated_at": "...",
  "created_by": "admin",
  "updated_by": "admin"
}
```

- `priority`：`high` / `medium` / `low`，默认 `medium`。
- `end_time` 为 null 表示永久有效；`GET /api/announcements/active` 只返回当前生效且启用的公告。

### 5.8 用户模型

`User`（已核对 `model/user.go`，JSON 序列化）：

```json
{
  "id": 1,
  "username": "zhangsan",
  "role": "admin",
  "is_enabled": true,
  "last_login_at": "2026-09-30T08:00:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

`password_hash`、`token_version`、`deleted_at` 不序列化。

---

## 6. SSE 渐进式搜索：POST /api/search/progressive

- 请求：与 `POST /api/search` 相同的 JSON 体。
- 响应：`Content-Type: text/event-stream`，事件流逐插件/逐批次推送 `ResourceObject` 增量结果，最后发送结束事件。
- 前端接入：`apiClient.stream()`（开发计划 M1-F-02），注意断线重连与去重（按 `resource.id` 去重）。

---

## 7. 管理端通用约定

- 列表接口统一支持 `page`、`page_size`、`q`（关键词）；响应形如 `{ "code": 0, "data": { "total": N, "items": [...] } }`（具体字段以 handler 为准，OpenAPI 转正后以 yaml 为准）。
- 批量接口请求体为 `{ "ids": [...] }`；批量启停为 `{ "ids": [...], "enabled": true }`。
- 危险操作（删除、批量删除、清空审计、清空缓存）前端必须二次确认；后端已记操作审计。
- 各管理接口的 DTO 以 `backend/api/*_handler.go` 为准；M3-F-03（OpenAPI 全覆盖 + CI 防漂移）完成后以 `api/openapi/openapi.yaml` 为准。

---

## 8. 前后端映射表

| 前端 service（`frontend/src/services/`） | 对应后端接口域 | 说明 |
|---|---|---|
| `authService.ts` | §4.1 认证 | 登录/注册/刷新/退出；token 存取 |
| `userService.ts` | §4.2 用户 + `/api/admin/users` | 个人中心与后台用户管理共用 |
| `searchService.ts` | §4.3 搜索与资源 | 含 `POST /api/search/progressive` SSE |
| `hotRankingService.ts` | §4.4 `/api/hot` | 热榜筛选口径 |
| `announcementService.ts` | §4.4 + §4.6 公告 | 前台 active 与后台管理 |
| `systemSettingsService.ts` | §4.5 + §4.6 系统设置 | 公开读 + 管理写 |
| `bannedIPService.ts` | §4.6 封禁 IP | |
| `searchAuditService.ts` | §4.6 搜索审计 | |
| `adminAuditService.ts` | §4.6 操作审计 | |

前端 HTTP 统一走 `lib/api.ts`（`baseURL: '/api'`）→ M1 收敛为 `lib/apiClient.ts`（开发计划 M1-F-01）。**禁止**在组件/hook 中直接 `fetch(`，ESLint 规则强制。

---

## 9. 版本迁移对照（/api → /api/v1）

| 阶段 | 后端 | 前端 |
|---|---|---|
| M1 | 错误响应统一 + 兼容层（M1-B-01） | `AppError` 兼容新旧两套格式 |
| M2/M3 | 新增 `/api/v1` 路由组，老路径 301/307 转发或双挂载 | `apiClient` 的 `baseURL` 可配置，一处切换 |
| M4 | 老路径返回 410 Gone 一个版本后移除；`/api/admin/login*` 下线（M4-B-03） | 无老路径引用（grep 门禁） |

---

## 10. 未核实项

1. `GET /api/auth/check-username` 的成功响应字段名未逐行核对 handler，以代码为准。
2. `/api/search` 的 `SearchJWTMiddleware` 在 token 缺失/失效时的精确行为（放行 vs 401）未完全确认，联调时以实际为准。
3. 管理端列表接口的分页包络字段名（`items` vs `list`）各 handler 不完全一致，M3-F-03 OpenAPI 全覆盖后统一。
4. SSE 结束事件的具体事件名未核对 `search_progressive_handler.go`，前端实现时需对照。

---

## 11. 修订记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v2.0 | 2026-09-30 | 初版：路由表逐行核对 commit 4f54d88；核心接口给出已核对的请求/响应 schema |
