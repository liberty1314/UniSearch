package zhizhen

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestZhizhenPluginContract(t *testing.T) {
	p := NewZhizhenPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestZhizhenPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewZhizhenPlugin())

	if manifest.ID != "search.zhizhen" {
		t.Fatalf("期望插件 ID 为 search.zhizhen，实际为 %q", manifest.ID)
	}
	if manifest.Name != "至臻资源" {
		t.Fatalf("期望插件展示名为至臻资源，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 1 {
		t.Fatalf("期望插件优先级为 1，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestZhizhenParseSearchItem(t *testing.T) {
	html := `
<div class="module-search-item">
  <div class="module-item-pic"><img data-src="https://example.com/poster.jpg" /></div>
  <div class="video-info-header"><h3><a href="/index.php/vod/detail/id/123.html">仙逆 第三季</a></h3></div>
  <div class="video-serial">4K</div>
  <div class="video-info-aux">
    <span class="tag-link"><a>国产动漫</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">导演</span>
    <span class="video-info-actor"><a>测试导演</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">主演</span>
    <span class="video-info-actor"><a>演员一</a><a>演员二</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">剧情</span>
    <span class="video-info-item">王林修仙路。</span>
  </div>
</div>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造测试 DOM 失败: %v", err)
	}

	result := NewZhizhenPlugin().parseSearchItem(doc.Find(".module-search-item").First(), "仙逆")
	if result.UniqueID != "zhizhen-123" {
		t.Fatalf("期望 UniqueID 为 zhizhen-123，实际为 %q", result.UniqueID)
	}
	if result.Title != "仙逆 第三季" {
		t.Fatalf("期望标题被解析，实际为 %q", result.Title)
	}
	if len(result.Tags) != 1 || result.Tags[0] != "国产动漫" {
		t.Fatalf("期望标签被解析，实际为 %#v", result.Tags)
	}
	if len(result.Images) != 1 || result.Images[0] != "https://example.com/poster.jpg" {
		t.Fatalf("期望封面被解析，实际为 %#v", result.Images)
	}
	if !strings.Contains(result.Content, "王林修仙路") {
		t.Fatalf("期望剧情写入内容，实际为 %q", result.Content)
	}
}
