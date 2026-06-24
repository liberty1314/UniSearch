# SeedHub 分批展示与类型均衡解析优化方案

生成时间：2026-06-24 14:40:00 CST

## 1. 背景与问题

当前 SeedHub/sidhub 插件已经能把超过预解析上限的 `link_start` 资源兜底标记为 `scan_transfer`，但兜底资源没有二维码图片或二维码值。用户点击后会看到“当前资源暂未返回二维码图片”，再点击“打开链接”仍会跳转到 SeedHub 原始网页，体验不理想。

截图反映的问题不是单纯“是否识别为扫码资源”，而是：

- 可见结果里仍存在未完整解析的 SeedHub 扫码资源。
- 未完整解析资源只能展示空二维码占位。
- 弹窗里的“打开链接”仍会把用户带回原始 SeedHub 页面。
- 全局只解析前 8 条 `link_start`，会导致第 8 条后的可见结果质量明显下降。

用户调整后的目标是：

- SeedHub 以外的插件保持现状。
- SeedHub 插件每个资源类型的前 N 条 `link_start` 尝试完整解析，例如磁力 N 条、百度 N 条、夸克 N 条等。
- 同一资源类型超过 N 条后的 `link_start` 不再发起获取，也不再解析。
- N 的默认值为 3，并允许用户在插件中心的 SeedHub 插件配置中调整。
- 搜索按钮触发后首批仅加载 48 条。
- 继续加载每次仅加载 24 条。
- SeedHub 已进入解析预算的内容要完整解析，而不是只使用全局前 8 条。

## 2. 可行性分析

该方向可行，但建议拆成两个层次实现。

### 2.1 当前前端已有 48 条首屏展示能力

现有前端搜索 store 已经有本地懒加载：

- `displayedCount` 初始为 `48`。
- `SearchResults` 只渲染 `allSortedResults.slice(0, displayedCount)`。
- 已有测试覆盖“1000 条结果只渲染 48 条”。

因此“搜索后先展示 48 条”不需要新建 UI 框架。

### 2.2 当前继续加载步长还是 48

当前 `loadMore` 使用同一个 `pageSize`：

- 初始显示：48 条。
- 每次继续加载：再加 48 条。

如果要满足“后续每次 24 条”，需要把“初始显示数量”和“追加数量”拆成两个常量：

- `INITIAL_DISPLAY_COUNT = 48`
- `LOAD_MORE_INCREMENT = 24`

这是前端展示层调整，不需要改后端协议。

### 2.3 当前后端搜索不是分页加载

当前搜索接口一次返回完整 `resources`，前端只做本地分批渲染。也就是说，现阶段“仅加载 48 条、继续加载 24 条”如果严格理解为“后端只返回 48 条，再请求 24 条”，需要新增搜索分页或游标协议，改动面较大。

推荐不要第一阶段就做真实后端分页。先用现有本地分批展示解决渲染压力，再把 SeedHub 解析预算从“全局前 8 条”改为“类型均衡的可见窗口解析”，优先解决扫码体验。

### 2.4 每类型前 N 条比全局前 8 条更合理

当前全局 8 条会被某一种资源类型快速耗尽，例如百度或夸克占满后，其他类型没有机会完整解析。

改成“每个资源类型前 N 条”更符合用户浏览习惯：

- 百度、夸克、UC、迅雷等扫码资源都能至少有几条完整可用结果。
- 磁力类 `link_start` 也能优先解析为真实下载链接。
- 避免首屏中某些类型全部是空二维码兜底。
- N 可配置，管理员可以在“速度”和“完整解析数量”之间自行取舍。

### 2.5 插件中心需要补齐运行配置存储

当前插件 manifest 已有 `config_schema` 字段，插件中心详情页也能展示配置项，但现有代码里还没有完整的插件配置保存接口与持久化模型。

因此“在插件中心 SeedHub 中控制数量”需要新增插件级配置能力：

- SeedHub manifest 暴露配置项。
- 插件中心渲染该配置表单。
- 后端提供读取/保存插件配置接口。
- SeedHub 搜索时读取该配置，并回退到默认值 3。

## 3. 推荐优化方案

采用两阶段方案。

第一阶段先做低风险体验修复：

- 前端展示改为首屏 48、后续每次 24。
- SeedHub 后端解析改为“按资源类型前 N 条完整解析，超过 N 条不抓取不解析”。
- 插件中心支持配置 SeedHub 的每类型解析数量。
- 保留后端一次搜索返回完整结果的现状。
- 不新增搜索分页接口。

第二阶段如仍有性能压力，再做真实后端游标加载：

- 搜索接口增加 SeedHub 专用分页参数或游标。
- 首次只返回 48 条可见候选。
- 继续加载再请求后续 24 条。

## 4. 第一阶段具体方案

### 4.1 前端展示分批调整

目标：

- 用户搜索后首屏显示 48 条。
- 触底或点击继续加载时，每次追加 24 条。

建议调整：

- 在 `frontend/src/stores/searchStore.ts` 中拆分数量语义：
  - `initialDisplayCount = 48`
  - `loadMoreIncrement = 24`
- 搜索开始、搜索完成、渐进式 batch 更新时，`displayedCount` 重置为 `initialDisplayCount`。
- `loadMore` 中从 `displayedCount + pageSize` 改为 `displayedCount + loadMoreIncrement`。
- 保持现有 `SearchResults`、`useSearchResultsPresentation` 的切片展示逻辑。

验收：

- 1000 条结果首屏仍只渲染 48 条。
- 第一次继续加载后渲染 72 条。
- 第二次继续加载后渲染 96 条。

### 4.2 SeedHub 类型均衡解析预算

目标：

- 不再使用全局前 8 条作为唯一预解析预算。
- 每个资源类型前 N 条 `link_start` 都尝试完整解析。
- 同一资源类型超过 N 条后的 `link_start` 不发起获取，也不解析页面内容。
- 超过 N 条的资源仍可作为搜索结果展示，但标记为延迟解析或未解析，避免误导为已完整可用。

建议新增常量：

```go
defaultPreResolvedLinkStartPerType = 3
```

资源类型范围：

- `magnet`
- `baidu`
- `quark`
- `xunlei`
- `uc`
- `aliyun`

建议调整 `resolveLinkStartEntries`：

1. 遍历 SeedHub 详情页解析出的 entries。
2. 从 SeedHub 插件配置读取 `pre_resolved_link_start_per_type`，缺失时使用默认值 3。
3. 对每个 `link.Type` 维护已完整解析数量。
4. 如果当前 entry 是 SeedHub `link_start` 且该类型计数小于 N，则执行真实预解析。
4. 如果真实预解析成功，返回完整结果：
   - 网盘扫码页返回 `access_mode = scan_transfer` 和二维码/口令/二维码值。
   - 磁力下载页返回真实 `magnet:` 链接。
   - 其他直接网盘页返回真实网盘链接和提取码。
5. 如果真实预解析失败，返回兜底 `scan_transfer`，并记录 `sid_hub_resolution_status = fallback`。
6. 超过每类型 N 条的 `link_start` 不调用 `fetchURL`，不调用 `resolveLinkStartLink`，直接记录 `sid_hub_resolution_status = deferred`。
7. `deferred` 资源的 `scan_transfer` 只保留最小定位信息，不承诺已有二维码：
   - `provider`
   - `source_page_url`
   - `refresh_key`
   - `instruction`

推荐补充一个配置结构：

```go
type sidHubRuntimeOptions struct {
    PreResolvedLinkStartPerType int
}
```

并提供归一化规则：

- 默认值：3。
- 最小值：0，表示完全不预解析 SeedHub `link_start`。
- 最大值：20，避免管理员误填过大导致搜索阻塞。
- 非法值回退默认值 3。

### 4.3 插件中心配置项

目标：

- 管理员可以在插件中心的 SeedHub 详情/配置区域调整每类型完整解析数量。
- 配置保存后影响后续搜索，不要求影响已缓存的旧结果。

SeedHub manifest 建议新增 `config_schema`：

```json
[
  {
    "key": "pre_resolved_link_start_per_type",
    "label": "每类完整解析数量",
    "type": "number",
    "required": false,
    "default": 3,
    "description": "SeedHub 每种资源类型前 N 条 link_start 会尝试完整解析，超过 N 条不抓取不解析。",
    "group": "解析性能"
  }
]
```

插件中心需要补齐：

- `GET /api/admin/plugins/:name/config`
  - 返回当前插件配置和 manifest `config_schema`。
- `PUT /api/admin/plugins/:name/config`
  - 保存插件配置。
  - 对 `pre_resolved_link_start_per_type` 做整数校验和范围限制。

后端建议新增轻量持久化表：

```text
plugin_runtime_configs
- plugin_name
- config_json
- updated_at
```

SeedHub 插件读取配置的推荐路径：

1. 搜索服务调用插件前，把插件运行配置放入 `ext`。
2. SeedHub 从 `ext["sidhub_pre_resolved_link_start_per_type"]` 或插件配置服务读取。
3. 没有配置时使用默认值 3。

### 4.4 SeedHub 排序优化

目标：

- 已完整解析的 SeedHub 资源优先展示。
- 未完整解析的兜底资源靠后，避免首屏出现空二维码弹窗。

建议在 SeedHub 结果 `Meta` 中增加：

- `sid_hub_resolution_status`
  - `resolved`
  - `fallback`
  - `deferred`
- `sid_hub_resolution_rank`
  - `0`：完整解析
  - `1`：预解析失败但可刷新
  - `2`：超过预算延迟解析

后端或前端排序时优先使用该信息：

- SeedHub 已解析资源排在 SeedHub 未解析资源之前。
- 非 SeedHub 插件保持现有排序，不受影响。

第一阶段推荐在前端 `searchResultSorter` 做轻量排序补充：

- 仅当 `resource.source.id` 或 `source.plugin_id` 是 `sidhub` 时读取该 meta。
- 非 SeedHub 结果不参与这个特殊排序。

### 4.5 弹窗体验优化

目标：

- 未返回二维码的 SeedHub 兜底资源不要鼓励用户直接跳转原始网页。

建议调整：

- 当 `access_mode = scan_transfer` 且 `scan_transfer.refreshable = true` 但没有二维码时，主按钮文案优先为“获取二维码”。
- “打开链接”降级为次要操作，或只在刷新失败后显示。
- 如果刷新成功，直接展示二维码、二维码值或口令。

该项不是必须，但能直接解决截图里的“打开链接又回原站”的观感问题。

## 5. 第二阶段：真实后端分批加载

只有在第一阶段后仍存在明显性能问题时，再做第二阶段。

### 5.1 新增协议

搜索请求增加可选字段：

```json
{
  "page_size": 48,
  "cursor": ""
}
```

搜索响应增加：

```json
{
  "next_cursor": "seedhub:...",
  "has_more": true
}
```

### 5.2 适用范围

第二阶段不建议一次性改所有插件。

推荐只对 SeedHub 使用游标：

- 其他插件继续一次返回。
- SeedHub 首次只返回首批解析完成的 48 条候选。
- 继续加载时只拉取 SeedHub 后续 24 条。

### 5.3 风险

真实后端分页会引入以下复杂度：

- 搜索结果跨插件排序稳定性。
- 游标缓存与过期。
- 过滤条件变化后的游标失效。
- 渐进式搜索事件协议兼容。

因此不推荐作为第一阶段。

## 6. 不推荐方案

### 6.1 直接全量解析所有 SeedHub `link_start`

不推荐。

原因：

- SeedHub 单个详情页可能有大量资源。
- 当前最多搜索 5 个影片卡片。
- 全量预抓可能导致大量外站请求，显著拖慢搜索。
- Cloudflare 或 SeedHub 限流风险更高。

### 6.2 继续只做兜底 `scan_transfer`

不推荐。

原因：

- 虽然避免了直接点击卡片跳原站，但弹窗没有二维码。
- 用户仍会通过“打开链接”进入 SeedHub。
- 首屏可见结果质量不稳定。

### 6.3 第一阶段就做全局后端分页

不推荐。

原因：

- 当前前端已有本地懒加载，先复用即可。
- 后端分页需要新增请求协议和缓存游标，改动面较大。
- 当前主要痛点是 SeedHub 解析质量，而不是 DOM 渲染数量。

## 7. 实施顺序

建议按以下顺序实施：

1. 调整前端懒加载数量：首屏 48，后续 24。
2. 为 SeedHub manifest 增加 `pre_resolved_link_start_per_type` 配置项。
3. 补齐插件中心配置保存/读取能力。
4. 调整 SeedHub 解析预算：从全局 8 条改为每资源类型前 N 条。
5. 超过 N 条的同类型 `link_start` 不抓取、不解析，仅标记 deferred。
6. 为 SeedHub 解析状态写入 meta。
7. 排序中让 SeedHub 已完整解析资源优先于 fallback/deferred 资源。
8. 优化扫码弹窗：无二维码但可刷新时优先“获取二维码”，弱化“打开链接”。
9. 跑后端 SeedHub 单测和前端搜索结果测试。
10. 真实浏览器搜索 `迈克尔·杰克逊：巨星之路` 验证首屏 SeedHub 资源质量。

## 8. 测试计划

### 8.1 后端单测

新增或调整 `backend/plugin/sidhub/sidhub_test.go`：

- 每个资源类型前 3 条 `link_start` 会被预解析。
- 第 4 条同类型 `link_start` 不调用 fetcher、不解析页面，进入 deferred。
- 百度、夸克、UC、迅雷等扫码页能返回 `scan_transfer` 载荷。
- 磁力 `link_start` 能优先解析为真实 `magnet:` 链接。
- 预解析失败时返回 fallback，并生成 refresh_key。
- 配置为 5 时，每类型前 5 条会被预解析。
- 配置为 0 时，所有 SeedHub `link_start` 都不预抓，全部进入 deferred。
- 配置为空、非法或超过上限时，按归一化规则回退或截断。

执行：

```bash
cd backend && go test ./plugin/sidhub
```

### 8.2 前端单测

调整 `frontend/src/components/__tests__/SearchResults.test.tsx` 或 store 相关测试：

- 1000 条资源首屏渲染 48 条。
- 调用一次 `loadMore` 后显示 72 条。
- 再调用一次显示 96 条。
- SeedHub `sid_hub_resolution_rank = 0` 的结果排在 `rank = 2` 前。
- 无二维码但可刷新的扫码资源主操作不直接表现为“打开链接”。
- 插件中心 SeedHub 详情页展示“每类完整解析数量”配置项。
- 保存配置后再次打开插件中心能看到最新值。

执行：

```bash
cd frontend && pnpm test -- SearchResults
```

### 8.3 手工验证

关键词：

```text
迈克尔·杰克逊：巨星之路
```

验收点：

- 首屏展示 48 条。
- 继续加载每次追加 24 条。
- SeedHub 各资源类型前 N 条优先有完整解析结果。
- 同类型第 N+1 条不会触发后台预抓请求。
- 点击首屏 SeedHub 百度/夸克/UC/迅雷扫码资源时，优先展示二维码、二维码值或口令。
- 没有二维码时优先尝试刷新，不再把“打开链接”作为主要路径。

## 9. 推荐结论

用户方案方向可行，但建议优化为：

- 第一阶段不做真实后端分页，先复用已有前端本地懒加载。
- 把前端追加步长从 48 改为 24。
- SeedHub 解析从“全局前 8 条”改为“每资源类型前 N 条”，默认 N=3。
- N 通过插件中心 SeedHub 配置控制，并限制在 0-20。
- 同类型超过 N 条的 `link_start` 不获取、不解析，只保留延迟解析状态。
- 对未完整解析资源做排序降级和弹窗主操作优化，避免首屏空二维码和直接跳原站。
- 第二阶段再评估是否需要 SeedHub 专用后端游标加载。

这样能用较小改动先解决当前体验问题，并保留后续扩展到真实分批加载的空间。
