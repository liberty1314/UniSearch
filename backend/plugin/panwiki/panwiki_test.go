package panwiki

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestPanwikiPluginContract(t *testing.T) {
	p := NewPanwikiPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestPanwikiPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewPanwikiPlugin())

	if manifest.ID != "search.panwiki" {
		t.Fatalf("期望插件 ID 为 search.panwiki，实际为 %q", manifest.ID)
	}
	if manifest.Name != "PanWiki" {
		t.Fatalf("期望插件展示名为 PanWiki，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 3 {
		t.Fatalf("期望插件优先级为 3，实际为 %d", manifest.Resource.Priority)
	}
	if !manifest.Resource.SkipServiceFilter {
		t.Fatal("期望 PanWiki 保留跳过 Service 层过滤")
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestPanwikiParseSearchResult(t *testing.T) {
	html := `
<li class="pbw">
  <h3 class="xs3"><a href="forum.php?mod=viewthread&tid=456">【PanWiki.com】庆余年 第二季 4K</a></h3>
  <p>命中内容片段。</p>
  <p>范闲继续破局。</p>
  <p class="xg1">
    <span>2026-06-01 12:30</span>
    <span><a>测试作者</a></span>
    <span><a>国产剧</a></span>
  </p>
</li>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造测试 DOM 失败: %v", err)
	}

	p := NewPanwikiPlugin()
	result := p.parseSearchResult(doc.Find("li.pbw").First())

	if result.UniqueID != "panwiki-456" {
		t.Fatalf("期望 UniqueID 为 panwiki-456，实际为 %q", result.UniqueID)
	}
	if result.Title != "庆余年 第二季 4K" {
		t.Fatalf("期望标题清理广告前缀，实际为 %q", result.Title)
	}
	if !strings.Contains(result.Content, "详情: https://www.panwiki.com/forum.php?mod=viewthread&tid=456") {
		t.Fatalf("期望内容包含详情页地址，实际为 %q", result.Content)
	}
	if len(result.Tags) != 1 || result.Tags[0] != "国产剧" {
		t.Fatalf("期望分类标签被解析，实际为 %#v", result.Tags)
	}
	if result.Datetime.IsZero() || result.Datetime.Year() != 2026 {
		t.Fatalf("期望发布时间被解析，实际为 %v", result.Datetime)
	}
}

func TestPanwikiExtractDetailLinksFromDocument(t *testing.T) {
	html := `
<div class="t_f" id="postmessage_1">
  <p>夸克：https://pan.quark.cn/s/abc123</p>
  <p>百度：<a href="https://pan.baidu.com/s/abcdef?pwd=9x8y">下载</a></p>
  <p>无效：https://example.com/not-cloud</p>
</div>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造详情页 DOM 失败: %v", err)
	}

	links := NewPanwikiPlugin().extractDetailLinksFromDocument(doc)
	if len(links) != 2 {
		t.Fatalf("期望提取 2 个有效网盘链接，实际为 %#v", links)
	}
	if links[0].Type != "baidu" && links[1].Type != "baidu" {
		t.Fatalf("期望包含百度链接，实际为 %#v", links)
	}
}

func TestPanwikiURLHelpers(t *testing.T) {
	p := NewPanwikiPlugin()

	searchURL := p.buildSearchURL(primaryBaseURL, "庆余年", 2)
	if !strings.Contains(searchURL, "page=2") || !strings.Contains(searchURL, "%E5%BA%86%E4%BD%99%E5%B9%B4") {
		t.Fatalf("期望搜索 URL 包含页码和转义关键词，实际为 %s", searchURL)
	}

	location := p.resolveLocation(primaryBaseURL, "/search.php?searchid=123")
	if location != "https://www.panwiki.com/search.php?searchid=123" {
		t.Fatalf("期望相对跳转地址被补全，实际为 %s", location)
	}

	pageURL := p.rewritePageURL(primaryBaseURL, "https://www.panwiki.com/search.php?mod=forum&searchid=123", 2)
	if !strings.Contains(pageURL, "searchid=123") || !strings.Contains(pageURL, "page=2") {
		t.Fatalf("期望分页 URL 被重写，实际为 %s", pageURL)
	}
}
