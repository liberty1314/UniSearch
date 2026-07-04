# UniSearch 插件长期优化开发计划

## 1. 文档目标

本文基于 `docs/plugin.md` 中的长期方案，将“插件性能监控面板、自动降级和恢复机制、智能负载均衡”拆解为可执行开发计划。计划覆盖后端模型、服务、API、前端页面、测试验证、交付顺序与风险控制，作为后续迭代排期和验收依据。

## 2. 背景与现状

### 2.1 已有能力

- 搜索执行器已有插件执行封装，位置为 `backend/service/search_executor.go`。
- 插件健康状态已有持久化服务，位置为 `backend/service/plugin_health_service.go`。
- 动态超时计算器已经存在，位置为 `backend/service/search_adaptive_timeout.go`。
- 渐进式搜索已经支持分批返回结果，位置为 `backend/service/search_progressive.go`。
- 管理后台已有插件中心页面，位置为 `frontend/src/components/admin/PluginManagementView.tsx`。
- 本地质量验证入口为 `scripts/tests/local-quality.sh`。

### 2.2 当前缺口

- 动态超时计算器尚未完整接入插件搜索执行链路。
- 插件性能历史数据没有独立持久化模型，无法支撑趋势分析。
- 熔断状态、半开探测、冷却期和自动恢复机制尚未建模。
- 插件调度仍以统一超时和固定并发为主，缺少按健康度排序与分级。
- 管理后台缺少插件性能指标、错误日志和熔断状态可视化。

## 3. 总体原则

- 优先复用现有插件执行器、健康服务、管理路由和管理后台组件。
- 指标采集不阻塞用户搜索主链路，采用内存缓冲和批量写入。
- 熔断和降级只影响故障插件，不影响其他插件结果返回。
- 所有状态转换必须可测试、可追踪、可回滚。
- 前端默认复用现有 UI 体系；若引入 Recharts 等新依赖，需要单独评审。

## 4. 交付范围

### 4.1 后端交付

- 新增插件性能指标模型和错误日志模型。
- 扩展插件健康状态模型，增加熔断状态相关字段。
- 新增指标采集与聚合服务。
- 新增熔断器服务和主动健康检查服务。
- 接入搜索执行器和渐进式搜索调度。
- 新增管理端插件指标 API。
- 新增数据清理任务。

### 4.2 前端交付

- 新增插件性能指标类型定义与 API 调用封装。
- 新增插件性能监控页面或插件中心子视图。
- 展示实时指标卡片、趋势图、性能对比表和错误日志抽屉。
- 支持时间范围筛选、状态筛选、自动刷新和空数据状态。

### 4.3 测试交付

- 后端服务单元测试。
- 后端 API 测试。
- 前端组件和 Hook 测试。
- 关键路径冒烟测试。
- 本地验证记录和审查报告。

## 5. 架构设计

### 5.1 数据流

```mermaid
flowchart LR
    A["插件搜索执行"] --> B["指标采集缓冲区"]
    A --> C["插件健康状态更新"]
    B --> D["定时聚合写库"]
    C --> E["熔断器状态机"]
    E --> F["搜索调度准入判断"]
    D --> G["管理端指标 API"]
    E --> G
    G --> H["管理后台监控视图"]
```

### 5.2 核心集成点

| 集成点 | 计划动作 | 验收重点 |
| --- | --- | --- |
| `backend/service/search_executor.go` | 包装单插件执行，记录耗时、结果数、错误和超时 | 不阻塞搜索主流程 |
| `backend/service/search_progressive.go` | 按插件优先级排序，跳过熔断插件 | 快速插件优先返回 |
| `backend/service/plugin_health_service.go` | 扩展健康状态字段和状态快照 | 状态读写保持兼容 |
| `backend/database/migration.go` | 注册新增模型迁移 | 本地启动可自动建表 |
| `backend/api/router_admin.go` | 注册插件指标 API | 复用管理员路由 |
| `frontend/src/components/admin` | 新增监控视图组件 | 风格与管理后台一致 |

## 6. 阶段计划

### 阶段一：监控基础设施，P0，预计 5 个工作日（已完成）

#### 6.1 数据模型与迁移

- [x] 新增 `PluginPerformanceMetric` 模型。
- [x] 新增 `PluginErrorLog` 模型。
- [x] 扩展 `PluginHealthStatus`，增加熔断状态预留字段。
- [x] 在 `database.AutoMigrate` 注册新增模型。

验收条件：
- [x] SQLite 测试库可以自动迁移新增表。
- [x] MySQL 字段类型满足 30 天指标和 7 天错误日志保留需求。
- [x] 插件名、时间戳组合索引可用于查询性能数据。

#### 6.2 指标采集服务

- [x] 新增 `PluginMetricsCollector`。
- [x] 使用环形缓冲区暂存原始执行记录。
- [x] 每 5 分钟聚合 p50、p95、p99、成功率、超时率、错误率、平均响应时间。
- [x] 聚合写库失败时返回错误并保留在本地验证报告中追踪。

验收条件：
- [x] 单元测试覆盖环形缓冲、单插件、多事件、百分位计算、查询与错误日志。
- [x] 搜索请求结束后能看到内存快照更新。
- [x] 聚合任务按事务批量写入，失败时返回明确错误。

#### 6.3 搜索执行器接入

- [x] 在单插件执行任务内记录开始时间、结束时间、错误类型和结果数量。
- [x] 对缓存命中场景记录缓存命中统计。
- [x] 对全局超时未返回的插件记录超时事件。

验收条件：
- [x] 插件成功、失败、超时均能生成指标事件。
- [x] 原有搜索结果、warning 和缓存行为通过聚焦测试覆盖。

#### 6.4 管理 API

- [x] `GET /api/admin/plugin-metrics/realtime` 返回实时快照。
- [x] `GET /api/admin/plugin-metrics` 返回聚合指标。
- [x] `GET /api/admin/plugin-metrics/errors` 返回错误日志。

验收条件：
- [x] API 返回统一 JSON 结构。
- [x] 支持 `plugin_name`、时间范围、分页和排序参数。
- [x] 空数据时返回空列表而不是错误。

完成记录：
- 后端模型：`backend/model/plugin_metrics.go`、`backend/model/plugin_health_status.go`。
- 采集服务：`backend/service/plugin_metrics_collector.go`。
- 搜索接入：`backend/service/search_executor.go`、`backend/service/search_service.go`。
- 管理 API：`backend/api/plugin_metrics_handler.go`、`backend/api/router_admin.go`。
- 启动接线：`backend/cmd/bootstrap/app.go`、`backend/cmd/bootstrap/server.go`。
- 测试覆盖：`backend/service/plugin_metrics_collector_test.go`、`backend/service/search_executor_test.go`、`backend/api/plugin_metrics_handler_test.go`。

### 阶段二：熔断与自动恢复，P0，预计 5 个工作日（已完成）

#### 6.5 熔断器服务

- [x] 新增 `PluginCircuitBreakerService`。
- [x] 实现 `Closed`、`Open`、`HalfOpen` 三态状态机。
- [x] 使用每插件独立锁避免并发状态转换冲突。
- [x] 提供 `ShouldAllowRequest` 和 `RecordResult` 两个核心方法。

验收条件：
- [x] 连续失败达到阈值后进入 `Open`。
- [x] 冷却期结束后进入 `HalfOpen`。
- [x] 半开连续成功后恢复 `Closed`。
- [x] 半开任一失败后回到 `Open`。

#### 6.6 降级策略接入

- [x] 搜索前调用 `ShouldAllowRequest`。
- [x] 熔断插件直接跳过并返回来源级 warning。
- [x] 超时率过高时接入 `adaptiveTimeoutCalculator` 缩短插件超时。
- [x] 将熔断结果同步写入健康状态和指标事件。

验收条件：
- [x] 故障插件被跳过时不影响其他插件结果。
- [x] warning 能指明插件被临时降级。
- [x] 手动测试插件仍可作为恢复探测入口。

#### 6.7 主动健康检查

- [x] 新增 `PluginHealthChecker`。
- [x] `Closed` 状态插件默认 5 分钟检查一次。
- [x] `Open` 状态插件默认 30 秒探测一次，并使用指数退避限制频率。
- [x] 在应用启动流程中注册后台任务，并提供停止上下文。

验收条件：
- [x] 后台任务随服务启动和关闭正确创建与退出。
- [x] 探测失败不会造成 goroutine 泄漏。
- [x] 恢复成功后健康状态、熔断状态和指标快照一致。

完成记录：
- 熔断服务：`backend/service/plugin_circuit_breaker.go`。
- 主动探测：`backend/service/plugin_health_checker.go`。
- 搜索接入：`backend/service/search_executor.go`、`backend/service/search_progressive.go`、`backend/service/search_service.go`。
- 启动接线：`backend/cmd/bootstrap/app.go`、`backend/cmd/bootstrap/server.go`。
- 测试覆盖：`backend/service/plugin_circuit_breaker_test.go`、`backend/service/search_executor_test.go`。

### 阶段三：智能负载均衡，P1，预计 4 个工作日

#### 6.8 优先级计算

- 新增 `PluginPriorityCalculator`。
- 基于健康度、平均响应时间、成功率和连续失败次数计算综合得分。
- 输出 `Critical`、`Fast`、`Medium`、`Slow`、`Degraded` 分级。

验收条件：
- 无历史数据插件使用稳定默认分。
- 用户显式选择或高优先级插件可进入 `Critical`。
- 超时率高或连续失败插件进入低优先级或降级分组。

#### 6.9 调度策略接入

- 在渐进式搜索中按 `Critical > Fast > Medium > Slow` 排序提交。
- 对 `Slow` 和 `Degraded` 插件降低并发或延迟提交。
- 保留全局并发上限和单插件锁。

验收条件：
- 快速插件结果优先返回。
- 降级插件不会占满 worker。
- 排序结果有单元测试覆盖。

### 阶段四：管理后台可视化，P1，预计 5 个工作日

#### 6.10 前端类型与接口

- 新增插件指标相关 TypeScript 类型。
- 新增管理端 API 调用封装。
- 新增数据刷新 Hook。

验收条件：
- 类型覆盖实时指标、聚合指标、错误日志和分页响应。
- 请求失败时显示现有后台风格错误提示。

#### 6.11 监控视图组件

- 新增实时指标卡片：活跃插件数、平均响应、成功率、错误数。
- 新增响应时间趋势图。
- 新增插件性能对比表。
- 新增错误日志抽屉。
- 新增熔断状态和恢复倒计时展示。

验收条件：
- 桌面和移动布局无文本溢出。
- 加载、空数据、错误和有数据状态均有测试覆盖。
- 自动刷新默认 30 秒，并在组件卸载时停止。

#### 6.12 导航集成

- 在管理后台侧边栏或插件中心内增加“性能监控”入口。
- 与现有 `PluginManagementView` 保持视觉一致。

验收条件：
- 管理员可从后台稳定进入监控视图。
- 现有插件中心筛选、测试和启停功能不回归。

### 阶段五：清理、验证与发布，P0，预计 2 个工作日

#### 6.13 数据清理任务

- 每天清理 30 天前性能指标。
- 每天清理 7 天前错误日志。
- 清理任务输出结构化日志。

验收条件：
- 单元测试覆盖清理边界时间。
- 清理失败不会影响搜索服务。

#### 6.14 全量验证

- 后端：`go test ./...`。
- 前端：`pnpm tsc -b --noEmit`、`pnpm eslint .`、`pnpm vitest run`。
- 集成：`scripts/tests/local-quality.sh`。
- 可选：开启 `UNISEARCH_REAL_SEARCH_SMOKE=1` 执行真实搜索冒烟。

验收条件：
- 所有本地验证通过。
- `.Codex/verification-report.md` 记录评分、风险和结论。
- 新增文档和迁移说明完整。

## 7. API 契约草案

### 7.1 实时快照

```http
GET /api/admin/plugin-metrics/realtime
```

响应字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `active_plugin_count` | number | 当前参与统计的插件数量 |
| `avg_response_ms` | number | 平均响应耗时 |
| `success_rate` | number | 成功率，范围 0 到 1 |
| `timeout_rate` | number | 超时率，范围 0 到 1 |
| `error_count` | number | 当前窗口错误数 |
| `items` | array | 单插件实时快照 |

### 7.2 聚合指标

```http
GET /api/admin/plugin-metrics?plugin_name=pansearch&from=2026-07-04T00:00:00Z&to=2026-07-04T23:59:59Z
```

响应字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `items` | array | 聚合指标列表 |
| `range` | object | 查询时间范围 |
| `granularity` | string | 聚合粒度 |

### 7.3 错误日志

```http
GET /api/admin/plugin-metrics/errors?plugin_name=pansearch&page=1&page_size=20
```

响应字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `items` | array | 错误日志列表 |
| `page` | number | 当前页 |
| `page_size` | number | 每页数量 |
| `total` | number | 总数 |

## 8. 数据模型草案

### 8.1 `plugin_performance_metrics`

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `plugin_name` | 插件名称，归一化小写 |
| `bucket_started_at` | 聚合窗口开始时间 |
| `bucket_ended_at` | 聚合窗口结束时间 |
| `request_count` | 请求数 |
| `success_count` | 成功数 |
| `timeout_count` | 超时数 |
| `error_count` | 错误数 |
| `cache_hit_count` | 缓存命中数 |
| `avg_response_ms` | 平均响应时间 |
| `p50_response_ms` | p50 响应时间 |
| `p95_response_ms` | p95 响应时间 |
| `p99_response_ms` | p99 响应时间 |
| `created_at` | 创建时间 |

### 8.2 `plugin_error_logs`

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `plugin_name` | 插件名称，归一化小写 |
| `keyword_hash` | 搜索关键词哈希，用于排查关联请求 |
| `error_type` | 错误类型 |
| `error_message` | 错误信息 |
| `duration_ms` | 执行耗时 |
| `occurred_at` | 发生时间 |
| `created_at` | 创建时间 |

### 8.3 `plugin_health_statuses` 扩展字段

| 字段 | 说明 |
| --- | --- |
| `circuit_state` | 熔断状态：`closed`、`open`、`half_open` |
| `circuit_opened_at` | 最近熔断时间 |
| `circuit_cooldown_until` | 冷却截止时间 |
| `half_open_successes` | 半开探测连续成功次数 |
| `last_success_at` | 最近成功时间 |
| `last_failure_at` | 最近失败时间 |

## 9. 测试矩阵

| 层级 | 测试文件建议 | 覆盖内容 |
| --- | --- | --- |
| 模型迁移 | `backend/database/migration_test.go` | 新增表和扩展字段可迁移 |
| 指标采集 | `backend/service/plugin_metrics_collector_test.go` | 缓冲、聚合、百分位、写库失败 |
| 熔断器 | `backend/service/plugin_circuit_breaker_test.go` | 三态转换、并发锁、冷却期 |
| 健康检查 | `backend/service/plugin_health_checker_test.go` | 探测频率、上下文取消、恢复路径 |
| 搜索执行 | `backend/service/search_executor_test.go` | 成功、失败、超时、跳过 warning |
| API | `backend/api/plugin_metrics_handler_test.go` | 查询参数、分页、空数据、错误态 |
| 前端类型和 Hook | `frontend/src/hooks/__tests__/usePluginMetricsController.test.tsx` | 拉取、刷新、失败恢复 |
| 前端组件 | `frontend/src/components/admin/__tests__/PluginPerformanceDashboard.test.tsx` | 指标卡、表格、抽屉、空态 |

## 10. 里程碑与排期

| 里程碑 | 周期 | 产出 | 通过标准 |
| --- | --- | --- | --- |
| M1 监控数据闭环 | 第 1 周 | 模型、采集、聚合、API | 后端测试通过，API 可查询数据 |
| M2 熔断降级闭环 | 第 2 周 | 熔断器、主动检查、搜索接入 | 故障插件自动熔断并恢复 |
| M3 调度优化闭环 | 第 3 周前半 | 优先级计算和渐进式排序 | 快速插件优先返回，慢插件不阻塞 |
| M4 可视化闭环 | 第 3 周后半到第 4 周 | 管理后台监控视图 | 管理端可查看趋势、表格和错误日志 |
| M5 发布验证 | 第 4 周末 | 验证报告和发布说明 | `scripts/tests/local-quality.sh` 通过 |

## 11. 回滚与降级方案

- 指标采集异常：关闭聚合写库任务，保留搜索主链路。
- 熔断误判：将熔断器配置切换为只记录不跳过。
- 调度排序异常：回退到原插件顺序和统一并发策略。
- 前端监控页异常：隐藏导航入口，不影响插件中心原功能。
- 数据表异常：新增表独立于搜索主表，必要时暂停写入并保留健康状态原逻辑。

## 12. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 指标同步写库拖慢搜索 | 搜索延迟升高 | 使用内存缓冲和批量写入 |
| 熔断阈值过严 | 有效插件被跳过 | 阈值配置化，先以观察模式上线 |
| 半开探测并发冲突 | 状态反复抖动 | 每插件独立锁和探测配额 |
| 前端图表依赖增加包体 | 构建体积增加 | 默认使用轻量 SVG，确需依赖时单独评审 |
| 历史数据过多 | 数据库压力增加 | 30 天指标和 7 天错误日志保留策略 |

## 13. 最终验收清单

- 插件执行后能产生实时指标和聚合指标。
- 连续失败、超时率过高、滑动窗口错误率过高均能触发熔断。
- 冷却期后能进入半开探测，并按探测结果恢复或继续熔断。
- 渐进式搜索按插件健康和性能排序，快速插件优先返回。
- 管理后台能查看实时指标、趋势、性能对比和错误日志。
- 所有新增能力均有本地自动化测试覆盖。
- `scripts/tests/local-quality.sh` 本地通过。
- `.Codex/verification-report.md` 记录最终审查结论。
