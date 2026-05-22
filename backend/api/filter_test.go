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
