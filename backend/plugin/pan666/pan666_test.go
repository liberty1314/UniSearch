package pan666

import (
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestPan666PluginContract(t *testing.T) {
	p := NewPan666AsyncPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestPan666PluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewPan666AsyncPlugin())
	if manifest.ID != "search.pan666" {
		t.Fatalf("期望插件 ID 为 search.pan666，实际为 %q", manifest.ID)
	}
	if manifest.Name != "Pan666" {
		t.Fatalf("期望插件展示名为 Pan666，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 3 {
		t.Fatalf("期望插件优先级为 3，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestPan666ConvertResponse(t *testing.T) {
	payload := pan666Response{
		Data: []pan666Discussion{
			{
				ID: "10",
				Attributes: struct {
					Title     string `json:"title"`
					CreatedAt string `json:"createdAt"`
				}{Title: "庆余年 4K", CreatedAt: "2026-06-01T12:30:00Z"},
				Relationships: struct {
					MostRelevantPost struct {
						Data struct {
							ID string `json:"id"`
						} `json:"data"`
					} `json:"mostRelevantPost"`
				}{MostRelevantPost: struct {
					Data struct {
						ID string `json:"id"`
					} `json:"data"`
				}{Data: struct {
					ID string `json:"id"`
				}{ID: "p1"}}},
			},
		},
		Included: []pan666Included{
			{
				ID: "p1",
				Attributes: struct {
					ContentHTML string `json:"contentHtml"`
				}{ContentHTML: `<p>链接：https://pan.quark.cn/s/abc123</p>`},
			},
		},
	}

	results := NewPan666AsyncPlugin().convertResponse(payload)
	if len(results) != 1 {
		t.Fatalf("期望转换出 1 条结果，实际为 %#v", results)
	}
	if results[0].UniqueID != "pan666-10" || len(results[0].Links) != 1 || results[0].Links[0].Type != "quark" {
		t.Fatalf("期望基础字段和链接被转换，实际为 %#v", results[0])
	}
}

func TestPan666LinksFromTextSkipsInvalid(t *testing.T) {
	links := linksFromText("有效 https://pan.baidu.com/s/abcdef?pwd=9x8y 无效 https://example.com/a")
	if len(links) != 1 || links[0].Type != "baidu" || links[0].Password != "9x8y" {
		t.Fatalf("期望只提取有效网盘链接，实际为 %#v", links)
	}
}
