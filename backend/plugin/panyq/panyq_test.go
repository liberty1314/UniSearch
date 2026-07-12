package panyq

import (
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestPanyqPluginContract(t *testing.T) {
	p := NewPanyqPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestPanyqPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewPanyqPlugin())
	if manifest.ID != "search.panyq" {
		t.Fatalf("期望插件 ID 为 search.panyq，实际为 %q", manifest.ID)
	}
	if manifest.Name != "盘友圈" {
		t.Fatalf("期望插件展示名为盘友圈，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 2 {
		t.Fatalf("期望插件优先级为 2，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestPanyqExtractFinalLink(t *testing.T) {
	response := "1:ignored\n[null,{\"url\":\"https://pan.quark.cn/s/abc123\"}]"
	if link := extractFinalLink(response); link != "https://pan.quark.cn/s/abc123" {
		t.Fatalf("期望从最终响应 JSON 行提取链接，实际为 %q", link)
	}

	fallback := "跳转 https://pan.baidu.com/s/abcdef?pwd=9x8y"
	if link := extractFinalLink(fallback); link != "https://pan.baidu.com/s/abcdef?pwd=9x8y" {
		t.Fatalf("期望从文本兜底提取链接，实际为 %q", link)
	}
}

func TestPanyqTextHelpers(t *testing.T) {
	desc := `\u003Cmark\u003E《庆余年》\u003C/mark\u003E ✔ 4K 资源`
	if title := extractTitle(desc); title != "庆余年" {
		t.Fatalf("期望提取书名号标题，实际为 %q", title)
	}
	if cleaned := cleanEscapedHTML(desc); cleaned != "《庆余年》 ✔ 4K 资源" {
		t.Fatalf("期望清理转义 HTML，实际为 %q", cleaned)
	}
	if password := extractPassword("https://pan.baidu.com/s/abcdef?pwd=9x8y", "baidu"); password != "9x8y" {
		t.Fatalf("期望提取百度提取码，实际为 %q", password)
	}
}

func TestExtractActionIDsSupportsModernScriptMarkup(t *testing.T) {
	html := `<script src='/_next/static/chunks/app.js'></script><script>const actionId = "0123456789abcdef0123456789abcdef01234567"</script>`
	ids := extractActionIDs(html)
	if len(ids) != 1 || ids[0] != "0123456789abcdef0123456789abcdef01234567" {
		t.Fatalf("期望从现代脚本标记提取 Action ID，实际为 %#v", ids)
	}
}
