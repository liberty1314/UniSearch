package sidhub

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"sync"
	"testing"

	"github.com/PuerkitoBio/goquery"

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

func TestSidHubPluginContract(t *testing.T) {
	p := NewSidHubPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestSidHubPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewSidHubPlugin())

	if manifest.ID != "search.sidhub" {
		t.Fatalf("期望插件 ID 为 search.sidhub，实际为 %q", manifest.ID)
	}
	if manifest.Name != "SidHub" {
		t.Fatalf("期望插件展示名为 SidHub，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != defaultPriority {
		t.Fatalf("期望插件优先级为 %d，实际为 %d", defaultPriority, manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestParseSearchCards(t *testing.T) {
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

func TestParseDetailLinks(t *testing.T) {
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
	if links[0].URL != "https://sidhub.cc/link_start/?redirect_to=pan_id_10&movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD" {
		t.Fatalf("期望 SidHub 跳转地址被转为绝对地址，实际为 %q", links[0].URL)
	}
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
	if results[0].TargetType != "download" {
		t.Fatalf("期望磁力结果 target_type 为 download，实际为 %q", results[0].TargetType)
	}
	if results[1].TargetType != "share" {
		t.Fatalf("期望网盘结果 target_type 为 share，实际为 %q", results[1].TargetType)
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

	results, err := p.Search("   ", nil)
	if err != nil {
		t.Fatalf("空关键词 Search 不应失败: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("期望空关键词 Search 返回空结果，实际为 %#v", results)
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
	hasResolvedQuark := false
	for _, result := range results {
		if result.SourcePluginID != "sidhub" || result.SourceName != "SidHub" {
			t.Fatalf("期望来源为 SidHub，实际为 %#v", result)
		}
		if len(result.Links) != 1 {
			t.Fatalf("期望每条展开结果只包含一个链接，实际为 %#v", result.Links)
		}
		if result.MediaType != "tv" {
			t.Fatalf("期望媒体类型为 tv，实际为 %q", result.MediaType)
		}
		counts[result.Links[0].Type]++
		if result.Links[0].URL == "https://pan.quark.cn/s/real123" {
			hasResolvedQuark = true
		}
	}

	expected := map[string]int{"magnet": 3, "baidu": 2, "quark": 2, "xunlei": 2, "uc": 1}
	if !reflect.DeepEqual(counts, expected) {
		t.Fatalf("期望展开结果类型计数为 %#v，实际为 %#v", expected, counts)
	}
	if !hasResolvedQuark {
		t.Fatalf("期望夸克跳转被解析为真实链接，实际为 %#v", results)
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
	if fetchCount[searchURL] != 1 || fetchCount[detailURL] != 1 || fetchCount[linkStartURL] != 1 {
		t.Fatalf("期望每个测试地址只请求一次，实际为 %#v", fetchCount)
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
	if err == nil || !strings.Contains(err.Error(), "SidHub 搜索失败") {
		t.Fatalf("期望返回 SidHub 搜索失败错误，实际为 %v", err)
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

	baseURLs := resolveBaseURLs(map[string]interface{}{"sidhub_base_url": " https://example.test/ "})
	if len(baseURLs) != 1 || baseURLs[0] != "https://example.test" {
		t.Fatalf("期望自定义 baseURL 被清理，实际为 %#v", baseURLs)
	}
	if len(resolveBaseURLs(nil)) != 2 {
		t.Fatal("期望默认 baseURL 包含主站和备用站")
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
