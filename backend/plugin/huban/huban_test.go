package huban

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestHubanPluginContract(t *testing.T) {
	p := NewHubanPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestHubanPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewHubanPlugin())

	if manifest.ID != "search.huban" {
		t.Fatalf("期望插件 ID 为 search.huban，实际为 %q", manifest.ID)
	}
	if manifest.Name != "虎斑资源" {
		t.Fatalf("期望插件展示名为虎斑资源，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 2 {
		t.Fatalf("期望插件优先级为 2，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestHubanParseSearchItem(t *testing.T) {
	html := `
<div class="module-search-item">
  <div class="module-item-pic"><img data-src="https://example.com/huban.jpg" /></div>
  <div class="video-info-header">
    <h3><a href="/index.php/vod/detail/id/789.html">4K 测试影片</a></h3>
    <span class="video-info-remarks">蓝光</span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">分类</span>
    <span class="video-info-item">电影</span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">导演</span>
    <span class="video-info-item">测试导演</span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">主演</span>
    <span class="video-info-item">演员甲 / 演员乙</span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">剧情</span>
    <span class="video-info-item">测试剧情。</span>
  </div>
  <div class="video-info-items">
    <span class="video-info-itemtitle">年份</span>
    <span class="video-info-item">2026</span>
  </div>
</div>`

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造测试 DOM 失败: %v", err)
	}

	result := NewHubanPlugin().parseSearchItem(doc.Find(".module-search-item").First(), "4K")
	if result.UniqueID != "huban-789" {
		t.Fatalf("期望 UniqueID 为 huban-789，实际为 %q", result.UniqueID)
	}
	if result.Title != "4K 测试影片" {
		t.Fatalf("期望标题被解析，实际为 %q", result.Title)
	}
	if len(result.Tags) != 1 || result.Tags[0] != "2026" {
		t.Fatalf("期望年份标签被解析，实际为 %#v", result.Tags)
	}
	if len(result.Images) != 1 || result.Images[0] != "https://example.com/huban.jpg" {
		t.Fatalf("期望封面被解析，实际为 %#v", result.Images)
	}
	if !strings.Contains(result.Content, "测试剧情") {
		t.Fatalf("期望剧情写入内容，实际为 %q", result.Content)
	}
}
