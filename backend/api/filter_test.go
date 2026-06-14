package api

import (
	"testing"

	"unisearch/model"
)

func TestApplyResultFilterFiltersResourceObjectsAndRebuildsFacets(t *testing.T) {
	response := model.SearchResponse{
		Total: 3,
		Resources: []model.ResourceObject{
			{
				ID:         "keep-match",
				Title:      "仙逆合集",
				Source:     model.ResourceSource{Type: "plugin", Name: "插件源"},
				MediaType:  "tv",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/1"}},
				Capabilities: model.ResourceCapabilities{
					Searchable:   true,
					Downloadable: true,
				},
				Actions: []model.ResourceAction{{Key: "link.quark.open", Type: "open_link"}},
			},
			{
				ID:         "drop-exclude",
				Title:      "仙逆 枪版",
				Source:     model.ResourceSource{Type: "plugin", Name: "插件源"},
				MediaType:  "book",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "baidu", URL: "https://pan.baidu.com/s/2"}},
				Actions:    []model.ResourceAction{{Key: "link.baidu.open", Type: "open_link"}},
			},
			{
				ID:         "drop-keyword",
				Title:      "凡人修仙传",
				Source:     model.ResourceSource{Type: "tg", Name: "频道源"},
				MediaType:  "tv",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/3"}},
				Actions:    []model.ResourceAction{{Key: "detail.open", Type: "open_detail"}},
			},
		},
	}

	filtered := applyResultFilter(response, &model.FilterConfig{
		Include: []string{"仙逆"},
		Exclude: []string{"枪版"},
	}, "merge")

	if filtered.Total != 1 {
		t.Fatalf("expected one filtered resource, got %d", filtered.Total)
	}
	if len(filtered.Resources) != 1 || filtered.Resources[0].ID != "keep-match" {
		t.Fatalf("expected keep-match only, got %#v", filtered.Resources)
	}
	if filtered.Facets.CloudTypes["quark"] != 1 {
		t.Fatalf("expected rebuilt quark facet, got %#v", filtered.Facets)
	}
	if _, exists := filtered.Facets.CloudTypes["baidu"]; exists {
		t.Fatalf("expected excluded link facet to be removed, got %#v", filtered.Facets.CloudTypes)
	}
}

func TestApplyResultFilterSupportsStructuredFacetFilters(t *testing.T) {
	response := model.SearchResponse{
		Total: 3,
		Resources: []model.ResourceObject{
			{
				ID:         "keep-structured",
				Title:      "你的名字 4K",
				Source:     model.ResourceSource{Type: "plugin", Name: "插件源"},
				MediaType:  "movie",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/1"}},
				Capabilities: model.ResourceCapabilities{
					Downloadable: true,
				},
				Actions: []model.ResourceAction{{Key: "link.quark.open", Type: "open_link"}},
			},
			{
				ID:         "drop-media",
				Title:      "你的名字 原画设定集",
				Source:     model.ResourceSource{Type: "tg", Name: "频道源"},
				MediaType:  "book",
				TargetType: "detail",
				Links:      []model.ResourceLink{{Type: "baidu", URL: "https://pan.baidu.com/s/2"}},
				Capabilities: model.ResourceCapabilities{
					Searchable: true,
				},
				Actions: []model.ResourceAction{{Key: "detail.open", Type: "open_detail"}},
			},
			{
				ID:         "drop-capability",
				Title:      "你的名字 预告片",
				Source:     model.ResourceSource{Type: "plugin", Name: "插件源"},
				MediaType:  "movie",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/3"}},
				Capabilities: model.ResourceCapabilities{
					Searchable: true,
				},
				Actions: []model.ResourceAction{{Key: "link.quark.open", Type: "open_link"}},
			},
		},
	}

	filtered := applyResultFilter(response, &model.FilterConfig{
		MediaTypes:   []string{"movie"},
		TargetTypes:  []string{"share"},
		Capabilities: []string{"downloadable"},
	}, "merge")

	if filtered.Total != 1 {
		t.Fatalf("expected one structured-match resource, got %d", filtered.Total)
	}
	if len(filtered.Resources) != 1 || filtered.Resources[0].ID != "keep-structured" {
		t.Fatalf("expected keep-structured only, got %#v", filtered.Resources)
	}
	if filtered.Facets.MediaTypes["movie"] != 1 {
		t.Fatalf("expected rebuilt media facet, got %#v", filtered.Facets.MediaTypes)
	}
	if _, exists := filtered.Facets.MediaTypes["book"]; exists {
		t.Fatalf("expected unmatched media facet to be removed, got %#v", filtered.Facets.MediaTypes)
	}
}

func TestApplyResultFilterMatchesSeedHub4KEntriesCaseInsensitively(t *testing.T) {
	response := model.SearchResponse{
		Total: 2,
		Resources: []model.ResourceObject{
			{
				ID:         "seedhub-web-4k",
				Title:      "✅【大濛】【WEB-4K】【中字】【正式版】",
				Source:     model.ResourceSource{Type: "plugin", Name: "SeedHub"},
				MediaType:  "movie",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "baidu", URL: "https://pan.baidu.com/s/1?pwd=yea8"}},
			},
			{
				ID:         "seedhub-4k-1080p",
				Title:      "✅【大濛】【4K+1080P】【内嵌简中字幕】【流媒体正式版】",
				Source:     model.ResourceSource{Type: "plugin", Name: "SeedHub"},
				MediaType:  "movie",
				TargetType: "share",
				Links:      []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/2"}},
			},
		},
	}

	filtered := applyResultFilter(response, &model.FilterConfig{
		Include: []string{"4k"},
	}, "merge")

	if filtered.Total != 2 || len(filtered.Resources) != 2 {
		t.Fatalf("期望小写 4k 能命中 WEB-4K 与 4K+1080P 标题，实际为 %#v", filtered.Resources)
	}
}

func TestApplyResultFilterMatchesSeedHubQualityTermsAcrossResourceFields(t *testing.T) {
	buildSeedHubResource := func(id string, title string, description string, detailContent string, link model.ResourceLink) model.ResourceObject {
		return model.ResourceObject{
			ID:          id,
			Title:       title,
			Description: description,
			Source:      model.ResourceSource{Type: "plugin", Name: "SeedHub"},
			MediaType:   "movie",
			TargetType:  "share",
			Links:       []model.ResourceLink{link},
			Detail: model.ResourceDetail{
				Content: detailContent,
			},
		}
	}

	response := model.SearchResponse{
		Total: 4,
		Resources: []model.ResourceObject{
			buildSeedHubResource(
				"match-2160p",
				"大濛 2160P 杜比视界",
				"",
				"",
				model.ResourceLink{Type: "quark", URL: "https://pan.quark.cn/s/2160p"},
			),
			buildSeedHubResource(
				"match-dolby-detail",
				"大濛 正片",
				"",
				"资源标签: 杜比视界 / 蓝光",
				model.ResourceLink{Type: "quark", URL: "https://pan.quark.cn/s/dolby"},
			),
			buildSeedHubResource(
				"match-link-title",
				"大濛 普通版",
				"",
				"",
				model.ResourceLink{Type: "quark", URL: "https://pan.quark.cn/s/link-title", Title: "大濛 杜比音效版"},
			),
			buildSeedHubResource(
				"drop-gun",
				"大濛 2160P 枪版",
				"",
				"",
				model.ResourceLink{Type: "quark", URL: "https://pan.quark.cn/s/gun", Title: "大濛 杜比 枪版"},
			),
		},
	}

	filtered2160p := applyResultFilter(response, &model.FilterConfig{Include: []string{"2160p"}}, "merge")
	if filtered2160p.Total != 2 {
		t.Fatalf("期望 2160p 命中标题中的清晰度词，实际为 %#v", filtered2160p.Resources)
	}

	filteredDolby := applyResultFilter(response, &model.FilterConfig{
		Include: []string{"杜比"},
		Exclude: []string{"枪版"},
	}, "merge")
	if filteredDolby.Total != 3 {
		t.Fatalf("期望杜比命中详情内容和链接标题，同时排除枪版，实际为 %#v", filteredDolby.Resources)
	}
	for _, resource := range filteredDolby.Resources {
		if resource.ID == "drop-gun" {
			t.Fatalf("枪版资源应被排除，实际为 %#v", filteredDolby.Resources)
		}
	}
}
