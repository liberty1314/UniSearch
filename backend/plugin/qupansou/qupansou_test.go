package qupansou

import (
	"strings"
	"testing"
	"time"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestQuPanSouPluginContract(t *testing.T) {
	p := NewQuPanSouPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestQuPanSouPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewQuPanSouPlugin())

	if manifest.ID != "search.qupansou" {
		t.Fatalf("期望插件 ID 为 search.qupansou，实际为 %q", manifest.ID)
	}
	if manifest.Name != "趣盘搜" {
		t.Fatalf("期望插件展示名为趣盘搜，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != 3 {
		t.Fatalf("期望插件优先级为 3，实际为 %d", manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestQuPanSouConvertResultsSkipsUnknownLinks(t *testing.T) {
	results := NewQuPanSouPlugin().convertResults([]QuPanSouItem{
		{
			ID:         101,
			Title:      "<em>庆余年</em> 第二季",
			URL:        "https://pan.quark.cn/s/abc",
			ExtCode:    "abcd",
			Category:   "影视",
			FileType:   "视频",
			Size:       "2GB",
			UpdateTime: "2026-06-01 12:30:00",
		},
		{
			ID:    102,
			Title: "未知链接",
			URL:   "https://example.com/skip",
		},
	})

	if len(results) != 1 {
		t.Fatalf("期望只保留 1 条有效结果，实际为 %d", len(results))
	}
	result := results[0]
	if result.UniqueID != "qupansou-101" {
		t.Fatalf("期望 UniqueID 为 qupansou-101，实际为 %q", result.UniqueID)
	}
	if result.Title != "庆余年 第二季" {
		t.Fatalf("期望标题清理 HTML 标签，实际为 %q", result.Title)
	}
	if len(result.Links) != 1 || result.Links[0].Type != "quark" || result.Links[0].Password != "abcd" {
		t.Fatalf("期望有效链接和提取码被保留，实际为 %#v", result.Links)
	}
	if !strings.Contains(result.Content, "影视") || !strings.Contains(result.Content, "2GB") {
		t.Fatalf("期望内容包含分类和大小，实际为 %q", result.Content)
	}
	if result.Datetime.IsZero() || result.Datetime.Year() != 2026 {
		t.Fatalf("期望更新时间被解析，实际为 %v", result.Datetime)
	}
}

func TestQuPanSouConvertResultsAllowsEmptyList(t *testing.T) {
	results := NewQuPanSouPlugin().convertResults(nil)
	if len(results) != 0 {
		t.Fatalf("期望空响应转换为空结果，实际为 %#v", results)
	}
}

func TestParseUpdateTimeFallback(t *testing.T) {
	if !parseUpdateTime("").IsZero() {
		t.Fatal("期望空时间返回零值")
	}
	if !parseUpdateTime("错误时间").IsZero() {
		t.Fatal("期望非法时间返回零值")
	}
	if parseUpdateTime("2026-06-01 12:30:00").Year() != 2026 {
		t.Fatal("期望合法时间被解析")
	}
	if !parseUpdateTime(time.Time{}.Format(time.RFC3339)).IsZero() {
		t.Fatal("当前只接受 API 既有时间格式，RFC3339 应返回零值")
	}
}
