# sidhub 插件超时优化方案

更新时间：2026-07-10

## 一、背景

管理后台性能监控显示 `sidhub` 插件出现稳定超时，最近错误日志为 `插件搜索超时`，耗时约 `4001 ms`。这类耗时与当前运行时的 4 秒响应阈值高度一致，说明问题不是单纯的 HTML 解析失败，而是 sidhub 的搜索执行链路经常无法在服务层等待窗口内返回。

本方案聚焦 sidhub 专项优化，不替代已有的全局插件监控、熔断、优先级和指标体系。

## 二、现状与根因

### 2.1 sidhub 执行链路更重

sidhub 当前搜索流程是：

1. 请求 SeedHub 搜索页：`/s/{keyword}/`。
2. 解析最多 5 个影视卡片。
3. 对每个卡片串行请求详情页。
4. 从详情页解析网盘、磁力、ed2k、迅雷等资源入口。
5. 如果启用了 `pre_resolved_link_start_per_type`，还会进一步请求 `/link_start/` 页面解析真实链接或扫码转存载荷。
6. 主域名失败时再尝试 fallback 域名。

这意味着一次 sidhub 搜索可能包含 1 次搜索页请求 + 最多 5 次详情页请求 + 可选 link_start 请求。与多数插件只请求搜索页和少量并发详情页相比，sidhub 天然更容易越过 4 秒窗口。

### 2.2 sidhub 没有走通用异步快速返回包装

多数插件使用 `BaseAsyncPlugin.AsyncSearchWithResult`，命中 `ASYNC_RESPONSE_TIMEOUT` 时会先返回空结果或缓存结果，并让后台继续完成搜索和更新缓存。

sidhub 当前直接实现 `SearchWithResult -> doSearch`，同步等待完整搜索结果返回。服务层超过阈值后会直接把该次请求记为 timeout。

### 2.3 外层超时不能取消 sidhub 内部抓取

sidhub 内部调用 `searchBaseURL(context.Background(), ...)`，真实请求又通过 `cloudscraper.Get` 执行。服务层超时后，外层 goroutine 返回 timeout 指标，但 sidhub 内部请求可能仍在运行。

由于服务层对单插件加了互斥锁，上一轮未结束的 sidhub 请求会阻塞下一轮同插件请求，形成：

超时 -> 后台仍在跑 -> 锁被占用 -> 新请求等待锁 -> 再次超时

这就是“总是超时”的放大机制。

### 2.4 自适应超时进一步压缩等待时间

服务层会根据插件健康状态计算动态超时：

- 超时率 > 70%：使用基准超时的 40%
- 超时率 > 50%：使用基准超时的 50%
- 超时率 > 30%：使用基准超时的 70%
- 其他：使用完整基准超时

如果基准超时为 10 秒，sidhub 历史超时率超过 70% 后，实际等待约为 4 秒。这与观测到的 `4001 ms` 对齐。

## 三、优化目标

P0 目标：

- sidhub 不再因为一次慢请求长期占用插件锁。
- sidhub 搜索在 4 秒窗口内可以返回可用的部分结果、缓存结果或明确的非最终状态。
- timeout 指标能区分“真实不可用”和“后台处理中”。

P1 目标：

- 首次冷搜索尽量在 4 秒内返回至少搜索页级别结果。
- 详情页与 link_start 解析后台化、可缓存、可复用。
- Cloudflare 或站点慢响应时自动降级到 fallback 链接，不阻塞全局搜索体验。

P2 目标：

- sidhub 具备独立运行时配置，可按插件调节卡片数、详情并发、预解析数量和超时策略。

## 四、推荐方案

### 4.1 P0：接入异步快速返回模型

将 sidhub 改为使用 `BaseAsyncPlugin.AsyncSearchWithResult` 包装，但保留 sidhub 自己的解析逻辑：

```go
func (p *SidHubAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
    return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}
```

调整 `doSearch` 接收传入的客户端和上下文控制策略，避免绕过通用异步机制。

预期收益：

- 4 秒内未完成时返回 `IsFinal=false`，不再直接把用户侧体验变成失败。
- 后台完成后写入主缓存，下一次同关键词可快速命中。
- 与其他插件行为统一，便于观测与调度。

注意事项：

- 需要避免 sidhub 自己的 `searchCache` 与 BaseAsyncPlugin 缓存语义冲突。
- 如果继续保留 sidhub 本地缓存，缓存 key 必须包含运行时配置和 baseURL。

### 4.2 P0：让外层超时可取消内部请求

将 sidhub 的内部调用从 `context.Background()` 改成可传入的 `ctx`：

- `doSearch(ctx, client, keyword, ext)`
- `searchBaseURL(ctx, baseURL, keyword, runtimeConfig)`
- `fetchURL(ctx, targetURL)`
- `resolveLinkStartEntries(ctx, entries, movieID, limit)`

对于 `cloudscraper.Get` 无法直接接收 context 的问题，保留当前 goroutine + select 模式，但必须确保：

- 外层 ctx 超时后尽快返回。
- 已拿到的 response body 必须关闭。
- 后续解析循环每个阶段都检查 `ctx.Err()`。

预期收益：

- 服务层判定超时后，sidhub 内部能更快释放插件锁。
- 避免慢请求堆积导致后续请求被锁阻塞。

### 4.3 P0：拆分“搜索页结果”和“详情页增强”

把 sidhub 搜索拆成两层结果：

1. 快速层：只请求搜索页，返回影视卡片和详情页 fallback 链接。
2. 增强层：后台请求详情页，补充真实资源链接。

快速层结果可以用 `IsFinal=false` 返回，增强层完成后更新缓存。

建议行为：

- 搜索页成功、详情页未完成：返回卡片结果，链接可指向详情页或标记为待解析。
- 详情页成功：返回完整资源链接。
- link_start 未解析：返回扫码转存 fallback 链接，点击时再刷新。

预期收益：

- 首屏结果不再被 5 个详情页串行请求阻塞。
- 即使 SeedHub 详情页慢，用户也能看到候选资源。

### 4.4 P1：详情页并发化并设置小超时

当前详情页循环是串行的。建议改为受限并发：

- 默认 `detail_concurrency = 2` 或 `3`
- 单详情页超时 `2s-3s`
- 总详情增强预算 `3s-4s`
- 超时的卡片返回 fallback，不影响其他卡片

示例策略：

| 阶段 | 超时预算 | 失败行为 |
|---|---:|---|
| 搜索页 | 2s | 尝试 fallback 域名 |
| 单详情页 | 2s | 返回卡片 fallback |
| 详情增强总预算 | 4s | 返回已完成详情 |
| link_start 预解析 | 默认关闭 | 点击时刷新 |

### 4.5 P1：默认关闭搜索阶段 link_start 预解析

当前默认 `pre_resolved_link_start_per_type = 0` 是合理的，应保持默认关闭。

后续可以增加更细粒度配置：

- `max_search_cards`：默认 3 或 5。
- `detail_concurrency`：默认 2。
- `detail_timeout_seconds`：默认 2。
- `enable_search_stage_link_start_resolve`：默认 false。
- `base_url_strategy`：primary_only / fallback_on_error / both。

建议不要在搜索阶段主动解析大量 link_start，因为该步骤常常涉及扫码转存、反爬、跳转或动态脚本，最容易拖慢整体响应。

### 4.6 P1：调整 sidhub 健康状态的超时计数语义

如果 sidhub 走异步快速返回，外层 4 秒内返回 `IsFinal=false` 不应被简单记为“插件失败”。建议区分：

- `timeout`：完整搜索超过服务层硬超时，并且后台也未能完成。
- `deferred`：快速窗口未完成，但后台继续处理。
- `partial_success`：返回搜索页或部分详情页结果。
- `success`：返回完整详情资源。

这样自适应超时不会因为“后台处理中”持续降低 sidhub 的超时预算，避免 4 秒阈值越来越常见。

### 4.7 P2：对 sidhub 单独降低调度优先级但保留后台价值

sidhub 资源质量较高，但链路慢。建议在渐进式搜索中归为 Slow Tier：

- 不参与首批快速源竞争。
- 延迟 1s-2s 启动，给快速插件先返回。
- 后台完成后补充结果或写缓存。
- 管理后台显示为“慢源后台增强”，而不是普通失败源。

## 五、实施计划

### 阶段一：快速止血，1 天

1. 将 `SearchWithResult` 改为走 `AsyncSearchWithResult`。
2. 保持 `pre_resolved_link_start_per_type = 0` 默认不变。
3. 为 sidhub 增加最小回归测试：慢搜索超过 `ASYNC_RESPONSE_TIMEOUT` 时返回 `IsFinal=false`，后台可完成缓存。
4. 验证管理后台不再将所有 4 秒未完成请求都展示成硬失败。

验收标准：

- `go test ./plugin/sidhub ./service` 通过。
- 人工搜索冷关键词时，sidhub 不再连续占用插件锁导致下一次请求立即超时。
- 监控中 sidhub timeout 数下降，deferred 或 partial_success 数上升。

### 阶段二：释放锁与可取消，1-2 天

1. 把 sidhub 搜索链路改为显式传递 context。
2. 外层超时后，内部详情页循环和 link_start 解析能及时退出。
3. 增加测试：模拟 fetcher 阻塞，ctx cancel 后搜索能快速返回。
4. 检查所有 response body 在取消路径都能关闭。

验收标准：

- 慢 fetcher 不会让后续同插件请求长时间等待锁。
- goroutine 数不会随连续超时持续增长。

### 阶段三：部分结果与详情并发，2-3 天

1. 把搜索页卡片解析和详情页资源解析拆开。
2. 搜索页成功即可生成 fallback 结果。
3. 详情页解析改为受限并发。
4. 每个详情页失败或超时只影响当前卡片。
5. 缓存增强后的最终结果。

验收标准：

- SeedHub 搜索页可用但详情页慢时，接口仍能返回部分结果。
- 详情页并发不会超过配置值。
- 同关键词第二次搜索优先返回缓存增强结果。

### 阶段四：观测与配置，1-2 天

1. 增加 sidhub 专项运行时配置字段。
2. 管理后台插件配置展示这些字段。
3. 指标区分 timeout、deferred、partial_success、success。
4. 性能面板展示 sidhub 的搜索页耗时、详情页耗时、详情成功数、fallback 数。

验收标准：

- 后台能看到 sidhub 慢在搜索页、详情页还是 link_start。
- 调整详情并发和超时后无需重新部署。

## 六、测试方案

单元测试：

- `TestSidHubAsyncTimeoutReturnsNonFinalResult`
- `TestSidHubSearchContextCancelStopsDetailLoop`
- `TestSidHubReturnsCardFallbackWhenDetailTimeout`
- `TestSidHubDetailEnhancementCachesFinalResults`
- `TestSidHubPreResolvedLinkStartDefaultDisabled`

服务层测试：

- 慢 sidhub 不阻塞其他插件结果。
- sidhub deferred 不计为硬 timeout。
- 连续 deferred 不触发过度自适应降级。

人工验证：

1. 清空 sidhub 相关缓存。
2. 搜索冷门关键词和热门关键词各 3 次。
3. 观察首次响应、后台完成、第二次缓存命中。
4. 在管理后台查看性能监控与错误日志。

建议命令：

```bash
cd backend
go test ./plugin/sidhub ./service
```

## 七、风险与回滚

风险一：快速返回空结果导致用户误以为 sidhub 没资源。

缓解：返回 `IsFinal=false` 和 source warning，前端标记为“后台解析中”；后台完成后缓存补齐。

风险二：详情页并发增加 SeedHub 访问压力。

缓解：默认并发控制在 2；单请求设置短超时；失败后回退 fallback。

风险三：Cloudflare 绕过器不支持原生 context，取消不彻底。

缓解：继续使用 goroutine + select 包装，外层先释放等待；同时限制同插件后台任务数量，避免堆积。

风险四：指标语义变化影响现有监控。

缓解：保留 timeout 字段；新增 deferred 和 partial_success，不改变旧 API 字段含义。

回滚策略：

1. 保留原 `doSearch` 同步实现入口一版。
2. 通过 sidhub 运行时配置关闭详情并发或关闭异步增强。
3. 如出现异常，临时将 sidhub 从 `ENABLED_PLUGINS` 移除，保留其他插件搜索能力。

## 八、最终推荐

优先做 P0：

1. sidhub 接入 `AsyncSearchWithResult`。
2. 外层 context 贯穿 sidhub 内部抓取。
3. 超时后释放锁，后台完成写缓存。

这三项能直接解决“总是超时”的放大机制。随后再做详情页并发化和部分结果返回，把 sidhub 从阻塞型慢插件改造成后台增强型高价值插件。
