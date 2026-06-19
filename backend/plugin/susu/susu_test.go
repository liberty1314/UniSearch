package susu

import (
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestSusuAsyncPluginContract(t *testing.T) {
	p := NewSusuAsyncPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestSusuAsyncPluginManifestFallback(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewSusuAsyncPlugin())
	if manifest.ID != "search.susu" {
		t.Fatalf("期望插件 ID 为 search.susu，实际为 %q", manifest.ID)
	}
	if manifest.Resource.Priority != 1 {
		t.Fatalf("期望插件优先级为 1，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("期望使用生成清单，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestSusuDetermineLinkType(t *testing.T) {
	p := NewSusuAsyncPlugin()
	cases := []struct {
		name     string
		url      string
		label    string
		expected string
	}{
		{name: "百度链接", url: "https://pan.baidu.com/s/abc123", expected: "baidu"},
		{name: "阿里名称兜底", url: "https://example.com/file", label: "阿里云盘", expected: "aliyun"},
		{name: "夸克链接", url: "https://pan.quark.cn/s/abc123", expected: "quark"},
		{name: "未知来源", url: "https://example.com/file", label: "普通下载", expected: "others"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if actual := p.determineLinkType(tc.url, tc.label); actual != tc.expected {
				t.Fatalf("期望链接类型为 %q，实际为 %q", tc.expected, actual)
			}
		})
	}
}
