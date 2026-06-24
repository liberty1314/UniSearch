# SeedHub 分批展示与类型可配置解析开发计划

生成时间：2026-06-24 15:05:00 CST

## 1. 开发目标

基于 `docs/sidhub-progressive-resolution-optimization-plan.md`，本次开发目标是：

- SeedHub 每个资源类型前 N 条 `link_start` 尝试完整解析。
- 同一资源类型第 N+1 条及之后不发起页面获取，也不进行解析。
- N 默认值为 3，并可在插件中心的 SeedHub 配置中调整。
- 搜索结果首屏展示 48 条，继续加载每次追加 24 条。
- 未完整解析的 SeedHub 资源降低展示优先级，避免首屏大量空二维码。
- 无二维码但可刷新的扫码弹窗优先引导“获取二维码”，弱化直接打开原站。

不做真实后端分页，不改其他插件解析行为。

## 2. 阶段拆分

### 阶段一：插件配置能力（已完成）

目标：让插件中心能保存并读取 SeedHub 的运行配置。

后端改动：

- 在 `backend/model` 新增插件运行配置模型：
  - `plugin_name`
  - `config_json`
  - `updated_at`
- 新增 `PluginRuntimeConfigService`：
  - 获取插件配置。
  - 保存插件配置。
  - 按 manifest `config_schema` 做基础校验。
- 新增管理接口：
  - `GET /api/admin/plugins/:name/config`
  - `PUT /api/admin/plugins/:name/config`
- 在路由中注册上述接口。

前端改动：

- 在插件中心详情页中把现有只读 `config_schema` 区域升级为可编辑表单。
- 支持 `number` 类型字段。
- SeedHub 配置保存成功后刷新当前插件详情。

验收：

- SeedHub 插件详情页展示“每类完整解析数量”。
- 修改配置后刷新页面仍能保留。
- 非 SeedHub 插件没有配置项时保持现状。
- 完成记录：已新增插件运行配置模型、服务、管理接口与前端数字配置表单；弹窗式插件管理和页面级插件中心右侧详情均支持 SeedHub 解析条数配置。

### 阶段二：SeedHub manifest 与配置读取（已完成）

目标：SeedHub 声明配置项，并在搜索时读取配置。

后端改动：

- 在 `backend/plugin/sidhub/sidhub.go` 的 manifest 增加 `ConfigSchema`：
  - key：`pre_resolved_link_start_per_type`
  - label：`每类完整解析数量`
  - type：`number`
  - default：`3`
  - group：`解析性能`
- 新增 SeedHub 运行配置归一化：
  - 默认值：3。
  - 最小值：0。
  - 最大值：20。
  - 非法值回退默认值。
- 搜索执行时把插件运行配置传入插件 `ext`，SeedHub 从 `ext` 读取该值。

验收：

- 未保存配置时 SeedHub 使用 3。
- 保存 5 后，SeedHub 每类型只返回前 5 条 `link_start` 资源并尝试完整解析。
- 保存 0 后，SeedHub 不预抓也不返回任何 `link_start` 资源。
- 保存非法值时不会导致搜索失败。
- 完成记录：SeedHub manifest 已声明 `pre_resolved_link_start_per_type`，搜索执行器已注入运行配置，SeedHub 已做 0-20 范围归一化。

### 阶段三：SeedHub 类型均衡解析（已完成）

目标：替换当前全局解析上限，按资源类型独立控制解析数量。

后端改动：

- 替换当前全局 `maxPreResolvedLinkStartLinks` 逻辑。
- 在 `resolveLinkStartEntries` 中维护 `map[string]int` 计数。
- 对 SeedHub `link_start`：
  - 当前类型计数小于 N：调用 `fetchURL` 和 `resolveLinkStartLink`。
  - 当前类型计数大于等于 N：不调用 `fetchURL`，不调用 `resolveLinkStartLink`，也不生成展示结果。
- 完整解析成功时写入：
  - `sid_hub_resolution_status = resolved`
  - `sid_hub_resolution_rank = 0`
- 预解析失败时写入：
  - `sid_hub_resolution_status = fallback`
  - `sid_hub_resolution_rank = 1`
注意：

- 磁力 `link_start` 也纳入每类型 N 条解析预算。
- 直接真实网盘链接不占用 `link_start` 解析预算。
- 非 SeedHub 插件不受影响。

验收：

- 百度前 N 条会尝试解析，第 N+1 条不会触发 fetcher。
- 夸克、UC、迅雷、阿里、磁力分别独立计数。
- 第 N+1 条同类型资源不会因为其他类型未满额而被解析或展示。
- 单测能断言 fetcher 调用次数。
- 完成记录：已替换全局上限为每类型计数，磁力 `link_start` 纳入预算，解析状态写入结果 `meta`。

### 阶段四：展示批量与排序优化（已完成）

目标：首屏 48 条，继续加载 24 条，并让已完整解析 SeedHub 资源优先显示。

前端改动：

- 在 `frontend/src/stores/searchStore.ts` 中拆分：
  - `initialDisplayCount = 48`
  - `loadMoreIncrement = 24`
- 搜索开始、搜索完成、渐进式 batch 更新时重置为 48。
- `loadMore` 每次增加 24。
- 在 `searchResultSorter` 中对 SeedHub 结果读取：
  - `resource.meta.sid_hub_resolution_rank`
- SeedHub 完整解析结果优先于 fallback；历史 deferred meta 仍按低优先级兼容排序。
- 非 SeedHub 结果保持现有排序逻辑。

验收：

- 1000 条结果首屏渲染 48 条。
- 第一次继续加载后渲染 72 条。
- 第二次继续加载后渲染 96 条。
- SeedHub `resolution_rank=0` 排在 `resolution_rank=2` 前。
- 完成记录：`searchStore` 已拆分首屏 48 与追加 24，排序器已读取 SeedHub `sid_hub_resolution_rank`。

### 阶段五：扫码弹窗体验优化（已完成）

目标：没有二维码的 SeedHub 兜底资源不再把“打开链接”作为主路径。

前端改动：

- 在 `PasswordModal` 中识别：
  - `access_mode = scan_transfer`
  - `scan_transfer.refreshable = true`
  - 没有二维码图片、二维码值和口令
- 主按钮显示为“获取二维码”。
- 点击主按钮调用现有刷新接口。
- “打开链接”降级为次要入口，或只在刷新失败后展示。

验收：

- 可刷新但无二维码的扫码弹窗不会默认主推打开原站。
- 刷新成功后展示二维码、二维码值或口令。
- 刷新失败时显示错误提示，不关闭弹窗。
- 完成记录：可刷新但无二维码载荷时主按钮为“获取二维码”，打开链接不再作为主入口。

## 3. 测试计划

### 后端测试

执行：

```bash
cd backend && go test ./plugin/sidhub ./api ./service
```

重点用例：

- SeedHub manifest 包含 `pre_resolved_link_start_per_type` 配置项。
- 插件配置接口能保存和读取数字配置。
- 每类型前 N 条 `link_start` 调用 fetcher。
- 同类型第 N+1 条不调用 fetcher，也不展示。
- N=0 时所有 SeedHub `link_start` 都不调用 fetcher，也不展示。
- 非法配置回退默认值。

### 前端测试

执行：

```bash
cd frontend && pnpm test -- SearchResults PluginManage PasswordModal searchResultSorter
```

重点用例：

- 插件中心弹窗和页面级右侧详情均渲染 SeedHub 数字配置项并可保存。
- 搜索结果首屏 48，继续加载追加 24。
- SeedHub 已解析结果排序优先。
- 无二维码扫码弹窗主按钮为“获取二维码”。
- 刷新二维码失败时保留弹窗并展示错误。

### 浏览器验证

关键词：

```text
迈克尔·杰克逊：巨星之路
```

验证步骤：

1. 在插件中心把 SeedHub 每类完整解析数量设为 3。
2. 搜索关键词。
3. 检查首屏结果数量为 48。
4. 点击继续加载或触底，确认每次增加 24。
5. 检查 SeedHub 百度、夸克、UC、迅雷、磁力前 3 条优先完整解析。
6. 点击 SeedHub 已解析扫码资源，确认弹窗展示二维码、二维码值或口令。
7. 点击超过配置数量的同类型资源，确认不会直接主推打开原站。

## 4. 风险与处理

- 插件配置能力是新增通用能力，先只支持当前需要的 `number` 类型，避免扩大范围。
- 配置保存后不强制刷新旧缓存，用户重新搜索或强制刷新后生效。
- 每类型 N 最大限制为 20，避免管理员误填导致 SeedHub 请求量过高。
- 真实后端分页不在本次范围，避免同时改搜索协议、渐进式事件和前端状态。
- 如果 SeedHub 页面结构变化导致解析失败，资源进入 fallback，不影响其他类型继续解析。

## 5. 交付清单

- 插件运行配置模型、服务和管理接口。
- SeedHub manifest 配置项。
- SeedHub 每类型 N 条解析逻辑。
- SeedHub 解析状态 meta。
- 前端插件中心配置表单，覆盖弹窗式插件管理和页面级右侧详情。
- 搜索结果 48/24 展示逻辑。
- SeedHub 排序补充。
- 扫码弹窗“获取二维码”主操作。
- 后端单测、前端单测和浏览器验证记录。

完成状态：

- [x] 插件运行配置模型、服务和管理接口。
- [x] SeedHub manifest 配置项。
- [x] SeedHub 每类型 N 条解析逻辑。
- [x] SeedHub 解析状态 meta。
- [x] 前端插件中心配置表单（弹窗式插件管理和页面级右侧详情）。
- [x] 搜索结果 48/24 展示逻辑。
- [x] SeedHub 排序补充。
- [x] 扫码弹窗“获取二维码”主操作。
- [x] 后端单测与前端单测。
- [ ] 浏览器真实后端验证记录。
