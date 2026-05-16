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
				ID:         "keep-source",
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
				ID:         "drop-media",
				Title:      "仙逆小说",
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
		Include:      []string{"仙逆"},
		SourceTypes:  []string{"plugin"},
		MediaTypes:   []string{"tv"},
		TargetTypes:  []string{"share"},
		Capabilities: []string{"downloadable"},
		ActionTypes:  []string{"open_link"},
	}, "merge")

	if filtered.Total != 1 {
		t.Fatalf("expected one filtered resource, got %d", filtered.Total)
	}
	if len(filtered.Resources) != 1 || filtered.Resources[0].ID != "keep-source" {
		t.Fatalf("expected keep-source only, got %#v", filtered.Resources)
	}
	if filtered.Facets.CloudTypes["quark"] != 1 {
		t.Fatalf("expected rebuilt quark facet, got %#v", filtered.Facets)
	}
	if _, exists := filtered.Facets.MediaTypes["book"]; exists {
		t.Fatalf("expected dropped media facet to be removed, got %#v", filtered.Facets.MediaTypes)
	}
}
