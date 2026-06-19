package weibo

import (
	"testing"
	"time"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func newWeiboPluginForTest() *WeiboPlugin {
	return &WeiboPlugin{
		BaseAsyncPlugin: plugin.NewBaseAsyncPluginWithFilter("weibo", 3, true),
	}
}

func TestWeiboPluginContract(t *testing.T) {
	p := newWeiboPluginForTest()
	testutil.AssertPluginContract(t, p)
	if !p.SkipServiceFilter() {
		t.Fatal("期望微博插件跳过服务层关键词过滤")
	}
}

func TestWeiboPluginManifestFallback(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(newWeiboPluginForTest())
	if manifest.ID != "search.weibo" {
		t.Fatalf("期望插件 ID 为 search.weibo，实际为 %q", manifest.ID)
	}
	if !manifest.Resource.SkipServiceFilter {
		t.Fatal("期望清单继承跳过服务层过滤标记")
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("期望使用生成清单，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestWeiboExtractNetworkDriveLinks(t *testing.T) {
	publishTime := time.Date(2026, 6, 19, 11, 30, 0, 0, time.UTC)
	text := "资源 https://pan.baidu.com/s/abcdef?pwd=9x8y 备用 https://pan.quark.cn/s/abc123 提取码 abcd"

	links := extractNetworkDriveLinks(text, publishTime)
	if len(links) != 2 {
		t.Fatalf("期望提取 2 个网盘链接，实际为 %#v", links)
	}

	found := map[string]string{}
	for _, link := range links {
		found[link.Type] = link.Password
		if !link.Datetime.Equal(publishTime) {
			t.Fatalf("期望链接时间继承发布时间，实际为 %v", link.Datetime)
		}
	}
	if found["baidu"] != "9x8y" {
		t.Fatalf("期望百度提取码为 9x8y，实际为 %q", found["baidu"])
	}
	if _, ok := found["quark"]; !ok {
		t.Fatalf("期望提取夸克链接，实际为 %#v", links)
	}
}
