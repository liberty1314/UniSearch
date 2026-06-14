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

func TestSearchResponseBuilderBuildsResourceObjectsAndFacets(t *testing.T) {
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
			Content:  "完全无关的内容",
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
			Title:    "#电影",
			Content:  "仙逆剧场版\n链接：https://pan.quark.cn/s/tg",
			Datetime: now.Add(-2 * time.Hour),
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/tg"}},
		},
	}, NormalizedSearchRequest{
		Keyword:    "仙逆",
		ResultType: "results",
	})

	if response.Total != 2 {
		t.Fatalf("expected 2 resources, got %d", response.Total)
	}
	if len(response.Resources) != 2 {
		t.Fatalf("expected 2 resource payload items, got %d", len(response.Resources))
	}
	for _, resource := range response.Resources {
		if resource.ID == "ordinary-1" || resource.ID == "builderpriority-1" {
			t.Fatal("expected unrelated resources to be filtered from display list")
		}
	}
	var tgResource *model.ResourceObject
	for i := range response.Resources {
		if response.Resources[i].Source.Type == "tg" {
			tgResource = &response.Resources[i]
			break
		}
	}
	if tgResource == nil {
		t.Fatal("expected one tg resource in response")
	}
	if tgResource.Title != "仙逆剧场版" {
		t.Fatalf("expected tg resource to fallback to content title, got %q", tgResource.Title)
	}
	if response.Facets.CloudTypes["quark"] != 2 {
		t.Fatalf("expected quark facet count 2, got %#v", response.Facets.CloudTypes)
	}
	if response.Facets.SourceTypes["plugin"] == 0 || response.Facets.SourceTypes["tg"] == 0 {
		t.Fatalf("expected plugin and tg source facets, got %#v", response.Facets.SourceTypes)
	}
}

func TestSearchResponseBuilderHonorsCloudTypesAndSkipFilterForResources(t *testing.T) {
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
			Content:  "仙逆合集\n链接：https://pan.quark.cn/s/keep",
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

	if response.Total != 1 {
		t.Fatalf("expected resource total 1, got %d", response.Total)
	}
	if len(response.Resources) != 1 {
		t.Fatalf("expected exactly one resource, got %d", len(response.Resources))
	}
	if len(response.Resources[0].Links) != 1 {
		t.Fatalf("expected cloud type filter to keep one link, got %#v", response.Resources[0].Links)
	}
	if response.Resources[0].Links[0].URL != "https://pan.quark.cn/s/keep" {
		t.Fatalf("expected skip-filter plugin link to remain, got %q", response.Resources[0].Links[0].URL)
	}
	if _, exists := response.Facets.CloudTypes["baidu"]; exists {
		t.Fatal("expected baidu links to be filtered out by cloudTypes")
	}
}

func TestSearchResponseBuilderFiltersExpandedSidHubResultsByCloudType(t *testing.T) {
	builder := newSearchResponseBuilder()
	results := []model.SearchResult{
		{
			UniqueID:       "sidhub-4259-magnet-a",
			Title:          "你的名字 磁力资源",
			SourcePluginID: "sidhub",
			SourceType:     "plugin",
			SourceName:     "SidHub",
			Links:          []model.Link{{Type: "magnet", URL: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567"}},
		},
		{
			UniqueID:       "sidhub-4259-xunlei-a",
			Title:          "你的名字 迅雷资源",
			SourcePluginID: "sidhub",
			SourceType:     "plugin",
			SourceName:     "SidHub",
			Links:          []model.Link{{Type: "xunlei", URL: "https://pan.xunlei.com/s/x"}},
		},
	}

	response := builder.Build(results, NormalizedSearchRequest{
		Keyword:    "你的名字",
		CloudTypes: []string{"magnet"},
	})
	if response.Total != 1 || len(response.Resources) != 1 {
		t.Fatalf("期望只保留 1 条 SidHub 磁力展开结果，实际为 %#v", response)
	}
	resource := response.Resources[0]
	if resource.Source.ID != "sidhub" || len(resource.Links) != 1 || resource.Links[0].Type != "magnet" {
		t.Fatalf("期望只保留 SidHub 磁力展开结果，实际为 %#v", response)
	}
	if _, exists := response.Facets.CloudTypes["xunlei"]; exists {
		t.Fatalf("期望迅雷类型被筛选掉，实际 facets 为 %#v", response.Facets.CloudTypes)
	}
}

func TestSearchResponseBuilderAdaptsSearchResultToResourceProtocol(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID:       "resource-protocol-1",
			Title:          "仙逆合集",
			SourcePluginID: "search.resource_protocol",
			SourceType:     "search",
			SourceName:     "资源协议测试",
			MediaType:      "tv",
			TargetType:     "share",
			DetailURL:      "https://example.com/detail/1",
			Capabilities: model.ResourceCapabilities{
				Searchable:         true,
				ShareSearchable:    true,
				Downloadable:       true,
				OfficialSearchable: false,
			},
			Actions: []model.ResourceAction{
				{
					Key:   "link.share.open",
					Label: "打开分享",
					Type:  "link",
				},
			},
			Meta: map[string]interface{}{
				"ranking": float64(1),
			},
			Links: []model.Link{{URL: "https://pan.quark.cn/s/resource"}},
		},
	}, NormalizedSearchRequest{
		Keyword:    "仙逆",
		ResultType: "results",
	})

	if len(response.Resources) != 1 {
		t.Fatalf("expected one resource, got %d", len(response.Resources))
	}
	resource := response.Resources[0]
	if resource.Source.ID != "search.resource_protocol" || resource.Source.Type != "search" {
		t.Fatalf("expected source descriptor to be preserved, got %#v", resource.Source)
	}
	if resource.MediaType != "tv" || resource.TargetType != "share" {
		t.Fatalf("expected resource type fields to be preserved, got media=%q target=%q", resource.MediaType, resource.TargetType)
	}
	if !resource.Capabilities.Searchable || !resource.Capabilities.Downloadable {
		t.Fatalf("expected capabilities to be preserved, got %#v", resource.Capabilities)
	}
	if len(resource.Actions) != 1 || resource.Actions[0].Key != "link.share.open" {
		t.Fatalf("expected explicit actions to be preserved, got %#v", resource.Actions)
	}
	if resource.Meta["ranking"] != float64(1) {
		t.Fatalf("expected meta to be preserved, got %#v", resource.Meta)
	}
	if resource.Detail.URL != "https://example.com/detail/1" {
		t.Fatalf("expected detail url to be preserved, got %#v", resource.Detail)
	}
}

func TestSearchResponseBuilderGeneratesActionsForMultipleLinksAndMagnet(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "magnet-1",
			Title:    "磁力资源",
			Links: []model.Link{
				{URL: "magnet:?xt=urn:btih:abc"},
				{URL: "https://pan.baidu.com/s/abc", Password: "1234", WorkTitle: "百度备份"},
			},
		},
	}, NormalizedSearchRequest{Keyword: "磁力", ResultType: "results"})

	if len(response.Resources) != 1 {
		t.Fatalf("expected one resource, got %d", len(response.Resources))
	}
	resource := response.Resources[0]
	if len(resource.Links) != 2 {
		t.Fatalf("expected two resource links, got %#v", resource.Links)
	}
	if resource.Links[0].Type != "magnet" || resource.Links[1].Type != "baidu" {
		t.Fatalf("expected inferred link types, got %#v", resource.Links)
	}
	if len(resource.Actions) != 2 {
		t.Fatalf("expected generated actions for both links, got %#v", resource.Actions)
	}
	if resource.Actions[1].Payload["password"] != "1234" {
		t.Fatalf("expected password in generated action payload, got %#v", resource.Actions[1].Payload)
	}
	if !resource.Capabilities.Downloadable {
		t.Fatalf("expected generated capabilities to mark downloadable resource, got %#v", resource.Capabilities)
	}
}

func TestSearchResponseBuilderPreservesScanTransferProtocol(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "seedhub-scan-1",
			Title:    "需要扫码转存的资源",
			Links: []model.Link{
				{
					Type:       "quark",
					URL:        "https://pan.quark.cn/s/scan-transfer",
					AccessMode: "scan_transfer",
					ScanTransfer: &model.ScanTransferInfo{
						QRCodeBase64: "data:image/png;base64,abc123",
						MobileURL:    "quark://scan-transfer/123",
						TransferCode: "转存口令",
						Instruction:  "请使用夸克 App 扫码转存",
						Refreshable:  true,
						RefreshKey:   "seedhub:4259:quark:0",
					},
				},
			},
		},
	}, NormalizedSearchRequest{Keyword: "扫码", ResultType: "results"})

	if len(response.Resources) != 1 {
		t.Fatalf("expected one resource, got %d", len(response.Resources))
	}

	resource := response.Resources[0]
	if len(resource.Links) != 1 {
		t.Fatalf("expected one resource link, got %#v", resource.Links)
	}

	link := resource.Links[0]
	if link.AccessMode != "scan_transfer" {
		t.Fatalf("expected link access_mode to be preserved, got %#v", link)
	}
	if link.ScanTransfer == nil {
		t.Fatalf("expected scan_transfer payload to be preserved, got %#v", link)
	}
	if link.ScanTransfer.RefreshKey != "seedhub:4259:quark:0" {
		t.Fatalf("expected refresh key to be preserved, got %#v", link.ScanTransfer)
	}

	if len(resource.Actions) != 1 {
		t.Fatalf("expected one generated action, got %#v", resource.Actions)
	}

	payload := resource.Actions[0].Payload
	if payload["access_mode"] != "scan_transfer" {
		t.Fatalf("expected action payload access_mode to be preserved, got %#v", payload)
	}

	rawScanTransfer, ok := payload["scan_transfer"]
	if !ok {
		t.Fatalf("expected action payload to include scan_transfer, got %#v", payload)
	}

	scanTransfer, ok := rawScanTransfer.(*model.ScanTransferInfo)
	if !ok {
		t.Fatalf("expected action payload scan_transfer to be *model.ScanTransferInfo, got %T", rawScanTransfer)
	}

	if scanTransfer.TransferCode != "转存口令" {
		t.Fatalf("expected action payload scan_transfer transfer_code to be preserved, got %#v", scanTransfer)
	}
}

func TestSearchResponseBuilderKeepsResourceWithoutLinks(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID:  "detail-only-1",
			Title:     "只有详情页",
			Content:   "正文介绍",
			DetailURL: "https://example.com/detail-only",
		},
	}, NormalizedSearchRequest{Keyword: "详情页", ResultType: "results"})

	if response.Total != 1 || len(response.Resources) != 1 {
		t.Fatalf("expected detail-only resource to remain, got total=%d resources=%#v", response.Total, response.Resources)
	}
	if len(response.Resources[0].Links) != 0 {
		t.Fatalf("expected no links, got %#v", response.Resources[0].Links)
	}
	if len(response.Resources[0].Actions) != 1 || response.Resources[0].Actions[0].Type != "open_detail" {
		t.Fatalf("expected generated detail action, got %#v", response.Resources[0].Actions)
	}
}

func TestSearchResponseBuilderPrioritizesExactPhraseThenTime(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "fuzzy-newer",
			Title:    "速度：激情特别篇",
			Datetime: time.Date(2026, 5, 17, 12, 0, 0, 0, time.UTC),
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/fuzzy-newer"}},
		},
		{
			UniqueID: "exact-older",
			Title:    "速度与激情8",
			Datetime: time.Date(2026, 5, 10, 12, 0, 0, 0, time.UTC),
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/exact-older"}},
		},
		{
			UniqueID: "exact-newer",
			Title:    "速度与激情10",
			Datetime: time.Date(2026, 5, 16, 12, 0, 0, 0, time.UTC),
			Links:    []model.Link{{URL: "https://pan.quark.cn/s/exact-newer"}},
		},
	}, NormalizedSearchRequest{
		Keyword: "速度与激情",
	})

	if len(response.Resources) != 3 {
		t.Fatalf("expected 3 resources, got %d", len(response.Resources))
	}

	if response.Resources[0].ID != "exact-newer" {
		t.Fatalf("expected newer exact match first, got %q", response.Resources[0].ID)
	}
	if response.Resources[1].ID != "exact-older" {
		t.Fatalf("expected older exact match second, got %q", response.Resources[1].ID)
	}
	if response.Resources[2].ID != "fuzzy-newer" {
		t.Fatalf("expected fuzzy match after exact matches, got %q", response.Resources[2].ID)
	}
}

func TestSearchResponseBuilderFiltersContentOnlyNoise(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "noise-1",
			Title:    "IMG【女神炫技】浪味小仙女",
			Content:  "速度与激情特别行动(2019)\n这是正文里的无关引用",
			Links: []model.Link{
				{Type: "magnet", URL: "magnet:?xt=urn:btih:noise"},
			},
		},
		{
			UniqueID: "match-1",
			Title:    "速度与激情10（2023）",
			Links: []model.Link{
				{Type: "quark", URL: "https://pan.quark.cn/s/match"},
			},
		},
	}, NormalizedSearchRequest{
		Keyword: "速度与激情",
	})

	if len(response.Resources) != 1 {
		t.Fatalf("expected only one high precision resource, got %#v", response.Resources)
	}
	if response.Resources[0].ID != "match-1" {
		t.Fatalf("expected unrelated content-only noise to be filtered, got %q", response.Resources[0].ID)
	}
}

func TestSearchResponseBuilderKeepsOnlyMatchedLinkTitlesInMixedResult(t *testing.T) {
	builder := newSearchResponseBuilder()
	response := builder.Build([]model.SearchResult{
		{
			UniqueID: "mixed-links-1",
			Title:    "#电影",
			Content:  "速度与激情10\n链接：https://pan.quark.cn/s/fast\n\n女神炫技写真\n链接：https://pan.quark.cn/s/noise",
			Links: []model.Link{
				{Type: "quark", URL: "https://pan.quark.cn/s/fast"},
				{Type: "quark", URL: "https://pan.quark.cn/s/noise"},
			},
		},
	}, NormalizedSearchRequest{
		Keyword: "速度与激情",
	})

	if len(response.Resources) != 1 {
		t.Fatalf("expected one resource, got %#v", response.Resources)
	}
	if len(response.Resources[0].Links) != 1 {
		t.Fatalf("expected only the matched link to remain, got %#v", response.Resources[0].Links)
	}
	if response.Resources[0].Links[0].URL != "https://pan.quark.cn/s/fast" {
		t.Fatalf("expected matched link to remain, got %#v", response.Resources[0].Links)
	}
	if response.Resources[0].Title != "速度与激情10" {
		t.Fatalf("expected matched title fallback, got %q", response.Resources[0].Title)
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
