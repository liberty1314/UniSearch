package service

import (
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util/cache"
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
	if workers != 3 {
		t.Fatalf("expected default concurrency to cap worker count at 3, got %d", workers)
	}
}

func TestCalculatePluginWorkerCountDoesNotRaiseRequestConcurrency(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 6,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	workers := calculatePluginWorkerCount(2, 12)
	if workers != 2 {
		t.Fatalf("expected request concurrency to stay at 2, got %d", workers)
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
	executor := newPluginSearchExecutor(selector, newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder(), nil, nil)

	results, warnings, err := executor.Search("仙逆", nil, true, 1, nil)
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %#v", warnings)
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

func TestPluginSearchExecutorDoesNotStorePartialPluginResults(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              true,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             200 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	finalPlugin := &pluginResultStateProbe{
		name:    "final-plugin",
		isFinal: true,
	}
	partialPlugin := &pluginResultStateProbe{
		name:    "partial-plugin",
		isFinal: false,
	}

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(finalPlugin)
	pm.RegisterPlugin(partialPlugin)

	backend := &fakeCacheBackend{}
	searchCache := &redisSearchCache{
		cache:   backend,
		metrics: newSearchMetricsRecorder(),
	}
	selector := newPluginSelector(pm, nil)
	executor := newPluginSearchExecutor(selector, searchCache, newSearchMetricsRecorder(), nil, nil)

	results, warnings, err := executor.Search("铁拳教育", nil, true, 2, nil)
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %#v", warnings)
	}
	if len(results) != 2 {
		t.Fatalf("expected both immediate plugin results to be returned, got %d", len(results))
	}
	if backend.Calls() != 0 {
		t.Fatalf("非最终插件结果不应写入主搜索缓存，实际写入 %d 次", backend.Calls())
	}
}

func TestPluginSearchExecutorRecordsTimedOutPluginName(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             20 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "fast-plugin"})
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "timeout-plugin", delay: 200 * time.Millisecond})

	metrics := newSearchMetricsRecorder()
	selector := newPluginSelector(pm, nil)
	executor := newPluginSearchExecutor(selector, newSearchCache(nil, metrics), metrics, nil, nil)

	results, warnings, err := executor.Search("仙逆", nil, true, 2, nil)
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected fast plugin result only, got %d", len(results))
	}
	if len(warnings) != 1 {
		t.Fatalf("expected timeout warning, got %#v", warnings)
	}

	snapshot := metrics.Snapshot()
	if snapshot.TimeoutCount != 1 {
		t.Fatalf("expected one timeout, got %d", snapshot.TimeoutCount)
	}
	if len(snapshot.RecentErrors) == 0 {
		t.Fatal("expected timeout to be recorded in recent errors")
	}
	if got := snapshot.RecentErrors[0].PluginName; got != "timeout-plugin" {
		t.Fatalf("expected timeout plugin name to be recorded, got %q", got)
	}
}

func TestPluginSearchExecutorIsolatesRequestStatePerPlugin(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	statefulPlugin := &requestStateProbePlugin{name: "stateful-plugin"}
	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(statefulPlugin)

	selector := newPluginSelector(pm, nil)
	executor := newPluginSearchExecutor(selector, newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder(), nil, nil)

	type searchOutcome struct {
		keyword string
		results []model.SearchResult
		err     error
	}

	outcomes := make(chan searchOutcome, 2)
	var wg sync.WaitGroup

	runSearch := func(keyword string) {
		defer wg.Done()
		results, _, err := executor.Search(keyword, nil, true, 2, nil)
		outcomes <- searchOutcome{
			keyword: keyword,
			results: results,
			err:     err,
		}
	}

	wg.Add(1)
	go runSearch("alpha")
	time.Sleep(5 * time.Millisecond)
	wg.Add(1)
	go runSearch("beta")

	wg.Wait()
	close(outcomes)

	for outcome := range outcomes {
		if outcome.err != nil {
			t.Fatalf("unexpected search error for %s: %v", outcome.keyword, outcome.err)
		}
		if len(outcome.results) != 1 {
			t.Fatalf("expected one result for %s, got %d", outcome.keyword, len(outcome.results))
		}

		result := outcome.results[0]
		if result.Title != outcome.keyword {
			t.Fatalf("expected %s search to observe its own keyword, got %s", outcome.keyword, result.Title)
		}

		expectedCacheKey := cache.GeneratePluginCacheKey(outcome.keyword, []string{statefulPlugin.Name()}, nil)
		if result.Content != expectedCacheKey {
			t.Fatalf("expected %s search to observe cache key %s, got %s", outcome.keyword, expectedCacheKey, result.Content)
		}
	}
}

type requestStateProbePlugin struct {
	name string

	mu             sync.Mutex
	mainCacheKey   string
	currentKeyword string
}

func (p *requestStateProbePlugin) Name() string {
	return p.name
}

func (p *requestStateProbePlugin) Priority() int {
	return 1
}

func (p *requestStateProbePlugin) AsyncSearch(
	keyword string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, nil)
	if err != nil {
		return nil, err
	}
	return result.GetResults(), nil
}

func (p *requestStateProbePlugin) SetMainCacheKey(key string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.mainCacheKey = key
}

func (p *requestStateProbePlugin) SetCurrentKeyword(keyword string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.currentKeyword = keyword
}

func (p *requestStateProbePlugin) SearchWithResult(keyword string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	if keyword == "alpha" {
		time.Sleep(25 * time.Millisecond)
	}

	p.mu.Lock()
	observedKeyword := p.currentKeyword
	observedCacheKey := p.mainCacheKey
	p.mu.Unlock()

	return model.PluginSearchResult{
		Results: []model.SearchResult{{
			UniqueID: fmt.Sprintf("%s-%s", p.name, keyword),
			Title:    observedKeyword,
			Content:  observedCacheKey,
			Links: []model.Link{
				{
					Type: "mock",
					URL:  "https://example.com/" + p.name,
				},
			},
		}},
		IsFinal: true,
		Source:  p.name,
	}, nil
}

func (p *requestStateProbePlugin) SkipServiceFilter() bool {
	return false
}

type pluginResultStateProbe struct {
	name    string
	isFinal bool
}

func (p *pluginResultStateProbe) Name() string {
	return p.name
}

func (p *pluginResultStateProbe) Priority() int {
	return 1
}

func (p *pluginResultStateProbe) AsyncSearch(
	keyword string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, nil)
	if err != nil {
		return nil, err
	}
	return result.GetResults(), nil
}

func (p *pluginResultStateProbe) SetMainCacheKey(_ string) {}

func (p *pluginResultStateProbe) SetCurrentKeyword(_ string) {}

func (p *pluginResultStateProbe) SearchWithResult(keyword string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{
		Results: []model.SearchResult{{
			UniqueID: fmt.Sprintf("%s-%s", p.name, keyword),
			Title:    p.name,
			Links: []model.Link{{
				Type: "mock",
				URL:  "https://example.com/" + p.name,
			}},
		}},
		IsFinal:   p.isFinal,
		Timestamp: time.Now(),
		Source:    p.name,
	}, nil
}

func (p *pluginResultStateProbe) SkipServiceFilter() bool {
	return false
}
