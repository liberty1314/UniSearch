# 兼容路径下线清单

生成时间：2026-06-19

本文记录当前仍保留的兼容路径、替代方案、删除条件与验证命令。后续删除任何兼容路径前，必须先更新本清单并完成对应验证。

## 1. 旧 API Key 服务方法

- **当前调用点**：`backend/service/apikey_service.go`
- **兼容内容**：`ValidateKey`、`GetKey`、`IncrementSearchCount`、`GetRemainingSearches`、`CanSearch`、`ListKeys`、`GenerateKey`、`RevokeKey`、`UpdateKeyExpiry`、`BatchExtendKeys`、`BatchGenerateKeys`、`BatchDeleteKeys`
- **替代路径**：用户账号体系、刷新令牌体系、后台用户管理接口。
- **删除条件**：
  - `rg "ValidateKey|GetRemainingSearches|BatchGenerateKeys|BatchDeleteKeys" backend frontend` 仅剩测试或文档引用。
  - 后台不再展示遗留 API Key 能力。
  - 迁移文档明确旧 API Key 不再作为用户能力。
- **验证命令**：
  - `cd backend && go test ./service ./api ./database`
  - `cd frontend && pnpm exec vitest run src/pages/__tests__/AccountPage.test.tsx src/components/admin/__tests__/AdminUsersView.test.tsx`

## 2. 旧缓存键函数

- **当前调用点**：`backend/util/cache/cache_key.go`
- **兼容内容**：`GenerateTGCacheKeyLegacy`、`GeneratePluginCacheKeyLegacy`、`GenerateCacheKey`、`GenerateCacheKeyLegacy`
- **替代路径**：`GenerateTGCacheKey`、`GeneratePluginCacheKey` 和带版本/归一化规则的新缓存键。
- **删除条件**：
  - `rg "Generate.*Legacy|GenerateCacheKey\\(" backend` 确认业务代码不再调用旧函数。
  - Redis 与本地缓存迁移策略确认不需要读取旧键。
  - 缓存命中率下降风险可接受，或已准备刷新缓存方案。
- **验证命令**：
  - `cd backend && go test ./util/cache ./service`
  - `scripts/tests/backend-race.sh`

## 3. 历史 refresh token 兜底

- **当前调用点**：`backend/api/refresh_token_handler.go`
- **兼容内容**：数据库登录失败后尝试配置文件用户，历史 refresh token 解密兜底。
- **替代路径**：统一数据库用户和刷新令牌服务。
- **删除条件**：
  - 配置文件用户迁移完成。
  - `rg "配置文件用户|历史 refresh token|login-remember" backend frontend` 确认只剩文档说明。
  - 管理员和普通用户登录恢复 E2E 已覆盖。
- **验证命令**：
  - `cd backend && go test ./api ./service`
  - `cd frontend && pnpm exec playwright test e2e/auth-resume-search.spec.ts`

## 4. 前端 API 类型兼容导出口

- **当前调用点**：`frontend/src/types/api.ts`
- **兼容内容**：集中导出账号、后台、搜索、资源等多领域类型。
- **替代路径**：新增类型进入 `common`、`search`、`resource`、`hotRanking` 或后续独立后台领域类型文件。
- **删除条件**：
  - 新代码不再向 `api.ts` 增加领域类型。
  - `rg "from '@/types/api'" frontend/src` 中的业务导入已逐步迁移到领域类型文件。
  - `api.ts` 仅保留短期兼容 re-export。
- **验证命令**：
  - `cd frontend && pnpm exec tsc -b --noEmit`
  - `cd frontend && pnpm exec vitest run src/services src/components/admin`

## 5. 插件 Search 兼容方法

- **当前调用点**：`backend/plugin/plugin.go` 与各插件包 `Search` 方法。
- **兼容内容**：`Search` 作为兼容方法内部调用异步搜索。
- **替代路径**：统一通过 `SearchWithResult` / `AsyncSearchWithResult` 返回最终态信息。
- **删除条件**：
  - `AsyncSearchPlugin` 接口完成版本升级设计。
  - 搜索执行器不再调用 `Search`。
  - 所有插件完成新接口契约测试。
- **验证命令**：
  - `cd backend && go test ./plugin/... ./service`
  - `scripts/tests/backend-race.sh`

## 6. 废弃数据库表清理

- **当前调用点**：`backend/database/migration.go`、`backend/cmd/migrate/main.go`
- **兼容内容**：默认保留废弃表，显式 `-drop-deprecated` 才删除。
- **替代路径**：部署前备份数据库，迁移后按需执行显式清理。
- **删除条件**：
  - 生产数据确认不再依赖 `api_keys` 等废弃表。
  - README 和部署 runbook 已明确备份与回滚方案。
- **验证命令**：
  - `cd backend && go test ./database`
  - `scripts/tests/integration-env.sh`
