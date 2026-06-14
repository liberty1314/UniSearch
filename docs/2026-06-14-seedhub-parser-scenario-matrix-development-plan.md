# SeedHub 解析场景矩阵与验收门禁开发计划

> **目标：** 把 SeedHub 解析从“功能描述式完成”升级为“场景矩阵 + fixture + RED/GREEN 测试 + 完成门禁”的可审计流程，避免再次出现计划已打勾但真实 DOM 变体未覆盖的问题。

生成时间：2026-06-14 21:11:41 CST

关联文档：

- [SeedHub 扫码转存支持详细开发计划](/Users/abner/Desktop/MyProject/UniSearch_dev/docs/2026-06-14-seedhub-qr-transfer-support-implementation-plan.md)
- [SeedHub 4K 筛选上下文摘要](/Users/abner/Desktop/MyProject/UniSearch_dev/.Codex/context-summary-seedhub-4k-filter-fix.md)
- [SeedHub 解析场景矩阵上下文摘要](/Users/abner/Desktop/MyProject/UniSearch_dev/.Codex/context-summary-seedhub-parser-scenario-matrix-plan.md)

---

## 1. 背景与问题

SeedHub 扫码转存计划已经覆盖了“搜索卡片、详情页下载项、`link_start`、扫码转存、前端弹窗、刷新接口”等能力。但最近的 `大濛 + include=4k` 问题暴露了一个流程缺口：

- 计划中写了“支持 SeedHub 详情页下载条目解析”。
- 实现中也有页签、原生列表和激活页签回退测试。
- 但真实页面存在“资源标题在整行文本中，可点击链接只显示打开”的 DOM 变体。
- 旧解析逻辑把标题解析成“打开”，导致 `4K+1080P` 未进入高级筛选文本。

这说明单个大项打勾不足以证明能力完整。后续必须把每个功能项拆成可验证的场景矩阵，并要求每个场景都有 fixture、测试函数和验证记录。

---

## 2. 开发目标

本计划聚焦治理 SeedHub 解析类问题，目标分为五层：

1. **场景矩阵层**  
   枚举 SeedHub 搜索页、详情页、下载项、`link_start`、筛选链路的 DOM 和数据变体。

2. **fixture 契约层**  
   为每个场景定义 fixture 来源、最小 HTML 样本、预期输出字段和失败表现。

3. **测试门禁层**  
   每个计划完成项必须绑定测试函数名和本地验证命令，没有测试不得标记完成。

4. **可观测性层**  
   解析结果需要能说明标题来源、网盘类型来源、访问模式来源，方便定位结构漂移。

5. **文档闭环层**  
   每次发现新变体，必须回填场景矩阵、补 fixture、补测试、更新完成状态。

---

## 3. 交付范围

### 3.1 本次必须交付

- SeedHub 解析场景矩阵文档
- fixture 命名与存放规范
- 计划完成门禁规则
- 新 DOM 变体接入流程
- 本地验证命令清单
- 与现有 SeedHub 扫码转存计划的完成标记规则

### 3.2 后续实施时必须交付

- 对照矩阵补齐缺失 fixture
- 对照矩阵补齐 Go 解析测试
- 对照矩阵补齐筛选和 URL 编解码测试
- 解析来源可观测字段或调试日志
- CI 或本地脚本入口，统一运行 SeedHub 回归

### 3.3 本次不交付

- 不立即重写 SeedHub 插件
- 不新增第二套解析器
- 不把前端作为解析兜底
- 不承诺绕过 Cloudflare 抓取完整真实页面
- 不新增外部依赖或浏览器抓取服务

---

## 4. 当前基线

### 4.1 已有能力

- `backend/plugin/sidhub/sidhub.go` 支持搜索卡片解析、详情页链接解析、页签解析、原生列表解析、激活页签回退、`link_start` 解析和扫码转存识别。
- `backend/plugin/sidhub/sidhub_test.go` 已有多类 HTML fixture。
- `backend/api/filter.go` 支持大小写无关的 `include/exclude` 关键词过滤。
- `frontend/src/services/searchService.ts` 支持把 `/search?q=...&include=...` 编解码为 `filter.include`。

### 4.2 已发现缺口

- 计划项粒度过粗，不能表达“标题在链接文本”和“标题在整行文本”的区别。
- fixture 缺少统一编号、来源说明和覆盖矩阵。
- 完成标记没有强制绑定测试函数名。
- 解析结果缺少标题来源、类型来源等调试信息。
- 新变体发现后没有固定的“回填计划”流程。

---

## 5. 总体策略

采用“矩阵先行、fixture 固化、测试门禁、实现补齐、文档回填”的顺序推进：

1. 先建立场景矩阵，明确所有应覆盖变体。
2. 再为每个变体补 fixture，先写失败测试。
3. 再按 TDD 修解析逻辑，不做无测试修改。
4. 再补可观测字段，方便下次快速定位退化点。
5. 最后把完成项从大复选框改成场景级复选框。

原因：

- SeedHub DOM 漂移不可避免，矩阵比单次修复更稳。
- fixture 是可重复验证的最小证据。
- 完成门禁能避免“实现看起来支持，但边界没测”的假完成。

---

## 6. SeedHub 解析场景矩阵

### 6.1 搜索页场景

| 编号 | 场景 | 当前状态 | 必需 fixture | 必需测试 |
| --- | --- | --- | --- | --- |
| S1 | 搜索卡片标题在 `a[title]` | 已覆盖 | `search-card-title-attr` | `TestParseSearchCards` |
| S2 | 搜索卡片封面在 `data-src` | 已覆盖 | `search-card-data-src` | `TestParseSearchCards` |
| S3 | 搜索卡片封面在 `src` | 已覆盖 | `search-card-src` | `TestParseSearchCards` |
| S4 | 搜索页返回 Cloudflare 挑战页 | 已覆盖 | `search-cloudflare-challenge` | `TestSidHubHelpersCoverEdgeCases`、`TestFetchURLRejectsCloudflareChallengeFromInjectedFetcher` |
| S5 | 搜索页卡片结构漂移但仍有 `/movies/{id}/` | 已覆盖 | 通用卡片内联样本 | `TestParseSearchCardsSupportsGenericMovieContainers` |

### 6.2 详情页资源列表场景

| 编号 | 场景 | 当前状态 | 必需 fixture | 必需测试 |
| --- | --- | --- | --- | --- |
| D1 | 原生 `.seed-list/.quark-list` 列表 | 已覆盖 | `sidHubNativeDownloadFixture` | `TestParseDetailLinkEntriesUsesNativeSeedHubLists` |
| D2 | 显式 tab target 列表 | 已覆盖 | `sidHubTabbedDownloadFixture` | `TestParseDetailLinkEntriesUsesDownloadTabs` |
| D3 | 激活页签 + 通用资源列表 | 已覆盖 | `sidHubActiveTabFallbackFixture` | `TestParseDetailLinkEntriesFallsBackToActiveSeedHubTab` |
| D4 | 标题在链接文本 | 已覆盖 | `sidHubActiveTabFallbackFixture` | `TestParseDetailLinkEntriesFallsBackToActiveSeedHubTab` |
| D5 | 标题在 `title` 属性 | 已覆盖 | `TestParseDetailLinks` 内联样本 | `TestParseDetailLinks` |
| D6 | 标题在整行文本，链接文本为“打开” | 已覆盖 | `sidHubQuarkRowTitleFallbackFixture` | `TestParseDetailLinkEntriesUsesRowTitleForQuark4KResource` |
| D7 | 行内包含大小、日期、标签噪声 | 已覆盖 | `sidHubRowNoiseFixture` | `TestParseDetailLinkEntriesCleansRowNoiseForTitleBadgesAndMeta` |
| D8 | 资源链接在 `data-url/data-href` | 已覆盖 | `sidHubAttributeResourceURLFixture` | `TestParseDetailLinkEntriesSupportsAttributeResourceURLs` |
| D9 | 资源链接在 `data-clipboard-text` | 已覆盖 | `sidHubAttributeResourceURLFixture` | `TestParseDetailLinkEntriesSupportsAttributeResourceURLs` |
| D10 | 资源链接在 `input[value]` | 已覆盖 | `sidHubAttributeResourceURLFixture` | `TestParseDetailLinkEntriesSupportsAttributeResourceURLs` |
| D11 | 纯 JS 点击且无可解析 URL | 已评估 | 暂无可解析样本 | 不做猜测解析，等待真实接口或 DOM 样本 |

### 6.3 网盘类型推断场景

| 编号 | 场景 | 当前状态 | 必需 fixture | 必需测试 |
| --- | --- | --- | --- | --- |
| T1 | 通过 `data-link` 推断 | 已覆盖 | `TestParseDetailLinks` 内联样本 | `TestParseDetailLinks` |
| T2 | 通过直接网盘 URL 推断 | 已覆盖 | `sidHubTabbedDownloadFixture` | `TestParseDetailLinkEntriesUsesDownloadTabs` |
| T3 | 通过 `redirect_to=quark_*` 推断 | 已覆盖 | `sidHubTabbedDownloadFixture` | `TestSidHubDoSearchFetchesDetailsAndUsesCache` |
| T4 | 通过 `seed_id` 推断磁力 | 已覆盖 | `sidHubNativeDownloadFixture` | `TestParseDetailLinkEntriesUsesNativeSeedHubLists` |
| T5 | 通过激活页签推断 | 已覆盖 | `sidHubActiveTabFallbackFixture` | `TestParseDetailLinkEntriesFallsBackToActiveSeedHubTab` |
| T6 | 多个 active 节点时选择资源区最近上下文 | 已覆盖 | 最近上下文内联样本 | `TestParseDetailLinkEntriesPrefersNearestContextOverUnrelatedActiveTab` |

### 6.4 `link_start` 场景

| 编号 | 场景 | 当前状态 | 必需 fixture | 必需测试 |
| --- | --- | --- | --- | --- |
| L1 | `link_start` 跳转真实夸克链接 | 已覆盖 | `TestSidHubDoSearchFetchesDetailsAndUsesCache` 内联样本 | `TestSidHubDoSearchFetchesDetailsAndUsesCache` |
| L2 | `link_start` 返回扫码转存页 | 已覆盖 | `sidHubScanTransferFixture` | `TestResolveLinkStartLinkDetectsScanTransfer` |
| L3 | 扫码页缺少二维码但有移动深链 | 已覆盖 | `sidHubScanTransferFallbackFixture` | `TestResolveLinkStartLinkKeepsFallbackScanTransferPayload` |
| L4 | 扫码页只有口令或提示文案 | 已覆盖 | `sidHubScanTransferCodeOnlyFixture` | `TestResolveLinkStartLinkDetectsCodeOnlyScanTransfer` |
| L5 | `link_start` 返回 Cloudflare 挑战页 | 已覆盖 | 注入抓取器挑战页样本 | `TestFetchURLRejectsCloudflareChallengeFromInjectedFetcher` |

### 6.5 高级筛选场景

| 编号 | 场景 | 当前状态 | 必需 fixture | 必需测试 |
| --- | --- | --- | --- | --- |
| F1 | `include=4k` 命中 `WEB-4K` | 已覆盖 | `seedhub-web-4k` | `TestApplyResultFilterMatchesSeedHub4KEntriesCaseInsensitively` |
| F2 | `include=4k` 命中 `4K+1080P` | 已覆盖 | `seedhub-4k-1080p` | `TestApplyResultFilterMatchesSeedHub4KEntriesCaseInsensitively` |
| F3 | `include=2160p` 命中 `2160P` | 已覆盖 | `match-2160p` | `TestApplyResultFilterMatchesSeedHubQualityTermsAcrossResourceFields` |
| F4 | `include=杜比` 命中标签或标题 | 已覆盖 | `match-dolby-detail`、`match-link-title` | `TestApplyResultFilterMatchesSeedHubQualityTermsAcrossResourceFields` |
| F5 | `exclude=枪版` 排除标题和链接标题 | 已覆盖 | `drop-gun` | `TestApplyResultFilterMatchesSeedHubQualityTermsAcrossResourceFields` |
| F6 | URL `include` 参数进入 POST `filter.include` | 已覆盖 | URL 编解码样本 | `searchService.test.ts` |
| F7 | 旧搜索缓存导致高级筛选为空时自动强刷一次 | 已覆盖 | 缓存旧结果与强刷新新结果样本 | `TestSearchWithFilterRefreshesOnceWhenCachedFilteredResultIsEmpty`、`TestSearchWithFilterKeepsCachedResultWhenRefreshFallbackFails`、`TestSearchWithFilterDoesNotRefreshWhenCachedResultMatches` |

---

## 7. fixture 契约

每个 SeedHub fixture 必须包含以下信息：

| 字段 | 要求 |
| --- | --- |
| fixture 名称 | 使用 `sidHub<场景>Fixture`，例如 `sidHubQuarkRowTitleFallbackFixture` |
| 来源 | 标注来自用户截图、真实 HTML、最小复现或历史样本 |
| 目标场景 | 对应矩阵编号，例如 `D6` |
| 最小 HTML | 只保留复现该场景所需 DOM，不夹杂无关结构 |
| 预期输出 | 明确 `Title`、`Link.Type`、`Link.URL`、`AccessMode`、`ScanTransfer` 等字段 |
| 失败表现 | 写清旧逻辑会如何失败，例如标题变成“打开” |

新增 fixture 时必须同步更新：

- 场景矩阵状态
- 对应测试函数
- `.Codex/operations-log.md`
- 必要时更新 `verification-report.md`

---

## 8. 完成门禁规则

从本计划生效后，SeedHub 解析相关任务不得只按“大项”打勾。必须满足以下门禁后才能标记完成：

### 8.1 单场景完成门禁

- [ ] 场景矩阵中存在明确编号
- [ ] fixture 已落地并标注来源
- [ ] 测试函数已命名并执行
- [ ] RED 阶段失败原因与目标问题一致
- [ ] GREEN 阶段定向测试通过
- [ ] 相关包测试通过
- [ ] `.Codex/operations-log.md` 已记录

### 8.2 阶段完成门禁

- [ ] 阶段下所有必需场景均完成
- [ ] 所有“部分覆盖”场景已说明缺口
- [ ] 所有“待补”场景有负责人、测试计划或明确延期原因
- [ ] 后端全量 `go test ./...` 通过
- [ ] 若涉及 URL 或前端行为，前端相关测试和 `pnpm build` 通过
- [ ] `verification-report.md` 已给出通过、退回或需讨论结论

### 8.3 禁止打勾条件

出现以下情况时不得标记完成：

- 只有代码实现，没有 fixture
- 只有 fixture，没有测试
- 测试没有先经历 RED 或无法证明失败原因
- 真实问题来自解析链路，却只改前端过滤
- 新增宽松解析但没有误判回归测试
- Cloudflare 或样本缺失未记录风险

---

## 9. 实施阶段计划

## 阶段 0：矩阵落地

### 目标

把本计划纳入 SeedHub 后续开发的统一验收入口。

### 任务

- [x] 创建 SeedHub 解析场景矩阵计划文档
- [x] 关联现有扫码转存计划和 4K 筛选上下文摘要
- [x] 将矩阵编号回填到现有 SeedHub 测试注释或测试名说明中
- [x] 在原扫码转存计划中增加“引用本矩阵作为完成门禁”的说明

### 追加完成项

- [x] 补 `S5`：搜索页卡片结构漂移但仍有 `/movies/{id}/`
- [x] 补 `T6`：多个 active 节点时选择资源区最近上下文
- [x] 补 `L4`：扫码页只有口令或提示文案
- [x] 补 `L5`：`link_start` 返回 Cloudflare 挑战页

### 验收

- 文档存在于 `docs/`
- `.Codex` 中有上下文和操作记录

---

## 阶段 1：补齐解析 fixture

### 目标

让详情页解析的主要 DOM 变体都有 fixture。

### 任务

- [x] 补 `D7`：行内大小、日期、标签噪声清理
- [x] 补 `D8`：资源链接在 `data-url/data-href`
- [x] 补 `D9`：资源链接在 `data-clipboard-text`
- [x] 补 `D10`：资源链接在 `input[value]`
- [x] 评估 `D11`：纯 JS 点击且无可解析 URL 的最小可行策略

### 验收

- 每个新增 fixture 对应一个测试
- 定向执行 `cd backend && go test ./plugin/sidhub -run TestParseDetailLinkEntries`

---

## 阶段 2：补齐筛选矩阵

### 目标

保证解析出的标题、描述、标签和链接标题能进入高级筛选文本。

### 任务

- [x] 补 `F3`：`include=2160p`
- [x] 补 `F4`：`include=杜比`
- [x] 补 `F5`：`exclude=枪版` 同时覆盖资源标题和链接标题
- [x] 建立 SeedHub 筛选测试数据构造辅助函数，减少重复对象

### 验收

- 定向执行 `cd backend && go test ./api -run TestApplyResultFilter`
- 筛选测试覆盖 `Title`、`Description`、`Detail.Content`、`Links.Title`、`Links.WorkTitle`

---

## 阶段 3：解析来源可观测性

### 目标

当资源解析异常时，可以快速知道标题和类型从哪里来。

### 任务

- [x] 在 SeedHub 结果 `Meta` 中增加 `sid_hub_title_source`
- [x] 在 SeedHub 结果 `Meta` 中增加 `sid_hub_link_type_source`
- [x] 在测试中断言关键场景的来源字段
- [x] 保持字段为调试信息，不影响前端展示和资源协议

建议来源枚举：

| 字段 | 可选值 |
| --- | --- |
| `sid_hub_title_source` | `title_attr`、`link_text`、`row_text`、`movie_title_fallback` |
| `sid_hub_link_type_source` | `data_link`、`direct_url`、`redirect_to`、`seed_id`、`active_tab`、`group_label` |

### 验收

- `cd backend && go test ./plugin/sidhub`
- 不改变前端展示文案

---

## 阶段 4：统一验证入口

### 目标

把 SeedHub 解析、筛选和 URL 编解码验证收敛为一组固定本地命令。

### 任务

- [x] 梳理 SeedHub 定向测试命令
- [x] 梳理筛选定向测试命令
- [x] 梳理前端 URL 编解码测试命令
- [x] 如项目已有脚本入口，复用现有脚本，不新增重复脚本

建议命令：

```bash
cd backend && go test ./plugin/sidhub ./api
```

```bash
cd backend && go test ./...
```

```bash
cd frontend && pnpm test -- src/services/__tests__/searchService.test.ts
```

```bash
cd frontend && pnpm build
```

### 验收

- 命令在本地可重复执行
- 若某条命令因项目参数传递方式运行范围扩大，需要在日志中如实记录

---

## 阶段 5：文档回填与完成状态治理

### 目标

让现有 SeedHub 计划不再只表达“功能已完成”，而能表达“哪些场景已覆盖，哪些仍有风险”。

### 任务

- [x] 在扫码转存计划中引用本矩阵作为验收门禁
- [x] 将大项完成状态补充为场景级完成状态
- [x] 对未覆盖场景标记“待补”而不是隐含完成
- [x] 每次新 bug 修复后追加矩阵编号、fixture 和测试名

### 验收

- 计划文档中不存在无法追溯测试的大项完成标记
- 新增完成项都能对应到测试函数或明确验证命令

---

## 10. 新 DOM 变体处理流程

后续再遇到 SeedHub 页面结构变化，必须按以下流程处理：

1. **记录现象**  
   保存 URL、截图、用户关键词、筛选条件、原页资源文本和 UniSearch 表现。

2. **定位矩阵编号**  
   如果已有场景编号，更新该场景；如果没有，新增编号。

3. **创建 fixture**  
   提取最小 HTML 样本，不依赖在线站点可用性。

4. **写 RED 测试**  
   测试必须失败在目标行为上，而不是编译错误或无关依赖。

5. **小步修复**  
   优先修既有解析函数，不新增第二套解析器。

6. **跑 GREEN 验证**  
   先跑定向测试，再跑相关包测试，必要时跑全量测试和构建。

7. **回填文档**  
   更新矩阵状态、完成标记、操作日志和验证报告。

---

## 11. 风险与应对

### R1：真实页面无法抓取

影响：

- 无法直接固化完整真实 HTML。

应对：

- 使用用户截图和浏览器可见 DOM 还原最小 fixture。
- 在 fixture 来源中标注“截图还原”。
- 如果后续可抓取真实 HTML，再替换或补充 fixture。

### R2：解析回退过宽导致误判

影响：

- 可能把导航、排序、说明文字误识别为资源。

应对：

- 所有回退解析必须先通过 `isPotentialSidHubResourceURL` 收口。
- 新增误判回归测试，例如 `javascript:`、`#tab`、排序按钮。

### R3：完成标记继续失真

影响：

- 大项打勾掩盖未覆盖场景。

应对：

- 完成项必须绑定矩阵编号和测试名。
- 没有测试的完成项只能标记为“待验证”。

### R4：前端或筛选层背锅

影响：

- 解析字段缺失时，如果只改前端筛选，会掩盖数据源问题。

应对：

- 先确认 `SearchResult -> ResourceObject -> filter` 的数据链路。
- 如果关键词没有进入资源对象，优先修解析或构建器。

---

## 12. 验收清单

- [x] 建立 SeedHub 解析场景矩阵
- [x] 明确 fixture 契约
- [x] 明确完成门禁规则
- [x] 明确新 DOM 变体处理流程
- [x] 明确本地验证命令
- [x] 将矩阵编号回填到现有测试说明
- [x] 补齐所有“待补”场景 fixture
- [x] 增加解析来源可观测字段
- [x] 将原 SeedHub 扫码转存计划改为引用本矩阵作为验收门禁

---

## 13. 结论

SeedHub 解析问题的根本解法不是再补一个临时 if 分支，而是把“能力完成”改成“场景完成”。

后续任何 SeedHub 解析能力只有同时满足以下四件事，才能标记为完成：

- 计划项存在矩阵编号
- fixture 已固化
- RED/GREEN 测试已执行
- 验证与完成状态已回填文档

这样即使 SeedHub 页面继续变化，我们也能把变化纳入矩阵，而不是让同类问题反复以线上 bug 的形式冒出来。
