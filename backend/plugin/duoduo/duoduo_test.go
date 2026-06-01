package duoduo

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestDuoduoPluginContract(t *testing.T) {
	p := NewDuoduoPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestDuoduoPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewDuoduoPlugin())

	if manifest.ID != "search.duoduo" {
		t.Fatalf("期望插件 ID 为 search.duoduo，实际为 %q", manifest.ID)
	}
	if manifest.Name != "多多资源" {
		t.Fatalf("期望插件展示名为多多资源，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 2 {
		t.Fatalf("期望插件优先级为 2，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestDuoduoParseSearchItem(t *testing.T) {
	html := `
<div class="module-search-item">
  <div class="module-item-pic"><img data-src="https://example.com/duoduo.jpg" /></div>
  <div class="video-info-header"><h3><a href="/index.php/vod/detail/id/456.html">庆余年 第二季</a></h3></div>
  <div class="video-serial">1080P</div>
  <div class="video-info-aux">
    <span class="tag-link"><a>国产剧</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">导演</span>
    <span class="video-info-actor"><a>测试导演</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">主演</span>
    <span class="video-info-actor"><a>演员甲</a><a>演员乙</a></span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">剧情</span>
    <span class="video-info-item">范闲继续破局。</span>
  </div>
</div>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造测试 DOM 失败: %v", err)
	}

	result := NewDuoduoPlugin().parseSearchItem(doc.Find(".module-search-item").First(), "庆余年")
	if result.UniqueID != "duoduo-456" {
		t.Fatalf("期望 UniqueID 为 duoduo-456，实际为 %q", result.UniqueID)
	}
	if result.Title != "庆余年 第二季" {
		t.Fatalf("期望标题被解析，实际为 %q", result.Title)
	}
	if len(result.Tags) != 1 || result.Tags[0] != "国产剧" {
		t.Fatalf("期望标签被解析，实际为 %#v", result.Tags)
	}
	if len(result.Images) != 1 || result.Images[0] != "https://example.com/duoduo.jpg" {
		t.Fatalf("期望封面被解析，实际为 %#v", result.Images)
	}
	if !strings.Contains(result.Content, "范闲继续破局") {
		t.Fatalf("期望剧情写入内容，实际为 %q", result.Content)
	}
}
