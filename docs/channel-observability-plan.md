# UniSearch 频道性能监控方案

## 一、背景与目标

现有管理后台的「性能监控」页面已经支持插件性能观测，能够查看插件实时指标、聚合趋势、错误日志和熔断状态。频道侧目前只有「Telegram 频道」管理页提供启停、最近健康检查、错误信息与快速测试能力，缺少按请求维度沉淀的响应时间、成功率、超时率、错误日志和趋势分析。

本方案目标是在现有「性能监控」页面内新增频道观测视图，并通过页面顶部导航在「插件监控」与「频道监控」之间切换。顶部切换参考系统设置页的分组导航样式，复用 `Tabs`、`TabsList`、`TabsTrigger` 形成同一页面内的轻量切换，而不是新增侧边栏入口。

## 二、现状分析

### 2.1 已具备能力

- 插件性能监控已具备完整闭环：
  - `PluginMetricsCollector` 采集插件执行事件。
  - `plugin_performance_metrics` 存储 5 分钟聚合指标。
  - `plugin_error_logs` 存储错误日志。
  - `/api/admin/plugin-metrics/realtime` 返回实时内存窗口。
  - `/api/admin/plugin-metrics` 返回聚合指标。
  - `/api/admin/plugin-metrics/errors` 返回错误日志。
  - `PluginPerformanceDashboard` 聚合目录、实时指标、历史指标和错误日志。
- 频道管理已具备健康状态基础：
  - `tg_channels` 维护频道配置、启停、排序和标签。
  - `tg_channel_health_statuses` 保存频道最近一次健康检查。
  - `TGChannelHealthService.RecordResult` 可记录手动测试、批量测试或系统检查结果。
  - `ChannelManagementView` 已展示频道健康状态、最近错误、最近检查时间和操作入口。
- 搜索执行链路已有频道执行器：
  - `tgSearchExecutor.Search` 按频道拆分任务并发执行。
  - `searchChannel` 负责请求 `https://t.me/s/{channel}` 并解析结果。
  - 搜索总指标通过 `SearchMetricsRecorder.RecordSearch("tg", ...)` 记录，但没有拆到单频道维度。

### 2.2 缺口

1. 缺少频道请求级事件采集，无法知道哪个频道拖慢 TG 搜索。
2. 缺少频道聚合指标表，无法展示历史趋势。
3. 缺少频道错误日志，频道管理页只能展示最近一次错误。
4. 性能监控页只有插件视图，无法从同一工作台比较插件和频道两类搜索源。
5. 频道健康检查与真实搜索结果未充分打通，搜索失败不会形成可回溯的性能证据。

## 三、产品交互方案

### 3.1 页面入口

保留侧边栏「性能监控」入口不变，进入后默认展示「插件监控」。

页面主标题区域下方新增顶部导航：

- 插件监控
- 频道监控

导航实现参考 `SystemSettingsSectionNav`：

- 使用 `Tabs`、`TabsList`、`TabsTrigger`。
- `ariaLabel` 使用「性能监控分组」。
- 样式复用系统设置的 pills 导航外观。
- 切换不改变侧边栏选中项，仍处于 `plugin_observability` 视图。

### 3.2 插件监控视图

插件监控保持现有能力和布局，仅将当前 `PluginPerformanceDashboard` 拆为：

- `PerformanceObservabilityView`：页面壳与顶部导航。
- `PluginPerformancePanel`：现有插件监控内容。
- `ChannelPerformancePanel`：新增频道监控内容。

### 3.3 频道监控视图

频道监控与插件监控保持信息架构一致：

#### 顶部指标卡

- 活跃频道：当前窗口有请求的频道数。
- 平均响应：当前实时窗口或最近聚合窗口的加权平均响应。
- 成功率：成功请求数 / 总请求数。
- 错误数：当前窗口累计错误数。

#### 趋势区

展示最近 24 个聚合窗口的频道响应时间趋势：

- 默认按当前筛选结果聚合。
- 粒度与插件一致，使用 5 分钟窗口。
- 空态提示「频道搜索产生指标后，这里会展示最近窗口的响应时间走势」。

#### 列表区

列出频道性能对比，字段建议：

- 频道：频道名称与标签摘要。
- 状态：启用/停用 + 健康/异常/未测试。
- 响应：平均响应 + P95。
- 质量：成功率 + 超时率。
- 错误：错误次数。
- 最近检查：最近健康检查时间或最近指标时间。

筛选能力：

- 状态筛选：全部状态、健康、异常、未测试、启用中、停用、错误。
- 搜索框：搜索频道名称、标签、错误信息。

#### 详情抽屉

点击频道行展示详情：

- 健康状态：健康状态、最近检查、检查来源、最近错误。
- 性能摘要：平均响应、P50、P95、P99、最大并发、缓存命中数。
- 最近错误日志：错误类型、错误信息、耗时、关键词哈希、发生时间。
- 操作入口：跳转到频道管理页或提供「快速测试」按钮。第一期建议只提供「快速测试」，避免在监控页承载配置编辑。

## 四、核心指标

频道指标与插件指标保持同构，方便前端复用展示模型：

- `request_count`：请求次数。
- `success_count`：成功次数。
- `timeout_count`：超时次数。
- `error_count`：错误次数。
- `cache_hit_count`：缓存命中次数。
- `max_concurrent_requests`：最大并发请求数。
- `avg_response_ms`：平均响应时间。
- `p50_response_ms`：P50 响应时间。
- `p95_response_ms`：P95 响应时间。
- `p99_response_ms`：P99 响应时间。
- `result_count`：结果数量，频道侧建议新增，用于识别空结果频道。
- `last_error`：实时窗口内最近错误。

## 五、后端设计

### 5.1 数据模型

新增频道性能聚合表：

```go
type TGChannelPerformanceMetric struct {
    ID                    uint
    ChannelName           string
    BucketStartedAt       time.Time
    BucketEndedAt         time.Time
    RequestCount          int
    SuccessCount          int
    TimeoutCount          int
    ErrorCount            int
    CacheHitCount         int
    ResultCount           int
    MaxConcurrentRequests int
    AvgResponseMS         int64
    P50ResponseMS         int64
    P95ResponseMS         int64
    P99ResponseMS         int64
    CreatedAt             time.Time
}
```

表名：`tg_channel_performance_metrics`

索引：

- `(channel_name, bucket_started_at)`
- `bucket_started_at`
- `bucket_ended_at`

新增频道错误日志表：

```go
type TGChannelErrorLog struct {
    ID           uint
    ChannelName  string
    KeywordHash  string
    ErrorType    string
    ErrorMessage string
    DurationMS   int64
    OccurredAt   time.Time
    CreatedAt    time.Time
}
```

表名：`tg_channel_error_logs`

索引：

- `(channel_name, occurred_at)`
- `keyword_hash`
- `error_type`

保留并复用现有 `tg_channel_health_statuses`：

- 搜索成功时记录 `search_success`。
- 搜索失败时记录 `search_failure`。
- 超时时记录 `timeout`。
- 手动测试继续记录 `manual_test`。
- 批量测试继续记录 `batch_test`。

### 5.2 指标采集器

新增 `service/tg_channel_metrics_collector.go`，整体设计复用 `PluginMetricsCollector`：

- `TGChannelMetricEvent` 表示单次频道请求事件。
- 内存环形缓冲区默认 10000 条。
- 5 分钟聚合写入数据库。
- 支持 `RealtimeSnapshot()`。
- 支持 `ListMetrics()` 和 `ListErrorLogs()`。
- 支持 `BeginChannelRequest(channelName)` 统计实时并发。

建议先保持插件与频道采集器分离，避免一次重构影响现有插件监控；后续如两者稳定，可抽象通用指标采集器。

### 5.3 搜索链路集成

改造 `tgSearchExecutor`：

- 构造函数新增可选 `channelMetrics *TGChannelMetricsCollector` 和 `channelHealth *TGChannelHealthService`。
- 每个频道任务执行前调用 `BeginChannelRequest(channel)`。
- `channelSearcher(keyword, channel)` 成功时记录：
  - `Success: true`
  - `Duration`
  - `ResultCount`
  - `OccurredAt`
  - `ConcurrentRequests`
- 失败时记录：
  - `Success: false`
  - `ErrorType: search_failure`
  - `ErrorMessage`
- 批量执行超时时，对未返回的频道记录：
  - `Timeout: true`
  - `ErrorType: timeout`
  - `ErrorMessage: 频道搜索超时`

缓存命中处理：

- 当前 TG 缓存键按频道集合生成，缓存命中时无法知道单个频道贡献。
- 第一期方案：对请求中的每个频道记录 `CacheHit: true`、`Success: true`，`Duration: 0`，用于表示缓存覆盖但不参与响应时间分位计算。
- 第二期优化：缓存结果按 `SearchResult.Channel` 回推频道结果数量，补齐 `ResultCount`。

### 5.4 API 设计

新增管理员接口，命名与插件监控保持平行：

```text
GET /api/admin/channel-metrics/realtime
GET /api/admin/channel-metrics?channel_name={name}&from={rfc3339}&to={rfc3339}&limit=200
GET /api/admin/channel-metrics/errors?channel_name={name}&page=1&page_size=20
```

实时快照响应：

```json
{
  "active_channel_count": 2,
  "avg_response_ms": 840,
  "success_rate": 0.92,
  "timeout_rate": 0.04,
  "error_count": 3,
  "items": [
    {
      "channel_name": "yunpanpan",
      "request_count": 12,
      "success_count": 11,
      "timeout_count": 0,
      "error_count": 1,
      "cache_hit_count": 4,
      "result_count": 27,
      "max_concurrent_requests": 2,
      "avg_response_ms": 820,
      "p50_response_ms": 760,
      "p95_response_ms": 1460,
      "p99_response_ms": 1460,
      "success_rate": 0.9167,
      "timeout_rate": 0,
      "last_error": "解析频道内容失败"
    }
  ]
}
```

聚合指标响应：

```json
{
  "items": [],
  "range": {
    "from": "2026-07-05T00:00:00Z",
    "to": "2026-07-05T01:00:00Z"
  },
  "granularity": "5m"
}
```

错误日志响应：

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

## 六、前端设计

### 6.1 类型定义

新增 `frontend/src/types/channelMetrics.ts`：

- `ChannelMetricsRealtimeSnapshot`
- `ChannelMetricsRealtimeItem`
- `ChannelPerformanceMetric`
- `ChannelErrorLog`
- `ChannelObservabilityRow`
- `ChannelTrendPoint`
- `ChannelMetricStatusFilter`

字段命名与后端 JSON 保持 snake_case，组合后的前端行模型使用 camelCase。

### 6.2 数据控制器

新增 `frontend/src/hooks/useChannelMetricsController.ts`：

并行请求：

- `/api/admin/channel-metrics/realtime`
- `/api/admin/channel-metrics?limit=200`
- `/api/admin/channel-metrics/errors?page=1&page_size=20`
- `/api/admin/channels`

合并逻辑：

- 以频道名称小写值为主键。
- 合并频道配置、实时指标、聚合指标、健康状态。
- 排序优先级：异常频道、错误数、响应时间、频道名。
- 自动刷新周期与插件一致，为 30 秒。
- 如果实时窗口为空，则从最近聚合窗口构建快照兜底。

### 6.3 页面组件

新增或调整组件：

- `PerformanceObservabilityView.tsx`
  - 持有 `activeSection: "plugin" | "channel"`。
  - 渲染顶部导航。
  - 根据分组选中渲染插件或频道面板。
- `PluginPerformancePanel.tsx`
  - 从现有 `PluginPerformanceDashboard` 拆出。
- `ChannelPerformancePanel.tsx`
  - 复用 `AdminWorkspacePageFrame`、`AdminMetricGrid`、`AdminDataTable`、`AdminDetailDrawer`。
- `PerformanceSectionNav.tsx`
  - 参考 `SystemSettingsSectionNav`，使用 pills 导航。

`Admin.tsx` 中 `plugin_observability` 视图改为加载 `PerformanceObservabilityView`。

### 6.4 文案

频道监控标题建议：

- 标题：频道性能监控
- 描述：查看 Telegram 频道实时性能、聚合趋势、错误日志和健康状态，定位拖慢 TG 搜索链路的来源。
- 徽标：频道观测台

顶部导航文案：

- 插件监控
- 频道监控

## 七、分阶段实施计划

### 阶段一：频道指标基础设施

工作项：

1. 新增 `TGChannelPerformanceMetric` 与 `TGChannelErrorLog` 模型。
2. 更新数据库迁移，创建 `tg_channel_performance_metrics` 与 `tg_channel_error_logs`。
3. 新增 `TGChannelMetricsCollector`。
4. 增加聚合、实时快照、错误日志查询单元测试。

验收：

- 单元测试可验证聚合窗口、百分位计算、错误日志写入、环形缓冲容量。
- 本地迁移后数据库表结构可自动创建。

### 阶段二：搜索链路采集

工作项：

1. 将频道指标采集器注入 `tgSearchExecutor`。
2. 在单频道任务内记录成功、失败、耗时、结果数与并发。
3. 对 TG 缓存命中记录频道缓存事件。
4. 将搜索成功、失败、超时同步写入 `TGChannelHealthService`。
5. 补充 `search_executor_test.go` 的频道指标测试。

验收：

- 模拟频道成功时能在实时快照看到请求数、成功率、响应时间。
- 模拟频道失败时能写入错误日志并更新健康状态。
- 模拟缓存命中时能增加缓存命中数。

### 阶段三：后端 API

工作项：

1. 新增 `channel_metrics_handler.go`。
2. 注册 `/api/admin/channel-metrics/*` 路由。
3. 支持 `channel_name`、`from`、`to`、`limit`、`page`、`page_size` 查询参数。
4. 补充 handler 测试。

验收：

- 空采集器返回空结构而不是 500。
- 时间参数错误返回 `400`。
- 查询结果按时间倒序，分页参数有边界保护。

### 阶段四：前端频道监控

工作项：

1. 新增频道指标类型。
2. 新增 `useChannelMetricsController`。
3. 新增 `ChannelPerformancePanel`。
4. 新增 `PerformanceSectionNav` 和 `PerformanceObservabilityView`。
5. 调整 `Admin.tsx` 懒加载入口。
6. 补充组件与 Hook 测试。

验收：

- 性能监控页默认进入插件监控。
- 顶部导航可切换插件监控与频道监控。
- 频道监控可展示指标卡、趋势图、表格、详情抽屉和错误日志。
- 请求失败时显示中文错误提示，并保留刷新入口。

### 阶段五：清理与运维

工作项：

1. 扩展指标清理任务，删除 30 天前频道聚合指标和 7 天前频道错误日志。
2. 在 `docs/readme_YYMM.md` 追加开发记录。
3. 更新本方案执行状态或迁移说明。

验收：

- 清理任务只删除过期频道指标，不影响插件指标。
- 文档记录包含新增表、接口、验证命令和回滚说明。

## 八、测试策略

后端测试：

- `backend/service/tg_channel_metrics_collector_test.go`
  - 聚合成功、失败、超时、缓存命中。
  - P50/P95/P99 百分位计算。
  - 环形缓冲容量裁剪。
  - 查询指标与错误日志。
- `backend/api/channel_metrics_handler_test.go`
  - 实时指标。
  - 聚合指标。
  - 错误日志。
  - 非法时间参数。
- `backend/service/search_executor_test.go`
  - TG 搜索成功记录频道指标。
  - TG 搜索失败更新健康状态。
  - TG 缓存命中记录缓存事件。

前端测试：

- `frontend/src/hooks/__tests__/useChannelMetricsController.test.tsx`
  - 并行拉取与数据合并。
  - 实时数据为空时使用聚合指标兜底。
  - 状态筛选、搜索筛选、选中频道错误日志。
- `frontend/src/components/admin/__tests__/ChannelPerformancePanel.test.tsx`
  - 指标卡、趋势图、表格、详情抽屉。
  - 空态与错误态。
- `frontend/src/components/admin/__tests__/PerformanceObservabilityView.test.tsx`
  - 默认插件页。
  - 顶部导航切换到频道页。

本地验证命令：

```bash
cd backend && go test ./service ./api
cd frontend && pnpm test -- --run src/hooks/__tests__/useChannelMetricsController.test.tsx src/components/admin/__tests__/ChannelPerformancePanel.test.tsx src/components/admin/__tests__/PerformanceObservabilityView.test.tsx
cd frontend && pnpm lint
```

## 九、回滚方案

如上线后频道监控出现问题：

1. 前端先隐藏顶部「频道监控」分组，仅保留插件监控。
2. 后端保留表结构，停止注入 `TGChannelMetricsCollector`。
3. API 返回空结构，避免影响管理后台页面加载。
4. 搜索链路保留原有 `tgSearchExecutor` 行为，不影响用户搜索。

## 十、风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 频道数量较多导致事件量上升 | 数据库写入压力增加 | 继续使用内存缓冲与 5 分钟批量写入 |
| TG 缓存命中无法精确归因单频道 | 频道缓存命中与结果数不够精确 | 第一期按请求频道均摊缓存事件，第二期按结果频道回推 |
| 超时任务无法直接知道具体未完成频道 | 超时错误日志可能漏记 | 在任务包装层记录提交频道集合与完成集合，对差集写入超时事件 |
| 频道管理和频道监控边界混淆 | 页面职责变重 | 监控页只提供观测与测试，配置编辑保留在频道管理页 |
| 与插件监控组件重复 | 维护成本增加 | 第一期先复制同构模式，稳定后抽象通用观测组件 |

## 十一、交付清单

- 后端模型：`TGChannelPerformanceMetric`、`TGChannelErrorLog`。
- 后端服务：`TGChannelMetricsCollector`。
- 后端接口：`/api/admin/channel-metrics/realtime`、`/api/admin/channel-metrics`、`/api/admin/channel-metrics/errors`。
- 前端类型：`channelMetrics.ts`。
- 前端 Hook：`useChannelMetricsController.ts`。
- 前端组件：`PerformanceObservabilityView`、`PerformanceSectionNav`、`ChannelPerformancePanel`。
- 测试：后端服务与接口测试、前端 Hook 与组件测试。
- 文档：本方案、开发记录、验证报告。
