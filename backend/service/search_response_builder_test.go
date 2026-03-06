package service

import (
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"unisearch/model"
	"unisearch/plugin"
)

type responseBuilderTestPlugin struct {
	name       string
	priority   int
	skipFilter bool
}

func (p *responseBuilderTestPlugin) Name() string { return p.name }

func (p *responseBuilderTestPlugin) Priority() int { return p.priority }

func (p *responseBuilderTestPlugin) AsyncSearch(
	_ string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	return nil, nil
}

func (p *responseBuilderTestPlugin) SetMainCacheKey(_ string) {}

func (p *responseBuilderTestPlugin) SetCurrentKeyword(_ string) {}

func (p *responseBuilderTestPlugin) Search(_ string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return nil, nil
}

func (p *responseBuilderTestPlugin) SkipServiceFilter() bool { return p.skipFilter }

func TestSearchResponseBuilderBuildFiltersAndSortsResults(t *testing.T) {
	plugin.RegisterGlobalPlugin(&responseBuilderTestPlugin{
		name:     "builderpriority",
		priority: 1,
	})
	pluginLevelCache = sync.Map{}
	pluginMetadataCache.mu.Lock()
	pluginMetadataCache.priorities = nil
	pluginMetadataCache.skipFilters = nil
	pluginMetadataCache.registrySize = 0
	pluginMetadataCache.mu.Unlock()

	builder := newSearchResponseBuilder()
	now := time.Now()

	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "builderpriority-1",
			Title:    "普通条目",
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/high"}},
		},
		{
			UniqueID: "ordinary-1",
			Title:    "没有时间没有关键词",
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/filtered"}},
		},
		{
			UniqueID: "ordinary-2",
			Title:    "仙逆合集",
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/keyword"}},
		},
		{
			Channel:  "share",
			Title:    "TG 新结果",
			Datetime: now.Add(-2 * time.Hour),
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/tg"}},
		},
	}, NormalizedSearchRequest{
		Keyword:    "仙逆",
		ResultType: "results",
	})

	if response.Total != 3 {
		t.Fatalf("expected 3 display results, got %d", response.Total)
	}
	if len(response.Results) != 3 {
		t.Fatalf("expected 3 results payload items, got %d", len(response.Results))
	}
	if response.Results[0].UniqueID != "builderpriority-1" {
		t.Fatalf("expected priority plugin result to rank first, got %q", response.Results[0].UniqueID)
	}
	for _, result := range response.Results {
		if result.UniqueID == "ordinary-1" {
			t.Fatal("expected low-signal result to be filtered from display list")
		}
	}
}

func TestSearchResponseBuilderBuildMergedByTypeHonorsCloudTypesAndSkipFilter(t *testing.T) {
	plugin.RegisterGlobalPlugin(&responseBuilderTestPlugin{
		name:       "builderskip",
		priority:   3,
		skipFilter: true,
	})
	pluginLevelCache = sync.Map{}
	pluginMetadataCache.mu.Lock()
	pluginMetadataCache.priorities = nil
	pluginMetadataCache.skipFilters = nil
	pluginMetadataCache.registrySize = 0
	pluginMetadataCache.mu.Unlock()

	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "builderskip-1",
			Title:    "不包含关键词",
			Content:  "无关标题\n链接：https://pan.quark.cn/s/keep",
			Links: []model.Link{
				{URL: "https://pan.quark.cn/s/keep"},
				{URL: "https://pan.baidu.com/s/filtered"},
			},
		},
	}, NormalizedSearchRequest{
		Keyword:    "仙逆",
		ResultType: "merged_by_type",
		CloudTypes: []string{"quark"},
	})

	if response.Results != nil {
		t.Fatal("merged_by_type response should omit results payload")
	}
	if response.Total != 1 {
		t.Fatalf("expected merged link total 1, got %d", response.Total)
	}
	quarkLinks := response.MergedByType["quark"]
	if len(quarkLinks) != 1 {
		t.Fatalf("expected exactly one quark link, got %d", len(quarkLinks))
	}
	if quarkLinks[0].URL != "https://pan.quark.cn/s/keep" {
		t.Fatalf("expected skip-filter plugin link to remain, got %q", quarkLinks[0].URL)
	}
	if _, exists := response.MergedByType["baidu"]; exists {
		t.Fatal("expected baidu links to be filtered out by cloudTypes")
	}
}

func BenchmarkSearchResponseBuilderBuild(b *testing.B) {
	plugin.RegisterGlobalPlugin(&responseBuilderTestPlugin{
		name:     "benchplugin",
		priority: 1,
	})
	pluginLevelCache = sync.Map{}
	pluginMetadataCache.mu.Lock()
	pluginMetadataCache.priorities = nil
	pluginMetadataCache.skipFilters = nil
	pluginMetadataCache.registrySize = 0
	pluginMetadataCache.mu.Unlock()

	now := time.Now()
	results := make([]model.SearchResult, 0, 500)
	for i := 0; i < 500; i++ {
		results = append(results, model.SearchResult{
			UniqueID: fmt.Sprintf("benchplugin-%d", i),
			Title:    fmt.Sprintf("仙逆合集 第%d集", i),
			Content: fmt.Sprintf(
				"仙逆合集 第%d集\n链接：https://pan.quark.cn/s/%03d\n链接：https://pan.baidu.com/s/%03d",
				i, i, i,
			),
			Links: []model.Link{
				{URL: fmt.Sprintf("https://pan.quark.cn/s/%03d", i)},
				{URL: fmt.Sprintf("https://pan.baidu.com/s/%03d", i)},
			},
			Datetime: now.Add(-time.Duration(i) * time.Hour),
		})
	}

	builder := newSearchResponseBuilder()
	request := NormalizedSearchRequest{
		Keyword:    "仙逆",
		ResultType: "all",
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = builder.Build(results, request)
	}
}
