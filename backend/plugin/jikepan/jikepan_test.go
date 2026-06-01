package jikepan

import (
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestJikepanPluginContract(t *testing.T) {
	p := NewJikepanAsyncV2Plugin()
	testutil.AssertPluginContract(t, p)
}

func TestJikepanPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewJikepanAsyncV2Plugin())

	if manifest.ID != "search.jikepan" {
		t.Fatalf("期望插件 ID 为 search.jikepan，实际为 %q", manifest.ID)
	}
	if manifest.Name != "即刻盘" {
		t.Fatalf("期望插件展示名为即刻盘，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 3 {
		t.Fatalf("期望插件优先级为 3，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestJikepanConvertResultsSkipsUnknownLinks(t *testing.T) {
	results := NewJikepanAsyncV2Plugin().convertResults([]JikepanItem{
		{
			Name: "测试资源",
			Links: []JikepanLink{
				{Service: "quark", Link: "https://pan.quark.cn/s/abc", Pwd: "1234"},
				{Service: "unknown", Link: "https://example.com/invalid"},
				{Service: "unknown", Link: "https://drive.uc.cn/s/ucabc"},
			},
		},
		{
			Name: "无有效链接资源",
			Links: []JikepanLink{
				{Service: "unknown", Link: "https://example.com/skip"},
			},
		},
	})

	if len(results) != 1 {
		t.Fatalf("期望只保留 1 条有效结果，实际为 %d", len(results))
	}
	if results[0].UniqueID != "jikepan-0" {
		t.Fatalf("期望 UniqueID 为 jikepan-0，实际为 %q", results[0].UniqueID)
	}
	if len(results[0].Links) != 2 {
		t.Fatalf("期望保留 2 个有效链接，实际为 %#v", results[0].Links)
	}
	if results[0].Links[0].Type != "quark" || results[0].Links[0].Password != "1234" {
		t.Fatalf("期望夸克链接和密码被保留，实际为 %#v", results[0].Links[0])
	}
	if results[0].Links[1].Type != "uc" {
		t.Fatalf("期望 UC 链接被 URL 兜底识别，实际为 %#v", results[0].Links[1])
	}
}

func TestJikepanConvertResultsAllowsEmptyList(t *testing.T) {
	results := NewJikepanAsyncV2Plugin().convertResults(nil)
	if len(results) != 0 {
		t.Fatalf("期望空响应转换为空结果，实际为 %#v", results)
	}
}
