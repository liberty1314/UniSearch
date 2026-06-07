# UniSearch 二期优化方向方案

**生成时间**：2026-06-07 14:56:09 CST  
**适用范围**：上一轮项目优化完成后的二期工程、产品与验证路线图。  
**基线说明**：`scripts/tests/local-quality.sh` 已在当前工作区通过；本方案不直接修改业务代码，仅提供后续实施计划。

## 1. 当前基线

上一轮优化已经解决了主要阻断项：

- 前端原慢测/超时测试已恢复绿色。
- 搜索请求解析已从 `SearchHandler` 抽离。
- 插件搜索已通过按插件名加锁隔离请求态。
- 应用启动迁移已解耦为 `unisearch-migrate`。
- Redis 模式删除已改为 SCAN。
- 搜索缓存写队列具备关闭和 drain 能力。
- 前端路由拆包、健康请求缓存和 1000 条结果渲染测试已落地。
- Docker workflow 已移动到根 `.github/workflows/`，本地质量脚本已成型。

当前验证结果：

- `scripts/tests/backend-race.sh`：通过。
- `scripts/tests/frontend-focused.sh`：通过，8 个测试文件、72 个测试。
- `scripts/tests/local-quality.sh`：通过。
- 前端全量 Vitest：87 个测试文件、378 个测试，耗时 85.20 秒。
- 前端生产构建：主入口 gzip 126.12 KB，CSS gzip 39.43 KB，`Admin` chunk gzip 55.31 KB。

## 2. 二期优化总目标

1. 让生产环境更可观测：日志可检索、可脱敏、可分级，并避免重复日志。
2. 让插件体系从“按插件锁保证正确”演进到“请求上下文无状态执行”。
3. 降低维护面：拆分巨型 handler、巨型插件和巨型样式入口。
4. 补齐真实环境验证：浏览器 E2E、Docker 镜像、Redis/MySQL 迁移联调。
5. 提升测试反馈速度：慢测拆分、夹具复用、CI 纳入 race 与构建体积门禁。
6. 统一产品视觉边界：解决 `PRODUCT.md` 克制原则与现有渐变/玻璃动效之间的张力。

## 3. 优化方向总览

| 优先级 | 方向 | 主要收益 | 关键证据 |
| --- | --- | --- | --- |
| P0 | 日志与可观测性治理 | 降低隐私泄漏和排障成本 | `gin.Default()` 后又挂 `LoggerMiddleware()`；JWT 调试中间件记录 token 前缀；插件大量 debug 日志 |
| P0 | 真实环境验收闭环 | 降低发布后才暴露问题的概率 | 未发现 Playwright 配置；历史报告记录未做 Docker/Redis/DB 实境验证 |
| P1 | 插件请求上下文化 | 恢复同插件并发吞吐，减少锁依赖 | `BaseAsyncPlugin` 仍有 `MainCacheKey`、`currentKeyword` setter 和全局 worker/cache 状态 |
| P1 | 巨型模块拆分 | 降低维护成本和变更风险 | `admin_handler.go` 1535 行，`index.css` 1602 行，多个插件文件 1000+ 行 |
| P1 | 测试效率和 CI 门禁 | 更快反馈，更稳定合并 | 全量前端测试 85.20 秒，管理页慢测明显；CI 未跑 race |
| P2 | 前端体积和样式治理 | 降低首包和 CSS 成本 | 主入口 gzip 126.12 KB 接近 130 KB 目标，CSS gzip 39.43 KB |
| P2 | 产品视觉一致性 | 让界面回到“简洁、明了、可信” | `PRODUCT.md` 反对过度渐变/玻璃，但代码中仍有大量 `gradient`、`glass`、`backdrop-blur` |

## 4. 阶段计划

### M1：日志与可观测性治理（P0）

**目标**：用统一日志层替代散落的 `log.Printf`、`fmt.Printf` 和重复 Gin logger，默认生产日志脱敏且可按级别开启调试。

**建议任务**：

- [ ] 将 `gin.Default()` 改为 `gin.New()`，显式挂载 Recovery 和统一日志中间件，避免 Gin 默认日志与 `LoggerMiddleware()` 双输出。
- [ ] 新增后端统一日志适配层，例如 `backend/util/logger`，提供 `Info/Warn/Error/Debug` 和字段脱敏能力。
- [ ] 移除或合并未使用的 `backend/api/middleware/jwt_auth.go`；若保留，修复短 token 切片风险并禁止输出 token/header。
- [ ] 将插件 debug 日志统一接入 `config.AppConfig.AsyncLogEnabled` 或更细的插件日志开关。
- [ ] 对关键词、API Key、Authorization、Cookie、TMDB token、Redis 密码等字段建立统一脱敏规则。
- [ ] 增加请求 ID 字段，贯穿 HTTP 日志、搜索事件、插件警告和缓存错误。

**关键文件**：

- `backend/api/router.go`
- `backend/api/middleware.go`
- `backend/api/middleware/jwt_auth.go`
- `backend/service/search_metrics.go`
- `backend/plugin/http_helpers.go`
- `backend/plugin/javdb/javdb.go`
- `backend/api/controller/apikey_controller.go`

**验收命令**：

```bash
cd backend
go test ./api ./service ./plugin ./util -count=1
go test -race ./service ./util/cache -count=1
```

**退出标准**：

- 搜索一次请求只产生一条标准 HTTP 访问日志。
- 默认日志不包含完整 token、Authorization header、API Key、Cookie 或未脱敏外部密钥。
- 调试日志默认关闭，开启后可以按插件或搜索链路定位问题。

### M2：真实环境验收闭环（P0）

**目标**：把“单元测试全绿”扩展为“真实浏览器、真实容器、真实缓存/数据库迁移可验证”。

**建议任务**：

- [ ] 新增 Playwright 配置和 E2E 目录，先覆盖 5 条关键流：公共首页搜索、热门榜单跳搜索、登录后恢复搜索、资源详情返回、后台插件测试。
- [ ] 为 Docker 镜像新增本地构建验证脚本，确认 `unisearch` 和 `unisearch-migrate` 均在镜像中可执行。
- [ ] 增加基于 Docker Compose 的临时 MySQL/Redis 验证脚本，覆盖迁移、搜索缓存写入、SCAN 删除和优雅关闭。
- [ ] 在 README 中明确发布候选前的本地验收顺序。
- [ ] 将 E2E 与 Docker 验证作为发布候选门禁，普通开发保持可选。

**关键文件**：

- `frontend/playwright.config.ts`
- `frontend/e2e/**`
- `scripts/tests/local-quality.sh`
- `scripts/tests/release-candidate.sh`
- `Dockerfile`
- `docker-compose.yml`
- `README.md`

**验收命令**：

```bash
cd frontend
pnpm exec playwright test
```

```bash
docker build -t unisearch:local .
docker run --rm unisearch:local /app/backend/unisearch-migrate -help
```

**退出标准**：

- E2E 能在本地稳定覆盖核心用户路径。
- Docker 镜像构建通过，迁移命令可执行。
- Redis/MySQL 临时环境能完成迁移和缓存关键路径验证。

### M3：插件请求上下文化（P1）

**目标**：从“同插件串行锁”升级为“每次搜索携带独立上下文”，减少插件实例请求态和全局状态。

**建议任务**：

- [ ] 定义 `PluginSearchContext`，包含 `Keyword`、`MainCacheKey`、`Ext`、`RequestID`、`StartedAt` 和日志字段。
- [ ] 为插件接口新增上下文方法，例如 `SearchWithContext(ctx context.Context, req PluginSearchContext)`；旧接口仅保留迁移期适配。
- [ ] 将 `SetMainCacheKey`、`SetCurrentKeyword` 从核心执行路径移除。
- [ ] 将 `apiResponseCache`、`backgroundWorkerPool`、`backgroundTasksCount` 封装到可注入的插件运行时对象，避免隐式全局状态。
- [ ] 扩展 `plugin/testutil/contract.go`，要求插件提供 manifest、DisplayName、超时和并发隔离测试。
- [ ] 为 3 个代表插件先做试点：一个纯 HTML 插件、一个 JSON 插件、一个复杂详情页插件。

**关键文件**：

- `backend/plugin/plugin.go`
- `backend/plugin/baseasyncplugin.go`
- `backend/service/search_executor.go`
- `backend/plugin/testutil/contract.go`
- `backend/plugin/*/*_test.go`

**验收命令**：

```bash
cd backend
go test ./plugin ./service -run 'Test.*Plugin|TestPluginSearchExecutor' -count=1
go test -race ./service ./plugin -count=1
```

**退出标准**：

- 同一插件可以并发执行两个不同关键词，不依赖全局 setter。
- 代表插件通过契约测试。
- `go test -race` 不报告插件请求态数据竞争。

### M4：巨型模块与死代码治理（P1）

**目标**：把高维护成本文件拆成可测试、可替换的小模块，清理只被测试引用的过期组件。

**建议任务**：

- [ ] 拆分 `backend/api/admin_handler.go`：API Key、系统信息、插件测试、自定义插件 CRUD、批量操作分别进入独立文件。
- [ ] 为插件管理引入 service 层，handler 只负责请求解析、调用 service 和响应。
- [ ] 拆分 `frontend/src/index.css`：基础变量、玻璃表面、动画、公共组件样式、页面级样式分区。
- [ ] 审查 `HotHeroCarousel`、`HotHighlightGrid` 是否仍有产品用途；若无引用，删除组件和对应测试。
- [ ] 对 `weibo`、`panta`、`javdb` 三个大插件按“请求、解析、详情、映射、测试夹具”拆分。

**关键文件**：

- `backend/api/admin_handler.go`
- `backend/plugin/weibo/weibo.go`
- `backend/plugin/panta/panta.go`
- `backend/plugin/javdb/javdb.go`
- `frontend/src/index.css`
- `frontend/src/components/trending/HotHeroCarousel.tsx`
- `frontend/src/components/trending/HotHighlightGrid.tsx`

**验收命令**：

```bash
cd backend
go test ./api ./plugin/weibo ./plugin/panta ./plugin/javdb -count=1
```

```bash
cd frontend
./node_modules/.bin/vitest run src/pages/__tests__/HotPage.test.tsx src/components/trending/__tests__
./node_modules/.bin/vite build
```

**退出标准**：

- 单个 handler 文件控制在 800 行以内，核心 service 文件保持职责清晰。
- 删除的组件没有页面引用；保留的组件有真实入口和测试价值。
- CSS 拆分后生产构建通过，视觉回归测试不失败。

### M5：测试效率与 CI 门禁（P1）

**目标**：减少慢测反馈成本，让 CI 与本地关键门禁一致。

**建议任务**：

- [ ] 建立慢测清单，优先处理耗时超过 3 秒的测试用例。
- [ ] 后台管理页测试拆分为数据纯函数测试、交互组件测试和少量端到端用户路径测试。
- [ ] 减少全局 `testTimeout: 15000` 依赖，针对极少数长路径单测局部设置超时。
- [ ] 统一测试夹具工厂，减少每个管理页测试重复渲染完整工作区。
- [ ] CI 后端 job 增加 `go test -race ./service ./util/cache -count=1`。
- [ ] CI 前端 job 记录构建产物体积，主入口 gzip 超过 130 KB 时提示失败或警告。

**关键文件**：

- `frontend/vite.config.ts`
- `frontend/src/components/admin/__tests__/**`
- `.github/workflows/ci.yml`
- `scripts/tests/frontend-focused.sh`
- `scripts/tests/backend-race.sh`

**验收命令**：

```bash
scripts/tests/frontend-focused.sh
scripts/tests/backend-race.sh
scripts/tests/local-quality.sh
```

**退出标准**：

- 前端聚焦测试总耗时明显低于当前约 20-25 秒区间。
- 全量前端测试耗时有基线记录和下降目标。
- CI 与本地 race、构建体积门禁一致。

### M6：前端体积与样式治理（P2）

**目标**：降低入口包和 CSS 体积，并让视觉系统从散落类名回到可维护令牌。

**建议任务**：

- [ ] 对 `motion-vendor`、`Admin`、`index.css` 做构建体积归因。
- [ ] 首页只加载必要动效；将非首屏或仅首页使用的动效与展示组件继续延后加载。
- [ ] 将云盘类型渐变、玻璃面板、阴影等样式收敛为可命名令牌，不在业务组件内散落长 class。
- [ ] 明确 `PRODUCT.md` 中“不要过度渐变/玻璃”和近期用户恢复品牌渐变之间的例外规则。
- [ ] 为关键公共页增加视觉冒烟测试或截图验收，覆盖 390px 移动端和 1280px 桌面端。

**关键文件**：

- `frontend/vite.config.ts`
- `frontend/src/index.css`
- `frontend/src/lib/brandTheme.ts`
- `frontend/src/components/ui/glass-surface*.ts`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `PRODUCT.md`

**验收命令**：

```bash
cd frontend
./node_modules/.bin/vite build
./node_modules/.bin/vitest run src/pages/__tests__/Home.test.tsx src/routes/__tests__/AppRoutes.test.tsx
```

**退出标准**：

- 主入口 gzip 稳定低于 130 KB，最好回落到 120 KB 左右。
- CSS gzip 有明确下降目标或可解释的保留原因。
- 产品视觉例外清单写入文档，避免后续纯色/渐变来回摆动。

## 5. 建议实施顺序

1. 先做 M1 日志治理，解决生产排障和脱敏基础。
2. 并行准备 M2 E2E/Docker/真实 Redis/MySQL 验证，作为后续所有重构的护栏。
3. 在 M2 护栏稳定后推进 M3 插件请求上下文化。
4. 以 M4 拆分巨型模块降低维护成本，优先拆 `admin_handler.go` 和 `index.css`。
5. 做 M5 测试效率和 CI 门禁，保证长期反馈速度。
6. 最后做 M6 视觉与体积治理，避免在验证护栏不足时大面积改 UI。

## 6. 风险与回滚

| 风险 | 影响 | 预防措施 | 回滚方式 |
| --- | --- | --- | --- |
| 日志治理漏掉关键排障信息 | 线上问题定位变慢 | 调试级别保留完整字段但默认关闭，敏感字段始终脱敏 | 恢复旧日志入口，同时保留脱敏规则 |
| 插件接口迁移影响大量插件 | 搜索源不可用 | 先做兼容适配层和 3 个插件试点 | 回退到按插件锁方案 |
| E2E 引入后不稳定 | CI 阻塞 | 首期仅本地/发布候选运行，不进入普通 PR 必选 | 暂时移出 CI，只保留手动脚本 |
| CSS 拆分造成视觉漂移 | 公共页样式回退 | 先加截图/组件测试，再分区迁移 | 回退 CSS 分区提交 |
| 慢测拆分弱化断言 | 缺陷漏检 | 保留少量完整用户路径测试，纯函数测试只覆盖派生逻辑 | 恢复原测试路径 |

## 7. 最终验收清单

- [ ] `scripts/tests/local-quality.sh` 通过。
- [ ] `pnpm exec playwright test` 通过，覆盖核心用户流。
- [ ] Docker 镜像本地构建通过，`unisearch-migrate` 可执行。
- [ ] 临时 MySQL/Redis 环境完成迁移、缓存写入和缓存清理验证。
- [ ] `go test -race ./service ./plugin ./util/cache -count=1` 通过。
- [ ] 主入口 gzip 小于 130 KB，CSS gzip 有体积记录。
- [ ] `.Codex/operations-log.md` 和 `.Codex/verification-report.md` 更新。

## 8. 本轮不建议立即做的事项

- 不建议替换 Gin、GORM、React、Vite、Zustand 等核心技术栈。
- 不建议直接重写所有插件；应先通过上下文接口试点迁移。
- 不建议在未建立 E2E 前继续大面积调整公共页视觉。
- 不建议用提高全局超时掩盖慢测；应拆路径、稳定夹具和缩小渲染面。
- 不建议删除用户近期恢复的首页品牌渐变；应先把视觉例外规则写清楚。
