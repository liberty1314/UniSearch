package muou

import (
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestMuouAsyncPluginContract(t *testing.T) {
	p := NewMuouPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestMuouPluginManifestFallback(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewMuouPlugin())
	if manifest.ID != "search.muou" {
		t.Fatalf("期望插件 ID 为 search.muou，实际为 %q", manifest.ID)
	}
	if manifest.Resource.Priority != 2 {
		t.Fatalf("期望插件优先级为 2，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("期望使用生成清单，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestMuouDetermineLinkType(t *testing.T) {
	p := NewMuouPlugin()
	cases := []struct {
		name     string
		url      string
		expected string
	}{
		{name: "夸克链接", url: "https://pan.quark.cn/s/abc123", expected: "quark"},
		{name: "百度链接", url: "https://pan.baidu.com/s/abc123?pwd=9x8y", expected: "baidu"},
		{name: "阿里链接", url: "https://www.alipan.com/s/abc123", expected: "aliyun"},
		{name: "磁力链接", url: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567", expected: "magnet"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if actual := p.determineLinkType(tc.url); actual != tc.expected {
				t.Fatalf("期望链接类型为 %q，实际为 %q", tc.expected, actual)
			}
		})
	}
}
