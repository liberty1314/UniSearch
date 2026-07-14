# SeedHub 搜索质量治理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 分两个发布阶段修正 SeedHub 时间、解析状态、详情兜底和结果排序，再上线不暴露来源地址的按需解析、候选分组和通用来源配额。

**Architecture:** 第一阶段只处理数据正确性和兼容性，不增加 SeedHub 请求量。第二阶段用带认证加密的短期 token 替代公开的 SeedHub 中间地址，用户点击后由后端解析真实目标；前端按语义状态排序，并在首屏对任意单一来源应用可配置配额。

**Tech Stack:** Go 1.25、Gin、React 18、TypeScript、Zustand、Vitest、Playwright、pnpm。

---

## 1. 已确认的设计决策

以下决策来自 2026-07-13 的计划审查，实施期间不得自行恢复旧方案。

| 主题 | 决策 |
| --- | --- |
| 发布方式 | 分成“正确性与安全修复”和“按需解析与来源治理”两个可独立回滚的阶段 |
| 扫码与直链 | 解析成功后处于同一可操作等级；`access_mode` 只控制交互，不参与跨资源质量排序 |
| 来源地址 | 搜索响应和 resolver 响应均不返回 SeedHub `/link_start/`、详情页或 `source_page_url` |
| 真实目标 | 解析成功后可以返回真实网盘 URL、HTTP URL、magnet、ed2k 或 thunder 目标 |
| 详情失败 | 没有真实候选的详情兜底不进入搜索结果；失败只记录告警和指标 |
| 来源保护 | 首屏配额适用于任意单一来源，不在展示算法中写死 SeedHub |
| 自动预热 | 首个版本不预热；用户点击 deferred 候选时才调用 resolver |
| 重复结果 | 同组只展示一张卡片，但保留组内备用候选，不按标题直接丢弃 |
| 永久失效 | 只有稳定、明确的失效信号返回 `410 RESOURCE_INVALID` 并淘汰当前候选 |
| 公共状态 | API 输出语义状态，不新增数值型 `sid_hub_quality_rank` |
| 时间排序 | 实际发布时间优先；`sid_hub_time_source` 用于审计，不作为独立排序等级 |
| 月年计算 | `N月前`、`N年前` 使用日历减法，目标日期不存在时夹到目标月最后一天 |
| 时区 | SeedHub 日期统一按 `Asia/Shanghai` 解释；一轮搜索共享同一个 `now` |
| 解析凭据 | 使用后端签发的认证加密 `resolve_token`，有效期 24 小时 |
| 限流 | 每个用户每 5 秒最多 3 次 resolver 调用，不设置分钟配额；每个用户最多 2 个并发请求 |
| 备用候选 | 一次点击最多自动尝试 2 个候选，只有首个候选返回 410 时才自动尝试备用 |

## 2. 现状基线

2026-07-13 对关键词“沧元图”执行全插件强制刷新：

| 指标 | 当前值 |
| --- | ---: |
| 全插件资源数 | 374 |
| SeedHub 资源数 | 295 |
| 原始 API 前 48 条中的 SeedHub 数量 | 48 |
| 使用 `synthetic_fetch_time` 的 SeedHub 数量 | 131 |
| 空 `resolution_status` 且 `resolution_rank=0` 的 SeedHub 数量 | 295 |
| 标题含相对时间但仍使用合成时间的 SeedHub 数量 | 55 |

四段实现共同造成用户症状：

- `backend/plugin/sidhub/sidhub.go` 在页面缺少日期时把抓取时刻写成发布时间。
- `resolveLinkStartEntries` 在预解析上限为 0 时留下空状态和 rank 零值。
- `frontend/src/utils/searchResultSorter.ts` 把 `scan_transfer` 作为全局结果优先级。
- 详情抓取失败后，插件构造一个可打开的来源页，前端将其当成资源入口。

现有刷新接口还允许客户端提交服务端抓取地址。它只检查字符串中是否包含 `/link_start/`，没有对 scheme、host、解析后的 IP 和重定向目标执行同一套校验。第二阶段上线新 resolver 前，第一阶段必须先收紧旧接口。

## 3. 发布边界

### 3.1 阶段 A：正确性与安全修复

阶段 A 不增加新的自动网络请求，交付以下行为：

- SeedHub 日期解析覆盖正文、标题属性和最终资源标题。
- 未知发布时间不再使用抓取时刻；资源级和链接级时间都能缺失。
- 每轮抓取只记录一个 `sid_hub_fetched_at`，前端不使用它排序。
- deferred 条目具有显式语义状态，不再依赖 rank 零值。
- 前端删除全局 `accessRank`，按相关度、可操作性和真实时间排序。
- 详情抓取失败且没有候选时不返回资源。
- 旧扫码刷新入口增加严格的 SeedHub URL 校验。
- 搜索缓存结构版本升级，避免读取旧时间和状态合同。

阶段 A 发布后，旧前端仍能使用现有扫码刷新合同。SeedHub 中间地址在阶段 B 切换公开资源协议后才从新搜索响应中消失。

### 3.2 阶段 B：按需解析与来源治理

阶段 B 交付以下行为：

- 后端将重复 SeedHub 条目组成一个资源组，组内保留多个候选。
- 搜索响应用 `link_id + resolve_token` 表示 deferred 候选，不返回来源 URL。
- 用户点击后调用通用 resolver；页面加载和搜索过程不自动预热。
- resolver 支持真实 HTTP、网盘、magnet、ed2k、thunder 和扫码载荷。
- resolver 执行 token 校验、URL 安全检查、5 秒窗口限流、并发限制、缓存和 singleflight。
- 前端一次点击最多尝试主候选和一个备用候选。
- 首屏对任意单一来源应用 16/48 默认配额，其他来源不足时自动回填。
- 管理员可以关闭来源配额或调整单来源上限。
- 后端记录 resolver 成功率、超时、错误类型、延迟、缓存命中和并发量。

### 3.3 非目标

- 不在搜索阶段解析全部 SeedHub `/link_start/` 页面。
- 不调用网盘厂商的未公开 API 判断文件内容完整性。
- 不把超时、取消、页面结构变化或上游 5xx 判定为资源永久失效。
- 不建立跨插件统一质量分数。
- 不公开 token 内的 SeedHub 地址、详情地址或抓取地址。
- 不在本计划中删除旧 `/api/resources/scan-transfer/refresh`；阶段 B 稳定一个发布周期后另开清理任务。

## 4. 目标合同

### 4.1 时间合同

| 字段 | 含义 | 排序用途 |
| --- | --- | --- |
| `published_at` | 页面可推导出的资源发布时间；未知时省略 | 是 |
| `links[].datetime` | 页面可推导出的候选发布时间；未知时省略 | 是 |
| `meta.sid_hub_time_source` | `resource_row`、`movie_card` 或 `unknown` | 否 |
| `meta.sid_hub_time_text` | 页面原始时间文本 | 否 |
| `meta.sid_hub_fetched_at` | 本轮抓取开始时间 | 否 |

后端不再生成新的 `synthetic_fetch_time`。前端在兼容期把旧缓存中的 `synthetic_fetch_time` 当作 `unknown`。

Go 的公开模型同时使用可空时间：

```go
type ResourceLink struct {
	ID           string                  `json:"id,omitempty" sonic:"id,omitempty"`
	Type         string                  `json:"type" sonic:"type"`
	URL          string                  `json:"url,omitempty" sonic:"url,omitempty"`
	Password     string                  `json:"password,omitempty" sonic:"password,omitempty"`
	AccessMode   string                  `json:"access_mode,omitempty" sonic:"access_mode,omitempty"`
	ScanTransfer *ScanTransferInfo       `json:"scan_transfer,omitempty" sonic:"scan_transfer,omitempty"`
	Resolution   *ResourceLinkResolution `json:"resolution,omitempty" sonic:"resolution,omitempty"`
	Title        string                  `json:"title,omitempty" sonic:"title,omitempty"`
	WorkTitle    string                  `json:"work_title,omitempty" sonic:"work_title,omitempty"`
	Datetime     *time.Time              `json:"datetime,omitempty" sonic:"datetime,omitempty"`
}

type ResourceObject struct {
	PublishedAt *time.Time `json:"published_at,omitempty" sonic:"published_at,omitempty"`
}
```

上面的 `ResourceObject` 代码只表示字段替换：保留现有其他字段，将 `PublishedAt time.Time` 改为 `PublishedAt *time.Time`。

### 4.2 公开候选合同

deferred 候选不包含 URL：

```json
{
  "id": "lnk_v1_xxx",
  "type": "quark",
  "access_mode": "resolve_required",
  "resolution": {
    "status": "deferred",
    "token": "rrt_v1_xxx",
    "expires_at": "2026-07-14T18:00:00+08:00"
  }
}
```

公开状态只包含：

```go
const (
	resourceResolutionDeferred = "deferred"
	resourceResolutionResolved = "resolved"
	resourceResolutionInvalid  = "invalid"
)

type ResourceLinkResolution struct {
	Status    string     `json:"status" sonic:"status"`
	Token     string     `json:"token,omitempty" sonic:"token,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty" sonic:"expires_at,omitempty"`
}
```

`invalid` 主要用于前端组内候选状态。后端搜索响应不返回已知 invalid 候选；整组没有候选时不返回该资源。

### 4.3 认证加密 token

仅做 HMAC 签名仍会暴露 Base64 载荷，因此 `resolve_token` 必须使用认证加密。实现使用 AES-256-GCM：

```go
type resourceResolveTokenClaims struct {
	Version    int    `json:"v"`
	ResourceID string `json:"rid"`
	LinkID     string `json:"lid"`
	PluginID   string `json:"pid"`
	Provider   string `json:"provider"`
	SourceURL  string `json:"source_url"`
	MovieID    string `json:"movie_id,omitempty"`
	EntryIndex int    `json:"entry_index,omitempty"`
	IssuedAt   int64  `json:"iat"`
	ExpiresAt  int64  `json:"exp"`
}
```

实现约束：

- 使用 `RESOURCE_PUBLIC_ID_SECRET` 通过带领域标签的 HMAC-SHA256 派生独立 AES key，领域标签固定为 `resource-resolve-token-v1`。
- token 格式为 `rrt_v1_<base64url(nonce|ciphertext)>`，不输出明文 claims。
- AES-GCM additional data 固定为 `resource-resolve:v1`。
- token 有效期为 24 小时。
- `resource_id` 和 `link_id` 同时写入 claims 与请求体；验证时要求完全相等。
- token 日志只能记录 SHA-256 摘要前 12 位，不能记录 token 或解密后的 URL。
- singleflight 和成功缓存使用验证后的 `plugin_id + link_id`，不能使用随机化 token 字符串。

### 4.4 Resolver API

请求不包含来源 URL：

```http
POST /api/resources/resolve
Content-Type: application/json
Authorization: Bearer <token>

{
  "resource_id": "r_v1_xxx",
  "link_id": "lnk_v1_xxx",
  "resolve_token": "rrt_v1_xxx"
}
```

扫码响应只包含真实操作目标：

```json
{
  "resource_id": "r_v1_xxx",
  "link_id": "lnk_v1_xxx",
  "resolution_status": "resolved",
  "link": {
    "id": "lnk_v1_xxx",
    "type": "quark",
    "url": "https://pan.quark.cn/s/xxx",
    "access_mode": "scan_transfer",
    "scan_transfer": {
      "qr_code_value": "https://pan.quark.cn/s/xxx"
    }
  }
}
```

直链和 magnet 使用相同响应结构。响应不得包含 `original_link_url`、`sid_hub_detail_url`、`source_page_url` 或 refresh key。

### 4.5 错误合同

| 错误码 | HTTP | 前端行为 |
| --- | ---: | --- |
| `RESOURCE_RESOLVE_INVALID_REQUEST` | 400 | 不更新候选，提示请求无效 |
| `RESOURCE_RESOLVE_TOKEN_EXPIRED` | 410 | 提示重新搜索，不淘汰候选，不尝试备用 |
| `RESOURCE_INVALID` | 410 | 标记当前候选 invalid；本次点击可尝试一个备用 |
| `RESOURCE_UPSTREAM_PARSE_FAILED` | 502 | 保留 deferred，停止自动尝试 |
| `RESOURCE_RESOLVER_UNAVAILABLE` | 503 | 保留 deferred，停止自动尝试 |
| `RESOURCE_RESOLVE_TIMEOUT` | 504 | 保留 deferred，允许用户重试 |
| `RESOURCE_RESOLVE_REQUEST_CANCELED` | 499 | 不更新状态，不弹错误 |
| `RESOURCE_RESOLVE_RATE_LIMITED` | 429 | 读取 `Retry-After` 后允许重试 |
| `RESOURCE_RESOLVE_CONCURRENCY_LIMITED` | 429 | 当前请求结束后允许重试 |

token 过期和资源永久失效使用不同 `error_code`。前端不得只根据 HTTP 410 淘汰候选。

### 4.6 排序与来源配额

前端使用稳定排序：

1. 关键词相关度。
2. 可操作资源优于 deferred 资源。
3. 已知发布时间优于未知时间。
4. 已知时间按发布时间倒序。
5. 云盘类型优先级和原始索引作为稳定 tie-break。

扫码与直链解析结果处于同一可操作等级。`sid_hub_time_source` 不参与跨资源比较。

排序和筛选完成后，展示层对首屏应用来源配额：

```ts
export const FIRST_PAGE_SIZE = 48;
export const DEFAULT_MAX_PER_SOURCE = 16;
```

算法按排序顺序选择首屏，每个 `source.id` 最多取 16 条。其他来源不足时，算法按原顺序回填被延后的条目。只有一个来源时展示 48 条，不丢弃第二页数据。

## 5. 文件变更地图

### 阶段 A

| 文件 | 责任 |
| --- | --- |
| `backend/model/response.go` | 资源级和链接级可空时间 |
| `backend/plugin/sidhub/sidhub.go` | 固定时区、日期解析、显式 deferred、删除详情兜底、旧 URL 校验 |
| `backend/plugin/sidhub/sidhub_test.go` | 日期、状态、详情失败和 URL 安全测试 |
| `backend/service/search_response_builder.go` | 可空时间映射和排序兼容 |
| `backend/service/search_response_builder_test.go` | 零时间不进入公开响应 |
| `backend/util/cache/cache_key.go` | 搜索缓存结构版本升级 |
| `backend/util/cache/cache_key_test.go` | 新旧缓存隔离测试 |
| `frontend/src/types/resource.ts` | 可选 URL、时间和 `resolve_required` 类型准备 |
| `frontend/src/utils/searchResultSorter.ts` | 删除 `accessRank`，使用语义状态和真实时间 |
| `frontend/src/utils/__tests__/searchResultSorter.test.ts` | 排序矩阵 |
| `frontend/src/pages/ResourceDetailPage.tsx` | 未知资源级时间显示 |
| `frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx` | 未知链接级时间显示 |
| `frontend/src/pages/__tests__/ResourceDetailPage.test.tsx` | 零时间与缺失时间回归 |

### 阶段 B

| 文件 | 责任 |
| --- | --- |
| `backend/model/response.go` | `ResourceLinkResolution` 公开合同和 `LinkResolveTarget` 内部缓存合同 |
| `backend/plugin/sidhub/sidhub.go` | 候选分组、通用解析、明确 invalid 信号 |
| `backend/plugin/sidhub/sidhub_test.go` | 分组、解析与备用候选测试 |
| `backend/service/resource_resolve_token.go` | AES-GCM token 签发和验证 |
| `backend/service/resource_resolve_token_test.go` | 保密性、篡改、绑定和过期测试 |
| `backend/service/search_response_builder.go` | 生成 `link_id` 和 deferred token，清除来源地址 |
| `backend/service/search_response_builder_test.go` | 搜索响应不泄露来源地址 |
| `backend/api/resource_resolve_handler.go` | resolver 请求、错误映射、限流和并发限制 |
| `backend/api/resource_resolve_handler_test.go` | API 合同和限流测试 |
| `backend/api/scan_transfer_handler.go` | 旧接口兼容适配 |
| `backend/api/router.go` | 注册新路由 |
| `backend/service/resource_resolve_metrics.go` | resolver 运行指标快照 |
| `backend/service/resource_resolve_metrics_test.go` | 指标聚合测试 |
| `backend/api/resource_resolve_metrics_handler.go` | 管理员指标接口 |
| `frontend/src/types/resource.ts` | token、状态和响应类型 |
| `frontend/src/services/searchService.ts` | `resolveResource` 客户端 |
| `frontend/src/services/__tests__/searchService.test.ts` | resolver 请求和错误码保留测试 |
| `frontend/src/stores/searchStore.ts` | 按 `resource_id + link_id` 更新候选 |
| `frontend/src/stores/__tests__/searchStore.test.ts` | 原子更新和 stale response 测试 |
| `frontend/src/components/SearchResults.tsx` | 点击解析、取消和最多一个备用候选 |
| `frontend/src/components/__tests__/SearchResults.test.tsx` | HTTP、magnet、扫码、410、超时和取消测试 |
| `frontend/src/components/search-results/searchResultsPresentation.ts` | 通用来源配额纯函数 |
| `frontend/src/components/search-results/searchResultsPresentation.test.ts` | 分组、回填和分页测试 |
| `frontend/src/components/search-results/useSearchResultsPresentation.ts` | 接入排序、分组、配额和 slice |
| `backend/model/system_settings.go` | 来源配额开关与上限 |
| `backend/service/system_settings_service.go` | 来源配额默认值和校验 |
| `backend/api/system_settings_handler.go` | 公开设置与管理员更新 |
| `frontend/src/services/systemSettingsService.ts` | 来源配额设置类型 |
| `frontend/src/components/admin/system-settings/SearchExperienceSettingsPanel.tsx` | 来源配额开关和数值输入 |
| `frontend/e2e/search-quality.spec.ts` | 确定性首屏来源配额测试 |
| `frontend/e2e/real-backend.spec.ts` | 真实后端 smoke test |
| `docs/readme_2607.md` | 开发和验收记录 |

## 6. 阶段 A 实施任务

### Task A1: 建立回归测试，不提交失败状态

**Files:**

- Modify: `backend/plugin/sidhub/sidhub_test.go`
- Modify: `backend/service/search_response_builder_test.go`
- Modify: `frontend/src/utils/__tests__/searchResultSorter.test.ts`

- [x] **Step 1: 增加日期和未知时间失败测试**

覆盖以下输入和结果：

```go
func TestParseSidHubDateUsesCalendarArithmetic(t *testing.T) {
	location, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name string
		now  time.Time
		text string
		want time.Time
	}{
		{"months", time.Date(2026, 3, 31, 18, 0, 0, 0, location), "1月前", time.Date(2026, 2, 28, 12, 0, 0, 0, location)},
		{"leap year", time.Date(2024, 2, 29, 18, 0, 0, 0, location), "1年前", time.Date(2023, 2, 28, 12, 0, 0, 0, location)},
		{"days", time.Date(2026, 7, 13, 18, 0, 0, 0, location), "2天前", time.Date(2026, 7, 11, 12, 0, 0, 0, location)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := parseSidHubDate(tc.text, tc.now); !got.Equal(tc.want) {
				t.Fatalf("parseSidHubDate(%q) = %s, want %s", tc.text, got, tc.want)
			}
		})
	}
}
```

另加集成测试，证明日期可以来自资源行、链接 `title` 属性和最终解析标题；只测试 `parseSidHubDate` 不算完成。

- [x] **Step 2: 增加状态、详情失败和排序失败测试**

测试要求：

- `pre_resolved_link_start_per_type=0` 时，所有 `/link_start/` 条目状态为 `deferred`。
- 详情抓取失败且没有候选时返回 0 条结果。
- 未知 `published_at` 和 `links[].datetime` 在 JSON 中均不存在。
- 扫码访问方式不再让旧资源压过普通新资源。
- 相关度仍排在可操作性之前。

- [x] **Step 3: 运行测试并保存 RED 证据**

```bash
cd backend
go test ./plugin/sidhub -run 'TestParseSidHubDateUsesCalendarArithmetic|Test.*Deferred|Test.*DetailFailure' -count=1 -v
go test ./service -run 'Test.*Unknown.*Time' -count=1 -v

cd ../frontend
pnpm exec vitest run src/utils/__tests__/searchResultSorter.test.ts --reporter=verbose
```

Expected: 测试因旧日期、合成时间、空状态、详情兜底或 `accessRank` 失败。不要在此步骤提交。

### Task A2: 修正时间合同

**Files:**

- Modify: `backend/model/response.go`
- Modify: `backend/plugin/sidhub/sidhub.go`
- Modify: `backend/service/search_response_builder.go`
- Modify: `frontend/src/types/resource.ts`
- Test: `backend/plugin/sidhub/sidhub_test.go`
- Test: `backend/service/search_response_builder_test.go`

- [x] **Step 1: 实现固定时区和日历减法**

增加一次加载时区和日期夹取函数：

```go
var sidHubLocation = func() *time.Location {
	location, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		panic("load Asia/Shanghai: " + err.Error())
	}
	return location
}()

func subtractSidHubCalendarDate(now time.Time, years int, months int, days int) time.Time {
	localNow := now.In(sidHubLocation)
	firstOfTargetMonth := time.Date(localNow.Year()-years, localNow.Month()-time.Month(months), 1, 12, 0, 0, 0, sidHubLocation)
	lastDay := time.Date(firstOfTargetMonth.Year(), firstOfTargetMonth.Month()+1, 0, 12, 0, 0, 0, sidHubLocation).Day()
	day := localNow.Day()
	if day > lastDay {
		day = lastDay
	}
	target := time.Date(firstOfTargetMonth.Year(), firstOfTargetMonth.Month(), day, 12, 0, 0, 0, sidHubLocation)
	if days != 0 {
		target = target.AddDate(0, 0, -days)
	}
	return target
}
```

`sidhub.go` 导入 `_ "time/tzdata"`，确保精简容器中仍能加载 `Asia/Shanghai`。

`parseSidHubDate` 支持 `天/月/年`，并将传入的 `now` 转到 `sidHubLocation`。搜索入口在开始时捕获一次 `fetchedAt := time.Now().In(sidHubLocation)`，解析卡片、详情行和构建结果时都传递该值。

- [x] **Step 2: 保留未知时间并记录抓取时间**

`fillSidHubTimes` 不再用 `now` 填充 `Datetime`：

```go
func fillSidHubTimes(card sidHubMovie, entries []sidHubLinkEntry) (sidHubMovie, []sidHubLinkEntry) {
	if card.Datetime.IsZero() {
		card.DateText = ""
		card.DateSource = sidHubTimeSourceUnknown
	}
	next := make([]sidHubLinkEntry, len(entries))
	for index, entry := range entries {
		next[index] = entry
		if next[index].Datetime.IsZero() && !card.Datetime.IsZero() {
			next[index].Datetime = card.Datetime
			next[index].DateText = card.DateText
			next[index].DateSource = card.DateSource
		}
		if next[index].Datetime.IsZero() {
			next[index].DateText = ""
			next[index].DateSource = sidHubTimeSourceUnknown
		}
		next[index].Link.Datetime = next[index].Datetime
	}
	return card, next
}
```

`buildExpandedResult` 接收同一轮的 `fetchedAt`，并写入 `sid_hub_fetched_at`。删除 `sidHubTimeSourceSyntheticFetch`。

- [x] **Step 3: 让两个公开时间字段可空**

增加统一转换：

```go
func optionalTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	copy := value
	return &copy
}
```

构建 `ResourceObject` 和 `ResourceLink` 时调用 `optionalTime`。排序函数先检查指针，再检查链接指针。前端 `ResourceLink.datetime` 和 `ResourceObject.published_at` 保持可选字符串。

- [x] **Step 4: 运行时间测试**

```bash
cd backend
go test ./plugin/sidhub -run 'TestParseSidHubDate|Test.*Time' -count=1
go test ./service -run 'Test.*Unknown.*Time|TestSearchResponseBuilder' -count=1
```

Expected: PASS。

- [x] **Step 5: Commit**

```bash
git add backend/model/response.go backend/plugin/sidhub/sidhub.go backend/plugin/sidhub/sidhub_test.go backend/service/search_response_builder.go backend/service/search_response_builder_test.go frontend/src/types/resource.ts
git commit -m "fix(seedhub): preserve unknown publish times"
```

### Task A3: 修正 deferred、详情失败和旧刷新 URL 安全

**Files:**

- Modify: `backend/plugin/sidhub/sidhub.go`
- Modify: `backend/plugin/sidhub/sidhub_test.go`
- Modify: `backend/api/scan_transfer_handler.go`
- Modify: `backend/api/scan_transfer_handler_test.go`

- [x] **Step 1: 使用显式语义状态**

阶段 A 继续输出旧 `sid_hub_resolution_status` 供旧前端读取，但不新增 `sid_hub_quality_rank`：

```go
const (
	sidHubResolutionDeferred = "deferred"
	sidHubResolutionResolved = "resolved"
)
```

`resolveLinkStartEntries` 在 limit 为 0 或达到每类型上限时写入 `deferred`。解析出扫码或直链时都写入 `resolved`。旧 `sid_hub_resolution_rank` 在兼容期只作为派生字段输出：resolved 为 0，deferred 为 1；阶段 B 前端切换到语义状态后再删除。

- [x] **Step 2: 删除可打开的详情兜底**

`buildExpandedResults` 在没有候选时返回空切片：

```go
func buildExpandedResults(card sidHubMovie, entries []sidHubLinkEntry, fetchedAt time.Time) []model.SearchResult {
	card, entries = fillSidHubTimes(card, entries)
	if len(entries) == 0 {
		return []model.SearchResult{}
	}
	results := make([]model.SearchResult, 0, len(entries))
	for _, entry := range entries {
		results = append(results, buildExpandedResult(card, entry, fetchedAt))
	}
	return results
}
```

删除 `buildSidHubDetailFallbackEntry`，并停止公开 `sid_hub_detail_url`。`fetchDetailEntriesForCards` 同时返回成功、超时、抓取失败和解析失败计数；`searchBaseURL` 写一条 `seedhub_detail_enhancement` 结构化日志，包含卡片总数、各结果计数和总耗时，不记录详情 URL。没有候选时不构造 `target_type=detail` 资源。

- [x] **Step 3: 集中校验 SeedHub 抓取 URL**

增加 `validateSeedHubResolveURL`，要求：

- scheme 必须是 HTTPS。
- host 必须等于本轮启用的 SeedHub base URL host。
- path 必须精确等于 `/link_start/`，不能只做 substring 检查。
- URL 不含 userinfo 和 fragment。
- DNS 解析结果不得包含 loopback、private、link-local、unspecified 或 metadata IP。
- HTTP 重定向的每一跳重新执行相同校验。

旧接口接受的客户端 URL 只允许 `sidhub.cc` 和 `www.seedhub.cc` 两个现有生产 host。管理员配置的自定义 base URL 只用于服务端发起的搜索；阶段 B 由认证加密 token 绑定该地址后，resolver 才允许解析自定义 host。这样旧接口不需要依赖某次搜索留下的进程内 host 状态。

旧刷新接口在调用 `fetchURL` 前执行该函数。测试至少覆盖 `https://127.0.0.1/link_start/`、`https://example.com/x/link_start/y`、userinfo、HTTP、允许域名和重定向到内网。

- [x] **Step 4: 运行插件和旧接口测试**

```bash
cd backend
go test ./plugin/sidhub -run 'TestResolveLinkStartEntries|Test.*DetailFailure|TestValidateSeedHubResolveURL|Test.*RefreshScanTransfer' -count=1
go test ./api -run 'TestRefreshScanTransfer' -count=1
```

Expected: PASS。

- [x] **Step 5: Commit**

```bash
git add backend/plugin/sidhub/sidhub.go backend/plugin/sidhub/sidhub_test.go backend/api/scan_transfer_handler.go backend/api/scan_transfer_handler_test.go
git commit -m "fix(seedhub): harden deferred resource handling"
```

### Task A4: 修正前端排序并隔离旧缓存

**Files:**

- Modify: `frontend/src/utils/searchResultSorter.ts`
- Modify: `frontend/src/utils/__tests__/searchResultSorter.test.ts`
- Modify: `frontend/src/pages/ResourceDetailPage.tsx`
- Modify: `frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx`
- Modify: `frontend/src/pages/__tests__/ResourceDetailPage.test.tsx`
- Modify: `backend/util/cache/cache_key.go`
- Modify: `backend/util/cache/cache_key_test.go`

- [x] **Step 1: 删除 access rank 并实现稳定排序**

`SortableResultItem` 使用以下字段：

```ts
type SortableResultItem = ResultItem & {
  originalIndex: number;
  priority: number;
  matchRank: number;
  actionabilityRank: number;
  hasKnownTime: boolean;
};
```

排序比较顺序固定为：`matchRank`、`actionabilityRank`、`hasKnownTime`、`datetime desc`、`priority`、`originalIndex`。删除 `resolveResourceAccessRank`。SeedHub 缺少状态的旧缓存按 deferred 处理；非 SeedHub 和 `resolved` 都视为可操作。

- [x] **Step 2: 修正未知时间展示**

`formatDetailTime` 对缺失、非法值和公元 1 年返回“未知时间”：

```ts
const formatDetailTime = (value?: string): string => {
  if (!value?.trim()) return "未知时间";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() <= 1) {
    return "未知时间";
  }
  return parsed.toLocaleString("zh-CN");
};
```

资源 Hero 和链接列表共用同一格式化函数，避免两处规则漂移。

- [x] **Step 3: 升级搜索缓存结构版本**

将 `backend/util/cache/cache_key.go` 中的 `searchResultCacheSchemaVersion` 从 `v6` 改为 `v7`。测试构造 v6 key 并断言新 key 不相等。

- [x] **Step 4: 运行阶段 A 前端检查**

```bash
cd frontend
pnpm exec vitest run src/utils/__tests__/searchResultSorter.test.ts src/pages/__tests__/ResourceDetailPage.test.tsx --reporter=verbose
pnpm run check

cd ../backend
go test ./util/cache -count=1
```

Expected: PASS。

- [x] **Step 5: Commit**

```bash
git add frontend/src/utils/searchResultSorter.ts frontend/src/utils/__tests__/searchResultSorter.test.ts frontend/src/pages/ResourceDetailPage.tsx frontend/src/components/resource-detail/ResourceDetailLinksSection.tsx frontend/src/pages/__tests__/ResourceDetailPage.test.tsx backend/util/cache/cache_key.go backend/util/cache/cache_key_test.go
git commit -m "fix(search): sort by actionability and real time"
```

### Task A5: 阶段 A 验收

- [x] **Step 1: 运行后端目标包测试**

```bash
cd backend
go test ./plugin/sidhub ./api ./service ./util/cache -count=1
```

Expected: PASS。

- [x] **Step 2: 运行前端质量检查**

```bash
cd frontend
pnpm run lint
pnpm run check
pnpm exec vitest run
```

Expected: ESLint 0 errors、TypeScript 0 errors、Vitest 0 failed。

- [x] **Step 3: 强制刷新并检查 API 数据合同**

```bash
jq '{
  synthetic_seedhub: ([.data.resources[] | select(.source.id == "sidhub" and .meta.sid_hub_time_source == "synthetic_fetch_time")] | length),
  empty_resolution_status: ([.data.resources[] | select(.source.id == "sidhub" and (.meta.sid_hub_resolution_status // "") == "")] | length),
  year_one_resource_times: ([.data.resources[] | select((.published_at // "") | startswith("0001-"))] | length),
  year_one_link_times: ([.data.resources[].links[]? | select((.datetime // "") | startswith("0001-"))] | length)
}' /tmp/unisearch-all-plugins-cangyuantu-stage-a.json
```

Expected: 四项均为 0。阶段 A 不检查 API 原始前 48 条来源占比。

## 7. 阶段 B 实施任务

### Task B1: 实现认证加密 token 和公开链接边界

**Files:**

- Create: `backend/service/resource_resolve_token.go`
- Create: `backend/service/resource_resolve_token_test.go`
- Modify: `backend/model/response.go`
- Modify: `backend/service/search_response_builder.go`
- Modify: `backend/service/search_response_builder_test.go`

- [x] **Step 1: 先写 token 安全测试**

测试覆盖：

- token 字符串不包含明文 host、path、movie ID 或 provider。
- 正确 secret 可以解密并验证 claims。
- 修改 nonce、ciphertext、resource ID 或 link ID 后验证失败。
- 24 小时边界内有效，超过边界返回 `ErrResolveTokenExpired`。
- 两次签发因随机 nonce 得到不同 token，但 link ID 保持稳定。

- [x] **Step 2: 实现 AES-GCM token codec**

定义以下接口，测试通过固定 clock 和 nonce reader 注入时间与随机数：

```go
type resourceResolveTokenCodec struct {
	key   [32]byte
	now   func() time.Time
	rand  io.Reader
}

func newResourceResolveTokenCodec(secret string) (*resourceResolveTokenCodec, error)
func (codec *resourceResolveTokenCodec) Sign(claims resourceResolveTokenClaims) (string, error)
func (codec *resourceResolveTokenCodec) Verify(token string, resourceID string, linkID string) (resourceResolveTokenClaims, error)
```

构造函数拒绝空 secret。`Sign` 强制写入版本、签发时间和 24 小时过期时间；`Verify` 使用常量时间的 GCM tag 校验结果，并区分过期与篡改。

- [x] **Step 3: 生成稳定 link ID 和公开 deferred link**

先给内部 `model.Link` 增加可缓存的 resolver 描述符。搜索缓存需要序列化该字段，公开 `ResourceLink` 不复制它：

```go
type LinkResolveTarget struct {
	PluginID   string `json:"plugin_id" sonic:"plugin_id"`
	Provider   string `json:"provider" sonic:"provider"`
	MovieID    string `json:"movie_id,omitempty" sonic:"movie_id,omitempty"`
	EntryIndex int    `json:"entry_index,omitempty" sonic:"entry_index,omitempty"`
	Status     string `json:"status" sonic:"status"`
}
```

在现有内部 `Link` 类型中追加：

```go
ResolveTarget *LinkResolveTarget `json:"resolve_target,omitempty" sonic:"resolve_target,omitempty"`
```

`SourceURL` 继续存放在内部 `Link.URL`，`ResourceLink` 映射不会公开它。

`link_id` 使用领域分离 HMAC：

```go
func resolvePublicLinkID(secret string, resourceID string, link model.Link, index int) string {
	mac := hmac.New(sha256.New, []byte(secret))
	for _, field := range []string{"resource-link-id-v1", resourceID, link.Type, link.URL, strconv.Itoa(index)} {
		_, _ = mac.Write([]byte(field))
		_, _ = mac.Write([]byte{0})
	}
	return "lnk_v1_" + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)[:18])
}
```

SeedHub deferred link 的公开映射省略 URL、password、refresh key 和 `SourcePageURL`，只输出 `id/type/access_mode/resolution`。普通直链继续输出真实 URL。

- [x] **Step 4: 运行 token 和响应边界测试**

```bash
cd backend
go test ./service -run 'TestResourceResolveToken|TestSearchResponseBuilder.*Deferred|TestSearchResponseBuilder.*SourceURL' -count=1 -v
```

Expected: PASS，响应 JSON 中不出现 `sidhub.cc`、`seedhub.cc`、`/link_start/`、`sid_hub_detail_url` 或 `source_page_url`。

- [x] **Step 5: Commit**

```bash
git add backend/service/resource_resolve_token.go backend/service/resource_resolve_token_test.go backend/model/response.go backend/service/search_response_builder.go backend/service/search_response_builder_test.go
git commit -m "feat(resource): issue opaque resolve tokens"
```

### Task B2: 分组 SeedHub 候选并保留备用项

**Files:**

- Modify: `backend/plugin/sidhub/sidhub.go`
- Modify: `backend/plugin/sidhub/sidhub_test.go`

- [x] **Step 1: 定义内部候选分组**

```go
type sidHubResultGroup struct {
	MovieID   string
	Provider  string
	Title     string
	Entries   []sidHubLinkEntry
}

func buildSidHubGroupKey(movieID string, provider string, title string) string {
	normalizedTitle := normalizeSidHubGroupTitle(title)
	if movieID == "" || provider == "" || normalizedTitle == "" {
		return ""
	}
	return movieID + "\x00" + provider + "\x00" + normalizedTitle
}
```

标题规范化只移除空白和成对标点，不删除数字、清晰度、季集标记或 provider。空 key 的条目单独成组，不能将缺少 movie ID 的全部条目合并。

- [x] **Step 2: 每组构建一个 SearchResult**

组内条目按以下顺序稳定排列：已解析候选、已知时间新到旧、原始 index。一个 `SearchResult` 保留组内全部 `model.Link`。每个 deferred link 写入 `LinkResolveTarget{PluginID: "sidhub", Provider: normalizedType, MovieID: card.ID, EntryIndex: entry.Index, Status: "deferred"}`。内部 URL 和描述符供搜索缓存与 token 签发使用；公开响应由 Task B1 过滤。

- [x] **Step 3: 写分组测试**

覆盖：

- 相同 movie/provider/normalized title 组成一组并保留两个候选。
- 不同 provider、集数、清晰度和 movie ID 不合并。
- 缺少 movie ID 的候选不互相误合并。
- 分组后资源数量减少，候选总数不变。
- 组内第一个候选失效时，第二个候选仍保留。
- `LinkResolveTarget` 经过搜索缓存 JSON 往返后字段完整。

- [x] **Step 4: 运行测试并提交**

```bash
cd backend
go test ./plugin/sidhub -run 'Test.*Group|Test.*Expanded' -count=1
```

Expected: PASS。

```bash
git add backend/plugin/sidhub/sidhub.go backend/plugin/sidhub/sidhub_test.go
git commit -m "feat(seedhub): group duplicate resource candidates"
```

### Task B3: 实现 resolver、限流和指标

**Files:**

- Create: `backend/api/resource_resolve_handler.go`
- Create: `backend/api/resource_resolve_handler_test.go`
- Create: `backend/service/resource_resolve_metrics.go`
- Create: `backend/service/resource_resolve_metrics_test.go`
- Create: `backend/api/resource_resolve_metrics_handler.go`
- Modify: `backend/plugin/sidhub/sidhub.go`
- Modify: `backend/plugin/sidhub/sidhub_test.go`
- Modify: `backend/api/scan_transfer_handler.go`
- Modify: `backend/api/router.go`
- Modify: `backend/api/router_admin.go`
- Modify: `backend/api/rate_limiter.go`

- [x] **Step 1: 定义 typed resolver error**

```go
type ResourceResolveErrorKind string

const (
	ResolveInvalidRequest ResourceResolveErrorKind = "invalid_request"
	ResolveTokenExpired   ResourceResolveErrorKind = "token_expired"
	ResolveInvalid        ResourceResolveErrorKind = "resource_invalid"
	ResolveParseFailed    ResourceResolveErrorKind = "upstream_parse_failed"
	ResolveUnavailable    ResourceResolveErrorKind = "resolver_unavailable"
)

type ResourceResolveError struct {
	Kind ResourceResolveErrorKind
	Err  error
}

func (err *ResourceResolveError) Error() string { return err.Err.Error() }
func (err *ResourceResolveError) Unwrap() error { return err.Err }
```

SeedHub resolver 先验证 claims 中的 URL，再抓取页面。只有页面包含维护过的稳定失效文案时返回 `ResolveInvalid`。HTML 结构变化返回 `ResolveParseFailed`，网络错误返回 `ResolveUnavailable`。

- [x] **Step 2: 实现每用户限流和并发门**

复用 `RateLimiter` 的滑动窗口实现，新增：

```go
var resourceResolveRateLimiter = NewRateLimiter(3, 5*time.Second)
var resourceResolveConcurrency = newUserConcurrencyLimiter(2)

func resourceResolveUserKey(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		return "user:" + fmt.Sprint(userID)
	}
	return "ip:" + c.ClientIP()
}
```

给现有 `RateLimiter` 增加 `AllowWithRetryAfter(key string) (bool, time.Duration)`，`Allow` 调用它并丢弃 duration，避免影响登录限流调用点。限流 key 使用认证后的 `user_id`，缺失时回退到 IP。并发 limiter 返回 release 函数；handler 的 `defer release()` 覆盖成功和全部错误分支，并在计数降到 0 时删除用户条目。429 响应设置 `Retry-After`，窗口限流取剩余秒数向上取整，并发限制设置为 `1`。

- [x] **Step 3: 实现 resolver handler**

```go
type resourceResolveRequest struct {
	ResourceID   string `json:"resource_id" binding:"required"`
	LinkID       string `json:"link_id" binding:"required"`
	ResolveToken string `json:"resolve_token" binding:"required"`
}

type resourceResolveResponse struct {
	ResourceID       string             `json:"resource_id"`
	LinkID           string             `json:"link_id"`
	ResolutionStatus string             `json:"resolution_status"`
	Link             model.ResourceLink `json:"link"`
}
```

handler 使用 12 秒超时，按 4.5 节映射错误。响应转换清除 `ScanTransferInfo.SourcePageURL` 和 refresh key。旧扫码接口复用相同的 SeedHub 页面解析核心，但保留旧请求和响应结构；新搜索结果不再生成 URL 型 refresh key。

- [x] **Step 4: 增加 resolver 指标**

`ResourceResolveMetrics` 快照至少包含：

```go
type ResourceResolveMetrics struct {
	Total             uint64            `json:"total"`
	Success           uint64            `json:"success"`
	CacheHits         uint64            `json:"cache_hits"`
	Active            int               `json:"active"`
	MaxActive         int               `json:"max_active"`
	OutcomeCounts     map[string]uint64  `json:"outcome_counts"`
	LatencyBucketsMS  map[string]uint64  `json:"latency_buckets_ms"`
}
```

API 包创建一个进程级 `service.NewResourceResolveMetrics()`，resolver handler 写入它，管理员 handler 读取快照并注册为 `GET /api/admin/resource-resolve/metrics`。每次请求同时写结构化日志 `resource_resolve`，字段包含 request ID、token 摘要、provider、outcome、cache hit、latency 和 fallback index；日志不得包含 URL 或 token。

- [x] **Step 5: 运行 API、插件和指标测试**

```bash
cd backend
go test ./plugin/sidhub -run 'Test.*ResolveResource|Test.*InvalidSignal|TestValidateSeedHubResolveURL' -count=1
go test ./api -run 'TestResourceResolve|TestRefreshScanTransfer' -count=1
go test ./service -run 'TestResourceResolveMetrics' -count=1
```

测试必须覆盖第 4 个五秒窗口请求返回 429、第三个并发请求返回 429、相同 link ID singleflight、token 过期、取消、超时和所有 typed error。

- [x] **Step 6: Commit**

```bash
git add backend/api/resource_resolve_handler.go backend/api/resource_resolve_handler_test.go backend/service/resource_resolve_metrics.go backend/service/resource_resolve_metrics_test.go backend/api/resource_resolve_metrics_handler.go backend/plugin/sidhub/sidhub.go backend/plugin/sidhub/sidhub_test.go backend/api/scan_transfer_handler.go backend/api/router.go backend/api/router_admin.go backend/api/rate_limiter.go
git commit -m "feat(resource): resolve opaque candidates on demand"
```

### Task B4: 前端点击解析和备用候选

**Files:**

- Modify: `frontend/src/types/resource.ts`
- Modify: `frontend/src/services/searchService.ts`
- Modify: `frontend/src/services/__tests__/searchService.test.ts`
- Modify: `frontend/src/stores/searchStore.ts`
- Modify: `frontend/src/stores/__tests__/searchStore.test.ts`
- Modify: `frontend/src/components/SearchResults.tsx`
- Modify: `frontend/src/components/__tests__/SearchResults.test.tsx`
- Modify: `frontend/src/utils/resourceDisplay.ts`
- Modify: `frontend/src/utils/__tests__/resourceDisplay.test.ts`

- [x] **Step 1: 定义前端合同**

```ts
export type ResourceResolutionStatus = "deferred" | "resolved" | "invalid";

export interface ResourceLinkResolution {
  status: ResourceResolutionStatus;
  token?: string;
  expires_at?: string;
}

export interface ResourceResolveRequest {
  resource_id: string;
  link_id: string;
  resolve_token: string;
}

export interface ResourceResolveResponse {
  resource_id: string;
  link_id: string;
  resolution_status: "resolved";
  link: ResourceLink;
}
```

`ResourceLink.url` 改为可选，`ResourceAccessMode` 增加 `resolve_required`。

- [x] **Step 2: 实现 service 和错误码保留**

`SearchService.resolveResource` 调用 `/resources/resolve`。测试必须证明标准化错误对象中的 `data.error_code` 和 `response.status` 没有被 catch 后改写，组件通过 `getErrorDataCode` 区分两个 HTTP 410。

- [x] **Step 3: 按 resource ID 和 link ID 原子更新**

```ts
updateResolvedResourceLink: (resourceId, linkId, resolvedLink) => {
  set((state) => {
    if (!state.searchResults) return state;
    let changed = false;
    const resources = state.searchResults.resources.map((resource) => {
      if (resource.id !== resourceId) return resource;
      const links = resource.links.map((link) => {
        if (link.id !== linkId) return link;
        changed = true;
        return { ...resolvedLink, id: linkId };
      });
      return changed ? { ...resource, links } : resource;
    });
    return changed
      ? { searchResults: { ...state.searchResults, resources } }
      : state;
  });
},
```

增加 `markResourceLinkInvalid(resourceId, linkId)`。store 必须忽略 resource/link 不匹配和旧请求返回，不按 URL 更新。

- [x] **Step 4: 实现点击解析状态机**

点击流程：

1. 若候选已有真实 URL，按现有 direct、password、magnet 或 scan 规则打开。
2. deferred 候选使用自己的 token 调用 resolver。
3. 成功后更新 store 并打开解析后的真实目标。
4. `RESOURCE_INVALID` 时标记当前候选 invalid，并顺序尝试一个备用候选。
5. 其他错误停止，不尝试备用。
6. 用户取消时 abort 当前请求并清理 loading 状态。

删除全部预热 queue、prewarm limit、prewarm concurrency 和相关 effect。前端每次点击最多调用 resolver 两次。

- [x] **Step 5: 运行前端测试**

```bash
cd frontend
pnpm exec vitest run src/services/__tests__/searchService.test.ts src/stores/__tests__/searchStore.test.ts src/components/__tests__/SearchResults.test.tsx src/utils/__tests__/resourceDisplay.test.ts --reporter=verbose
pnpm run check
```

测试覆盖 HTTP 直链、magnet、扫码、主候选 410 后备用成功、token 过期不尝试备用、超时不淘汰、取消无副作用、最多两次调用和页面加载零预热请求。

- [x] **Step 6: Commit**

```bash
git add frontend/src/types/resource.ts frontend/src/services/searchService.ts frontend/src/services/__tests__/searchService.test.ts frontend/src/stores/searchStore.ts frontend/src/stores/__tests__/searchStore.test.ts frontend/src/components/SearchResults.tsx frontend/src/components/__tests__/SearchResults.test.tsx frontend/src/utils/resourceDisplay.ts frontend/src/utils/__tests__/resourceDisplay.test.ts
git commit -m "feat(search): resolve grouped candidates on click"
```

### Task B5: 通用来源配额和管理开关

**Files:**

- Create: `frontend/src/components/search-results/searchResultsPresentation.ts`
- Create: `frontend/src/components/search-results/searchResultsPresentation.test.ts`
- Modify: `frontend/src/components/search-results/useSearchResultsPresentation.ts`
- Modify: `backend/model/system_settings.go`
- Modify: `backend/service/system_settings_service.go`
- Modify: `backend/service/system_settings_service_test.go`
- Modify: `backend/api/system_settings_handler.go`
- Modify: `backend/api/system_settings_handler_test.go`
- Modify: `frontend/src/services/systemSettingsService.ts`
- Modify: `frontend/src/services/__tests__/systemSettingsService.test.ts`
- Modify: `frontend/src/hooks/useSystemSettingsController.ts`
- Modify: `frontend/src/components/admin/SystemSettingsView.tsx`
- Modify: `frontend/src/components/admin/system-settings/SearchExperienceSettingsPanel.tsx`
- Modify: `frontend/src/components/SearchResults.tsx`
- Modify: `frontend/src/components/__tests__/SearchResults.test.tsx`

- [x] **Step 1: 增加系统设置**

```go
EnableSearchSourceDiversity bool `gorm:"not null;default:false" json:"enable_search_source_diversity"`
SearchFirstPageMaxPerSource int  `gorm:"not null;default:16" json:"search_first_page_max_per_source"`
```

服务端只接受 `1..48`。迁移默认关闭，阶段 B 前后端都部署后由管理员开启。公开系统设置接口返回这两个值，前端读取失败时使用 `false/16`，避免旧后端被新前端误开启。

- [x] **Step 2: 实现通用来源配额纯函数**

```ts
export function rebalanceFirstPageBySource(
  items: ResultItem[],
  pageSize: number,
  maxPerSource: number,
): ResultItem[] {
  const head: ResultItem[] = [];
  const deferred: ResultItem[] = [];
  const tail: ResultItem[] = [];
  const counts = new Map<string, number>();

  for (const item of items) {
    if (head.length >= pageSize) {
      tail.push(item);
      continue;
    }
    const sourceId = String(item.resource.source.id || "unknown").trim() || "unknown";
    const count = counts.get(sourceId) || 0;
    if (count >= maxPerSource) {
      deferred.push(item);
      continue;
    }
    head.push(item);
    counts.set(sourceId, count + 1);
  }

  const fillCount = pageSize - head.length;
  return [
    ...head,
    ...deferred.slice(0, fillCount),
    ...deferred.slice(fillCount),
    ...tail,
  ];
}
```

调用顺序固定为：排序、云盘筛选、来源配额、slice。SeedHub 候选已经由后端分组，前端不再按标题执行第二次合并。关闭开关时跳过配额函数。

- [x] **Step 3: 增加设置 UI 和测试**

管理页提供一个开关和数值输入。数值输入使用 `min=1`、`max=48`、`step=1`，保存时复用系统设置更新入口。`SearchResults` 把公开设置传给 presentation hook。测试覆盖开关关闭、16/48、多来源不足自动回填、单来源 48 条、第二页数据保留和未知 source ID 的稳定分组。

- [x] **Step 4: 运行测试并提交**

```bash
cd backend
go test ./service ./api -run 'Test.*SystemSettings.*Source' -count=1

cd ../frontend
pnpm exec vitest run src/components/search-results/searchResultsPresentation.test.ts src/services/__tests__/systemSettingsService.test.ts --reporter=verbose
pnpm run check
```

Expected: PASS。

```bash
git add frontend/src/components/search-results/searchResultsPresentation.ts frontend/src/components/search-results/searchResultsPresentation.test.ts frontend/src/components/search-results/useSearchResultsPresentation.ts backend/model/system_settings.go backend/service/system_settings_service.go backend/service/system_settings_service_test.go backend/api/system_settings_handler.go backend/api/system_settings_handler_test.go frontend/src/services/systemSettingsService.ts frontend/src/services/__tests__/systemSettingsService.test.ts frontend/src/hooks/useSystemSettingsController.ts frontend/src/components/admin/SystemSettingsView.tsx frontend/src/components/admin/system-settings/SearchExperienceSettingsPanel.tsx frontend/src/components/SearchResults.tsx frontend/src/components/__tests__/SearchResults.test.tsx
git commit -m "feat(search): cap first-page results per source"
```

### Task B6: 确定性 E2E、真实 smoke test 和开发记录

**Files:**

- Create: `frontend/e2e/search-quality.spec.ts`
- Modify: `frontend/e2e/real-backend.spec.ts`
- Modify: `frontend/src/components/home/SearchResultGridCard.tsx`
- Modify: `frontend/src/components/home/SearchResultListItem.tsx`
- Modify: `docs/readme_2607.md`

- [x] **Step 1: 增加确定性浏览器回归**

第一组 fixture 返回 100 个结果，其中来源 A 60 个、来源 B 20 个、来源 C 20 个。第二组 fixture 返回来源 A 60 个、来源 B 10 个、来源 C 10 个。开启来源配额后断言：

- 第一组首屏恰好 48 条，每个来源各 16 条。
- 第二组首屏恰好 48 条，B/C 各 10 条，A 按原顺序回填到 28 条。
- 继续加载后仍能看到延后的结果。
- 页面加载不会调用 `/api/resources/resolve`。
- 点击 deferred 卡片才调用 resolver，请求体不含 URL。

Grid 和 List 根节点增加 `data-source-id`、`data-resource-id`，不得增加原始地址属性。

- [x] **Step 2: 增加真实后端 smoke test**

真实测试强制刷新“沧元图”并检查：

- 响应 JSON 不包含 `sidhub.cc`、`seedhub.cc`、`/link_start/`、`original_link_url`、`sid_hub_detail_url` 或 `source_page_url`。
- 每个 SeedHub deferred link 都有 `id`、`resolution.token` 和 `resolution.expires_at`，且没有 `url`。
- 点击一个 deferred 结果后返回真实可操作目标或受支持的 typed error。

上游结果数量不足时，真实 smoke test记录来源数量，但不把 16/48 配额判为通过。配额由确定性 E2E 负责。

- [x] **Step 3: 运行完整验证**

```bash
cd backend
go test ./plugin/sidhub ./api ./service ./util/cache -count=1

cd ../frontend
pnpm run lint
pnpm run check
pnpm exec vitest run
pnpm exec playwright test e2e/search-quality.spec.ts --project=chromium
```

Expected: 全部 PASS。

- [x] **Step 4: 运行真实 smoke test**

```bash
cd /Users/abner/Desktop/MyProject/UniSearch-dev
./scripts/local.sh restart

cd frontend
UNISEARCH_REAL_E2E=1 pnpm exec playwright test e2e/real-backend.spec.ts --project=real-backend
```

Expected: resolver 合同通过。真实上游数量只作为观测值，不替代确定性配额测试。

- [x] **Step 5: 追加开发记录并提交**

`docs/readme_2607.md` 记录两个阶段的提交、验证命令、真实搜索指标、resolver 指标快照和开启来源配额的时间。

```bash
git add frontend/e2e/search-quality.spec.ts frontend/e2e/real-backend.spec.ts frontend/src/components/home/SearchResultGridCard.tsx frontend/src/components/home/SearchResultListItem.tsx docs/readme_2607.md
git commit -m "test(search): verify opaque seedhub resolution"
```

## 8. 上线顺序

### 8.1 阶段 A

1. 发布 Task A2 至 A4。
2. 强制刷新基准关键词，确认阶段 A 四项 API 指标均为 0。
3. 观察搜索错误、SeedHub 结果数和详情抓取失败率。
4. 阶段 A 稳定后开始阶段 B。

### 8.2 阶段 B

1. 通过同一版本协同发布 token、resolver、新公开链接合同和前端点击解析代码，保持 `enable_search_source_diversity=false`。
2. 确认新搜索响应不泄露来源地址，resolver 指标接口有数据。
3. 开启 `enable_search_source_diversity`，默认 `search_first_page_max_per_source=16`。
4. 连续观察 24 小时：resolver 成功率、p95 延迟、超时、429、解析错误和用户点击错误。
5. 运行真实搜索采样，记录首屏各来源数量。
6. 稳定一个发布周期后另建任务删除旧扫码刷新合同和旧 resolution rank 兼容代码。

## 9. 回滚策略

| 风险 | 回滚方式 |
| --- | --- |
| 阶段 A 时间合同影响旧客户端 | 回滚可空公开字段提交；保留插件内部 unknown 时间，前端继续忽略 synthetic |
| 新排序降低相关性 | 回滚前端排序提交；后端时间和状态修复继续保留 |
| token 或 resolver 故障 | `git revert` 阶段 B 的后端公开合同和前端点击解析提交，恢复阶段 A 的旧客户端路径；不回滚阶段 A |
| resolver 增加上游压力 | 暂停 resolver 路由或将并发上限降为 1；搜索仍返回 deferred 结果 |
| 来源配额过强 | 关闭 `enable_search_source_diversity`，无需回滚代码 |
| 分组误合并 | `git revert` Task B2，并让响应构建器继续为单候选资源签发 token；token 和 resolver 继续可用 |

每个任务提交时测试必须为绿色。回滚使用 `git revert <commit>`，保留审计记录。

## 10. 完成标准

### 阶段 A

- [x] 新搜索不再生成 `synthetic_fetch_time`。
- [x] 资源级和链接级未知时间均从 JSON 中省略。
- [x] “天前、月前、年前”按 Asia/Shanghai 日历语义解析，月末和闰年测试通过。
- [x] deferred 条目具有显式状态，空状态和 rank 零值不再影响排序。
- [x] 扫码访问方式不再全局压过普通资源。
- [x] 没有真实候选的详情失败不进入结果集。
- [x] 旧刷新接口拒绝非允许域名、内网地址和不安全重定向。
- [x] 后端目标包、前端 lint、类型检查和 Vitest 全部通过。

### 阶段 B

- [x] 搜索响应和 resolver 响应不包含任何 SeedHub 中间页或来源页地址。
- [x] deferred 候选只公开 `link_id + resolve_token`，token 在 24 小时后过期。
- [x] resolver 返回扫码、HTTP、网盘、magnet、ed2k 或 thunder 真实目标。
- [x] 每用户 5 秒最多 3 次请求、最多 2 个并发请求。
- [x] 一次点击最多自动解析两个候选，且只在明确 410 invalid 后尝试备用。
- [x] 页面加载不产生自动 resolver 请求。
- [x] 同组结果只展示一张卡片，组内备用候选没有丢失。
- [x] 开启来源配额且其他来源足以填满首屏时，确定性 E2E 中任意来源不超过 16/48；来源不足时自动回填。
- [x] typed error、指标、缓存、singleflight、取消和超时测试通过。
- [x] 完整后端测试、前端 lint、类型检查、Vitest、确定性 Playwright 和真实 smoke test 通过。
