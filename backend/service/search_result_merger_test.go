package service

import (
	"testing"
	"time"

	"unisearch/model"
)

func TestResultMergerMergeDeduplicatesAndKeepsBestResult(t *testing.T) {
	merger := newResultMerger()
	now := time.Now()

	existing := []model.SearchResult{{
		UniqueID: "kkmao-1",
		Title:    "仙逆",
		Content:  "",
		Links: []model.Link{{
			URL: "https://pan.quark.cn/s/abc",
		}},
		Datetime: now.Add(-time.Hour),
	}}

	incoming := []model.SearchResult{{
		UniqueID: "kkmao-1",
		Title:    "仙逆 完整版",
		Content:  "more details",
		Links: []model.Link{{
			URL: "https://pan.quark.cn/s/abc",
		}, {
			URL: "https://pan.quark.cn/s/def",
		}},
		Datetime: now,
	}}

	merged := merger.Merge(existing, incoming)
	if len(merged) != 1 {
		t.Fatalf("expected 1 merged result, got %d", len(merged))
	}
	if merged[0].Title != "仙逆 完整版" {
		t.Fatalf("expected richer result to win, got %q", merged[0].Title)
	}
}
