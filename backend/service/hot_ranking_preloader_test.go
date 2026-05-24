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

func (f *fakeHotRankingRefreshService) RefreshHotRankings(_ context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	key := fmt.Sprintf("%s:%s", period, category)
	f.mu.Lock()
	f.calls = append(f.calls, key)
	f.mu.Unlock()
	if err := f.errors[key]; err != nil {
		return model.HotRankingResponse{}, err
	}
	return model.HotRankingResponse{
		Period: period,
		Sections: []model.HotRankingSection{
			{Category: category},
		},
	}, nil
}

type fakeHotRankingCacheForPreloader struct {
	clearCalls []string
}

func (f *fakeHotRankingCacheForPreloader) Load(_ context.Context, _ model.HotRankingQuery, _ *model.HotRankingResponse) (bool, error) {
	return false, nil
}

func (f *fakeHotRankingCacheForPreloader) Store(_ context.Context, _ model.HotRankingQuery, _ model.HotRankingResponse) error {
	return nil
}

func (f *fakeHotRankingCacheForPreloader) ClearByPrefix(_ context.Context, prefix string) error {
	f.clearCalls = append(f.clearCalls, prefix)
	return nil
}

func TestHotRankingPreloaderWarmAllRefreshesAllCombinations(t *testing.T) {
	refreshService := &fakeHotRankingRefreshService{}
	cache := &fakeHotRankingCacheForPreloader{}
	preloader := NewHotRankingPreloaderWithCache(refreshService, cache, HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   "10:00",
		Timeout:     2 * time.Second,
		Concurrency: 3,
		Location:    time.FixedZone("CST", 8*3600),
	})

	result := preloader.WarmAll(context.Background())

	if result.Total != 24 {
		t.Fatalf("expected 24 tasks, got %d", result.Total)
	}

	if result.Success != 24 || result.Failed != 0 {
		t.Fatalf("expected all warm tasks success, got success=%d failed=%d", result.Success, result.Failed)
	}

	if len(refreshService.calls) != 24 {
		t.Fatalf("expected 24 refresh calls, got %d", len(refreshService.calls))
	}

	if !containsRefreshCall(refreshService.calls, "day:all") {
		t.Fatalf("expected aggregated all category to be preloaded, got calls=%v", refreshService.calls)
	}
	if len(cache.clearCalls) == 0 {
		t.Fatalf("expected cache clear before preload refresh")
	}
}

func TestHotRankingPreloaderWarmAllContinuesWhenSingleRefreshFails(t *testing.T) {
	refreshService := &fakeHotRankingRefreshService{
		errors: map[string]error{
			"day:movie": errors.New("tmdb failed"),
		},
	}
	preloader := NewHotRankingPreloader(refreshService, HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   "10:00",
		Timeout:     2 * time.Second,
		Concurrency: 2,
		Location:    time.FixedZone("CST", 8*3600),
	})

	result := preloader.WarmAll(context.Background())

	if result.Total != 24 {
		t.Fatalf("expected 24 tasks, got %d", result.Total)
	}

	if result.Success != 22 || result.Failed != 2 {
		t.Fatalf("expected two failures for duplicated day/movie refresh, got success=%d failed=%d", result.Success, result.Failed)
	}

	if len(result.Errors) != 2 {
		t.Fatalf("expected two error details, got %d", len(result.Errors))
	}

	if len(refreshService.calls) != 24 {
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
