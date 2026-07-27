package sidhub

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/PuerkitoBio/goquery"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

const sidHubTabbedDownloadFixture = `
<section id="downloads">
  <nav class="download-tabs">
    <a href="#magnet-pane">磁力(3)</a>
    <a href="#baidu-pane">百度(2)</a>
    <a href="#quark-pane">夸克(2)</a>
    <a href="#xunlei-pane">迅雷(2)</a>
    <a href="#uc-pane">UC(1)</a>
    <a href="#aliyun-pane">阿里(0)</a>
  </nav>
  <div id="magnet-pane">
    <ul>
      <li><a href="/link_start/?redirect_to=magnet_1" title="你的名字。国粤日多音轨 8.19G">你的名字。国粤日多音轨</a><span>8.19G</span><span>蓝光</span><time>2025年</time></li>
      <li><a href="/link_start/?redirect_to=magnet_2">Kimi.no.Na.wa.2016.1080p.Remux</a><span>24.89G</span><span>无损</span><time>2025年</time></li>
      <li><a href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567">直接磁力</a><span>2.28G</span></li>
    </ul>
  </div>
  <div id="baidu-pane">
    <ul>
      <li><a href="/link_start/?redirect_to=baidu_1" title="百度资源一">百度资源一</a></li>
      <li><a href="https://pan.baidu.com/s/abc?pwd=1234">百度资源二</a></li>
    </ul>
  </div>
  <div id="quark-pane">
    <ul>
      <li><a href="/link_start/?redirect_to=quark_1">夸克资源一</a></li>
      <li><a href="https://pan.quark.cn/s/q2">夸克资源二</a></li>
    </ul>
  </div>
  <div id="xunlei-pane">
    <ul>
      <li><a href="/link_start/?redirect_to=xunlei_1">迅雷资源一</a></li>
      <li><a href="https://pan.xunlei.com/s/x2">迅雷资源二</a></li>
    </ul>
  </div>
  <div id="uc-pane">
    <ul>
      <li><a href="/link_start/?redirect_to=uc_1">UC资源一</a></li>
    </ul>
  </div>
  <div id="aliyun-pane"></div>
</section>`

const sidHubNativeDownloadFixture = `
<section id="downloads">
  <nav class="nav-links">
    <div class="nav-item"><a class="nav-link seed-tab router-link-active" href="javascript:switchTab('seed');">磁力(2)</a></div>
    <div class="nav-item"><a class="nav-link uc-tab" href="javascript:switchTab('uc');">UC(1)</a></div>
  </nav>
  <div class="seed-list">
    <p><span class="seeds-header"><a class="sort" href="javascript:doSort(1);">大小</a> / <a class="sort" href="javascript:doSort(0);">更新于↓</a></span></p>
    <ul class="seeds">
      <li>
        <a target="_blank" rel="nofollow" title="你的名字。[国粤日多音轨][8.19G]" href="/link_start/?seed_id=529070&amp;movie_title=你的名字。的磁力">你的名字。[国粤日多音轨]</a> / <code class="size">8.19G</code>
        <code class="seed-feature">蓝光</code>
        <span>2025年</span>
      </li>
      <li>
        <a target="_blank" rel="nofollow" title="Kimi.no.Na.wa.2016.1080p.Remux[24.89G]" href="/link_start/?seed_id=478334&amp;movie_title=你的名字。的磁力">Kimi.no.Na.wa.2016.1080p.Remux</a> / <code class="size">24.89G</code>
        <code class="seed-feature">无损</code>
        <span>2025年</span>
      </li>
    </ul>
  </div>
  <div class="uc-list">
    <ul>
      <li><a title="UC资源一" href="/link_start/?pan_id=uc_1&amp;movie_title=你的名字。">UC资源一</a></li>
    </ul>
  </div>
</section>`

const sidHubActiveTabFallbackFixture = `
<section id="downloads">
  <nav class="resource-tabs">
    <a class="tab">磁力(8)</a>
    <a class="tab router-link-active">百度(12)</a>
    <a class="tab">夸克(10)</a>
    <a class="tab">迅雷(7)</a>
    <a class="tab">UC(0)</a>
    <a class="tab">阿里(0)</a>
  </nav>
  <div class="resource-items">
    <ul>
      <li>
        <a href="/link_start/?redirect_to=pan_id_612954&amp;movie_title=%E2%9C%85%E3%80%90%E5%A4%A7%E6%BF%9B%E3%80%91%E3%80%90WEB-4K%E3%80%91%E3%80%90%E4%B8%AD%E5%AD%97%E3%80%91%E3%80%90%E6%AD%A3%E5%BC%8F%E7%89%88%E3%80%91">
          ✅【大濛】【WEB-4K】【中字】【正式版】
        </a>
        <span>今天</span>
      </li>
    </ul>
  </div>
</section>`

const sidHubQuarkRowTitleFallbackFixture = `
<section id="downloads">
  <nav class="resource-tabs">
    <a class="tab">磁力(8)</a>
    <a class="tab">百度(12)</a>
    <a class="tab router-link-active">夸克(10)</a>
    <a class="tab">迅雷(7)</a>
    <a class="tab">UC(0)</a>
    <a class="tab">阿里(0)</a>
  </nav>
  <div class="resource-items">
    <ul>
      <li>
        <span class="resource-title">✅【大濛】【4K+1080P】【内嵌简中字幕】【流媒体正式版】</span>
        <a class="open-link" href="/link_start/?redirect_to=pan_id_4k&amp;movie_title=%E5%A4%A7%E6%BF%9B">打开</a>
        <span>2天前</span>
      </li>
    </ul>
  </div>
</section>`

const sidHubRowNoiseFixture = `
<section id="downloads">
  <div class="quark-list">
    <ul>
      <li>
        <span class="resource-title">大濛 2160P 杜比视界</span>
        <a class="open-link" href="/link_start/?redirect_to=quark_noise&amp;movie_title=%E5%A4%A7%E6%BF%9B">查看</a>
        <code class="size">12.5G</code>
        <span class="seed-feature">蓝光</span>
        <span>今天</span>
      </li>
    </ul>
  </div>
</section>`

const sidHubAttributeResourceURLFixture = `
<section id="downloads">
  <div class="quark-list">
    <ul>
      <li><button data-url="/link_start/?redirect_to=quark_data_url&amp;movie_title=%E5%A4%A7%E6%BF%9B">大濛 data-url 资源</button></li>
      <li><button data-clipboard-text="https://pan.quark.cn/s/clipboard123">大濛 clipboard 资源</button></li>
      <li><label>大濛 input 资源<input value="https://pan.quark.cn/s/input123" /></label></li>
    </ul>
  </div>
</section>`

const sidHubScanTransferFixture = `
<html>
  <body>
    <div class="scan-transfer-panel">
      <p>请使用手机扫码转存，网盘链接容易被吞</p>
      <img class="qrcode" src="data:image/png;base64,abc123" />
      <a class="mobile-open" href="quark://scan-transfer/123">打开夸克 App</a>
      <code>转存口令：ABCD1234</code>
    </div>
  </body>
</html>`

const sidHubScanTransferFallbackFixture = `
<html>
  <body>
    <div class="scan-transfer-panel">
      <p>请使用手机扫码转存</p>
      <a class="mobile-open" href="quark://scan-transfer/fallback">打开夸克 App</a>
    </div>
  </body>
</html>`

const sidHubScanTransferCodeOnlyFixture = `
<html>
  <body>
    <main>
      <p>请使用手机扫码转存</p>
      <p>转存口令：EFGH5678</p>
    </main>
  </body>
</html>`

func TestSidHubPluginContract(t *testing.T) {
	p := NewSidHubPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestSidHubPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewSidHubPlugin())

	if manifest.ID != "search.sidhub" {
		t.Fatalf("期望插件 ID 为 search.sidhub，实际为 %q", manifest.ID)
	}
	if manifest.Name != "SeedHub" {
		t.Fatalf("期望插件展示名为 SeedHub，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != defaultPriority {
		t.Fatalf("期望插件优先级为 %d，实际为 %d", defaultPriority, manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
	if len(manifest.ConfigSchema) != 7 {
		t.Fatalf("期望 SeedHub 声明 7 个运行配置项，实际为 %#v", manifest.ConfigSchema)
	}
	fieldsByKey := make(map[string]model.PluginConfigField, len(manifest.ConfigSchema))
	for _, field := range manifest.ConfigSchema {
		fieldsByKey[field.Key] = field
	}
	expectedFields := map[string]float64{
		"max_search_cards":                 float64(maxSearchCards),
		"max_resource_entries_per_type":    float64(defaultMaxResourceEntriesPerType),
		"pre_resolved_link_start_per_type": float64(defaultPreResolvedLinkStartPerType),
		"detail_concurrency":               float64(defaultDetailConcurrency),
		"detail_timeout_seconds":           defaultDetailTimeout.Seconds(),
		"detail_total_budget_seconds":      defaultDetailTotalBudget.Seconds(),
	}
	for key, expectedDefault := range expectedFields {
		field, exists := fieldsByKey[key]
		if !exists || field.Type != "number" || field.Default != expectedDefault {
			t.Fatalf("期望声明 %s 配置，实际为 %#v", key, manifest.ConfigSchema)
		}
	}
	resourceLimitField, exists := fieldsByKey["max_resource_entries_per_type"]
	if !exists || resourceLimitField.Minimum == nil || *resourceLimitField.Minimum != 1 || resourceLimitField.Maximum == nil || *resourceLimitField.Maximum != maxResourceEntriesPerType || !resourceLimitField.Integer {
		t.Fatalf("期望声明每类资源数量约束，实际为 %#v", resourceLimitField)
	}
	preResolveField := fieldsByKey["pre_resolved_link_start_per_type"]
	if preResolveField.Minimum == nil || *preResolveField.Minimum != 0 || preResolveField.Maximum == nil || *preResolveField.Maximum != maxPreResolvedLinkStartPerType || !preResolveField.Integer || preResolveField.LessThanOrEqualTo != "max_resource_entries_per_type" {
		t.Fatalf("期望声明预解析数量约束，实际为 %#v", preResolveField)
	}
	baseURLStrategyField, exists := fieldsByKey["base_url_strategy"]
	if !exists || baseURLStrategyField.Type != "string" || baseURLStrategyField.Default != defaultBaseURLStrategy {
		t.Fatalf("期望声明 base_url_strategy 字符串配置，实际为 %#v", manifest.ConfigSchema)
	}
}

func TestParseSearchCards(t *testing.T) {
	// 覆盖矩阵：S1、S2、S3。
	html := `
<section class="grid">
  <article class="movie-card">
    <a title="怪奇物语 第五季 Stranger Things Season 5" class="image" href="/movies/119254/">
      <img data-src="https://sidhub.cc/poster.jpg" />
    </a>
    <p>2025 / 剧集 / 美国 / 英语 / 薇诺娜·瑞德 大卫·哈伯</p>
    <span>类型:科幻/悬疑/剧情</span>
    <span>豆瓣评分: 9.6</span>
  </article>
  <article class="movie-card">
    <a title="女士优先 Ladies First" class="image" href="/movies/138485/">
      <img src="/static/lady.jpg" />
    </a>
    <p>2026 / 电影 / 美国 / 英语 / 萨莎·拜伦·科恩</p>
    <span>类型:喜剧/爱情</span>
    <span>豆瓣评分: 5.4</span>
  </article>
</section>`

	cards, err := parseSearchCards(strings.NewReader(html), "https://sidhub.cc", 10)
	if err != nil {
		t.Fatalf("解析搜索卡片失败: %v", err)
	}
	if len(cards) != 2 {
		t.Fatalf("期望解析 2 个卡片，实际为 %d", len(cards))
	}

	first := cards[0]
	if first.ID != "119254" {
		t.Fatalf("期望 ID 为 119254，实际为 %q", first.ID)
	}
	if first.Title != "怪奇物语 第五季 Stranger Things Season 5" {
		t.Fatalf("期望标题被解析，实际为 %q", first.Title)
	}
	if first.MediaType != "tv" {
		t.Fatalf("期望剧集识别为 tv，实际为 %q", first.MediaType)
	}
	if first.DetailURL != "https://sidhub.cc/movies/119254/" {
		t.Fatalf("期望详情 URL 为绝对地址，实际为 %q", first.DetailURL)
	}
	if first.CoverURL != "https://sidhub.cc/poster.jpg" {
		t.Fatalf("期望封面地址被解析，实际为 %q", first.CoverURL)
	}
	if !strings.Contains(first.Content, "豆瓣评分: 9.6") {
		t.Fatalf("期望内容包含评分，实际为 %q", first.Content)
	}

	second := cards[1]
	if second.MediaType != "movie" {
		t.Fatalf("期望电影识别为 movie，实际为 %q", second.MediaType)
	}
	if second.CoverURL != "https://sidhub.cc/static/lady.jpg" {
		t.Fatalf("期望相对封面转为绝对地址，实际为 %q", second.CoverURL)
	}
}

func TestParseSearchCardsSupportsGenericMovieContainers(t *testing.T) {
	// 覆盖矩阵：S5。
	html := `
<section class="grid">
  <article class="movie-card">
    <a class="poster-link" href="/movies/120138/">
      <img data-original="/poster-dameng.jpg" />
      <strong class="title">大濛</strong>
    </a>
    <p>2025 / 电影 / 中国大陆 / 汉语普通话</p>
  </article>
</section>`

	cards, err := parseSearchCards(strings.NewReader(html), "https://sidhub.cc", 10)
	if err != nil {
		t.Fatalf("解析通用搜索卡片失败: %v", err)
	}
	if len(cards) != 1 {
		t.Fatalf("期望解析 1 个通用卡片，实际为 %#v", cards)
	}
	if cards[0].Title != "大濛" || cards[0].ID != "120138" {
		t.Fatalf("期望从链接文本和路径解析通用卡片，实际为 %#v", cards[0])
	}
}

func TestParseSearchCardsUsesImageAltAndContainerTitleFallback(t *testing.T) {
	// 覆盖 SeedHub 新卡片结构：影片链接可能只包裹封面，标题位于图片 alt 或容器标题节点。
	html := `
<section class="grid">
  <article class="movie-card">
    <a class="poster-link" href="/movies/626957/">
      <img alt="【铁拳教育】【WEB-4K】【内嵌中字】【极限画质】" src="/poster-tiequan.jpg" />
    </a>
    <h2 class="movie-title">铁拳教育</h2>
    <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
  </article>
</section>`

	cards, err := parseSearchCards(strings.NewReader(html), "https://www.seedhub.cc", 10)
	if err != nil {
		t.Fatalf("解析封面式搜索卡片失败: %v", err)
	}
	if len(cards) != 1 {
		t.Fatalf("期望解析 1 个封面式搜索卡片，实际为 %#v", cards)
	}
	if cards[0].Title != "【铁拳教育】【WEB-4K】【内嵌中字】【极限画质】" {
		t.Fatalf("期望从图片 alt 提取资源标题，实际为 %#v", cards[0])
	}
	if cards[0].ID != "626957" || cards[0].CoverURL != "https://www.seedhub.cc/poster-tiequan.jpg" {
		t.Fatalf("期望保留影片 ID 和封面，实际为 %#v", cards[0])
	}
}

func TestParseSidHubDateSupportsRelativeAndAbsoluteFormats(t *testing.T) {
	now := time.Date(2026, 6, 27, 18, 30, 0, 0, sidHubLocation)
	cases := []struct {
		name     string
		text     string
		expected time.Time
	}{
		{name: "今天", text: "今天", expected: time.Date(2026, 6, 27, 12, 0, 0, 0, sidHubLocation)},
		{name: "昨天", text: "昨天", expected: time.Date(2026, 6, 26, 12, 0, 0, 0, sidHubLocation)},
		{name: "三天前", text: "3 天前", expected: time.Date(2026, 6, 24, 12, 0, 0, 0, sidHubLocation)},
		{name: "短横线完整日期", text: "更新于 2026-06-20", expected: time.Date(2026, 6, 20, 12, 0, 0, 0, sidHubLocation)},
		{name: "斜线完整日期", text: "2026/06/20", expected: time.Date(2026, 6, 20, 12, 0, 0, 0, sidHubLocation)},
		{name: "中文完整日期", text: "2026年6月20日", expected: time.Date(2026, 6, 20, 12, 0, 0, 0, sidHubLocation)},
		{name: "当年月日", text: "06-20", expected: time.Date(2026, 6, 20, 12, 0, 0, 0, sidHubLocation)},
		{name: "未来月日回退上一年", text: "06-28", expected: time.Date(2025, 6, 28, 12, 0, 0, 0, sidHubLocation)},
		{name: "中文月日", text: "6月20日", expected: time.Date(2026, 6, 20, 12, 0, 0, 0, sidHubLocation)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			actual := parseSidHubDate(tc.text, now)
			if !actual.Equal(tc.expected) {
				t.Fatalf("期望解析为 %s，实际为 %s", tc.expected, actual)
			}
		})
	}
}

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
		{
			name: "clamps relative month to target month end",
			now:  time.Date(2026, 3, 31, 18, 0, 0, 0, location),
			text: "1月前",
			want: time.Date(2026, 2, 28, 12, 0, 0, 0, location),
		},
		{
			name: "clamps leap day to previous non leap year",
			now:  time.Date(2024, 2, 29, 18, 0, 0, 0, location),
			text: "1年前",
			want: time.Date(2023, 2, 28, 12, 0, 0, 0, location),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := parseSidHubDate(tc.text, tc.now); !got.Equal(tc.want) {
				t.Fatalf("parseSidHubDate(%q) = %s, want %s", tc.text, got, tc.want)
			}
		})
	}
}

func TestParseDetailLinkEntriesReadsDateFromResolvedTitle(t *testing.T) {
	html := `
<section class="quark-list">
  <div class="resource-row">
    <a href="/link_start/?redirect_to=quark_1" title="沧元图 2月前">夸克</a>
  </div>
</section>`

	entries, err := parseDetailLinkEntries(strings.NewReader(html), "https://www.seedhub.cc", "沧元图")
	if err != nil {
		t.Fatalf("parse detail entries: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected one entry, got %#v", entries)
	}
	if entries[0].DateText != "2月前" || entries[0].Datetime.IsZero() {
		t.Fatalf("expected title date to be parsed, got %#v", entries[0])
	}
}

func TestParseDetailLinks(t *testing.T) {
	// 覆盖矩阵：D5、T1。
	html := `
<section id="downloads">
  <a class="btn" data-link="quark" title="【怪奇物语】【4K】" href="/link_start/?redirect_to=pan_id_10&amp;movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD">夸克</a>
  <a class="btn" data-link="baidu" title="怪奇物语 百度" href="/link_start/?redirect_to=pan_id_11&amp;movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD">百度</a>
  <div data-link="alipan">
    <a title="阿里资源" href="/link_start/?redirect_to=pan_id_12&amp;movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD">阿里</a>
  </div>
  <a title="磁力资源" href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567">磁力</a>
</section>`

	links, err := parseDetailLinks(strings.NewReader(html), "https://sidhub.cc", "怪奇物语")
	if err != nil {
		t.Fatalf("解析详情链接失败: %v", err)
	}
	if len(links) != 4 {
		t.Fatalf("期望解析 4 个链接，实际为 %d: %#v", len(links), links)
	}

	if links[0].Type != "quark" || links[0].WorkTitle != "怪奇物语" {
		t.Fatalf("期望首个链接为夸克且带作品标题，实际为 %#v", links[0])
	}
	assertSidHubLinkStartURL(t, links[0].URL, "https", "sidhub.cc", "pan_id_10", "怪奇物语")
	if links[1].Type != "baidu" {
		t.Fatalf("期望第二个链接为百度，实际为 %#v", links[1])
	}
	if links[2].Type != "aliyun" {
		t.Fatalf("期望 alipan 归一为 aliyun，实际为 %#v", links[2])
	}
	if links[3].Type != "magnet" {
		t.Fatalf("期望直接磁力链接被保留，实际为 %#v", links[3])
	}
}

func TestParseDetailLinkEntriesUsesDownloadTabs(t *testing.T) {
	// 覆盖矩阵：D2、T2、T3。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubTabbedDownloadFixture), "https://sidhub.cc", "你的名字。")
	if err != nil {
		t.Fatalf("解析 SidHub 页签资源失败: %v", err)
	}

	counts := countSidHubEntryTypes(entries)
	expected := map[string]int{
		"magnet": 3,
		"baidu":  2,
		"quark":  2,
		"xunlei": 2,
		"uc":     1,
	}
	if !reflect.DeepEqual(counts, expected) {
		t.Fatalf("期望按页签识别全部资源类型，实际为 %#v", counts)
	}

	first := entries[0]
	if first.Link.Type != "magnet" || first.GroupLabel != "磁力" || first.Size != "8.19G" || first.Year != "2025年" {
		t.Fatalf("期望首个磁力资源携带页签、大小和年份，实际为 %#v", first)
	}
	if !containsString(first.Badges, "蓝光") {
		t.Fatalf("期望解析标签蓝光，实际为 %#v", first.Badges)
	}
}

func TestParseDetailLinkEntriesUsesNativeSeedHubLists(t *testing.T) {
	// 覆盖矩阵：D1、T4。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubNativeDownloadFixture), "https://www.seedhub.cc", "你的名字。")
	if err != nil {
		t.Fatalf("解析 SeedHub 原生资源列表失败: %v", err)
	}

	counts := countSidHubEntryTypes(entries)
	expected := map[string]int{
		"magnet": 2,
		"uc":     1,
	}
	if !reflect.DeepEqual(counts, expected) {
		t.Fatalf("期望按原生列表识别磁力和 UC 资源，实际为 %#v", counts)
	}
	if len(entries) != 3 {
		t.Fatalf("期望排序链接被跳过，仅保留 3 条资源，实际为 %#v", entries)
	}
	if entries[0].Link.Type != "magnet" || entries[0].GroupLabel != "磁力" || entries[0].Size != "8.19G" {
		t.Fatalf("期望首个原生列表资源识别为磁力并带大小，实际为 %#v", entries[0])
	}
}

func TestSidHubBuildsOneResultPerDownloadEntry(t *testing.T) {
	resourceTime := time.Date(2026, 6, 20, 12, 0, 0, 0, time.Local)
	card := sidHubMovie{
		ID:        "4259",
		Title:     "你的名字。 君の名は。",
		DetailURL: "https://sidhub.cc/movies/4259/",
		Content:   "2016 / 动漫 / 日本 / 日语",
		MediaType: "anime",
		Tags:      []string{"2016"},
	}
	entries := []sidHubLinkEntry{
		{
			Link:       model.Link{Type: "magnet", URL: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567", WorkTitle: "你的名字。"},
			Title:      "你的名字。国粤日多音轨",
			GroupLabel: "磁力",
			Index:      1,
			Size:       "8.19G",
			Year:       "2025年",
			Badges:     []string{"蓝光"},
			Datetime:   resourceTime,
			DateText:   "2026-06-20",
			DateSource: sidHubTimeSourceResourceRow,
		},
		{
			Link:       model.Link{Type: "quark", URL: "https://pan.quark.cn/s/q2", WorkTitle: "你的名字。"},
			Title:      "夸克资源二",
			GroupLabel: "夸克",
			Index:      2,
		},
	}

	results := buildExpandedResults(card, entries)
	if len(results) != 2 {
		t.Fatalf("期望每条下载资源展开为独立结果，实际为 %d", len(results))
	}
	if results[0].UniqueID == results[1].UniqueID {
		t.Fatalf("期望展开结果具有稳定且不同的 UniqueID，实际为 %q", results[0].UniqueID)
	}
	if results[0].Title != "你的名字。国粤日多音轨" || len(results[0].Links) != 1 || results[0].Links[0].Type != "magnet" {
		t.Fatalf("期望首条结果为独立磁力资源，实际为 %#v", results[0])
	}
	if !results[0].Datetime.Equal(resourceTime) || !results[0].Links[0].Datetime.Equal(resourceTime) {
		t.Fatalf("期望展开结果和链接继承资源时间，实际结果时间 %s，链接时间 %s", results[0].Datetime, results[0].Links[0].Datetime)
	}
	if results[0].TargetType != "download" {
		t.Fatalf("期望磁力结果 target_type 为 download，实际为 %q", results[0].TargetType)
	}
	if results[1].TargetType != "share" {
		t.Fatalf("期望网盘结果 target_type 为 share，实际为 %q", results[1].TargetType)
	}
}

func TestBuildSidHubGroupsKeepOnlyNewestCandidate(t *testing.T) {
	card := sidHubMovie{ID: "4259", Title: "你的名字。", MediaType: "anime"}
	newer := time.Date(2026, 7, 10, 12, 0, 0, 0, sidHubLocation)
	older := time.Date(2026, 7, 8, 12, 0, 0, 0, sidHubLocation)
	entries := []sidHubLinkEntry{
		{
			Link:             model.Link{Type: "quark", URL: "https://pan.quark.cn/s/older"},
			Title:            "【你的名字 4K】",
			Index:            1,
			ResolutionStatus: sidHubResolutionResolved,
			Datetime:         older,
		},
		{
			Link:             model.Link{Type: "quark", URL: "https://www.seedhub.cc/link_start/?redirect_to=newer"},
			Title:            "你的名字 [4k]",
			Index:            2,
			ResolutionStatus: sidHubResolutionDeferred,
			Datetime:         newer,
		},
	}

	results := buildExpandedResults(card, entries)
	if len(results) != 1 || len(results[0].Links) != 1 {
		t.Fatalf("期望同名只保留一个候选，实际为 %#v", results)
	}
	if results[0].Links[0].URL != entries[1].Link.URL {
		t.Fatalf("最新候选应优先于已解析旧候选，实际为 %#v", results[0].Links)
	}
	if results[0].Links[0].ResolveTarget == nil || results[0].Links[0].ResolveTarget.Status != sidHubResolutionDeferred {
		t.Fatalf("待解析最新候选必须保留 resolver target，实际为 %#v", results[0].Links[0])
	}
	if results[0].Meta["sid_hub_candidate_count"] != 1 {
		t.Fatalf("同名结果候选数必须为一，实际为 %#v", results[0].Meta)
	}
}

func TestNormalizeUpstreamTextRejectsOversizedInput(t *testing.T) {
	input := strings.Repeat("界", maxNormalizedTextBytes/len("界")+1)
	_, err := normalizeUpstreamText(input)
	if !errors.Is(err, errUpstreamTextTooLarge) {
		t.Fatalf("期望超限错误，实际为 %v", err)
	}
}

func TestNormalizeUpstreamTextKeepsUnicodeBehavior(t *testing.T) {
	got, err := normalizeUpstreamText("ＡＢＣ 资源")
	if err != nil {
		t.Fatalf("规范化失败: %v", err)
	}
	if got != "ABC 资源" {
		t.Fatalf("规范化结果不符合预期: %q", got)
	}
}

func TestNormalizeSidHubGroupTitleHandlesWidthCaseAndVersionBoundaries(t *testing.T) {
	tests := []struct {
		left  string
		right string
		equal bool
	}{
		{left: "凡人修仙传【4K】", right: "凡人修仙传 [4k]", equal: true},
		{left: "ＦＡＮＲＥＮ ４Ｋ", right: "fanren4k", equal: true},
		{left: "凡人修仙传 更新176集", right: "凡人修仙传 更新175集", equal: false},
		{left: "凡人修仙传 4K", right: "凡人修仙传 1080P", equal: false},
	}

	for _, tc := range tests {
		actual := normalizeSidHubGroupTitle(tc.left) == normalizeSidHubGroupTitle(tc.right)
		if actual != tc.equal {
			t.Fatalf("标题 %q 与 %q 的归一化相等性为 %v", tc.left, tc.right, actual)
		}
	}
}

func TestSelectLatestSidHubEntriesDoesNotBackfillPastPerTypeLimit(t *testing.T) {
	entries := make([]sidHubLinkEntry, 0, 11)
	for index := 1; index <= 11; index++ {
		title := fmt.Sprintf("凡人修仙传 第%d集", index)
		if index == 2 {
			title = "凡人修仙传 第1集"
		}
		entries = append(entries, sidHubLinkEntry{
			Link:     model.Link{Type: "quark", URL: fmt.Sprintf("https://pan.quark.cn/s/%02d", index)},
			Title:    title,
			Index:    index,
			Datetime: time.Date(2026, 7, index, 12, 0, 0, 0, sidHubLocation),
		})
	}

	selected := selectLatestSidHubEntries("4259", limitSidHubEntriesPerType(entries, 10))
	if len(selected) != 9 {
		t.Fatalf("前 10 条去重后应只剩 9 条，实际为 %#v", selected)
	}
	for _, entry := range selected {
		if strings.HasSuffix(entry.Link.URL, "/11") {
			t.Fatalf("去重后不应从第 11 条补位，实际为 %#v", selected)
		}
	}
}

func TestSelectLatestSidHubEntriesUsesOriginalOrderWhenTimesAreUnknown(t *testing.T) {
	entries := []sidHubLinkEntry{
		{Link: model.Link{Type: "quark", URL: "https://pan.quark.cn/s/first"}, Title: "凡人修仙传 4K", Index: 1},
		{Link: model.Link{Type: "quark", URL: "https://pan.quark.cn/s/second"}, Title: "凡人修仙传 [4k]", Index: 2},
	}

	selected := selectLatestSidHubEntries("4259", entries)
	if len(selected) != 1 || selected[0].Link.URL != entries[0].Link.URL {
		t.Fatalf("未知时间应保留原始顺序更靠前的候选，实际为 %#v", selected)
	}
}

func TestSelectLatestSidHubEntriesSkipsKnownInvalidCandidate(t *testing.T) {
	entries := []sidHubLinkEntry{
		{
			Link:             model.Link{Type: "quark", URL: "https://pan.quark.cn/s/invalid"},
			Title:            "凡人修仙传 4K",
			Index:            1,
			ResolutionStatus: "invalid",
			Datetime:         time.Date(2026, 7, 14, 12, 0, 0, 0, sidHubLocation),
		},
		{
			Link:     model.Link{Type: "quark", URL: "https://pan.quark.cn/s/available"},
			Title:    "凡人修仙传 [4k]",
			Index:    2,
			Datetime: time.Date(2026, 7, 13, 12, 0, 0, 0, sidHubLocation),
		},
	}

	selected := selectLatestSidHubEntries("4259", entries)
	if len(selected) != 1 || selected[0].Link.URL != entries[1].Link.URL {
		t.Fatalf("已知失效候选应被排除，实际为 %#v", selected)
	}
}

func TestBuildSidHubGroupsKeepDistinctProviderEpisodeQualityAndMovie(t *testing.T) {
	baseTitle := "沧元图 第12集 4K"
	if buildSidHubGroupKey("1", "quark", baseTitle) == buildSidHubGroupKey("1", "baidu", baseTitle) {
		t.Fatal("different providers must not merge")
	}
	if buildSidHubGroupKey("1", "quark", baseTitle) == buildSidHubGroupKey("1", "quark", "沧元图 第13集 4K") {
		t.Fatal("different episodes must not merge")
	}
	if buildSidHubGroupKey("1", "quark", baseTitle) == buildSidHubGroupKey("1", "quark", "沧元图 第12集 1080P") {
		t.Fatal("different qualities must not merge")
	}
	if buildSidHubGroupKey("1", "quark", baseTitle) == buildSidHubGroupKey("2", "quark", baseTitle) {
		t.Fatal("different movie IDs must not merge")
	}
}

func TestBuildSidHubGroupsDoNotMergeCandidatesWithoutMovieID(t *testing.T) {
	card := sidHubMovie{Title: "无编号影片"}
	entries := []sidHubLinkEntry{
		{Link: model.Link{Type: "quark", URL: "https://example.com/1"}, Title: "同名资源", Index: 1, ResolutionStatus: sidHubResolutionResolved},
		{Link: model.Link{Type: "quark", URL: "https://example.com/2"}, Title: "同名资源", Index: 2, ResolutionStatus: sidHubResolutionResolved},
	}

	results := buildExpandedResults(card, entries)
	if len(results) != 2 {
		t.Fatalf("candidates without movie ID must remain separate, got %#v", results)
	}
}

func TestBuildSidHubGroupsDropInvalidCandidateButKeepBackup(t *testing.T) {
	card := sidHubMovie{ID: "4259", Title: "你的名字。"}
	entries := []sidHubLinkEntry{
		{Link: model.Link{Type: "quark", URL: "https://example.com/invalid"}, Title: "你的名字 4K", Index: 1, ResolutionStatus: "invalid"},
		{Link: model.Link{Type: "quark", URL: "https://example.com/backup"}, Title: "你的名字 4K", Index: 2, ResolutionStatus: sidHubResolutionDeferred},
	}

	results := buildExpandedResults(card, entries)
	if len(results) != 1 || len(results[0].Links) != 1 || results[0].Links[0].URL != "https://example.com/backup" {
		t.Fatalf("invalid candidate must not remove its backup, got %#v", results)
	}
}

func TestSidHubResolveTargetSurvivesSearchCacheJSONRoundTrip(t *testing.T) {
	card := sidHubMovie{ID: "4259", Title: "你的名字。"}
	results := buildExpandedResults(card, []sidHubLinkEntry{{
		Link:             model.Link{Type: "quark", URL: "https://www.seedhub.cc/link_start/?redirect_to=private"},
		Title:            "你的名字 4K",
		Index:            3,
		ResolutionStatus: sidHubResolutionDeferred,
	}})
	payload, err := json.Marshal(results)
	if err != nil {
		t.Fatal(err)
	}
	var restored []model.SearchResult
	if err := json.Unmarshal(payload, &restored); err != nil {
		t.Fatal(err)
	}
	if len(restored) != 1 || len(restored[0].Links) != 1 || restored[0].Links[0].ResolveTarget == nil {
		t.Fatalf("missing resolver target after round trip: %#v", restored)
	}
	target := restored[0].Links[0].ResolveTarget
	if target.PluginID != "sidhub" || target.Provider != "quark" || target.MovieID != "4259" || target.EntryIndex != 3 || target.Status != sidHubResolutionDeferred {
		t.Fatalf("resolver target changed after round trip: %#v", target)
	}
}

func TestBuildResultUsesLatestEntryTime(t *testing.T) {
	older := time.Date(2026, 6, 20, 12, 0, 0, 0, time.Local)
	newer := time.Date(2026, 6, 22, 12, 0, 0, 0, time.Local)
	card := sidHubMovie{
		ID:         "120138",
		Title:      "大濛",
		DetailURL:  "https://sidhub.cc/movies/120138/",
		Datetime:   older,
		DateText:   "2026-06-20",
		DateSource: sidHubTimeSourceMovieCard,
	}
	entries := []sidHubLinkEntry{
		{
			Link:       model.Link{Type: "quark", URL: "https://pan.quark.cn/s/old"},
			Title:      "旧资源",
			Datetime:   older,
			DateText:   "2026-06-20",
			DateSource: sidHubTimeSourceResourceRow,
		},
		{
			Link:       model.Link{Type: "baidu", URL: "https://pan.baidu.com/s/new"},
			Title:      "新资源",
			Datetime:   newer,
			DateText:   "2026-06-22",
			DateSource: sidHubTimeSourceResourceRow,
		},
	}

	result := buildResult(card, entries)
	if !result.Datetime.Equal(newer) {
		t.Fatalf("期望聚合结果使用最新资源时间，实际为 %s", result.Datetime)
	}
	if result.Meta["sid_hub_time_source"] != sidHubTimeSourceResourceRow || result.Meta["sid_hub_time_text"] != "2026-06-22" {
		t.Fatalf("期望聚合结果记录最新时间来源，实际为 %#v", result.Meta)
	}
	if !result.Links[1].Datetime.Equal(newer) {
		t.Fatalf("期望链接时间被写入，实际为 %#v", result.Links[1])
	}
}

func TestBuildExpandedResultKeepsUnknownTimeEmpty(t *testing.T) {
	card := sidHubMovie{
		ID:        "120138",
		Title:     "大濛",
		DetailURL: "https://sidhub.cc/movies/120138/",
		MediaType: "movie",
	}
	entry := sidHubLinkEntry{
		Link:       model.Link{Type: "quark", URL: "https://pan.quark.cn/s/source", WorkTitle: "大濛"},
		Title:      "大濛 2160P 杜比视界",
		GroupLabel: "夸克",
		Index:      1,
	}

	result := buildExpandedResult(card, entry)
	if !result.Datetime.IsZero() {
		t.Fatalf("unknown published time must stay empty, got %s", result.Datetime)
	}
	if result.Meta["sid_hub_time_source"] != "unknown" || result.Meta["sid_hub_time_text"] != "" {
		t.Fatalf("expected unknown time source, got %#v", result.Meta)
	}
	if len(result.Links) != 1 || !result.Links[0].Datetime.IsZero() {
		t.Fatalf("unknown link time must stay empty, got %#v", result.Links)
	}
}

func TestParseDetailLinkEntriesFallsBackToActiveSeedHubTab(t *testing.T) {
	// 覆盖矩阵：D3、D4、T5。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubActiveTabFallbackFixture), "https://www.seedhub.cc", "大濛")
	if err != nil {
		t.Fatalf("解析 SeedHub 当前详情页资源失败: %v", err)
	}

	if len(entries) != 1 {
		t.Fatalf("期望从当前 SeedHub 详情页样式解析 1 条资源，实际为 %#v", entries)
	}

	entry := entries[0]
	if entry.Link.Type != "baidu" {
		t.Fatalf("期望根据激活页签推断为百度资源，实际为 %#v", entry)
	}
	if !strings.Contains(entry.Title, "WEB-4K") {
		t.Fatalf("期望标题保留 WEB-4K 关键词，实际为 %#v", entry)
	}
	if entry.DateText != "今天" || entry.DateSource != sidHubTimeSourceResourceRow || entry.Link.Datetime.IsZero() {
		t.Fatalf("期望从资源行写入今天的时间，实际为 %#v", entry)
	}
	if entry.Link.Datetime.Hour() != 12 || entry.Link.Datetime.Minute() != 0 {
		t.Fatalf("期望日期精度统一为中午，实际为 %s", entry.Link.Datetime)
	}
}

func TestParseDetailLinkEntriesUsesRowTitleForQuark4KResource(t *testing.T) {
	// 覆盖矩阵：D6、F2。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubQuarkRowTitleFallbackFixture), "https://www.seedhub.cc", "大濛")
	if err != nil {
		t.Fatalf("解析 SeedHub 夸克行标题资源失败: %v", err)
	}

	if len(entries) != 1 {
		t.Fatalf("期望从夸克激活页签解析 1 条资源，实际为 %#v", entries)
	}

	entry := entries[0]
	if entry.Link.Type != "quark" {
		t.Fatalf("期望根据激活页签推断为夸克资源，实际为 %#v", entry)
	}
	if !strings.Contains(entry.Title, "4K+1080P") {
		t.Fatalf("期望短链接文案时回退到整行资源标题，实际为 %#v", entry)
	}
	if entry.DateText != "2天前" || entry.DateSource != sidHubTimeSourceResourceRow || entry.Link.Datetime.IsZero() {
		t.Fatalf("期望从资源行写入相对更新时间，实际为 %#v", entry)
	}
}

func TestParseDetailLinkEntriesCleansRowNoiseForTitleBadgesAndMeta(t *testing.T) {
	// 覆盖矩阵：D7、阶段 3 标题来源和类型来源可观测性。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubRowNoiseFixture), "https://www.seedhub.cc", "大濛")
	if err != nil {
		t.Fatalf("解析 SeedHub 噪声行资源失败: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("期望解析 1 条噪声行资源，实际为 %#v", entries)
	}

	entry := entries[0]
	if entry.Title != "大濛 2160P 杜比视界" {
		t.Fatalf("期望标题清理大小、日期和动作词，实际为 %q", entry.Title)
	}
	if entry.Size != "12.5G" {
		t.Fatalf("期望提取资源大小，实际为 %q", entry.Size)
	}
	if !containsString(entry.Badges, "蓝光") {
		t.Fatalf("期望保留真实标签蓝光，实际为 %#v", entry.Badges)
	}
	if containsString(entry.Badges, "今天") {
		t.Fatalf("日期不应作为资源标签，实际为 %#v", entry.Badges)
	}
	if entry.TitleSource != "row_text" || entry.LinkTypeSource != "group_label" {
		t.Fatalf("期望记录标题和类型来源，实际为 %#v", entry)
	}
}

func TestParseDetailLinkEntriesSupportsAttributeResourceURLs(t *testing.T) {
	// 覆盖矩阵：D8、D9、D10。
	entries, err := parseDetailLinkEntries(strings.NewReader(sidHubAttributeResourceURLFixture), "https://www.seedhub.cc", "大濛")
	if err != nil {
		t.Fatalf("解析 SeedHub 属性资源链接失败: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("期望解析 data-url、data-clipboard-text 和 input[value] 三类资源，实际为 %#v", entries)
	}

	expectedURLs := []string{
		"",
		"https://pan.quark.cn/s/clipboard123",
		"https://pan.quark.cn/s/input123",
	}
	for index, expectedURL := range expectedURLs {
		entry := entries[index]
		if entry.Link.Type != "quark" {
			t.Fatalf("第 %d 条资源类型或 URL 不符合预期，实际为 %#v", index+1, entry)
		}
		if index == 0 {
			assertSidHubLinkStartURL(t, entry.Link.URL, "https", "www.seedhub.cc", "quark_data_url", "大濛")
		} else if entry.Link.URL != expectedURL {
			t.Fatalf("第 %d 条资源类型或 URL 不符合预期，实际为 %#v", index+1, entry)
		}
		if entry.Title == "" {
			t.Fatalf("第 %d 条资源应保留可展示标题，实际为 %#v", index+1, entry)
		}
	}
}

func assertSidHubLinkStartURL(t *testing.T, actualURL string, expectedScheme string, expectedHost string, expectedRedirectTo string, expectedMovieTitle string) {
	t.Helper()

	parsedURL, err := url.Parse(actualURL)
	if err != nil {
		t.Fatalf("期望 SidHub 跳转地址可解析，实际为 %q: %v", actualURL, err)
	}
	if parsedURL.Scheme != expectedScheme || parsedURL.Host != expectedHost || parsedURL.Path != linkStartPathPrefix {
		t.Fatalf("期望 SidHub 跳转地址被转为绝对地址，实际为 %q", actualURL)
	}
	query := parsedURL.Query()
	if query.Get("redirect_to") != expectedRedirectTo || query.Get("movie_title") != expectedMovieTitle {
		t.Fatalf("期望 SidHub 跳转参数完整，实际为 %q", actualURL)
	}
	if strings.Contains(actualURL, expectedMovieTitle) {
		t.Fatalf("期望 SidHub 跳转中文参数被编码，实际为 %q", actualURL)
	}
}

func TestParseDetailLinkEntriesPrefersNearestContextOverUnrelatedActiveTab(t *testing.T) {
	// 覆盖矩阵：T6。
	html := `
<section id="downloads">
  <nav class="resource-tabs">
    <a class="tab active">百度(12)</a>
    <a class="tab">夸克(10)</a>
  </nav>
  <div class="resource-items">
    <section data-type="quark">
      <a href="/link_start/?redirect_to=pan_id_nearest&amp;movie_title=%E5%A4%A7%E6%BF%9B">大濛 最近上下文资源</a>
    </section>
  </div>
</section>`

	entries, err := parseDetailLinkEntries(strings.NewReader(html), "https://www.seedhub.cc", "大濛")
	if err != nil {
		t.Fatalf("解析最近上下文资源失败: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("期望解析 1 条最近上下文资源，实际为 %#v", entries)
	}
	if entries[0].Link.Type != "quark" || entries[0].LinkTypeSource != "active_tab" {
		t.Fatalf("期望优先使用资源区最近上下文而非无关 active 页签，实际为 %#v", entries[0])
	}
}

func TestBuildExpandedResultRecordsSidHubParseSources(t *testing.T) {
	// 覆盖矩阵：阶段 3 解析来源可观测性。
	card := sidHubMovie{
		ID:        "120138",
		Title:     "大濛",
		DetailURL: "https://sidhub.cc/movies/120138/",
		MediaType: "movie",
	}
	entry := sidHubLinkEntry{
		Link:           model.Link{Type: "quark", URL: "https://pan.quark.cn/s/source", WorkTitle: "大濛"},
		Title:          "大濛 2160P 杜比视界",
		GroupLabel:     "夸克",
		Index:          1,
		TitleSource:    "row_text",
		LinkTypeSource: "group_label",
	}

	result := buildExpandedResult(card, entry)
	if result.Meta["sid_hub_title_source"] != "row_text" {
		t.Fatalf("期望记录标题来源，实际为 %#v", result.Meta)
	}
	if result.Meta["sid_hub_link_type_source"] != "group_label" {
		t.Fatalf("期望记录链接类型来源，实际为 %#v", result.Meta)
	}
}

func TestLimitExpandedSidHubEntriesKeepsTypicalDetailPage(t *testing.T) {
	entries := make([]sidHubLinkEntry, 158)
	for index := range entries {
		entries[index] = sidHubLinkEntry{
			Link:  model.Link{Type: "magnet", URL: fmt.Sprintf("magnet:?xt=urn:btih:%040d", index)},
			Title: fmt.Sprintf("资源 %d", index+1),
		}
	}

	limited, truncated := limitExpandedSidHubEntries(entries)
	if truncated {
		t.Fatal("158 条 SidHub 详情资源不应被截断")
	}
	if len(limited) != 158 {
		t.Fatalf("期望保留 158 条，实际为 %d", len(limited))
	}
}

func TestNormalizeLinkType(t *testing.T) {
	cases := map[string]string{
		"quark":       "quark",
		"pan_quark":   "quark",
		"baidu":       "baidu",
		"alipan":      "aliyun",
		"aliyundrive": "aliyun",
		"uc":          "uc",
		"xunlei":      "xunlei",
		"magnet":      "magnet",
		"ed2k":        "ed2k",
		"thunder":     "thunder",
		"unknown":     "",
	}

	for input, expected := range cases {
		if actual := normalizeLinkType(input); actual != expected {
			t.Fatalf("normalizeLinkType(%q) 期望 %q，实际为 %q", input, expected, actual)
		}
	}
}

func countSidHubEntryTypes(entries []sidHubLinkEntry) map[string]int {
	counts := make(map[string]int)
	for _, entry := range entries {
		counts[entry.Link.Type]++
	}
	return counts
}

func TestBuildSearchURL(t *testing.T) {
	actual := buildSearchURL("https://sidhub.cc", "怪奇物语")
	expected := "https://sidhub.cc/s/%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD/"
	if actual != expected {
		t.Fatalf("期望搜索 URL 为 %q，实际为 %q", expected, actual)
	}
}

func TestSidHubPublicSearchMethodsHandleEmptyKeyword(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	result, err := p.SearchWithResult("   ", nil)
	if err != nil {
		t.Fatalf("空关键词 SearchWithResult 不应失败: %v", err)
	}
	if len(result.Results) != 0 || !result.IsFinal {
		t.Fatalf("期望空关键词返回最终空结果，实际为 %#v", result)
	}

	repeatedResult, err := p.SearchWithResult("   ", nil)
	if err != nil {
		t.Fatalf("空关键词重复 SearchWithResult 不应失败: %v", err)
	}
	if len(repeatedResult.Results) != 0 {
		t.Fatalf("期望空关键词重复 SearchWithResult 返回空结果，实际为 %#v", repeatedResult.Results)
	}
}

func TestSidHubDoSearchFetchesDetailsAndUsesCache(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://sidhub.cc/s/%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD/"
	detailURL := "https://sidhub.cc/movies/119254/"
	linkStartURL := "https://sidhub.cc/link_start/?redirect_to=quark_1"
	fixtures := map[string]string{
		searchURL: `
<article>
  <a title="怪奇物语 第五季 Stranger Things Season 5" class="image" href="/movies/119254/">
    <img src="/poster.jpg" />
  </a>
  <p>2025 / 剧集 / 美国 / 英语 / 薇诺娜·瑞德 大卫·哈伯</p>
  <span>类型:科幻/悬疑</span>
  <span>豆瓣评分: 9.6</span>
</article>`,
		detailURL:    sidHubTabbedDownloadFixture,
		linkStartURL: `<html><body><a href="https://pan.quark.cn/s/real123">打开夸克</a></body></html>`,
	}
	fetchCount := map[string]int{}
	p.fetcher = func(targetURL string) ([]byte, error) {
		fetchCount[targetURL]++
		body, ok := fixtures[targetURL]
		if !ok {
			return nil, errors.New("未注册的测试地址")
		}
		return []byte(body), nil
	}

	results, err := p.doSearch(nil, "怪奇物语", map[string]interface{}{"sidhub_base_url": "https://sidhub.cc"})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if len(results) != 10 {
		t.Fatalf("期望 SidHub 下载项展开为 10 条结果，实际为 %d", len(results))
	}

	counts := map[string]int{}
	hasRefreshableFallback := false
	for _, result := range results {
		if result.SourcePluginID != "sidhub" || result.SourceName != "SeedHub" {
			t.Fatalf("期望来源为 SeedHub，实际为 %#v", result)
		}
		if len(result.Links) != 1 {
			t.Fatalf("期望每条展开结果只包含一个链接，实际为 %#v", result.Links)
		}
		if result.MediaType != "tv" {
			t.Fatalf("期望媒体类型为 tv，实际为 %q", result.MediaType)
		}
		counts[result.Links[0].Type]++
		link := result.Links[0]
		if link.AccessMode == "scan_transfer" && link.ScanTransfer != nil && link.ScanTransfer.RefreshKey != "" {
			hasRefreshableFallback = true
		}
	}

	expected := map[string]int{"magnet": 3, "baidu": 2, "quark": 2, "xunlei": 2, "uc": 1}
	if !reflect.DeepEqual(counts, expected) {
		t.Fatalf("期望展开结果类型计数为 %#v，实际为 %#v", expected, counts)
	}
	if !hasRefreshableFallback {
		t.Fatalf("期望搜索阶段返回可刷新的扫码兜底结果，实际为 %#v", results)
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		return nil, errors.New("缓存命中时不应再次请求")
	}
	cachedResults, err := p.doSearch(nil, "怪奇物语", map[string]interface{}{"sidhub_base_url": "https://sidhub.cc"})
	if err != nil {
		t.Fatalf("缓存搜索失败: %v", err)
	}
	if len(cachedResults) != 10 || cachedResults[0].SourcePluginID != "sidhub" {
		t.Fatalf("期望缓存返回同一结果，实际为 %#v", cachedResults)
	}
	if fetchCount[searchURL] != 1 || fetchCount[detailURL] != 1 || fetchCount[linkStartURL] != 0 {
		t.Fatalf("期望每个测试地址只请求一次，实际为 %#v", fetchCount)
	}
}

func TestResolveLinkStartLinkDetectsScanTransfer(t *testing.T) {
	original := model.Link{
		Type:      "quark",
		URL:       "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
		WorkTitle: "你的名字。",
	}

	resolved, handled, err := resolveLinkStartLink(original, []byte(sidHubScanTransferFixture), "4259", 2)
	if err != nil {
		t.Fatalf("解析扫码转存页失败: %v", err)
	}
	if !handled {
		t.Fatal("期望识别为已处理的扫码转存页")
	}
	if resolved.URL != original.URL {
		t.Fatalf("期望扫码转存保留原始 link_start 地址，实际为 %q", resolved.URL)
	}
	if resolved.AccessMode != "scan_transfer" {
		t.Fatalf("期望访问模式为 scan_transfer，实际为 %#v", resolved)
	}
	if resolved.ScanTransfer == nil {
		t.Fatalf("期望生成扫码转存载荷，实际为 %#v", resolved)
	}
	if resolved.ScanTransfer.QRCodeBase64 != "data:image/png;base64,abc123" {
		t.Fatalf("期望提取二维码 base64，实际为 %#v", resolved.ScanTransfer)
	}
	if resolved.ScanTransfer.MobileURL != "quark://scan-transfer/123" {
		t.Fatalf("期望提取手机深链，实际为 %#v", resolved.ScanTransfer)
	}
	if resolved.ScanTransfer.TransferCode != "ABCD1234" {
		t.Fatalf("期望提取转存口令，实际为 %#v", resolved.ScanTransfer)
	}
	if !strings.Contains(resolved.ScanTransfer.Instruction, "手机扫码转存") {
		t.Fatalf("期望提取扫码提示文案，实际为 %#v", resolved.ScanTransfer)
	}
	if !resolved.ScanTransfer.Refreshable || resolved.ScanTransfer.RefreshKey != "seedhub:4259:quark:2" {
		t.Fatalf("期望生成稳定刷新信息，实际为 %#v", resolved.ScanTransfer)
	}
}

func TestResolveLinkStartLinkDecodesMagnetCopyPage(t *testing.T) {
	original := model.Link{
		Type:      "magnet",
		URL:       "https://sidhub.cc/link_start/?seed_id=708637&movie_title=%E9%93%81%E6%8B%B3%E6%95%99%E8%82%B2%E7%9A%84%E7%A3%81%E5%8A%9B",
		WorkTitle: "铁拳教育",
	}
	body := []byte(`
<html>
  <body>
    <p>磁力链接：<a href="#" title="Teach.You.a.Lesson.S01.MULTi.1080p.WEB.x264-FW[30.52G]">Teach.You.a.Lesson.S01.MULTi.1080p.WEB.x264-FW[30.52G]</a></p>
    <button id="thunder">迅雷高速下载</button>
    <button id="copy-btn">复制磁力</button>
    <script>
      const data = "bWFnbmV0Oj94dD11cm46YnRpaDpjY2NjMjEyODYyNjAzODgzOGU5YTNkOTAzZGVlM2ZhZTJmMDg3MjMw";
      $("#thunder").click(function(e) {e.preventDefault();thunderLink.newTask({tasks: [{url: window.atob(data)}]});return false;});
      new ClipboardJS('#copy-btn', { text: function () { return window.atob(data); } });
    </script>
  </body>
</html>`)

	resolved, handled, err := resolveLinkStartLink(original, body, "135689", 1)
	if err != nil {
		t.Fatalf("解析磁力复制页失败: %v", err)
	}
	if !handled {
		t.Fatal("期望识别磁力复制页")
	}
	if resolved.Type != "magnet" || !strings.HasPrefix(resolved.URL, "magnet:?xt=urn:btih:cccc2128626038838e9a3d903dee3fae2f087230") {
		t.Fatalf("期望解析为真实磁力链接，实际为 %#v", resolved)
	}
	if resolved.AccessMode == "scan_transfer" || resolved.ScanTransfer != nil {
		t.Fatalf("磁力链接不应进入扫码转存，实际为 %#v", resolved)
	}
}

func TestResolveLinkStartLinkPrefersScanTransferWhenDirectURLAlsoExists(t *testing.T) {
	original := model.Link{
		Type:      "quark",
		URL:       "https://www.seedhub.cc/link_start/?redirect_to=quark_scan_with_direct",
		WorkTitle: "铁拳教育",
	}
	body := []byte(`
<html>
  <body>
    <p>请使用手机扫码转存，网盘链接容易被吞。</p>
    <script>var panLink = "https://pan.quark.cn/s/46300ad81d60";</script>
    <a href="https://pan.quark.cn/s/46300ad81d60">备用直链</a>
  </body>
</html>`)

	resolved, handled, err := resolveLinkStartLink(original, body, "135689", 10)
	if err != nil {
		t.Fatalf("解析混合扫码页失败: %v", err)
	}
	if !handled {
		t.Fatal("期望混合扫码页被识别")
	}
	if resolved.URL != original.URL {
		t.Fatalf("期望扫码页保留原始 link_start 地址，实际为 %q", resolved.URL)
	}
	if resolved.AccessMode != "scan_transfer" || resolved.ScanTransfer == nil {
		t.Fatalf("期望优先展示扫码转存载荷，实际为 %#v", resolved)
	}
	if resolved.ScanTransfer.QRCodeValue != "https://pan.quark.cn/s/46300ad81d60" {
		t.Fatalf("期望从 panLink 脚本变量提取二维码值，实际为 %#v", resolved.ScanTransfer)
	}
	if !strings.Contains(resolved.ScanTransfer.Instruction, "手机扫码转存") {
		t.Fatalf("期望保留扫码提示，实际为 %#v", resolved.ScanTransfer)
	}
}

func TestResolveLinkStartLinkKeepsFallbackScanTransferPayload(t *testing.T) {
	original := model.Link{
		Type:      "quark",
		URL:       "https://www.seedhub.cc/link_start/?redirect_to=quark_scan_fallback",
		WorkTitle: "你的名字。",
	}

	resolved, handled, err := resolveLinkStartLink(original, []byte(sidHubScanTransferFallbackFixture), "4259", 3)
	if err != nil {
		t.Fatalf("解析半残缺扫码转存页失败: %v", err)
	}
	if !handled {
		t.Fatal("期望半残缺扫码页也能被识别")
	}
	if resolved.AccessMode != "scan_transfer" || resolved.ScanTransfer == nil {
		t.Fatalf("期望半残缺扫码页仍输出 scan_transfer，实际为 %#v", resolved)
	}
	if resolved.ScanTransfer.QRCodeBase64 != "" && resolved.ScanTransfer.QRCodeImageURL != "" {
		t.Fatalf("期望当前回退样本不强制要求二维码图片，实际为 %#v", resolved.ScanTransfer)
	}
	if resolved.ScanTransfer.MobileURL != "quark://scan-transfer/fallback" {
		t.Fatalf("期望保留手机深链，实际为 %#v", resolved.ScanTransfer)
	}
	if resolved.ScanTransfer.SourcePageURL != original.URL {
		t.Fatalf("期望保留原始扫码页地址，实际为 %#v", resolved.ScanTransfer)
	}
}

func TestResolveLinkStartLinkDetectsCodeOnlyScanTransfer(t *testing.T) {
	// 覆盖矩阵：L4。
	original := model.Link{
		Type:      "quark",
		URL:       "https://www.seedhub.cc/link_start/?redirect_to=quark_code_only",
		WorkTitle: "大濛",
	}

	resolved, handled, err := resolveLinkStartLink(original, []byte(sidHubScanTransferCodeOnlyFixture), "120138", 4)
	if err != nil {
		t.Fatalf("解析只有口令的扫码转存页失败: %v", err)
	}
	if !handled {
		t.Fatal("期望只有口令和提示的页面也识别为扫码转存")
	}
	if resolved.AccessMode != "scan_transfer" || resolved.ScanTransfer == nil {
		t.Fatalf("期望返回扫码转存载荷，实际为 %#v", resolved)
	}
	if resolved.ScanTransfer.TransferCode != "EFGH5678" {
		t.Fatalf("期望提取转存口令，实际为 %#v", resolved.ScanTransfer)
	}
}

func TestResolveLinkStartEntriesKeepsOverflowAsFallback(t *testing.T) {
	p := NewSidHubPlugin()
	fetchCount := map[string]int{}
	entries := make([]sidHubLinkEntry, 0, 2)

	for index := 1; index <= 2; index++ {
		linkURL := fmt.Sprintf("https://www.seedhub.cc/link_start/?redirect_to=baidu_%d", index)
		entries = append(entries, sidHubLinkEntry{
			Link: model.Link{
				Type:      "baidu",
				URL:       linkURL,
				WorkTitle: "巨星之路",
			},
			Index: index,
			Title: fmt.Sprintf("百度资源 %d", index),
		})
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		fetchCount[targetURL]++
		return []byte(sidHubScanTransferFixture), nil
	}

	resolved := p.resolveLinkStartEntries(context.Background(), entries, "626957", 1)
	if len(resolved) != len(entries) {
		t.Fatalf("期望保留全部结果，实际为 %d: %#v", len(resolved), resolved)
	}

	overflowURL := "https://www.seedhub.cc/link_start/?redirect_to=baidu_2"
	if fetchCount[overflowURL] != 0 {
		t.Fatalf("超预算资源不应触发预抓取，实际抓取次数为 %d", fetchCount[overflowURL])
	}
	overflowLink := resolved[1].Link
	if overflowLink.AccessMode != "scan_transfer" || overflowLink.ScanTransfer == nil {
		t.Fatalf("期望超预算资源保留为扫码兜底，实际为 %#v", overflowLink)
	}
}

func TestResolveLinkStartEntriesUsesPerTypeBudget(t *testing.T) {
	p := NewSidHubPlugin()
	entries := []sidHubLinkEntry{
		{Link: model.Link{Type: "baidu", URL: "https://www.seedhub.cc/link_start/?redirect_to=baidu_1"}, Index: 1},
		{Link: model.Link{Type: "baidu", URL: "https://www.seedhub.cc/link_start/?redirect_to=baidu_2"}, Index: 2},
		{Link: model.Link{Type: "quark", URL: "https://www.seedhub.cc/link_start/?redirect_to=quark_1"}, Index: 3},
		{Link: model.Link{Type: "quark", URL: "https://www.seedhub.cc/link_start/?redirect_to=quark_2"}, Index: 4},
		{Link: model.Link{Type: "magnet", URL: "https://www.seedhub.cc/link_start/?seed_id=1"}, Index: 5},
		{Link: model.Link{Type: "magnet", URL: "https://www.seedhub.cc/link_start/?seed_id=2"}, Index: 6},
	}
	fetched := []string{}
	p.fetcher = func(targetURL string) ([]byte, error) {
		fetched = append(fetched, targetURL)
		return []byte(sidHubScanTransferFixture), nil
	}

	resolved := p.resolveLinkStartEntries(context.Background(), entries, "626957", 1)

	if len(fetched) != 3 {
		t.Fatalf("期望百度、夸克、磁力各预抓 1 条，实际抓取 %d 次: %#v", len(fetched), fetched)
	}
	if len(resolved) != len(entries) {
		t.Fatalf("期望保留全部结果，实际为 %d: %#v", len(resolved), resolved)
	}
}

func TestResolveLinkStartEntriesHonorsZeroBudget(t *testing.T) {
	p := NewSidHubPlugin()
	p.fetcher = func(targetURL string) ([]byte, error) {
		t.Fatalf("N=0 时不应预抓 link_start: %s", targetURL)
		return nil, nil
	}

	resolved := p.resolveLinkStartEntries(context.Background(), []sidHubLinkEntry{{
		Link:  model.Link{Type: "baidu", URL: "https://www.seedhub.cc/link_start/?redirect_to=baidu_1"},
		Index: 1,
	}}, "626957", 0)

	if len(resolved) != 1 {
		t.Fatalf("期望 N=0 时返回扫码兜底结果，实际为 %#v", resolved)
	}
	link := resolved[0].Link
	if link.AccessMode != "scan_transfer" || link.ScanTransfer == nil {
		t.Fatalf("期望 N=0 时返回扫码兜底载荷，实际为 %#v", link)
	}
	if link.ScanTransfer.RefreshKey != "seedhub:626957:baidu:1" {
		t.Fatalf("期望 N=0 时保留 refresh_key，实际为 %#v", link.ScanTransfer)
	}
	if resolved[0].ResolutionStatus != "deferred" {
		t.Fatalf("expected explicit deferred status, got %#v", resolved[0])
	}
}

func TestValidateSeedHubResolveURL(t *testing.T) {
	publicLookup := func(_ context.Context, _ string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("203.0.113.10")}}, nil
	}
	privateLookup := func(_ context.Context, _ string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("169.254.169.254")}}, nil
	}

	tests := []struct {
		name      string
		targetURL string
		baseURL   string
		lookup    seedHubLookupIPAddrFunc
		wantErr   bool
	}{
		{
			name:      "allows exact production URL",
			targetURL: "https://www.seedhub.cc/link_start/?redirect_to=quark_1",
			baseURL:   "https://www.seedhub.cc",
			lookup:    publicLookup,
		},
		{
			name:      "rejects HTTP",
			targetURL: "http://www.seedhub.cc/link_start/?redirect_to=quark_1",
			baseURL:   "https://www.seedhub.cc",
			lookup:    publicLookup,
			wantErr:   true,
		},
		{
			name:      "rejects userinfo",
			targetURL: "https://user@www.seedhub.cc/link_start/?redirect_to=quark_1",
			baseURL:   "https://www.seedhub.cc",
			lookup:    publicLookup,
			wantErr:   true,
		},
		{
			name:      "rejects path containing link start",
			targetURL: "https://www.seedhub.cc/x/link_start/y",
			baseURL:   "https://www.seedhub.cc",
			lookup:    publicLookup,
			wantErr:   true,
		},
		{
			name:      "rejects loopback host",
			targetURL: "https://127.0.0.1/link_start/",
			baseURL:   "https://127.0.0.1",
			lookup: func(_ context.Context, _ string) ([]net.IPAddr, error) {
				return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}}, nil
			},
			wantErr: true,
		},
		{
			name:      "rejects private DNS result including redirect target",
			targetURL: "https://www.seedhub.cc/link_start/?redirect_to=internal",
			baseURL:   "https://www.seedhub.cc",
			lookup:    privateLookup,
			wantErr:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := validateSeedHubResolveURL(context.Background(), tc.targetURL, tc.baseURL, tc.lookup)
			if tc.wantErr && err == nil {
				t.Fatalf("expected %q to be rejected", tc.targetURL)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected %q to be accepted: %v", tc.targetURL, err)
			}
		})
	}
}

func TestSidHubResolveResourceReturnsDirectLink(t *testing.T) {
	p := NewSidHubPlugin()
	sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_1"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL != sourceURL {
			t.Fatalf("unexpected resolver URL: %s", targetURL)
		}
		return []byte(`<a href="https://pan.quark.cn/s/resolved123">打开资源</a>`), nil
	})

	link, err := p.ResolveResource(context.Background(), sourceURL, "quark", "4259", 1)
	if err != nil {
		t.Fatalf("resolve resource: %v", err)
	}
	if link.URL != "https://pan.quark.cn/s/resolved123" || link.AccessMode != "direct_open" {
		t.Fatalf("unexpected resolved link: %#v", link)
	}
}

func TestSidHubResolveResourceClassifiesInvalidSignal(t *testing.T) {
	p := NewSidHubPlugin()
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		return []byte(`<html><body>该分享链接已失效</body></html>`), nil
	})

	_, err := p.ResolveResource(context.Background(), "https://www.seedhub.cc/link_start/?redirect_to=invalid", "quark", "4259", 1)
	var resolveErr *ResourceResolveError
	if !errors.As(err, &resolveErr) || resolveErr.Kind != ResolveInvalid {
		t.Fatalf("expected permanent invalid error, got %v", err)
	}
}

func TestSidHubResolveResourceSeparatesParseAndNetworkFailures(t *testing.T) {
	p := NewSidHubPlugin()
	sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=changed"
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		return []byte(`<html><body>页面结构已变化</body></html>`), nil
	})

	_, err := p.ResolveResource(context.Background(), sourceURL, "quark", "4259", 1)
	var resolveErr *ResourceResolveError
	if !errors.As(err, &resolveErr) || resolveErr.Kind != ResolveParseFailed {
		t.Fatalf("expected parse failure, got %v", err)
	}

	p.SetFetcherForTest(func(_ string) ([]byte, error) { return nil, errors.New("upstream unavailable") })
	_, err = p.ResolveResource(context.Background(), sourceURL, "quark", "4259", 1)
	if !errors.As(err, &resolveErr) || resolveErr.Kind != ResolveUnavailable {
		t.Fatalf("expected unavailable failure, got %v", err)
	}
}

func TestSidHubResolveResourceRejectsInvalidSourceURL(t *testing.T) {
	p := NewSidHubPlugin()
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		t.Fatalf("invalid source must not be fetched: %s", targetURL)
		return nil, nil
	})

	_, err := p.ResolveResource(context.Background(), "https://127.0.0.1/link_start/", "quark", "4259", 1)
	var resolveErr *ResourceResolveError
	if !errors.As(err, &resolveErr) || resolveErr.Kind != ResolveInvalidRequest {
		t.Fatalf("expected invalid request, got %v", err)
	}
}

func TestResolveLinkStartEntriesDoesNotExposeURLRefreshKeyWithoutMovieID(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://sidhub.cc/link_start/?movie_title=%E9%93%81%E6%8B%B3%E6%95%99%E8%82%B2&redirect_to=pan_id_660573"
	p.fetcher = func(targetURL string) ([]byte, error) {
		t.Fatalf("N=0 且无 movieID 时不应预抓 link_start: %s", targetURL)
		return nil, nil
	}

	resolved := p.resolveLinkStartEntries(context.Background(), []sidHubLinkEntry{{
		Link:  model.Link{Type: "baidu", URL: linkStartURL},
		Index: 1,
	}}, "", 0)

	if len(resolved) != 1 {
		t.Fatalf("期望保留无 movieID 的 link_start 结果，实际为 %#v", resolved)
	}
	link := resolved[0].Link
	if link.AccessMode != "scan_transfer" || link.ScanTransfer == nil {
		t.Fatalf("期望无 movieID 时返回扫码兜底载荷，实际为 %#v", link)
	}
	if link.ScanTransfer.Refreshable || link.ScanTransfer.RefreshKey != "" {
		t.Fatalf("期望无 movieID 时不再生成 URL 型 refresh_key，实际为 %#v", link.ScanTransfer)
	}
}

func TestResolveLinkStartEntriesFallsBackWhenPreResolveFails(t *testing.T) {
	p := NewSidHubPlugin()
	entry := sidHubLinkEntry{
		Link: model.Link{
			Type:      "uc",
			URL:       "https://www.seedhub.cc/link_start/?redirect_to=uc_fail",
			WorkTitle: "巨星之路",
		},
		Index: 1,
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		return nil, errors.New("预抓取失败")
	}

	resolved := p.resolveLinkStartEntries(context.Background(), []sidHubLinkEntry{entry}, "626957")
	link := resolved[0].Link
	if link.AccessMode != "scan_transfer" || link.ScanTransfer == nil {
		t.Fatalf("期望预抓取失败时兜底为扫码转存，实际为 %#v", link)
	}
	if link.ScanTransfer.RefreshKey != "seedhub:626957:uc:1" {
		t.Fatalf("期望保留可刷新定位，实际为 %#v", link.ScanTransfer)
	}
}

func TestResolveLinkStartEntriesLeavesDirectAndDownloadLinksUnchanged(t *testing.T) {
	p := NewSidHubPlugin()
	entries := []sidHubLinkEntry{
		{
			Link: model.Link{
				Type: "quark",
				URL:  "https://pan.quark.cn/s/direct123",
			},
			Index: 1,
		},
		{
			Link: model.Link{
				Type: "magnet",
				URL:  "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567",
			},
			Index: 2,
		},
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		t.Fatalf("普通直链和下载型链接不应触发预抓取: %s", targetURL)
		return nil, nil
	}

	resolved := p.resolveLinkStartEntries(context.Background(), entries, "626957")
	for index, entry := range resolved {
		if entry.Link.AccessMode != "" || entry.Link.ScanTransfer != nil {
			t.Fatalf("第 %d 条链接不应被标记为扫码，实际为 %#v", index+1, entry.Link)
		}
		if entry.Link.URL != entries[index].Link.URL {
			t.Fatalf("第 %d 条链接 URL 不应变化，实际为 %#v", index+1, entry.Link)
		}
	}
}

func TestFetchURLRejectsCloudflareChallengeFromInjectedFetcher(t *testing.T) {
	// 覆盖矩阵：L5。
	p := NewSidHubPlugin()
	p.fetcher = func(targetURL string) ([]byte, error) {
		return []byte("Just a moment... window._cf_chl_opt Cloudflare"), nil
	}

	_, err := p.fetchURL(context.Background(), "https://www.seedhub.cc/link_start/?redirect_to=challenge")
	if err == nil || !strings.Contains(err.Error(), "Cloudflare") {
		t.Fatalf("期望测试抓取器返回挑战页时被拒绝，实际为 %v", err)
	}
}

func TestGetScraperRotatesBeforeCloudscraperSessionExpires(t *testing.T) {
	p := NewSidHubPlugin()

	firstScraper, err := p.getScraper()
	if err != nil {
		t.Fatalf("首次创建 SeedHub 抓取器失败: %v", err)
	}

	p.scraperMu.Lock()
	p.scraperCreatedAt = time.Now().Add(-seedHubScraperMaxAge)
	p.scraperMu.Unlock()

	secondScraper, err := p.getScraper()
	if err != nil {
		t.Fatalf("轮换 SeedHub 抓取器失败: %v", err)
	}
	if firstScraper == secondScraper {
		t.Fatal("期望在 cloudscraper 内部会话到期前轮换抓取器")
	}
}

func TestDecodeSidHubHTTPBodyHandlesGzipPayload(t *testing.T) {
	original := []byte(`<html><a href="/movies/626957/">铁拳教育</a></html>`)
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	if _, err := writer.Write(original); err != nil {
		t.Fatalf("写入 gzip 测试载荷失败: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("关闭 gzip 测试载荷失败: %v", err)
	}

	decodedByHeader, err := decodeSidHubHTTPBody(buffer.Bytes(), "gzip")
	if err != nil {
		t.Fatalf("按响应头解压 gzip 失败: %v", err)
	}
	if string(decodedByHeader) != string(original) {
		t.Fatalf("按响应头解压结果不一致，实际为 %q", decodedByHeader)
	}

	decodedByMagic, err := decodeSidHubHTTPBody(buffer.Bytes(), "")
	if err != nil {
		t.Fatalf("按 gzip 魔数解压失败: %v", err)
	}
	if string(decodedByMagic) != string(original) {
		t.Fatalf("按 gzip 魔数解压结果不一致，实际为 %q", decodedByMagic)
	}
}

func TestSidHubDoSearchBuildsScanTransferResult(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	fixtures := map[string]string{
		searchURL: `
<article>
  <a title="你的名字。 君の名は。" class="image" href="/movies/4259/">
    <img src="/poster.jpg" />
  </a>
  <p>2016 / 动漫 / 日本 / 日语</p>
  <span>类型:爱情/动画/剧情</span>
</article>`,
		detailURL: `
<section id="downloads">
  <div class="quark-list">
    <ul>
      <li><a href="/link_start/?redirect_to=quark_scan" title="夸克扫码资源">夸克扫码资源</a></li>
    </ul>
  </div>
</section>`,
		linkStartURL: sidHubScanTransferFixture,
	}
	p.fetcher = func(targetURL string) ([]byte, error) {
		body, ok := fixtures[targetURL]
		if !ok {
			return nil, errors.New("未注册的测试地址")
		}
		return []byte(body), nil
	}

	results, err := p.doSearch(nil, "你的名字", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("搜索扫码转存资源失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望生成 1 条扫码资源结果，实际为 %#v", results)
	}

	link := results[0].Links[0]
	if link.AccessMode != "scan_transfer" || link.ScanTransfer == nil {
		t.Fatalf("期望展开结果携带扫码协议，实际为 %#v", results[0])
	}
	if link.ScanTransfer.RefreshKey != "seedhub:4259:quark:1" {
		t.Fatalf("期望结果携带稳定刷新键，实际为 %#v", link.ScanTransfer)
	}
}

func TestSidHubDoSearchWithContextReturnsCanceledBeforeFetching(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		t.Fatalf("context 已取消时不应请求 %s", targetURL)
		return nil, nil
	})

	_, err := p.doSearchWithContext(ctx, nil, "取消测试", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("期望返回 context.Canceled，实际为 %v", err)
	}
}

func TestSidHubDoSearchWithContextStopsBeforeDetailFetchWhenCanceled(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	searchURL := "https://www.seedhub.cc/s/%E5%8F%96%E6%B6%88%E8%AF%A6%E6%83%85/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL == detailURL {
			t.Fatalf("context 取消后不应继续请求详情页 %s", targetURL)
		}
		if targetURL != searchURL {
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
		cancel()
		return []byte(`
	<article>
	  <a title="取消详情" class="image" href="/movies/4259/">
	    <img src="/poster.jpg" />
	  </a>
	  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
	</article>`), nil
	})

	_, err := p.doSearchWithContext(ctx, nil, "取消详情", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("期望详情页抓取前返回 context.Canceled，实际为 %v", err)
	}
}

func TestSidHubDoSearchWithContextReturnsWhenFetcherBlocks(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()

	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		time.Sleep(50 * time.Millisecond)
		return []byte("<html></html>"), nil
	})

	startedAt := time.Now()
	_, err := p.doSearchWithContext(ctx, nil, "阻塞抓取", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("期望返回 context deadline exceeded，实际为 %v", err)
	}
	if elapsed := time.Since(startedAt); elapsed > 30*time.Millisecond {
		t.Fatalf("期望阻塞 fetcher 被 context 快速截断，实际耗时 %s", elapsed)
	}
}

func TestSidHubSearchCardsOnlyFetchesSearchPage(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E5%8D%A1%E7%89%87%E6%8B%86%E5%88%86/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL == detailURL {
			t.Fatalf("searchCardsOnly 不应请求详情页 %s", targetURL)
		}
		if targetURL != searchURL {
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
		return []byte(`
	<article>
	  <a title="卡片拆分" class="image" href="/movies/4259/">
	    <img src="/poster.jpg" />
	  </a>
	  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
	</article>`), nil
	})

	cards, err := p.searchCardsOnly(context.Background(), "https://www.seedhub.cc", "卡片拆分", maxSearchCards)
	if err != nil {
		t.Fatalf("搜索卡片失败: %v", err)
	}
	if len(cards) != 1 || cards[0].Title != "卡片拆分" || cards[0].DetailURL != detailURL {
		t.Fatalf("期望解析搜索页卡片，实际为 %#v", cards)
	}
}

func TestSidHubSearchCardsOnlyHonorsMaxSearchCards(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E5%8D%A1%E7%89%87%E6%95%B0/"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL != searchURL {
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
		return []byte(`
	<article><a title="卡片数 一" class="image" href="/movies/5001/"><img src="/one.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="卡片数 二" class="image" href="/movies/5002/"><img src="/two.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="卡片数 三" class="image" href="/movies/5003/"><img src="/three.jpg" /></a><p>2026 / 电影</p></article>`), nil
	})

	cards, err := p.searchCardsOnly(context.Background(), "https://www.seedhub.cc", "卡片数", 2)
	if err != nil {
		t.Fatalf("搜索卡片失败: %v", err)
	}
	if len(cards) != 2 {
		t.Fatalf("期望 max_search_cards 限制为 2 条，实际为 %#v", cards)
	}
}

func TestSidHubEnhanceSidHubCardsWithDetailsOmitsFailedDetails(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	card := sidHubMovie{
		ID:        "4259",
		Title:     "增强拆分",
		DetailURL: "https://www.seedhub.cc/movies/4259/",
		CoverURL:  "https://www.seedhub.cc/poster.jpg",
		MediaType: "movie",
		Content:   "2026 / 电影",
	}
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		return nil, fmt.Errorf("详情页失败: %s", targetURL)
	})

	results := p.enhanceSidHubCardsWithDetails(context.Background(), "https://www.seedhub.cc", []sidHubMovie{card}, resolveSidHubRuntimeConfig(nil))
	if len(results) != 0 {
		t.Fatalf("expected failed details to produce no resource, got %#v", results)
	}
}

func TestSidHubDoSearchOmitsResourceWhenDetailFetchFails(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E8%AF%A6%E6%83%85%E5%A4%B1%E8%B4%A5/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		switch targetURL {
		case searchURL:
			return []byte(`
	<article>
	  <a title="详情失败" class="image" href="/movies/4259/">
	    <img src="/poster.jpg" />
	  </a>
	  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
	</article>`), nil
		case detailURL:
			return nil, errors.New("详情页超时")
		default:
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
	})

	results, err := p.doSearch(nil, "详情失败", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected failed detail fetch to produce no resource, got %#v", results)
	}
}

func TestSidHubDoSearchFetchesDetailsConcurrently(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E5%B9%B6%E5%8F%91%E8%AF%A6%E6%83%85/"
	detailURLs := []string{
		"https://www.seedhub.cc/movies/1001/",
		"https://www.seedhub.cc/movies/1002/",
		"https://www.seedhub.cc/movies/1003/",
	}
	searchBody := `
	<article><a title="并发详情 一" class="image" href="/movies/1001/"><img src="/one.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="并发详情 二" class="image" href="/movies/1002/"><img src="/two.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="并发详情 三" class="image" href="/movies/1003/"><img src="/three.jpg" /></a><p>2026 / 电影</p></article>`
	detailBody := `
	<section id="downloads">
	  <div class="quark-list">
	    <ul><li><a href="https://pan.quark.cn/s/concurrent" title="并发详情资源">并发详情资源</a></li></ul>
	  </div>
	</section>`

	var mu sync.Mutex
	activeDetailRequests := 0
	maxActiveDetailRequests := 0
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL == searchURL {
			return []byte(searchBody), nil
		}
		for _, detailURL := range detailURLs {
			if targetURL == detailURL {
				mu.Lock()
				activeDetailRequests++
				if activeDetailRequests > maxActiveDetailRequests {
					maxActiveDetailRequests = activeDetailRequests
				}
				mu.Unlock()

				time.Sleep(10 * time.Millisecond)

				mu.Lock()
				activeDetailRequests--
				mu.Unlock()
				return []byte(detailBody), nil
			}
		}
		return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
	})

	results, err := p.doSearch(nil, "并发详情", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("期望返回 3 条详情结果，实际为 %#v", results)
	}
	if maxActiveDetailRequests < 2 {
		t.Fatalf("期望详情页并发请求，最大并发数为 %d", maxActiveDetailRequests)
	}
}

func TestSidHubDoSearchHonorsDetailConcurrencyLimit(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E5%B9%B6%E5%8F%91%E9%99%90%E5%88%B6/"
	detailURLs := []string{
		"https://www.seedhub.cc/movies/3001/",
		"https://www.seedhub.cc/movies/3002/",
		"https://www.seedhub.cc/movies/3003/",
	}
	searchBody := `
	<article><a title="并发限制 一" class="image" href="/movies/3001/"><img src="/one.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="并发限制 二" class="image" href="/movies/3002/"><img src="/two.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="并发限制 三" class="image" href="/movies/3003/"><img src="/three.jpg" /></a><p>2026 / 电影</p></article>`
	detailBody := `
	<section id="downloads">
	  <div class="quark-list">
	    <ul><li><a href="https://pan.quark.cn/s/limited" title="并发限制资源">并发限制资源</a></li></ul>
	  </div>
	</section>`

	var mu sync.Mutex
	activeDetailRequests := 0
	maxActiveDetailRequests := 0
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL == searchURL {
			return []byte(searchBody), nil
		}
		for _, detailURL := range detailURLs {
			if targetURL == detailURL {
				mu.Lock()
				activeDetailRequests++
				if activeDetailRequests > maxActiveDetailRequests {
					maxActiveDetailRequests = activeDetailRequests
				}
				mu.Unlock()

				time.Sleep(10 * time.Millisecond)

				mu.Lock()
				activeDetailRequests--
				mu.Unlock()
				return []byte(detailBody), nil
			}
		}
		return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
	})

	results, err := p.doSearch(nil, "并发限制", map[string]interface{}{
		"sidhub_base_url": "https://www.seedhub.cc",
		"plugin_runtime_config": map[string]interface{}{
			"detail_concurrency": 1,
		},
	})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("期望返回 3 条详情结果，实际为 %#v", results)
	}
	if maxActiveDetailRequests > 1 {
		t.Fatalf("期望详情页最大并发不超过 1，实际为 %d", maxActiveDetailRequests)
	}
}

func TestSidHubDoSearchAppliesDetailTimeout(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E8%AF%A6%E6%83%85%E8%B6%85%E6%97%B6/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		switch targetURL {
		case searchURL:
			return []byte(`
	<article>
	  <a title="详情超时" class="image" href="/movies/4259/">
	    <img src="/poster.jpg" />
	  </a>
	  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
	</article>`), nil
		case detailURL:
			time.Sleep(50 * time.Millisecond)
			return []byte(`
	<section id="downloads">
	  <div class="quark-list">
	    <ul><li><a href="https://pan.quark.cn/s/slow-detail" title="慢详情资源">慢详情资源</a></li></ul>
	  </div>
	</section>`), nil
		default:
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
	})

	startedAt := time.Now()
	results, err := p.doSearch(nil, "详情超时", map[string]interface{}{
		"sidhub_base_url": "https://www.seedhub.cc",
		"plugin_runtime_config": map[string]interface{}{
			"detail_timeout_seconds": 0.01,
		},
	})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if elapsed := time.Since(startedAt); elapsed > 40*time.Millisecond {
		t.Fatalf("期望详情页超时快速降级，实际耗时 %s", elapsed)
	}
	if len(results) != 0 {
		t.Fatalf("期望详情超时且无候选时不返回资源，实际为 %#v", results)
	}
}

func TestSidHubDoSearchAppliesDetailTotalBudget(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E6%80%BB%E9%A2%84%E7%AE%97/"
	searchBody := `
	<article><a title="总预算 一" class="image" href="/movies/2001/"><img src="/one.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="总预算 二" class="image" href="/movies/2002/"><img src="/two.jpg" /></a><p>2026 / 电影</p></article>
	<article><a title="总预算 三" class="image" href="/movies/2003/"><img src="/three.jpg" /></a><p>2026 / 电影</p></article>`
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL == searchURL {
			return []byte(searchBody), nil
		}
		if strings.Contains(targetURL, "/movies/") {
			time.Sleep(50 * time.Millisecond)
			return []byte(`
	<section id="downloads">
	  <div class="quark-list">
	    <ul><li><a href="https://pan.quark.cn/s/slow-budget" title="慢预算资源">慢预算资源</a></li></ul>
	  </div>
	</section>`), nil
		}
		return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
	})

	startedAt := time.Now()
	results, err := p.doSearch(nil, "总预算", map[string]interface{}{
		"sidhub_base_url": "https://www.seedhub.cc",
		"plugin_runtime_config": map[string]interface{}{
			"detail_timeout_seconds":      1,
			"detail_total_budget_seconds": 0.01,
		},
	})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if elapsed := time.Since(startedAt); elapsed > 40*time.Millisecond {
		t.Fatalf("期望详情增强总预算快速降级，实际耗时 %s", elapsed)
	}
	if len(results) != 0 {
		t.Fatalf("期望总预算耗尽且无候选时不返回资源，实际为 %#v", results)
	}
}

func TestSidHubSearchWithResultReturnsDeferredAndCachesScanTransferPayload(t *testing.T) {
	searchCache = sync.Map{}
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		AsyncResponseTimeoutDur:   time.Millisecond,
		AsyncMaxBackgroundWorkers: 1,
		AsyncMaxBackgroundTasks:   10,
		AsyncCacheTTLHours:        1,
		PluginTimeout:             100 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	p := NewSidHubPlugin()

	searchURL := "https://www.seedhub.cc/s/%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97/"
	detailURL := "https://www.seedhub.cc/movies/4259/"
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	fixtures := map[string]string{
		searchURL: `
<article>
  <a title="你的名字。 君の名は。" class="image" href="/movies/4259/">
    <img src="/poster.jpg" />
  </a>
  <p>2016 / 动漫 / 日本 / 日语</p>
  <span>类型:爱情/动画/剧情</span>
</article>`,
		detailURL: `
<section id="downloads">
  <div class="quark-list">
    <ul>
      <li><a href="/link_start/?redirect_to=quark_scan" title="夸克扫码资源">夸克扫码资源</a></li>
    </ul>
  </div>
</section>`,
		linkStartURL: sidHubScanTransferFixture,
	}
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		time.Sleep(5 * time.Millisecond)
		body, ok := fixtures[targetURL]
		if !ok {
			return nil, errors.New("未注册的测试地址")
		}
		return []byte(body), nil
	})

	result, err := p.SearchWithResult("你的名字", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("搜索扫码转存资源失败: %v", err)
	}
	if result.IsFinal {
		t.Fatalf("期望慢速 SeedHub 首包标记为非最终结果，实际为 %#v", result)
	}
	if len(result.Results) != 0 {
		t.Fatalf("期望首包先返回空结果并后台继续，实际为 %#v", result.Results)
	}

	var cachedResult model.PluginSearchResult
	for i := 0; i < 20; i++ {
		time.Sleep(5 * time.Millisecond)
		cachedResult, err = p.SearchWithResult("你的名字", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
		if err != nil {
			t.Fatalf("读取后台缓存失败: %v", err)
		}
		if cachedResult.IsFinal && len(cachedResult.Results) == 1 && len(cachedResult.Results[0].Links) == 1 {
			break
		}
	}
	if !cachedResult.IsFinal || len(cachedResult.Results) != 1 || len(cachedResult.Results[0].Links) != 1 {
		t.Fatalf("期望后台完成后缓存 1 条扫码资源，实际为 %#v", cachedResult)
	}

	link := cachedResult.Results[0].Links[0]
	if link.AccessMode != "scan_transfer" || link.ScanTransfer == nil {
		t.Fatalf("期望返回扫码转存载荷，实际为 %#v", link)
	}
	if link.ScanTransfer.RefreshKey != "seedhub:4259:quark:1" {
		t.Fatalf("期望保留稳定刷新键，实际为 %#v", link.ScanTransfer)
	}
}

func TestSidHubSearchWithResultUpdatesMainCacheAfterDeferredCompletion(t *testing.T) {
	searchCache = sync.Map{}
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		AsyncResponseTimeoutDur:   time.Millisecond,
		AsyncMaxBackgroundWorkers: 1,
		AsyncMaxBackgroundTasks:   10,
		AsyncCacheTTLHours:        1,
		PluginTimeout:             100 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	p := NewSidHubPlugin()
	p.SetMainCacheKey("main-cache-key")
	p.SetCurrentKeyword("后台缓存")

	var mu sync.Mutex
	var mainCacheCalls int
	var mainCacheResults []model.SearchResult
	var mainCacheFinal bool
	var mainCacheKeyword string
	p.SetMainCacheUpdater(func(cacheKey string, results []model.SearchResult, ttl time.Duration, isFinal bool, keyword string) error {
		mu.Lock()
		defer mu.Unlock()

		if cacheKey != "main-cache-key" {
			t.Fatalf("期望主缓存 key 为 main-cache-key，实际为 %q", cacheKey)
		}
		if ttl <= 0 {
			t.Fatalf("期望主缓存 ttl 为正数，实际为 %s", ttl)
		}
		mainCacheCalls++
		mainCacheResults = cloneResults(results)
		mainCacheFinal = isFinal
		mainCacheKeyword = keyword
		return nil
	})

	searchURL := "https://www.seedhub.cc/s/%E5%90%8E%E5%8F%B0%E7%BC%93%E5%AD%98/"
	detailURL := "https://www.seedhub.cc/movies/8899/"
	fixtures := map[string]string{
		searchURL: `
<article>
  <a title="后台缓存" class="image" href="/movies/8899/">
    <img src="/poster.jpg" />
  </a>
  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
</article>`,
		detailURL: `
<section id="downloads">
  <div class="quark-list">
    <ul><li><a href="https://pan.quark.cn/s/main-cache" title="后台缓存资源">后台缓存资源</a></li></ul>
  </div>
</section>`,
	}
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		time.Sleep(5 * time.Millisecond)
		body, ok := fixtures[targetURL]
		if !ok {
			return nil, fmt.Errorf("未注册的测试地址: %s", targetURL)
		}
		return []byte(body), nil
	})

	result, err := p.SearchWithResult("后台缓存", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("搜索后台缓存失败: %v", err)
	}
	if result.IsFinal || len(result.Results) != 0 {
		t.Fatalf("期望首包 deferred 空结果，实际为 %#v", result)
	}

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		mu.Lock()
		calls := mainCacheCalls
		cachedResults := cloneResults(mainCacheResults)
		isFinal := mainCacheFinal
		keyword := mainCacheKeyword
		mu.Unlock()

		if calls > 0 && isFinal && keyword == "后台缓存" && len(cachedResults) == 1 && len(cachedResults[0].Links) == 1 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()
	if mainCacheCalls == 0 || !mainCacheFinal || mainCacheKeyword != "后台缓存" {
		t.Fatalf("期望后台完成后写入主缓存，calls=%d final=%v keyword=%q", mainCacheCalls, mainCacheFinal, mainCacheKeyword)
	}
	if len(mainCacheResults) != 1 || len(mainCacheResults[0].Links) != 1 || mainCacheResults[0].Links[0].URL != "https://pan.quark.cn/s/main-cache" {
		t.Fatalf("期望主缓存写入增强后的真实资源链接，实际为 %#v", mainCacheResults)
	}

	cachedResult, err := p.SearchWithResult("后台缓存", map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
	if err != nil {
		t.Fatalf("读取插件后台缓存失败: %v", err)
	}
	if !cachedResult.IsFinal || len(cachedResult.Results) != 1 || cachedResult.Results[0].Links[0].URL != "https://pan.quark.cn/s/main-cache" {
		t.Fatalf("期望插件缓存返回增强后的真实资源链接，实际为 %#v", cachedResult)
	}
}

func TestSidHubSearchWithResultRepeatedSlowRequestsDoNotBlock(t *testing.T) {
	searchCache = sync.Map{}
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		AsyncResponseTimeoutDur:   5 * time.Millisecond,
		AsyncMaxBackgroundWorkers: 1,
		AsyncMaxBackgroundTasks:   10,
		AsyncCacheTTLHours:        1,
		PluginTimeout:             100 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	p := NewSidHubPlugin()
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		time.Sleep(50 * time.Millisecond)
		if strings.Contains(targetURL, "/s/") {
			return []byte(`
	<article>
	  <a title="连续慢请求" class="image" href="/movies/7788/">
	    <img src="/poster.jpg" />
	  </a>
	  <p>2026 / 电影 / 中国大陆 / 汉语普通话</p>
	</article>`), nil
		}
		return []byte(`
	<section id="downloads">
	  <div class="quark-list">
	    <ul><li><a href="https://pan.quark.cn/s/repeated-slow" title="连续慢请求资源">连续慢请求资源</a></li></ul>
	  </div>
	</section>`), nil
	})

	for i := 0; i < 3; i++ {
		startedAt := time.Now()
		result, err := p.SearchWithResult(fmt.Sprintf("连续慢请求-%d", i), map[string]interface{}{"sidhub_base_url": "https://www.seedhub.cc"})
		if err != nil {
			t.Fatalf("第 %d 次慢请求不应失败: %v", i+1, err)
		}
		if result.IsFinal {
			t.Fatalf("第 %d 次慢请求首包应为 deferred，实际为 %#v", i+1, result)
		}
		if elapsed := time.Since(startedAt); elapsed > 40*time.Millisecond {
			t.Fatalf("第 %d 次慢请求被前序后台任务阻塞，耗时 %s", i+1, elapsed)
		}
	}
}

func TestSidHubRefreshScanTransferReturnsLatestPayload(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	p.fetcher = func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			return nil, errors.New("未注册的测试地址")
		}
		return []byte(sidHubScanTransferFixture), nil
	}

	refreshedLink, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
	if err != nil {
		t.Fatalf("刷新扫码转存载荷失败: %v", err)
	}
	if refreshedLink.AccessMode != "scan_transfer" || refreshedLink.ScanTransfer == nil {
		t.Fatalf("期望刷新结果仍为扫码转存载荷，实际为 %#v", refreshedLink)
	}
	if refreshedLink.ScanTransfer.RefreshKey != "seedhub:4259:quark:1" {
		t.Fatalf("期望刷新后保留相同 refresh_key，实际为 %#v", refreshedLink.ScanTransfer)
	}
}

func TestSidHubRefreshScanTransferUsesSuccessCache(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	fetchCount := 0
	p.fetcher = func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			t.Fatalf("期望刷新固定链接，实际为 %s", targetURL)
		}
		fetchCount++
		return []byte(sidHubScanTransferFixture), nil
	}

	firstLink, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
	if err != nil {
		t.Fatalf("首次刷新失败: %v", err)
	}
	if firstLink.ScanTransfer == nil {
		t.Fatalf("首次刷新应返回扫码载荷")
	}
	firstLink.ScanTransfer.TransferCode = "MUTATED"

	secondLink, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
	if err != nil {
		t.Fatalf("第二次刷新失败: %v", err)
	}
	if fetchCount != 1 {
		t.Fatalf("期望第二次刷新命中缓存，实际抓取 %d 次", fetchCount)
	}
	if secondLink.ScanTransfer == nil || secondLink.ScanTransfer.TransferCode == "MUTATED" {
		t.Fatalf("期望缓存返回隔离副本，实际为 %#v", secondLink.ScanTransfer)
	}
}

func TestSidHubRefreshScanTransferSingleflightMergesConcurrentRequests(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	started := make(chan struct{})
	release := make(chan struct{})
	fetchCount := 0
	p.fetcher = func(targetURL string) ([]byte, error) {
		fetchCount++
		if fetchCount == 1 {
			close(started)
			<-release
		}
		if targetURL != linkStartURL {
			t.Fatalf("期望刷新固定链接，实际为 %s", targetURL)
		}
		return []byte(sidHubScanTransferFixture), nil
	}

	resultCh := make(chan error, 2)
	go func() {
		_, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
		resultCh <- err
	}()
	<-started
	go func() {
		_, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
		resultCh <- err
	}()
	close(release)

	for i := 0; i < 2; i++ {
		if err := <-resultCh; err != nil {
			t.Fatalf("并发刷新失败: %v", err)
		}
	}
	if fetchCount != 1 {
		t.Fatalf("期望并发刷新只抓取一次，实际为 %d 次", fetchCount)
	}
}

func TestSidHubRefreshScanTransferRetriesWhenSharedCallWasCanceled(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	started := make(chan struct{})
	releaseFirstFetch := make(chan struct{})
	var startedOnce sync.Once
	var fetchMu sync.Mutex
	fetchCount := 0
	p.fetcher = func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			t.Fatalf("期望刷新固定链接，实际为 %s", targetURL)
		}
		fetchMu.Lock()
		fetchCount++
		currentFetch := fetchCount
		fetchMu.Unlock()
		if currentFetch == 1 {
			startedOnce.Do(func() { close(started) })
			<-releaseFirstFetch
		}
		return []byte(sidHubScanTransferFixture), nil
	}

	leaderCtx, cancelLeader := context.WithCancel(context.Background())
	leaderErrCh := make(chan error, 1)
	go func() {
		_, err := p.RefreshScanTransfer(leaderCtx, linkStartURL, "seedhub:4259:quark:1")
		leaderErrCh <- err
	}()
	<-started

	waiterErrCh := make(chan error, 1)
	go func() {
		refreshedLink, err := p.RefreshScanTransfer(context.Background(), linkStartURL, "seedhub:4259:quark:1")
		if err == nil && (refreshedLink.ScanTransfer == nil || refreshedLink.ScanTransfer.RefreshKey != "seedhub:4259:quark:1") {
			err = fmt.Errorf("期望等待者重试后返回扫码载荷，实际为 %#v", refreshedLink.ScanTransfer)
		}
		waiterErrCh <- err
	}()
	time.Sleep(10 * time.Millisecond)
	cancelLeader()

	if err := <-leaderErrCh; !errors.Is(err, context.Canceled) {
		t.Fatalf("期望领头请求返回 context.Canceled，实际为 %v", err)
	}
	if err := <-waiterErrCh; err != nil {
		t.Fatalf("期望等待者在领头请求取消后重新刷新成功，实际为 %v", err)
	}
	close(releaseFirstFetch)

	fetchMu.Lock()
	defer fetchMu.Unlock()
	if fetchCount != 2 {
		t.Fatalf("期望取消后的等待者重新抓取一次，实际抓取 %d 次", fetchCount)
	}
}

func TestSidHubRefreshScanTransferRefetchesExpiredCache(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	refreshKey := "seedhub:4259:quark:1"
	cacheKey := p.buildSeedHubRefreshCacheKey(linkStartURL, refreshKey)
	refreshCache.Store(cacheKey, cachedRefreshResult{
		link: model.Link{
			Type:       "quark",
			URL:        linkStartURL,
			AccessMode: "scan_transfer",
			ScanTransfer: &model.ScanTransferInfo{
				TransferCode: "EXPIRED",
			},
		},
		expiresAt: time.Now().Add(-time.Second),
	})
	fetchCount := 0
	p.fetcher = func(targetURL string) ([]byte, error) {
		fetchCount++
		if targetURL != linkStartURL {
			t.Fatalf("期望刷新固定链接，实际为 %s", targetURL)
		}
		return []byte(sidHubScanTransferFixture), nil
	}

	refreshedLink, err := p.RefreshScanTransfer(context.Background(), linkStartURL, refreshKey)
	if err != nil {
		t.Fatalf("过期缓存重新刷新失败: %v", err)
	}
	if fetchCount != 1 {
		t.Fatalf("期望过期缓存触发重新抓取，实际抓取 %d 次", fetchCount)
	}
	if refreshedLink.ScanTransfer == nil || refreshedLink.ScanTransfer.TransferCode == "EXPIRED" {
		t.Fatalf("期望返回新载荷，实际为 %#v", refreshedLink.ScanTransfer)
	}
}

func TestSidHubRefreshScanTransferStopsWhenContextCanceled(t *testing.T) {
	p := NewSidHubPlugin()
	p.fetcher = func(_ string) ([]byte, error) {
		t.Fatal("上下文取消后不应发起页面抓取")
		return nil, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := p.RefreshScanTransfer(ctx, "https://www.seedhub.cc/link_start/?redirect_to=quark_scan", "seedhub:4259:quark:1")
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("期望返回 context.Canceled，实际为 %v", err)
	}
}

func TestSidHubRefreshScanTransferAcceptsURLRefreshKey(t *testing.T) {
	p := NewSidHubPlugin()
	linkStartURL := "https://sidhub.cc/link_start/?movie_title=%E9%93%81%E6%8B%B3%E6%95%99%E8%82%B2&redirect_to=pan_id_660573"
	refreshKey := buildSeedHubURLRefreshKey(linkStartURL, "baidu")
	if refreshKey == "" {
		t.Fatalf("期望生成 URL 型 refresh_key")
	}
	p.fetcher = func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			t.Fatalf("期望使用 refresh_key 内的 link_start URL，实际为 %s", targetURL)
		}
		return []byte(sidHubScanTransferFixture), nil
	}

	refreshedLink, err := p.RefreshScanTransfer(context.Background(), "", refreshKey)
	if err != nil {
		t.Fatalf("URL 型 refresh_key 刷新失败: %v", err)
	}
	if refreshedLink.AccessMode != "scan_transfer" || refreshedLink.ScanTransfer == nil {
		t.Fatalf("期望返回扫码转存载荷，实际为 %#v", refreshedLink)
	}
	if !refreshedLink.ScanTransfer.Refreshable || refreshedLink.ScanTransfer.RefreshKey != refreshKey {
		t.Fatalf("期望刷新后保留 URL 型 refresh_key，实际为 %#v", refreshedLink.ScanTransfer)
	}
}

func TestSidHubDoSearchHandlesEmptyAndFetchErrors(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	results, err := p.doSearch(nil, "   ", nil)
	if err != nil {
		t.Fatalf("空关键词不应返回错误: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("空关键词期望空结果，实际为 %#v", results)
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		return nil, errors.New("测试失败")
	}
	_, err = p.doSearch(nil, "不存在", map[string]interface{}{"sidhub_base_url": "https://sidhub.cc"})
	if err == nil || !strings.Contains(err.Error(), "SeedHub 搜索失败") {
		t.Fatalf("期望返回 SeedHub 搜索失败错误，实际为 %v", err)
	}
}

func TestSidHubDoSearchReturnsEmptyWithoutTryingFallbackBaseURL(t *testing.T) {
	searchCache = sync.Map{}
	p := NewSidHubPlugin()

	searchURL := "https://sidhub.cc/s/%E4%B8%8D%E5%AD%98%E5%9C%A8/"
	fallbackCalled := false
	p.fetcher = func(targetURL string) ([]byte, error) {
		if targetURL == searchURL {
			return []byte(`<main><p>没有找到相关内容</p></main>`), nil
		}
		fallbackCalled = true
		return nil, errors.New("备用域名不应在空结果时被请求")
	}

	results, err := p.doSearch(nil, "不存在", nil)
	if err != nil {
		t.Fatalf("空搜索结果不应返回错误: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("期望空结果，实际为 %#v", results)
	}
	if fallbackCalled {
		t.Fatal("主域名成功返回空结果时不应继续请求备用域名")
	}
}

func TestSidHubHelpersCoverEdgeCases(t *testing.T) {
	if extractMovieID("/bad/path") != "" {
		t.Fatal("期望非法影片路径不返回 ID")
	}
	if inferMediaType("2026 / 动漫 / 日本") != "anime" {
		t.Fatal("期望动漫识别为 anime")
	}
	if inferMediaType("未知文本") != "unknown" {
		t.Fatal("期望未知媒体类型返回 unknown")
	}

	baseURLs, err := resolveBaseURLs(map[string]interface{}{"sidhub_base_url": " https://example.test/ "}, defaultBaseURLStrategy)
	if err != nil {
		t.Fatalf("自定义 baseURL 不应失败: %v", err)
	}
	if len(baseURLs) != 1 || baseURLs[0] != "https://example.test" {
		t.Fatalf("期望自定义 baseURL 被清理，实际为 %#v", baseURLs)
	}
	defaultBaseURLs, err := resolveBaseURLs(nil, defaultBaseURLStrategy)
	if err != nil {
		t.Fatalf("默认 baseURL 不应失败: %v", err)
	}
	if len(defaultBaseURLs) != 2 {
		t.Fatal("期望默认 baseURL 包含主站和备用站")
	}
	primaryOnlyBaseURLs, err := resolveBaseURLs(nil, "primary_only")
	if err != nil {
		t.Fatalf("primary_only 策略不应失败: %v", err)
	}
	if len(primaryOnlyBaseURLs) != 1 || primaryOnlyBaseURLs[0] != primaryBaseURL {
		t.Fatalf("期望 primary_only 只返回主域名，实际为 %#v", primaryOnlyBaseURLs)
	}
	fallbackOnlyBaseURLs, err := resolveBaseURLs(nil, "fallback_only")
	if err != nil {
		t.Fatalf("fallback_only 策略不应失败: %v", err)
	}
	if len(fallbackOnlyBaseURLs) != 1 || fallbackOnlyBaseURLs[0] != fallbackBaseURL {
		t.Fatalf("期望 fallback_only 只返回备用域名，实际为 %#v", fallbackOnlyBaseURLs)
	}

	if determineDirectLinkType("https://pan.baidu.com/s/abc") != "baidu" {
		t.Fatal("期望百度链接识别为 baidu")
	}
	if determineDirectLinkType("https://pan.quark.cn/s/abc") != "quark" {
		t.Fatal("期望夸克链接识别为 quark")
	}
	if determineDirectLinkType("https://www.alipan.com/s/abc") != "aliyun" {
		t.Fatal("期望阿里链接识别为 aliyun")
	}
	if determineDirectLinkType("https://drive.uc.cn/s/abc") != "uc" {
		t.Fatal("期望 UC 链接识别为 uc")
	}
	if determineDirectLinkType("https://pan.xunlei.com/s/abc") != "xunlei" {
		t.Fatal("期望迅雷链接识别为 xunlei")
	}
	if determineDirectLinkType("https://example.com") != "" {
		t.Fatal("期望未知链接类型返回空")
	}

	if absoluteURL("https://sidhub.cc", "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567") == "" {
		t.Fatal("期望磁力链接保持可用")
	}
	encodedLinkStartURL := absoluteURL("https://sidhub.cc", "/link_start/?redirect_to=pan_id_626957&movie_title=【铁拳教育】【WEB-4K】 更新于 昨天")
	if !strings.Contains(encodedLinkStartURL, "movie_title=%E3%80%90%E9%93%81%E6%8B%B3%E6%95%99%E8%82%B2%E3%80%91") {
		t.Fatalf("期望 link_start 中文参数被编码，实际为 %q", encodedLinkStartURL)
	}
	if absoluteURL("://bad", "%zz") != "" {
		t.Fatal("期望非法 URL 返回空")
	}

	if extractPassword("https://pan.baidu.com/s/abc?pwd=1234") != "1234" {
		t.Fatal("期望提取 pwd 参数")
	}
	if extractPassword("https://example.com") != "" {
		t.Fatal("期望无密码链接返回空")
	}
	if extractRating("暂无评分") != "" {
		t.Fatal("期望无评分文本返回空评分")
	}
	if extractPrefixedValue("暂无类型", "类型") != "" {
		t.Fatal("期望缺少类型分隔符时返回空")
	}
	if len(extractTags("没有年份")) != 0 {
		t.Fatal("期望无年份文本返回空标签")
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`<a href="/x">回退文本</a>`))
	if err != nil {
		t.Fatalf("构造 goquery 文档失败: %v", err)
	}
	if attrOrText(doc.Find("a").First(), "title") != "回退文本" {
		t.Fatal("期望缺少属性时回退到节点文本")
	}

	seenEntries := []sidHubLinkEntry{}
	seenKeys := map[string]struct{}{}
	addLinkEntry(&seenEntries, seenKeys, sidHubLinkEntry{})
	addLinkEntry(&seenEntries, seenKeys, sidHubLinkEntry{Link: model.Link{Type: "quark", URL: "https://pan.quark.cn/s/a"}})
	addLinkEntry(&seenEntries, seenKeys, sidHubLinkEntry{Link: model.Link{Type: "quark", URL: "https://pan.quark.cn/s/a"}})
	if len(seenEntries) != 1 {
		t.Fatalf("期望空链接被跳过且重复链接去重，实际为 %#v", seenEntries)
	}

	entries := []sidHubLinkEntry{
		{Link: model.Link{Type: "quark", URL: "https://pan.quark.cn/s/a"}},
		{Link: model.Link{Type: "baidu", URL: "https://pan.baidu.com/s/b"}},
		{Link: model.Link{Type: "custom", URL: "https://example.com/c"}},
	}
	summary := formatLinkTypeSummary(entries)
	if summary != "quark 1 / baidu 1 / custom 1" {
		t.Fatalf("期望资源摘要稳定排序，实际为 %q", summary)
	}
	if len(limitLinkEntries(entries, 2)) != 2 {
		t.Fatal("期望链接列表被限制到 2 条")
	}
	if len(limitLinkEntries(entries, 0)) != 3 {
		t.Fatal("期望非正数限制保留全部链接")
	}
	if len(cloneResults([]model.SearchResult{{UniqueID: "a"}})) != 1 {
		t.Fatal("期望结果克隆保留长度")
	}
	if !isCloudflareChallenge([]byte("Just a moment... window._cf_chl_opt Cloudflare")) {
		t.Fatal("期望识别 Cloudflare 挑战页")
	}
	if isCloudflareChallenge([]byte("普通页面")) {
		t.Fatal("普通页面不应识别为 Cloudflare 挑战")
	}
}

func TestResolveBaseURLsRejectsUnsafeCustomBaseURL(t *testing.T) {
	cases := []string{
		"http://example.test",
		"https://localhost",
		"https://127.0.0.1",
		"https://10.0.0.5",
		"https://169.254.169.254",
	}

	for _, rawURL := range cases {
		if _, err := resolveBaseURLs(map[string]interface{}{"sidhub_base_url": rawURL}, defaultBaseURLStrategy); err == nil {
			t.Fatalf("期望拒绝不安全 baseURL %s", rawURL)
		}
	}
}

func TestResolveSidHubRuntimeConfigClampsSearchCardsAndBaseURLStrategy(t *testing.T) {
	config := resolveSidHubRuntimeConfig(map[string]interface{}{
		"plugin_runtime_config": map[string]interface{}{
			"max_search_cards":  99,
			"base_url_strategy": "fallback_only",
		},
	})
	if config.MaxSearchCards != maxSearchCards {
		t.Fatalf("期望 max_search_cards 被限制到 %d，实际为 %d", maxSearchCards, config.MaxSearchCards)
	}
	if config.BaseURLStrategy != "fallback_only" {
		t.Fatalf("期望读取 fallback_only 策略，实际为 %q", config.BaseURLStrategy)
	}

	fallbackConfig := resolveSidHubRuntimeConfig(map[string]interface{}{
		"plugin_runtime_config": map[string]interface{}{
			"max_search_cards":  0,
			"base_url_strategy": "unknown",
		},
	})
	if fallbackConfig.MaxSearchCards != maxSearchCards {
		t.Fatalf("期望非法 max_search_cards 回落默认值，实际为 %d", fallbackConfig.MaxSearchCards)
	}
	if fallbackConfig.BaseURLStrategy != defaultBaseURLStrategy {
		t.Fatalf("期望非法 base_url_strategy 回落默认值，实际为 %q", fallbackConfig.BaseURLStrategy)
	}
}

func TestResolveSidHubRuntimeConfigAppliesPerTypeResourceLimit(t *testing.T) {
	defaults := resolveSidHubRuntimeConfig(nil)
	if defaults.MaxResourceEntriesPerType != defaultMaxResourceEntriesPerType {
		t.Fatalf("期望每类资源数量默认值为 %d，实际为 %d", defaultMaxResourceEntriesPerType, defaults.MaxResourceEntriesPerType)
	}

	clamped := resolveSidHubRuntimeConfig(map[string]interface{}{
		"plugin_runtime_config": map[string]interface{}{
			"max_resource_entries_per_type":    99,
			"pre_resolved_link_start_per_type": 20,
		},
	})
	if clamped.MaxResourceEntriesPerType != maxResourceEntriesPerType || clamped.PreResolvedLinkStartPerType != maxPreResolvedLinkStartPerType {
		t.Fatalf("期望上限配置被收敛，实际为 %#v", clamped)
	}

	legacy := resolveSidHubRuntimeConfig(map[string]interface{}{
		"plugin_runtime_config": map[string]interface{}{
			"max_resource_entries_per_type":    10,
			"pre_resolved_link_start_per_type": 20,
		},
	})
	if legacy.MaxResourceEntriesPerType != 10 || legacy.PreResolvedLinkStartPerType != 10 {
		t.Fatalf("期望历史预解析值在运行时不超过资源数量，实际为 %#v", legacy)
	}

	invalid := resolveSidHubRuntimeConfig(map[string]interface{}{
		"plugin_runtime_config": map[string]interface{}{
			"max_resource_entries_per_type": 0,
		},
	})
	if invalid.MaxResourceEntriesPerType != defaultMaxResourceEntriesPerType {
		t.Fatalf("期望非法数量回落默认值，实际为 %#v", invalid)
	}
}

func TestBuildSidHubSearchCacheKeyIncludesPerTypeResourceLimit(t *testing.T) {
	baseURLs := []string{"https://sidhub.cc", "https://www.seedhub.cc"}
	baseConfig := sidHubRuntimeConfig{
		PreResolvedLinkStartPerType: 0,
		MaxResourceEntriesPerType:   10,
		MaxSearchCards:              maxSearchCards,
		BaseURLStrategy:             defaultBaseURLStrategy,
		DetailConcurrency:           defaultDetailConcurrency,
		DetailTimeout:               defaultDetailTimeout,
		DetailTotalBudget:           defaultDetailTotalBudget,
	}
	keyWithTen := buildSidHubSearchCacheKey("凡人修仙传", baseConfig, baseURLs)
	keyWithTenAgain := buildSidHubSearchCacheKey("凡人修仙传", baseConfig, baseURLs)
	if keyWithTen != keyWithTenAgain {
		t.Fatalf("相同配置应生成同一缓存键，实际为 %q 和 %q", keyWithTen, keyWithTenAgain)
	}

	baseConfig.MaxResourceEntriesPerType = 5
	keyWithFive := buildSidHubSearchCacheKey("凡人修仙传", baseConfig, baseURLs)
	if keyWithFive == keyWithTen {
		t.Fatalf("不同每类资源数量不得复用缓存键，实际为 %q", keyWithFive)
	}
}

func TestLimitSidHubEntriesPerTypeKeepsOnlyLeadingEntriesOfEachType(t *testing.T) {
	entries := make([]sidHubLinkEntry, 0, 27)
	for index := 1; index <= 12; index++ {
		entries = append(entries, sidHubLinkEntry{
			Link:  model.Link{Type: "quark", URL: fmt.Sprintf("https://www.seedhub.cc/link_start/?redirect_to=quark_%02d", index)},
			Index: index,
		})
	}
	for index := 1; index <= 12; index++ {
		entries = append(entries, sidHubLinkEntry{
			Link:  model.Link{Type: "baidu", URL: fmt.Sprintf("https://www.seedhub.cc/link_start/?redirect_to=baidu_%02d", index)},
			Index: 12 + index,
		})
	}
	for index := 1; index <= 3; index++ {
		entries = append(entries, sidHubLinkEntry{
			Link:  model.Link{Type: "magnet", URL: fmt.Sprintf("magnet:?xt=urn:btih:%040d", index)},
			Index: 24 + index,
		})
	}

	limited := limitSidHubEntriesPerType(entries, 10)
	counts := countSidHubEntryTypes(limited)
	if counts["quark"] != 10 || counts["baidu"] != 10 || counts["magnet"] != 3 {
		t.Fatalf("期望各类型独立限制，实际为 %#v", counts)
	}
	for _, entry := range limited {
		if strings.Contains(entry.Link.URL, "_11") || strings.Contains(entry.Link.URL, "_12") {
			t.Fatalf("限制范围外条目不应保留，实际为 %#v", entry)
		}
	}
}

func TestLimitSidHubEntriesPerTypeRunsBeforePreResolve(t *testing.T) {
	p := NewSidHubPlugin()
	entries := make([]sidHubLinkEntry, 0, 12)
	for index := 1; index <= 12; index++ {
		entries = append(entries, sidHubLinkEntry{
			Link:  model.Link{Type: "quark", URL: fmt.Sprintf("https://www.seedhub.cc/link_start/?redirect_to=quark_%02d", index)},
			Index: index,
		})
	}

	fetchedURLs := make([]string, 0, 10)
	p.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		fetchedURLs = append(fetchedURLs, targetURL)
		return []byte(`<a href="https://pan.quark.cn/s/resolved">打开</a>`), nil
	})

	resolved := p.resolveLinkStartEntries(context.Background(), limitSidHubEntriesPerType(entries, 10), "4259", 10)
	if len(resolved) != 10 || len(fetchedURLs) != 10 {
		t.Fatalf("期望只预解析前 10 条，结果=%d 请求=%d", len(resolved), len(fetchedURLs))
	}
	for _, targetURL := range fetchedURLs {
		if strings.Contains(targetURL, "_11") || strings.Contains(targetURL, "_12") {
			t.Fatalf("限制范围外链接不应预解析：%s", targetURL)
		}
	}
}
