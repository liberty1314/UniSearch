package service

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"unisearch/model"
)

type fakeHotRankingRefreshService struct {
	mu     sync.Mutex
	calls  []string
	errors map[string]error
}

func (f *fakeHotRankingRefreshService) GetHotRankings(_ context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	key := fmt.Sprintf("%s:%s:%s:%s:%d", query.Mode, query.Period, query.Category, query.SortBy, query.PageSize)
	f.mu.Lock()
	f.calls = append(f.calls, key)
	f.mu.Unlock()
	if err := f.errors[key]; err != nil {
		return model.HotRankingResponse{}, err
	}
	return model.HotRankingResponse{
		Mode:   query.Mode,
		Period: query.Period,
		Sections: []model.HotRankingSection{
			{Category: query.Category},
		},
	}, nil
}

type fakeHotRankingCacheForPreloader struct {
	mu         sync.Mutex
	clearCalls []string
}

func (f *fakeHotRankingCacheForPreloader) IsCacheEnabled() bool {
	return true
}

func (f *fakeHotRankingCacheForPreloader) Load(_ context.Context, _ model.HotRankingQuery, _ *model.HotRankingResponse) (bool, error) {
	return false, nil
}

func (f *fakeHotRankingCacheForPreloader) Store(_ context.Context, _ model.HotRankingQuery, _ model.HotRankingResponse) error {
	return nil
}

func (f *fakeHotRankingCacheForPreloader) ClearByPrefix(_ context.Context, prefix string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.clearCalls = append(f.clearCalls, prefix)
	return nil
}

func (f *fakeHotRankingCacheForPreloader) ClearCalls() []string {
	f.mu.Lock()
	defer f.mu.Unlock()

	return append([]string(nil), f.clearCalls...)
}

func TestHotRankingPreloaderWarmAllRefreshesAllCombinations(t *testing.T) {
	refreshService := &fakeHotRankingRefreshService{}
	cache := &fakeHotRankingCacheForPreloader{}
	preloader := NewHotRankingPreloaderWithCache(refreshService, cache, HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   "00:00",
		Limit:       50,
		Timeout:     2 * time.Second,
		Concurrency: 3,
		Location:    time.FixedZone("CST", 8*3600),
	})

	result := preloader.WarmAll(context.Background())

	if result.Total != 56 {
		t.Fatalf("expected 56 tasks, got %d", result.Total)
	}

	if result.Success != 56 || result.Failed != 0 {
		t.Fatalf("expected all warm tasks success, got success=%d failed=%d", result.Success, result.Failed)
	}

	if len(refreshService.calls) != 56 {
		t.Fatalf("expected 56 refresh calls, got %d", len(refreshService.calls))
	}

	if !containsRefreshCall(refreshService.calls, "trend:day:all:popularity.desc:50") {
		t.Fatalf("expected aggregated all category to be preloaded, got calls=%v", refreshService.calls)
	}
	if !containsRefreshCall(refreshService.calls, "popular:year:anime:vote_average.desc:50") {
		t.Fatalf("expected popular year anime vote_average task to be preloaded, got calls=%v", refreshService.calls)
	}
	if len(cache.ClearCalls()) != 1 {
		t.Fatalf("expected cache clear once before preload refresh, got %d", len(cache.ClearCalls()))
	}
}

func TestHotRankingPreloaderWarmAllContinuesWhenSingleRefreshFails(t *testing.T) {
	refreshService := &fakeHotRankingRefreshService{
		errors: map[string]error{
			"trend:day:movie:popularity.desc:50": errors.New("tmdb failed"),
		},
	}
	preloader := NewHotRankingPreloader(refreshService, HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   "00:00",
		Limit:       50,
		Timeout:     2 * time.Second,
		Concurrency: 2,
		Location:    time.FixedZone("CST", 8*3600),
	})

	result := preloader.WarmAll(context.Background())

	if result.Total != 56 {
		t.Fatalf("expected 56 tasks, got %d", result.Total)
	}

	if result.Success != 55 || result.Failed != 1 {
		t.Fatalf("expected one failure for failed day/movie refresh, got success=%d failed=%d", result.Success, result.Failed)
	}

	if len(result.Errors) != 1 {
		t.Fatalf("expected one error detail, got %d", len(result.Errors))
	}

	if len(refreshService.calls) != 56 {
		t.Fatalf("expected warm all to continue after failure, got %d calls", len(refreshService.calls))
	}
}

func containsRefreshCall(calls []string, target string) bool {
	for _, call := range calls {
		if call == target {
			return true
		}
	}
	return false
}

func TestHotRankingPreloaderNextRunUsesNextLocalSchedule(t *testing.T) {
	location := time.FixedZone("CST", 8*3600)
	preloader := NewHotRankingPreloader(nil, HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   "10:00",
		Timeout:     2 * time.Second,
		Concurrency: 1,
		Location:    location,
	})

	now := time.Date(2026, 5, 23, 9, 30, 0, 0, location)
	nextRun, err := preloader.NextRun(now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	expected := time.Date(2026, 5, 23, 10, 0, 0, 0, location)
	if !nextRun.Equal(expected) {
		t.Fatalf("expected next run %v, got %v", expected, nextRun)
	}

	now = time.Date(2026, 5, 23, 10, 30, 0, 0, location)
	nextRun, err = preloader.NextRun(now)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	expected = time.Date(2026, 5, 24, 10, 0, 0, 0, location)
	if !nextRun.Equal(expected) {
		t.Fatalf("expected next day run %v, got %v", expected, nextRun)
	}
}

func TestNormalizeHotRankingPreloaderConfigUsesNewDefaults(t *testing.T) {
	config := normalizeHotRankingPreloaderConfig(HotRankingPreloaderConfig{})

	if config.DailyTime != "00:00" {
		t.Fatalf("expected default daily time 00:00, got %q", config.DailyTime)
	}

	if config.Limit != 50 {
		t.Fatalf("expected default limit 50, got %d", config.Limit)
	}
}
