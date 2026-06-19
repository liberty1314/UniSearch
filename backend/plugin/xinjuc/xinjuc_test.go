package xinjuc

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestXinjucPluginContract(t *testing.T) {
	p := NewXinjucPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestXinjucPluginManifestFallback(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewXinjucPlugin())
	if manifest.ID != "search.xinjuc" {
		t.Fatalf("期望插件 ID 为 search.xinjuc，实际为 %q", manifest.ID)
	}
	if manifest.Resource.Priority != 2 {
		t.Fatalf("期望插件优先级为 2，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("期望使用生成清单，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestXinjucBaiduLinkParsing(t *testing.T) {
	p := NewXinjucPlugin()
	if !p.isValidBaiduLink("https://pan.baidu.com/s/abcdef12345?pwd=9x8y") {
		t.Fatal("期望识别有效百度网盘链接")
	}
	if p.isValidBaiduLink("https://example.com/s/abcdef12345") {
		t.Fatal("不应接受非百度网盘链接")
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(`
<article>
  <a href="https://pan.baidu.com/s/abcdef12345?pwd=9x8y">百度网盘</a>
  <a href="https://example.com/s/abcdef12345">无效链接</a>
</article>`))
	if err != nil {
		t.Fatalf("构造测试文档失败: %v", err)
	}

	links := p.extractLinksFromDoc(doc)
	if len(links) != 1 {
		t.Fatalf("期望只提取 1 个有效链接，实际为 %#v", links)
	}
	if links[0].Type != "baidu" || links[0].Password != "9x8y" {
		t.Fatalf("期望提取百度链接和提取码，实际为 %#v", links[0])
	}
}
