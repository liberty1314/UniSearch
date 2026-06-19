package thepiratebay

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestThePirateBayPluginContract(t *testing.T) {
	p := NewThePirateBayPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestThePirateBayPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewThePirateBayPlugin())
	if manifest.ID != "search.thepiratebay" {
		t.Fatalf("期望插件 ID 为 search.thepiratebay，实际为 %q", manifest.ID)
	}
	if !manifest.Resource.SkipServiceFilter {
		t.Fatal("期望磁力搜索插件跳过服务层关键词过滤")
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestThePirateBayParseSearchResultItem(t *testing.T) {
	html := `
<table>
  <tr>
    <td class="vertTh"><a>Video</a><a>HD</a></td>
    <td>
      <div class="detName"><a class="detLink" href="/torrent/123456/movie-name">Movie.Name.2026.1080p</a></div>
      <a href="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=movie"></a>
      <font class="detDesc">Uploaded 06-19 2026, Size 1.5 GiB, ULed by tester</font>
    </td>
    <td>12</td>
    <td>3</td>
  </tr>
</table>`
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造测试文档失败: %v", err)
	}

	result := NewThePirateBayPlugin().parseSearchResultItem(doc.Find("tr").First())
	if result == nil {
		t.Fatal("期望解析出磁力搜索结果")
	}
	if result.Title != "Movie Name 2026 1080p" {
		t.Fatalf("期望标题格式化，实际为 %q", result.Title)
	}
	if len(result.Links) != 1 || result.Links[0].Type != "magnet" {
		t.Fatalf("期望解析磁力链接，实际为 %#v", result.Links)
	}
	if !strings.Contains(result.Content, "Seeders: 12") {
		t.Fatalf("期望内容包含种子元数据，实际为 %q", result.Content)
	}
}
