# 搜索可观测性与渐进式搜索说明

## 渐进式搜索协议

`POST /api/search/progressive` 复用现有搜索请求体，响应类型为 `application/x-ndjson`。每一行都是一个事件对象，事件类型固定为：

| 类型 | 语义 |
| --- | --- |
| `started` | 服务端已接收请求并完成来源计算，包含 `total_sources`。 |
| `batch` | 某个来源已返回可展示结果，包含当前聚合后的 `resources`、`warnings`、`completed_sources`、`total_sources` 和 `received_batches`。 |
| `warning` | 某个来源失败或超时，前端只做摘要提示，不阻断其他来源结果展示。 |
| `complete` | 搜索结束，`response` 字段与 `/api/search` 的数据结构同形。 |
| `error` | 渐进式链路自身失败，搜索页会回退到 `/api/search`。 |

搜索页优先使用渐进式接口；若浏览器不支持流式读取、接口不可用或事件解析失败，会自动回退到现有 `/api/search`。

## Warning 语义

warning 表示部分来源失败、超时或主动降级，不表示整次搜索失败。验收时允许响应带 warning，但不允许请求整体卡死或超出脚本超时上限。

前端展示规则：

- 已收到首批结果时立即展示资源列表。
- 顶部工具栏展示“仍在搜索 X/Y 个来源”。
- warning 收敛在工具栏的“部分来源异常/超时”摘要中，不使用大横幅打断浏览。

## 插件健康来源

插件健康快照的 `check_source` 当前支持：

| 来源 | 说明 |
| --- | --- |
| `manual_test` | 管理员手动点击插件测试。 |
| `search_failure` | 真实搜索过程中插件返回错误。 |
| `timeout` | 真实搜索过程中插件超过超时上限。 |

后台插件中心会展示最近检查时间、失败原因和来源类型，并提供“仅测试异常插件”入口复用现有插件测试接口。

## 搜索观测接口

管理员只读接口：

```http
GET /api/admin/search-observability
```

返回内容包括搜索次数、平均耗时、缓存命中/未命中、缓存命中率、超时次数、warning 次数、结果数分布、Top 关键词和最近异常摘要。系统信息页会展示其中的搜索健康摘要。

## 排障步骤

1. 先运行 `scripts/tests/real-search-smoke.sh`，确认真实登录态 `/api/search` 能在超时上限内返回。
2. 打开后台系统信息页，查看搜索健康摘要中的平均耗时、插件超时和最近异常。
3. 打开插件中心，按“异常”筛选或点击“仅测试异常插件”，确认失败来源是否已恢复。
4. 若只在渐进式接口失败，搜索页应自动回退 `/api/search`；可查看浏览器网络面板确认最后是否有 `complete` 或 `error` 事件。
5. 若测试用户残留，运行 `scripts/tests/cleanup-test-data.sh` 清理 `codexqa_*` 用户及关联登录统计、刷新令牌。
