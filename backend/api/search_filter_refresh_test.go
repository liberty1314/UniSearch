package api

import (
	"errors"
	"testing"

	"unisearch/model"
)

func TestSearchWithFilterRefreshesOnceWhenCachedFilteredResultIsEmpty(t *testing.T) {
	calls := 0
	req := model.SearchRequest{
		Keyword:    "大濛",
		ResultType: "merged_by_type",
		Filter: &model.FilterConfig{
			Include: []string{"4k"},
		},
	}

	result, err := searchWithFilterRefreshFallback(req, func(forceRefresh bool) (model.SearchResponse, error) {
		calls++
		if !forceRefresh {
			return model.SearchResponse{
				Total: 1,
				Resources: []model.ResourceObject{
					{
						ID:    "seedhub-stale-cache",
						Title: "大濛 普通版",
						Links: []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/stale"}},
					},
				},
			}, nil
		}

		return model.SearchResponse{
			Total: 1,
			Resources: []model.ResourceObject{
				{
					ID:    "seedhub-refresh-4k",
					Title: "【大濛】【4K+1080P】【内嵌简中字幕】",
					Links: []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/fresh"}},
				},
			},
		}, nil
	})
	if err != nil {
		t.Fatalf("期望搜索成功，实际错误：%v", err)
	}

	if calls != 2 {
		t.Fatalf("期望缓存过滤为空时自动强刷一次，实际调用 %d 次", calls)
	}
	if result.Total != 1 || len(result.Resources) != 1 || result.Resources[0].ID != "seedhub-refresh-4k" {
		t.Fatalf("期望返回强刷后的 4K 资源，实际为 %#v", result.Resources)
	}
}

func TestSearchWithFilterKeepsCachedResultWhenRefreshFallbackFails(t *testing.T) {
	calls := 0
	req := model.SearchRequest{
		Keyword:    "大濛",
		ResultType: "merged_by_type",
		Filter: &model.FilterConfig{
			Include: []string{"4k"},
		},
	}

	result, err := searchWithFilterRefreshFallback(req, func(forceRefresh bool) (model.SearchResponse, error) {
		calls++
		if forceRefresh {
			return model.SearchResponse{}, errors.New("上游暂时不可用")
		}

		return model.SearchResponse{
			Total: 1,
			Resources: []model.ResourceObject{
				{
					ID:    "seedhub-stale-cache",
					Title: "大濛 普通版",
					Links: []model.ResourceLink{{Type: "quark", URL: "https://pan.quark.cn/s/stale"}},
				},
			},
		}, nil
	})
	if err != nil {
		t.Fatalf("强刷兜底失败不应让已有缓存搜索失败，实际错误：%v", err)
	}

	if calls != 2 {
		t.Fatalf("期望尝试一次强刷兜底，实际调用 %d 次", calls)
	}
	if result.Total != 0 || len(result.Resources) != 0 {
		t.Fatalf("期望保留原缓存过滤后的空结果，实际为 %#v", result.Resources)
	}
}

func TestSearchWithFilterDoesNotRefreshWhenCachedResultMatches(t *testing.T) {
	calls := 0
	req := model.SearchRequest{
		Keyword:    "大濛",
		ResultType: "merged_by_type",
		Filter: &model.FilterConfig{
			Include: []string{"4k"},
		},
	}

	result, err := searchWithFilterRefreshFallback(req, func(forceRefresh bool) (model.SearchResponse, error) {
		calls++
		if forceRefresh {
			t.Fatal("缓存结果已命中筛选时不应触发强刷")
		}

		return model.SearchResponse{
			Total: 1,
			Resources: []model.ResourceObject{
				{
					ID:    "seedhub-cache-4k",
					Title: "【大濛】【WEB-4K】【中字】【正式版】",
					Links: []model.ResourceLink{{Type: "baidu", URL: "https://pan.baidu.com/s/cache"}},
				},
			},
		}, nil
	})
	if err != nil {
		t.Fatalf("期望搜索成功，实际错误：%v", err)
	}

	if calls != 1 {
		t.Fatalf("期望只使用缓存结果，实际调用 %d 次", calls)
	}
	if result.Total != 1 || result.Resources[0].ID != "seedhub-cache-4k" {
		t.Fatalf("期望保留已匹配筛选的缓存结果，实际为 %#v", result.Resources)
	}
}
