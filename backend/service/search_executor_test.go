package service

import (
	"testing"
	"time"

	"unisearch/config"
	"unisearch/plugin"
)

func TestCalculatePluginWorkerCountUsesConfigFallbackAndPluginLimit(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DefaultConcurrency:        3,
		AsyncMaxBackgroundWorkers: 10,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	workers := calculatePluginWorkerCount(0, 4)
	if workers != 4 {
		t.Fatalf("expected plugin count to cap worker count at 4, got %d", workers)
	}
}

func TestCalculatePluginWorkerCountPrefersLargerBackgroundPool(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 6,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	workers := calculatePluginWorkerCount(2, 12)
	if workers != 6 {
		t.Fatalf("expected background worker limit to win with 6 workers, got %d", workers)
	}
}

func TestPluginSearchExecutorUsesPluginSearchDirectly(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             200 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	mockPlugin := &mockAsyncSearchPlugin{name: "executor-plugin"}
	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(mockPlugin)

	selector := newPluginSelector(pm, nil)
	executor := newPluginSearchExecutor(selector, newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder())

	results, err := executor.Search("仙逆", nil, true, 1, nil)
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected one result, got %d", len(results))
	}
	if mockPlugin.SearchCalls() == 0 {
		t.Fatal("expected plugin Search to be called")
	}
	if mockPlugin.AsyncSearchCalls() != 0 {
		t.Fatalf("expected executor to avoid outer AsyncSearch wrapper, got %d calls", mockPlugin.AsyncSearchCalls())
	}
}
