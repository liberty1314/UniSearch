package service

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

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
	hasPluginTimeoutWarning := false
	for _, warning := range warnings {
		if warning.Source == "timeout-plugin" {
			hasPluginTimeoutWarning = true
			break
		}
	}
	if !hasPluginTimeoutWarning {
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

func TestPluginSearchExecutorRecordsPluginMetrics(t *testing.T) {
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
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "metric-ok"})
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "metric-timeout", delay: 200 * time.Millisecond})

	collector, _ := newPluginMetricsTestCollector(t)
	metrics := newSearchMetricsRecorder()
	selector := newPluginSelector(pm, nil)
	executor := newPluginSearchExecutorWithMetrics(selector, newSearchCache(nil, metrics), metrics, nil, nil, collector, nil)

	_, _, err := executor.Search("仙逆", nil, true, 2, nil)
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 2 {
		t.Fatalf("期望记录两个插件指标，实际为 %#v", snapshot.Items)
	}
	byName := make(map[string]model.PluginMetricsRealtimeItem, len(snapshot.Items))
	for _, item := range snapshot.Items {
		byName[item.PluginName] = item
	}
	if byName["metric-ok"].SuccessCount != 1 {
		t.Fatalf("成功插件指标不正确: %#v", byName["metric-ok"])
	}
	if byName["metric-timeout"].TimeoutCount != 1 || byName["metric-timeout"].ErrorCount != 1 {
		t.Fatalf("超时插件指标不正确: %#v", byName["metric-timeout"])
	}
}

func TestTGSearchExecutorRecordsChannelMetricsOnSuccess(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:  false,
		PluginTimeout: time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	collector, _ := newTGChannelMetricsTestCollector(t)
	executor := newTGSearchExecutor(newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder(), func(keyword string, channel string) ([]model.SearchResult, error) {
		return []model.SearchResult{{Channel: channel, Title: keyword}}, nil
	}, collector, nil)

	results, err := executor.Search("仙逆", []string{"MetricChannel"}, true)
	if err != nil {
		t.Fatalf("频道搜索不应失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望返回 1 条结果，实际为 %d", len(results))
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 {
		t.Fatalf("期望记录一个频道指标，实际为 %#v", snapshot.Items)
	}
	item := snapshot.Items[0]
	if item.ChannelName != "metricchannel" || item.SuccessCount != 1 || item.ResultCount != 1 {
		t.Fatalf("成功频道指标不正确: %#v", item)
	}
}

func TestTGSearchExecutorRecordsChannelMetricsOnFailure(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:  false,
		PluginTimeout: time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.TGChannelHealthStatus{}); err != nil {
		t.Fatalf("迁移频道健康表失败: %v", err)
	}

	collector, _ := newTGChannelMetricsTestCollector(t)
	health := NewTGChannelHealthService(db)
	executor := newTGSearchExecutor(newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder(), func(_ string, _ string) ([]model.SearchResult, error) {
		return nil, fmt.Errorf("频道不可用")
	}, collector, health)

	results, err := executor.Search("仙逆", []string{"BrokenChannel"}, true)
	if err != nil {
		t.Fatalf("执行器应吞掉单频道错误并返回其他结果，实际错误: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("失败频道不应返回结果，实际为 %d", len(results))
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 || snapshot.Items[0].ErrorCount != 1 {
		t.Fatalf("失败频道指标不正确: %#v", snapshot.Items)
	}

	statusMap, err := health.GetStatusMap([]string{"BrokenChannel"})
	if err != nil {
		t.Fatalf("查询频道健康状态失败: %v", err)
	}
	status, ok := statusMap["BrokenChannel"]
	if !ok || status.IsHealthy || status.CheckSource != "search_failure" {
		t.Fatalf("频道健康状态未记录失败: ok=%v status=%#v", ok, status)
	}
}

func TestTGSearchExecutorRecordsChannelMetricsOnCacheHit(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:  true,
		PluginTimeout: time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	collector, _ := newTGChannelMetricsTestCollector(t)
	cache := &staticSearchCache{
		loadHit: true,
		results: []model.SearchResult{
			{Channel: "CachedChannel", Title: "缓存结果"},
		},
	}
	executor := newTGSearchExecutor(cache, newSearchMetricsRecorder(), func(_ string, _ string) ([]model.SearchResult, error) {
		t.Fatal("缓存命中时不应调用频道搜索")
		return nil, nil
	}, collector, nil)

	results, err := executor.Search("仙逆", []string{"CachedChannel"}, false)
	if err != nil {
		t.Fatalf("缓存命中不应失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望返回缓存结果，实际为 %d", len(results))
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 || snapshot.Items[0].CacheHitCount != 1 || snapshot.Items[0].ResultCount != 1 {
		t.Fatalf("缓存命中频道指标不正确: %#v", snapshot.Items)
	}
}

func TestTGSearchExecutorRecordsChannelTimeoutForUnfinishedTasks(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:  false,
		PluginTimeout: 20 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	collector, _ := newTGChannelMetricsTestCollector(t)
	executor := newTGSearchExecutor(newSearchCache(nil, newSearchMetricsRecorder()), newSearchMetricsRecorder(), func(_ string, channel string) ([]model.SearchResult, error) {
		if channel == "slow-channel" {
			time.Sleep(200 * time.Millisecond)
		}
		return []model.SearchResult{{Channel: channel}}, nil
	}, collector, nil)

	results, err := executor.Search("仙逆", []string{"fast-channel", "slow-channel"}, true)
	if err != nil {
		t.Fatalf("频道超时不应让执行器失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望只返回快速频道结果，实际为 %d", len(results))
	}

	snapshot := collector.RealtimeSnapshot()
	byName := make(map[string]model.TGChannelMetricsRealtimeItem, len(snapshot.Items))
	for _, item := range snapshot.Items {
		byName[item.ChannelName] = item
	}
	if byName["fast-channel"].SuccessCount != 1 {
		t.Fatalf("快速频道指标不正确: %#v", byName["fast-channel"])
	}
	if byName["slow-channel"].TimeoutCount != 1 || byName["slow-channel"].ErrorCount != 1 {
		t.Fatalf("超时频道指标不正确: %#v", byName["slow-channel"])
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

type staticSearchCache struct {
	loadHit bool
	results []model.SearchResult
}

func (c *staticSearchCache) Load(_ string, _ string, _ string, target interface{}) (bool, error) {
	if !c.loadHit {
		return false, nil
	}
	if output, ok := target.(*[]model.SearchResult); ok {
		*output = append([]model.SearchResult(nil), c.results...)
	}
	return true, nil
}

func (c *staticSearchCache) Store(_ string, _ string, _ string, _ interface{}) {}

func (c *staticSearchCache) Close(_ context.Context) error {
	return nil
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
