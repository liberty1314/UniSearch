package hdr4k

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestHdr4kPluginContract(t *testing.T) {
	p := NewHdr4kAsyncPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestHdr4kPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewHdr4kAsyncPlugin())
	if manifest.ID != "search.hdr4k" {
		t.Fatalf("期望插件 ID 为 search.hdr4k，实际为 %q", manifest.ID)
	}
	if manifest.Name != "4KHDR" {
		t.Fatalf("期望插件展示名为 4KHDR，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 1 {
		t.Fatalf("期望插件优先级为 1，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestHdr4kExtractDetailFromDocument(t *testing.T) {
	html := `
<div class="t_f">
  <p>4K 资源详情介绍，内容足够长用于生成详情摘要。4K 资源详情介绍，内容足够长用于生成详情摘要。</p>
  <a href="https://pan.quark.cn/s/abc123">夸克网盘</a>
  <span>提取码：9x8y</span>
</div>`
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("构造详情页 DOM 失败: %v", err)
	}

	links, content := NewHdr4kAsyncPlugin().extractDetailFromDocument(doc)
	if len(links) != 1 || links[0].Type != "quark" {
		t.Fatalf("期望提取夸克链接，实际为 %#v", links)
	}
	if content == "" {
		t.Fatal("期望提取详情摘要")
	}
}

func TestHdr4kHelpers(t *testing.T) {
	if !isEmptyRequestPost("求片 4K", nil) {
		t.Fatal("期望无链接求片帖被过滤")
	}
	if isEmptyRequestPost("求片 4K", []model.Link{{Type: "quark", URL: "https://pan.quark.cn/s/abc"}}) {
		t.Fatal("有链接的求片标题不应被过滤")
	}
	if parseDateTime("2025-4-9 19:55").Year() != 2025 {
		t.Fatal("期望解析 4KHDR 日期格式")
	}
	if cleanHTML("<strong>庆余年</strong>&nbsp;4K") != "庆余年 4K" {
		t.Fatalf("期望清理 HTML，实际为 %q", cleanHTML("<strong>庆余年</strong>&nbsp;4K"))
	}
}
