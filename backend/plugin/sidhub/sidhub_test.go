package sidhub

import (
	"errors"
	"strings"
	"sync"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

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
	linkStartURL := "https://sidhub.cc/link_start/?redirect_to=pan_id_10&movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD"
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
		detailURL: `
<section>
  <a data-link="quark" title="【怪奇物语】【4K】" href="/link_start/?redirect_to=pan_id_10&amp;movie_title=%E6%80%AA%E5%A5%87%E7%89%A9%E8%AF%AD">夸克</a>
  <a title="磁力资源" href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567">磁力</a>
</section>`,
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
	if len(results) != 1 {
		t.Fatalf("期望 1 条结果，实际为 %d", len(results))
	}
	result := results[0]
	if result.UniqueID != "sidhub-119254" {
		t.Fatalf("期望 UniqueID 为 sidhub-119254，实际为 %q", result.UniqueID)
	}
	if len(result.Links) != 2 {
		t.Fatalf("期望解析 2 个链接，实际为 %#v", result.Links)
	}
	if result.Links[0].URL != "https://pan.quark.cn/s/real123" {
		t.Fatalf("期望夸克跳转被解析为真实链接，实际为 %q", result.Links[0].URL)
	}
	if result.MediaType != "tv" || result.SourcePluginID != "sidhub" {
		t.Fatalf("期望媒体类型和来源被设置，实际为 media=%q source=%q", result.MediaType, result.SourcePluginID)
	}
	if !strings.Contains(result.Content, "资源类型: quark 1 / magnet 1") {
		t.Fatalf("期望内容包含资源类型摘要，实际为 %q", result.Content)
	}

	p.fetcher = func(targetURL string) ([]byte, error) {
		return nil, errors.New("缓存命中时不应再次请求")
	}
	cachedResults, err := p.doSearch(nil, "怪奇物语", map[string]interface{}{"sidhub_base_url": "https://sidhub.cc"})
	if err != nil {
		t.Fatalf("缓存搜索失败: %v", err)
	}
	if len(cachedResults) != 1 || cachedResults[0].UniqueID != "sidhub-119254" {
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
