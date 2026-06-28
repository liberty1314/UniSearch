# UniSearch 安全与质量优化开发计划

生成时间：2026-06-27  
依据文档：`docs/security-and-quality-optimization-plan-2026-06-27.md`  
计划目标：把安全与质量优化方案拆解为可执行开发任务，确保每一批改动都有明确范围、测试、验收和回滚路径。

## 开发原则

- 先修发布阻断问题，再做体验和运维增强。
- 每个任务包都必须保持可编译、可测试、可回滚。
- 后端改动优先补单元测试和路由集成测试。
- 前端改动优先补 service、hook、路由守卫和关键页面测试。
- 不在同一提交里混合依赖升级、鉴权重构和部署配置大改。
- 不在报告、日志或测试输出中复述真实密钥、token 或密码。

## 里程碑安排

| 里程碑 | 目标 | 任务包 | 出口标准 |
| --- | --- | --- | --- |
| M1 | 消除公网发布阻断 | T1-T5 | 后端测试通过，前端 high audit 通过，插件 Web 管理入口受保护 |
| M2 | 收敛滥用和泄露风险 | T6-T9 | CORS、body 限制、TMDB 掩码、搜索边界全部有测试 |
| M3 | 增强体验与运维基线 | T10-T14 | refresh token 风险缓解、安全头、角色确认、错误治理和发布门禁落地 |

推荐开发顺序：T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14。

## 任务状态

| 任务 | 状态 | 完成记录 |
| --- | --- | --- |
| T1 插件 Web 路由统一鉴权 | 已完成 | 已将插件 Web 路由迁移到后台受保护分组，并通过 `cd backend && go test ./api ./plugin/weibo` 验证。 |
| T2 移除生产默认管理员弱口令 | 已完成 | 已增加生产初始管理员显式配置规则，并通过 `cd backend && go test ./config ./database ./service` 验证。 |
| T3 关键密钥生产强校验 | 已完成 | 已增加生产密钥缺失、占位符、重复值校验，并通过 `cd backend && go test ./api ./config ./database ./service ./plugin/weibo` 验证。 |
| T4 前端依赖漏洞升级 | 已完成 | 已升级前端依赖并通过 `cd frontend && pnpm lint`、`cd frontend && pnpm check`、`cd frontend && pnpm test -- --run`、`cd frontend && pnpm audit --audit-level high` 验证；剩余 1 low/3 moderate 非阻断漏洞。 |
| T5 生产 Docker Compose 模板收敛 | 已完成 | 已新增生产 compose 模板、收敛开发 compose 弱默认，并通过 YAML 解析、静态弱配置检查、`cd backend && go test ./...` 验证；本机缺少 `docker` 命令，未能执行 `docker compose config`。 |
| T6 CORS 白名单化 | 已完成 | 已新增 `ALLOWED_ORIGINS`、生产必填校验和白名单 CORS 中间件，并通过 `cd backend && go test ./api ./config`、`cd backend && go test ./...` 验证。 |
| T7 请求体大小限制与限流读取优化 | 已完成 | 已为认证、搜索和扫码刷新入口增加 body 上限，限流预读改为有限读取，并通过 `cd backend && go test ./api`、`cd backend && go test ./...` 验证。 |
| T8 TMDB token 掩码化 | 已完成 | 已将 TMDB 管理接口改为只返回掩码预览并更新前端状态读取，通过 `cd backend && go test ./api ./service`、`cd frontend && pnpm test -- systemSettingsService useSystemSettingsController --run` 验证。 |
| T9 搜索请求边界、并发与 SeedHub base URL 限制 | 已完成 | 已增加搜索参数边界、修正插件并发取最小语义、限制 SeedHub 自定义 base URL，并通过 `cd backend && go test ./api ./service ./plugin/sidhub`、`cd backend && go test ./...` 验证。 |
| T10 refresh token 存储策略优化 | 已完成 | 已确认并补测刷新令牌轮换、旧令牌撤销、前端 single-flight 写回新令牌，通过 `cd backend && go test ./api ./service`、`cd frontend && pnpm test -- authStore authRefreshManager useAutoRefreshToken --run` 验证。 |
| T11 Nginx 安全响应头 | 已完成 | 已为 Nginx 增加基础安全响应头和 CSP Report-Only；本机缺少 `nginx` 命令未能执行 `nginx -t`，已通过静态规则检查关键头配置。 |
| T12 管理端角色状态重新确认 | 已完成 | 已在 `AdminRoute` 进入后台前调用 `/api/user/me` 确认服务端角色，非管理员或失败会清理状态并跳转，通过 `cd frontend && pnpm test -- RouteGuards useAdminPageController --run`、`cd frontend && pnpm check` 验证。 |
| T13 错误响应与日志治理 | 已完成 | 已为搜索、渐进式搜索和扫码刷新入口增加稳定 `error_code`、`request_id` 和非泄露用户提示，内部错误写结构化日志；同时补充前端错误码映射，通过 `cd backend && go test ./api ./service`、`cd frontend && pnpm test -- api error --run` 验证。 |
| T14 发布门禁与依赖治理 | 已完成 | 已新增发布门禁文档、安装并验证 `govulncheck`，修复 Go 可达依赖漏洞和前端供应链年龄策略阻断；通过 `cd backend && go test ./...`、`cd backend && /Users/abner/go/bin/govulncheck ./...`、`cd frontend && pnpm lint`、`cd frontend && pnpm check`、`cd frontend && pnpm test -- --run`、`cd frontend && pnpm audit --audit-level high` 验证；本机缺少 `docker`/`nginx`，已完成静态补偿检查并记录。 |

## M1：发布阻断修复

### T1 插件 Web 路由统一鉴权

目标：
- 插件 Web 管理入口只能由管理员访问。
- 微博插件不再暴露匿名可操作的 `/weibo/:param` 管理动作。

涉及文件：
- `backend/api/router.go`
- `backend/api/router_admin.go`
- `backend/plugin/plugin.go` 或插件接口定义文件
- `backend/plugin/weibo/weibo.go`
- `backend/api/admin_routes_test.go`
- `backend/plugin/weibo/weibo_test.go`

开发步骤：
1. 新增受保护插件 Web 分组，建议路径为 `/api/admin/plugins/:pluginName/web/*path`。
2. 调整 `PluginWithWebHandler` 注册方式，使插件只接收已带 `JWTMiddleware()` 和 `AdminMiddleware()` 的路由组。
3. 将微博插件 GET/POST 管理页迁移到新路径。
4. 保留旧 `/weibo/:param` GET 时只返回 404 或只读提示，不允许 POST action。
5. 为微博 action 增加管理员上下文校验、action 白名单和关键动作日志。
6. 为二维码刷新、登录检查、测试搜索增加轻量限流。

测试先行清单：
- 匿名 POST 旧 `/weibo/:param` 不会执行 action。
- 匿名访问新插件 Web 路径返回 401。
- 普通用户访问新插件 Web 路径返回 403。
- 管理员访问 `get_status`、`refresh_qrcode`、`set_user_ids`、`logout` 正常。
- 微博插件搜索功能不受路由迁移影响。

验收命令：
- `cd backend && go test ./api ./plugin/weibo`
- `cd backend && go test ./...`

回滚策略：
- 仅回滚路由迁移时，旧路径也必须保持不可执行 POST action；不能恢复匿名管理动作。

### T2 移除生产默认管理员弱口令

目标：
- 生产环境不再创建固定 `admin/admin`。
- 首次初始化必须显式配置管理员账号和强密码。

涉及文件：
- `backend/config/config.go`
- `backend/config/config_auth.go`
- `backend/database/seed.go`
- `backend/service/auth_service.go`
- `backend/database/seed_test.go`
- `backend/service/auth_service_test.go`
- `.env.example`

开发步骤：
1. 增加 `APP_ENV` 配置，默认开发环境，生产环境显式设为 `production`。
2. 增加 `INITIAL_ADMIN_USERNAME` 和 `INITIAL_ADMIN_PASSWORD` 读取逻辑。
3. 生产环境无管理员且缺少初始管理员配置时返回启动错误。
4. 生产环境初始密码必须满足强度与长度校验。
5. 开发环境如继续保留自动管理员，日志不得输出明文密码。
6. 更新 `.env.example` 的初始化说明。

测试先行清单：
- `APP_ENV=production` 且无初始管理员配置时失败。
- `APP_ENV=production` 且密码弱时失败。
- `APP_ENV=production` 且配置强密码时创建管理员。
- 已有管理员时不重复创建。
- 日志不包含明文默认密码。

验收命令：
- `cd backend && go test ./database ./service ./config`
- `cd backend && go test ./...`

回滚策略：
- 如启动失败，应通过补齐初始管理员环境变量恢复，不回滚到固定 `admin/admin`。

### T3 关键密钥生产强校验

目标：
- 生产环境缺少关键密钥时启动失败。
- 开发环境自动密钥使用强随机数。

涉及文件：
- `backend/config/config_auth.go`
- `backend/config/config.go`
- `backend/config/config_auth_test.go`
- `.env.example`

开发步骤：
1. 新增密钥校验函数，覆盖 JWT、刷新令牌加密密钥、主密钥。
2. 生产环境执行必填、长度、占位符、重复值校验。
3. 开发环境使用 `crypto/rand` 生成临时值。
4. 日志只输出配置状态，不输出密钥。
5. 更新 `.env.example`，明确生产必填项。

测试先行清单：
- 生产环境缺少 `AUTH_JWT_SECRET` 失败。
- 生产环境缺少 `REFRESH_TOKEN_ENCRYPT_KEY` 失败。
- 生产环境缺少 `SECRET_MASTER_KEY` 失败。
- 生产环境使用占位符失败。
- 生产环境多个密钥值相同失败。
- 开发环境未配置密钥时可加载。

验收命令：
- `cd backend && go test ./config`
- `cd backend && go test ./...`

回滚策略：
- 生产启动失败时补齐密钥配置；不恢复时间戳派生密钥。

### T4 前端依赖漏洞升级

目标：
- critical/high 级前端依赖漏洞清零。

涉及文件：
- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- 可能受影响的前端测试文件

开发步骤：
1. 使用 `pnpm audit` 明确 high/critical 漏洞对应依赖链。
2. 分组升级运行时依赖：`axios`、`react-router-dom`。
3. 分组升级开发依赖：`vitest`、`vite`、`rollup` 相关链路。
4. 跑前端 lint、typecheck、单测。
5. 修复因 React Router 或 Vitest 升级造成的测试兼容问题。
6. 记录 remaining moderate 漏洞和处理计划。

测试先行清单：
- 路由守卫测试通过。
- 登录、刷新 token、退出登录测试通过。
- 搜索页、资源详情页相关测试通过。
- 系统设置和后台页面测试通过。

验收命令：
- `cd frontend && pnpm install`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm audit --audit-level high`

回滚策略：
- 依赖升级按包分组提交；如出现行为回归，仅回滚对应依赖组。

### T5 生产 Docker Compose 模板收敛

目标：
- 生产模板不暴露 MySQL/Redis，不使用弱默认凭据。

涉及文件：
- `docker-compose.yml`
- `docker-compose.prod.example.yml`
- `.env.example`
- `docs/security-and-quality-optimization-plan-2026-06-27.md` 或部署说明文档

开发步骤：
1. 明确当前 `docker-compose.yml` 是开发配置，补充注释或新增开发文件。
2. 新增 `docker-compose.prod.example.yml`。
3. 生产模板中移除 MySQL、Redis 的宿主机端口映射。
4. 应用数据库用户改为专用账号变量。
5. Redis 增加密码变量和启动参数。
6. `.env.example` 不提供可直接复用弱默认值。
7. 文档提示当前本地 `.env` 中出现过的密钥和 token 需要轮换。

测试先行清单：
- `docker compose config` 通过。
- 生产 compose 模板 config 通过。
- 生产模板不包含 `3306:3306`、`6379:6379`。
- 生产模板不包含 root/root 或空 Redis 密码默认值。

验收命令：
- `docker compose config`
- `docker compose -f docker-compose.prod.example.yml config`
- `cd backend && go test ./...`

回滚策略：
- 保留开发 compose 可用；生产模板变更可单独回滚，不影响应用代码。

## M2：风险收敛

### T6 CORS 白名单化

目标：
- 生产环境不再返回 `Access-Control-Allow-Origin: *`。

涉及文件：
- `backend/config/config.go`
- `backend/config/config_env.go`
- `backend/api/middleware.go`
- `backend/api/middleware_test.go`
- `.env.example`

开发步骤：
1. 增加 `ALLOWED_ORIGINS` 配置，支持逗号分隔。
2. 开发环境默认允许 localhost 常用端口。
3. 生产环境必须显式配置来源。
4. CORS 中间件按请求 Origin 匹配白名单。
5. OPTIONS 预检保持正常。

测试先行清单：
- 白名单 Origin 返回允许头。
- 非白名单 Origin 不返回允许头。
- 无 Origin 请求不被拦截。
- OPTIONS 预检返回 204。

验收命令：
- `cd backend && go test ./api ./config`
- `cd backend && go test ./...`

### T7 请求体大小限制与限流读取优化

目标：
- 认证入口和搜索入口有明确 body 上限。

涉及文件：
- `backend/api/middleware.go`
- `backend/api/rate_limiter.go`
- `backend/api/router_auth.go`
- `backend/api/router.go`
- `backend/api/account_auth_flow_test.go`
- `backend/api/search_request_parser_test.go`

开发步骤：
1. 新增 body size limit 中间件。
2. 对 `/api/auth/*` 设置小上限，例如 16KB。
3. 对 `/api/search` 和 `/api/search/progressive` 设置搜索请求上限。
4. `readRequestBody` 改为有限读取，避免无界 `io.ReadAll`。
5. 超限返回统一错误码。

测试先行清单：
- 正常登录、注册、刷新 token 通过。
- 大 body 登录返回 413 或约定错误。
- 正常搜索请求通过。
- 大 ext 搜索请求返回错误。
- 限流仍按 IP + 用户名生效。

验收命令：
- `cd backend && go test ./api`
- `cd backend && go test ./...`

### T8 TMDB token 掩码化

目标：
- 管理接口和前端不展示完整 TMDB token。

涉及文件：
- `backend/api/system_settings_handler.go`
- `backend/service/system_settings_service.go`
- `backend/api/system_settings_handler_test.go`
- `frontend/src/services/systemSettingsService.ts`
- `frontend/src/hooks/useSystemSettingsController.ts`
- `frontend/src/services/__tests__/systemSettingsService.test.ts`
- `frontend/src/hooks/__tests__/useSystemSettingsController.test.tsx`

开发步骤：
1. 后端响应字段从 `read_access_token` 改为 `token_preview` 或保留字段但只放掩码值。
2. 保存 token 后不回显完整 token。
3. 前端加载时只显示配置状态与掩码。
4. 保存成功后清空输入框并更新状态。
5. 更新测试断言。

测试先行清单：
- GET 不返回完整 token。
- PUT 不回显完整 token。
- 前端保存后输入框清空。
- 旧配置来源和更新时间仍显示。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test -- systemSettingsService useSystemSettingsController`

### T9 搜索请求边界、并发与 SeedHub base URL 限制

目标：
- 搜索入口参数可控，插件并发语义正确，SeedHub 不访问内网目标。

涉及文件：
- `backend/api/search_request_parser.go`
- `backend/service/search_request.go`
- `backend/service/search_executor.go`
- `backend/plugin/sidhub/sidhub.go`
- `backend/api/search_request_parser_test.go`
- `backend/service/search_request_test.go`
- `backend/service/search_executor_test.go`
- `backend/plugin/sidhub/sidhub_test.go`

开发步骤：
1. 定义搜索请求限制常量。
2. 对 keyword、plugins、channels、cloud_types、ext 大小做校验。
3. ext 仅允许已知键，未知键按策略拒绝或忽略。
4. 修正 `calculatePluginWorkerCount` 为最小值语义。
5. SeedHub 自定义 base URL 增加 HTTPS、域名、IP 范围校验。
6. 拒绝 localhost、私网、link-local、metadata 地址。

测试先行清单：
- 超长 keyword 返回 400。
- 过多插件返回 400。
- 过大 ext 返回 400。
- 请求并发低于全局上限时不会被提升。
- SeedHub base URL 拒绝内网和 localhost。
- SeedHub 默认 base URL 正常。

验收命令：
- `cd backend && go test ./api ./service ./plugin/sidhub`
- `cd backend && go test ./...`

## M3：体验与运维增强

### T10 refresh token 存储策略优化

目标：
- 降低 refresh token 被脚本读取后的长期冒用风险。

涉及文件：
- `backend/api/refresh_token_handler.go`
- `backend/api/controller/auth_controller.go`
- `backend/service/refresh_token_service.go`
- `frontend/src/stores/authStore.ts`
- `frontend/src/lib/authRefreshManager.ts`
- `frontend/src/hooks/useAutoRefreshToken.ts`
- 相关认证测试

开发步骤：
1. 评估是否直接迁移到 HttpOnly Cookie。
2. 如果分阶段迁移，先实现 refresh token 轮换和更短 TTL。
3. 后端 refresh 接口支持旋转并撤销旧 token。
4. 前端减少 localStorage 中 refresh token 暴露时间。
5. 退出登录时确保服务端撤销 token。

测试先行清单：
- 登录返回 refresh token 或设置 Cookie。
- refresh 成功后旧 token 失效。
- 多标签单飞刷新仍正常。
- 退出登录撤销 refresh token。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test -- authStore authRefreshManager useAutoRefreshToken`

### T11 Nginx 安全响应头

目标：
- 增加浏览器端基础安全防护。

涉及文件：
- `nginx.conf`
- Docker 或部署说明文档

开发步骤：
1. 增加 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。
2. CSP 先使用 report-only 方案验证。
3. 按实际资源来源补齐 CSP。
4. 验证静态资源、API、外部图片和字体加载。

测试先行清单：
- 首页响应包含安全头。
- `/api/health` 响应不异常。
- 前端资源加载不被误伤。

验收命令：
- `docker compose config`
- `curl -I http://localhost/`
- `cd frontend && pnpm e2e:mock`

### T12 管理端角色状态重新确认

目标：
- 后台页面不只依赖本地 `isAdmin`。

涉及文件：
- `frontend/src/routes/RouteGuards.tsx`
- `frontend/src/hooks/useAdminPageController.ts`
- `frontend/src/services/authService.ts`
- `frontend/src/routes/__tests__/RouteGuards.test.tsx`
- `frontend/src/hooks/__tests__/useAdminPageController.test.tsx`

开发步骤：
1. 进入 `/admin` 时调用后端确认当前用户角色。
2. 本地 `isAdmin` 仅作为初始 UI 状态。
3. 401/403 时清理状态并跳转管理员登录。
4. 增加加载态，避免页面闪烁。

测试先行清单：
- 伪造本地 `isAdmin=true` 但无有效 token 时不可进入后台。
- 普通用户访问后台跳转登录。
- 管理员刷新页面后仍能进入后台。

验收命令：
- `cd frontend && pnpm test -- RouteGuards useAdminPageController`
- `cd frontend && pnpm test`

### T13 错误响应与日志治理

目标：
- 用户错误提示稳定，内部错误只写服务端日志。

涉及文件：
- `backend/api/*handler.go`
- `backend/util/logger`
- `frontend/src/lib/api.ts`
- 前端 toast 相关调用点

开发步骤：
1. 定义后端错误码清单。
2. 搜索、TMDB、插件、认证相关 handler 返回稳定错误码。
3. 详细错误写结构化日志并带 request_id。
4. 前端按错误码映射用户提示。

测试先行清单：
- 上游失败不向前端泄露内部 URL 或堆栈。
- 返回体包含稳定错误码。
- 日志包含 request_id。
- 前端 toast 文案可预测。

验收命令：
- `cd backend && go test ./api ./service`
- `cd frontend && pnpm test`

### T14 发布门禁与依赖治理

目标：
- 发布前固定执行本地验证，阻断 high/critical 漏洞。

涉及文件：
- `docs/security-and-quality-development-plan-2026-06-27.md`
- `docs/readme_2606.md` 或项目现有发布说明
- 可选：本地验证脚本或 Makefile

开发步骤：
1. 固化发布前命令清单。
2. 安装并验证 `govulncheck` 使用方式。
3. high/critical 漏洞作为发布阻断。
4. moderate 漏洞必须记录风险接受和后续计划。
5. 输出阶段性验证报告模板。

验收命令：
- `cd backend && go test ./...`
- `govulncheck ./...`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm audit --audit-level high`

## 跨任务依赖

- T1 必须先于任何公网发布。
- T2 和 T3 应同批进入生产启动链路，避免只修账号不修密钥。
- T4 依赖升级可能影响 T12 的路由测试，建议 T4 先完成。
- T5 可与 T2/T3 并行，但发布前必须统一验收。
- T6 和 T11 都涉及浏览器安全边界，CORS 先做，CSP 后做。
- T8 涉及前后端字段契约，应后端和前端同批合并。
- T9 的搜索请求限制可能影响 SeedHub 前端预热和扫码解析，需要回归相关测试。
- T10 可能改变认证响应结构，应避开 T4 依赖升级同一提交。

## 总体验收命令

完成全部任务后执行：

```bash
cd backend && go test ./...
govulncheck ./...
cd frontend && pnpm lint
cd frontend && pnpm check
cd frontend && pnpm test
cd frontend && pnpm audit --audit-level high
docker compose config
docker compose -f docker-compose.prod.example.yml config
```

## 风险与缓解

- 依赖升级可能引入前端路由或测试兼容问题：按运行时依赖、构建依赖、测试依赖分组提交。
- 插件 Web 路由迁移可能影响微博管理入口：保留后台入口跳转和清晰提示，但旧路径不得执行操作。
- 密钥强校验可能导致现有环境启动失败：发布前提供环境变量清单和检查脚本。
- CORS 白名单可能误拦截合法前端域名：上线前收集所有正式域名、管理域名和本地开发域名。
- 搜索参数限制可能影响高级功能：先记录现有最大请求样例，再确定限制值。
- refresh token 迁移到 Cookie 可能影响跨域部署：先完成 CORS 与域名规划。

## 阶段性交付要求

每个里程碑结束时必须提交：

- 改动摘要。
- 测试结果。
- 未覆盖风险。
- 回滚方案。
- 配置变更说明。
- 用户影响说明。
