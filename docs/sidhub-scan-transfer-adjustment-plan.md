# SeedHub 扫码资源识别一致性调整方案

生成时间：2026-06-24 13:40:00 CST

## 1. 背景

当前搜索 `迈克尔·杰克逊：巨星之路` 时，SeedHub/sidhub 插件返回的部分结果会被识别为“需扫码”，点击后进入站内扫码转存弹窗；另一部分结果没有“需扫码”标识，点击后直接跳转到 SeedHub 原始 `link_start` 页面。

从截图可见，原始 SeedHub 页面本身提示“网盘链接容易被吞，请使用手机（百度网盘 APP）扫码转存”，说明这些结果实际也属于扫码转存资源，不应被前端当作普通直链打开。

## 2. 已确认现状

### 2.1 后端已有扫码协议能力

后端模型已支持扫码转存协议字段：

- `backend/model/response.go`
  - `Link.AccessMode`
  - `Link.ScanTransfer`
  - `ScanTransferInfo`

SeedHub 插件也已有扫码解析流程：

- `backend/plugin/sidhub/sidhub.go`
  - `resolveLinkStartEntries`
  - `resolveLinkStartLink`
  - `extractScanTransferInfo`
  - `RefreshScanTransfer`

### 2.2 前端已有扫码展示能力

前端排序和打开逻辑已支持扫码资源：

- `frontend/src/utils/searchResultSorter.ts`
  - 优先选择 `access_mode === "scan_transfer"` 或存在 `scan_transfer` 的链接作为主操作链接。

- `frontend/src/utils/resourceDisplay.ts`
  - 会保留扫码转存载荷并交给统一资源访问弹窗。

- 现有测试已覆盖扫码弹窗、二维码值渲染和刷新流程。

### 2.3 问题集中在后端结果协议不一致

如果某条结果没有携带：

```json
{
  "access_mode": "scan_transfer",
  "scan_transfer": {}
}
```

前端无法可靠判断它是扫码资源，只能按普通链接处理，最终直接打开 SeedHub 原站。

## 3. 根因分析

SeedHub 插件在解析详情页后，会对 `link_start` 链接做预抓取，尝试识别二维码、口令、手机深链或扫码提示。

当前实现存在预解析上限：

```go
maxQuarkResolveLinks = 8
```

在 `resolveLinkStartEntries` 中，只有前 8 个分享型 `link_start` 链接会被抓取并进入 `resolveLinkStartLink`。

超过上限的 `link_start` 链接会保持原始普通链接状态：

- 不设置 `AccessMode`
- 不设置 `ScanTransfer`
- URL 仍是 `https://sidhub.cc/link_start/...` 或 `https://www.seedhub.cc/link_start/...`

因此同一批 SeedHub 搜索结果中会出现一部分“需扫码”、一部分直接跳原站的割裂表现。

## 4. 调整目标

1. 所有 SeedHub 分享型 `link_start` 资源都能被前端识别为扫码转存资源。
2. 用户点击这些资源时不再直接跳转 SeedHub 原站。
3. 已能预解析出二维码、口令、手机深链的前若干条结果继续保留完整扫码载荷。
4. 超过预解析上限的结果不增加额外外站请求，只提供扫码兜底协议，由用户点击后按需刷新。
5. 保持现有前端扫码弹窗、刷新接口和资源排序逻辑不变。

## 5. 非目标

本次不做以下事项：

- 不改 SeedHub 搜索卡片 UI。
- 不新增前端特殊判断 `sidhub.cc/link_start` 的兜底逻辑。
- 不移除现有扫码弹窗。
- 不引入新依赖。
- 不扩大搜索并发模型。
- 不直接预抓取全部 `link_start` 页面。

## 6. 推荐方案

采用“有限预解析 + 协议兜底”的最小调整。

### 6.1 保留现有预解析上限

继续只对前 `maxQuarkResolveLinks` 条分享型 `link_start` 执行真实页面预抓取。

这样可以保留当前性能边界，避免一次搜索展开大量 SeedHub 结果时对外站发起过多请求。

### 6.2 对超过上限的 `link_start` 做扫码兜底标记

当链接满足以下条件时：

- URL 包含 `/link_start/`
- 链接类型属于分享型网盘资源
- 因预解析上限或抓取失败未能得到完整解析结果

后端仍应返回扫码协议字段：

```go
AccessMode: "scan_transfer"
ScanTransfer: &model.ScanTransferInfo{
    Provider:      link.Type,
    SourcePageURL: link.URL,
    Instruction:   "请使用手机网盘 App 扫码转存。",
    Refreshable:   true,
    RefreshKey:    buildSeedHubRefreshKey(movieID, link.Type, entry.Index),
}
```

如果 `RefreshKey` 无法生成，则仍保留：

```go
AccessMode: "scan_transfer"
ScanTransfer: &model.ScanTransferInfo{
    Provider:      link.Type,
    SourcePageURL: link.URL,
    Instruction:   "请打开扫码转存页获取最新二维码。",
}
```

### 6.3 点击后由现有弹窗按需刷新

前端收到 `scan_transfer` 后会进入统一资源访问弹窗。

如果初始载荷没有二维码图片或二维码值，弹窗可以使用现有刷新接口：

- `POST /resources/scan-transfer/refresh`
- 参数包含 `resource_id`、`link_url`、`refresh_key`

由后端在用户实际点击时再抓取 SeedHub 页面，获取最新二维码或口令。

## 7. 备选方案对比

### 方案 A：直接移除 8 条上限

优点：

- 实现最简单。
- 所有结果都能尝试拿到完整二维码载荷。

缺点：

- 搜索阶段请求量明显增加。
- SeedHub 单部影片可能展开大量结果，会拖慢首屏返回。
- 对外站压力更高，失败概率更高。

结论：不推荐作为默认方案。

### 方案 B：前端识别 `sidhub.cc/link_start`

优点：

- 改动位置少。

缺点：

- 前端需要理解插件私有 URL 规则。
- 与现有统一资源协议方向冲突。
- 其他入口仍可能遗漏。

结论：不推荐。

### 方案 C：有限预解析 + 协议兜底

优点：

- 不增加搜索阶段请求量。
- 前端继续只依赖统一协议字段。
- 能彻底避免普通点击直跳 SeedHub 原站。
- 改动集中在 SeedHub 插件内部。

缺点：

- 超过上限的结果初始弹窗可能没有二维码，需要用户点击刷新或等待弹窗刷新。

结论：推荐采用。

## 8. 具体实施步骤

### 8.1 后端调整

文件：

- `backend/plugin/sidhub/sidhub.go`

建议新增一个内部函数：

```go
func buildFallbackScanTransferLink(link model.Link, movieID string, entryIndex int) model.Link
```

职责：

- 克隆原始链接。
- 设置 `AccessMode = "scan_transfer"`。
- 填充最小 `ScanTransferInfo`。
- 尽可能生成 `RefreshKey`。

调整 `resolveLinkStartEntries`：

1. 如果当前链接不是 SeedHub 分享型 `link_start`，保持原逻辑。
2. 如果还在预解析额度内，继续调用 `fetchURL` 和 `resolveLinkStartLink`。
3. 如果预解析成功，使用完整解析结果。
4. 如果预解析失败、未识别或超过额度，使用 `buildFallbackScanTransferLink`。

### 8.2 测试调整

文件：

- `backend/plugin/sidhub/sidhub_test.go`

新增回归测试：

```go
func TestResolveLinkStartEntriesMarksOverflowLinkStartAsScanTransfer(t *testing.T)
```

测试要点：

- 构造 9 条 SeedHub 分享型 `link_start` 资源。
- 前 8 条允许走真实预解析。
- 第 9 条即使不抓取，也必须返回：
  - `AccessMode == "scan_transfer"`
  - `ScanTransfer != nil`
  - `ScanTransfer.SourcePageURL == 原始 link_start URL`
  - `ScanTransfer.RefreshKey` 稳定可用

补充断言：

- 第 9 条不应触发额外 fetch。
- 非 `link_start` 直链不受影响。
- 磁力、ed2k、thunder 下载类资源不被错误标记为扫码。

## 9. 验证计划

### 9.1 单元测试

执行：

```bash
go test ./plugin/sidhub
```

预期：

- sidhub 插件全部测试通过。
- 新增回归测试通过。

### 9.2 后端协议检查

使用本地搜索接口搜索：

```text
迈克尔·杰克逊：巨星之路
```

筛选 SeedHub/sidhub 来源结果，检查所有 `link_start` 分享型资源：

- 都有 `access_mode: "scan_transfer"`。
- 都有 `scan_transfer.source_page_url`。
- 可刷新项有稳定 `scan_transfer.refresh_key`。

### 9.3 前端行为检查

在本地页面搜索同一关键词：

```text
迈克尔·杰克逊：巨星之路
```

验收：

- SeedHub 返回的扫码资源卡片都显示“需扫码”。
- 点击卡片打开站内资源访问弹窗。
- 不直接打开 `sidhub.cc/link_start/...` 原站页面。
- 已有二维码的结果直接展示二维码。
- 兜底结果可通过弹窗刷新获得最新扫码载荷。

## 10. 风险与应对

### 10.1 兜底扫码载荷没有二维码

风险：

- 用户第一次打开弹窗时可能只看到提示文案，没有二维码图片。

应对：

- 使用现有刷新接口按需拉取。
- 弹窗文案明确提示“请刷新二维码”或“正在获取最新扫码信息”。

### 10.2 SeedHub 页面结构变化

风险：

- 真实预解析仍可能失败。

应对：

- 兜底协议保证不会直跳原站。
- 后续只需增强 `extractScanTransferInfo`，不需要改前端。

### 10.3 预解析额度命名误导

现有常量名 `maxQuarkResolveLinks` 实际限制了所有分享型网盘，不只夸克。

建议在本次调整中顺手重命名为：

```go
maxPreResolvedLinkStartLinks
```

该重命名不改变行为，只降低维护误解。

## 11. 回滚方案

如果调整后出现明显问题，可回滚以下改动：

- 删除 `buildFallbackScanTransferLink`。
- 恢复 `resolveLinkStartEntries` 的原始逻辑。
- 删除新增单元测试。

回滚后系统会恢复原行为：超过预解析上限的 `link_start` 仍可能直接跳转 SeedHub 原站。

## 12. 推荐结论

推荐采用“有限预解析 + 协议兜底”方案。

该方案以最小业务改动修复协议不一致问题，不增加搜索阶段外站请求量，也不让前端承接插件私有判断。后续如果需要更完整的首屏二维码，可再单独评估是否提高预解析额度或改为后台渐进式补全。
