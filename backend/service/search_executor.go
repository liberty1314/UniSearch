package service

import (
	"sync"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util/cache"
	"unisearch/util/pool"
)

const pluginRuntimeConfigSnapshotExtKey = "_plugin_runtime_configs"

type ChannelSearcher func(keyword string, channel string) ([]model.SearchResult, error)

type TGSearchExecutor interface {
	Search(keyword string, channels []string, forceRefresh bool) ([]model.SearchResult, error)
}

type PluginSearchExecutor interface {
	Search(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) ([]model.SearchResult, []model.SearchSourceWarning, error)
}

type tgSearchExecutor struct {
	searchCache     SearchCache
	metrics         *SearchMetricsRecorder
	channelSearcher ChannelSearcher
}

func newTGSearchExecutor(searchCache SearchCache, metrics *SearchMetricsRecorder, channelSearcher ChannelSearcher) TGSearchExecutor {
	return &tgSearchExecutor{
		searchCache:     searchCache,
		metrics:         metrics,
		channelSearcher: channelSearcher,
	}
}

func (e *tgSearchExecutor) Search(keyword string, channels []string, forceRefresh bool) (results []model.SearchResult, err error) {
	startedAt := time.Now()
	defer func() {
		e.metrics.RecordSearch("tg", keyword, time.Since(startedAt), len(results), err)
	}()

	cacheKey := cache.GenerateTGCacheKey(keyword, channels)
	if !forceRefresh {
		var cachedResults []model.SearchResult
		cacheHit, _ := e.searchCache.Load("tg", cacheKey, keyword, &cachedResults)
		if cacheHit {
			return cachedResults, nil
		}
	}

	tasks := make([]pool.Task, 0, len(channels))
	for _, channel := range channels {
		ch := channel
		tasks = append(tasks, func() interface{} {
			channelResults, searchErr := e.channelSearcher(keyword, ch)
			if searchErr != nil {
				return nil
			}
			return channelResults
		})
	}

	taskResults := pool.ExecuteBatchWithTimeout(tasks, len(channels), config.AppConfig.PluginTimeout)
	for _, result := range taskResults {
		if result != nil {
			results = append(results, result.([]model.SearchResult)...)
		}
	}

	e.searchCache.Store("tg", cacheKey, keyword, results)
	return results, nil
}

type pluginSearchExecutor struct {
	pluginSelector      *searchPluginSelector
	searchCache         SearchCache
	metrics             *SearchMetricsRecorder
	pluginLocks         *sync.Map
	pluginHealthService *PluginHealthService
	pluginRuntimeConfig *PluginRuntimeConfigService
	pluginMetrics       *PluginMetricsCollector
	pluginCircuit       *PluginCircuitBreakerService
}

func newPluginSearchExecutor(pluginSelector *searchPluginSelector, searchCache SearchCache, metrics *SearchMetricsRecorder, pluginLocks *sync.Map, pluginHealthService *PluginHealthService, pluginRuntimeConfig ...*PluginRuntimeConfigService) PluginSearchExecutor {
	return newPluginSearchExecutorWithMetrics(pluginSelector, searchCache, metrics, pluginLocks, pluginHealthService, nil, nil, pluginRuntimeConfig...)
}

func newPluginSearchExecutorWithMetrics(pluginSelector *searchPluginSelector, searchCache SearchCache, metrics *SearchMetricsRecorder, pluginLocks *sync.Map, pluginHealthService *PluginHealthService, pluginMetrics *PluginMetricsCollector, pluginCircuit *PluginCircuitBreakerService, pluginRuntimeConfig ...*PluginRuntimeConfigService) PluginSearchExecutor {
	if pluginLocks == nil {
		pluginLocks = &sync.Map{}
	}
	var runtimeConfig *PluginRuntimeConfigService
	if len(pluginRuntimeConfig) > 0 {
		runtimeConfig = pluginRuntimeConfig[0]
	}
	return &pluginSearchExecutor{
		pluginSelector:      pluginSelector,
		searchCache:         searchCache,
		metrics:             metrics,
		pluginLocks:         pluginLocks,
		pluginHealthService: pluginHealthService,
		pluginRuntimeConfig: runtimeConfig,
		pluginMetrics:       pluginMetrics,
		pluginCircuit:       pluginCircuit,
	}
}

type pluginTaskResult struct {
	name               string
	results            []model.SearchResult
	isFinal            bool
	err                error
	duration           time.Duration
	concurrentRequests int
}

func (e *pluginSearchExecutor) Search(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) (allResults []model.SearchResult, warnings []model.SearchSourceWarning, err error) {
	startedAt := time.Now()
	defer func() {
		e.metrics.RecordSearch("plugin", keyword, time.Since(startedAt), len(allResults), err)
	}()

	if ext == nil {
		ext = make(map[string]interface{})
	}

	availablePlugins := e.pluginSelector.ResolvePlugins(plugins)
	filteredPlugins := make([]plugin.AsyncSearchPlugin, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		if e.pluginCircuit == nil {
			filteredPlugins = append(filteredPlugins, p)
			continue
		}
		allowed, state := e.pluginCircuit.ShouldAllowRequest(p.Name())
		if allowed {
			filteredPlugins = append(filteredPlugins, p)
			continue
		}
		warnings = append(warnings, buildPluginHealthWarning(p.Name(), state))
		e.recordPluginMetric(PluginMetricEvent{
			PluginName:   p.Name(),
			Keyword:      keyword,
			Success:      false,
			ErrorType:    "circuit_open",
			ErrorMessage: "插件已临时熔断",
			OccurredAt:   time.Now(),
		})
	}
	availablePlugins = filteredPlugins
	availablePluginNames := make([]string, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		availablePluginNames = append(availablePluginNames, p.Name())
	}
	runtimeConfigs := e.runtimeConfigsForPlugins(availablePlugins)
	if len(runtimeConfigs) > 0 {
		nextExt := make(map[string]interface{}, len(ext)+1)
		for key, value := range ext {
			nextExt[key] = value
		}
		nextExt[pluginRuntimeConfigSnapshotExtKey] = runtimeConfigs
		ext = nextExt
	}

	cacheKey := cache.GeneratePluginCacheKey(keyword, availablePluginNames, ext)
	if !forceRefresh {
		var cachedResults []model.SearchResult
		cacheHit, _ := e.searchCache.Load("plugin", cacheKey, keyword, &cachedResults)
		if cacheHit {
			for _, pluginName := range availablePluginNames {
				e.recordPluginMetric(PluginMetricEvent{
					PluginName: pluginName,
					Keyword:    keyword,
					Success:    true,
					CacheHit:   true,
					OccurredAt: time.Now(),
				})
			}
			return cachedResults, nil, nil
		}
	}

	if len(availablePlugins) == 0 {
		return []model.SearchResult{}, warnings, nil
	}

	effectivePluginWorkers := calculatePluginWorkerCount(concurrency, len(availablePlugins))
	pluginTimeout := 10 * time.Second // 优化：从 30 秒降至 10 秒
	if config.AppConfig != nil && config.AppConfig.PluginTimeout > 0 {
		pluginTimeout = config.AppConfig.PluginTimeout
	}
	timeoutCalculator := newAdaptiveTimeoutCalculator(e.pluginHealthService)

	tasks := make([]pool.Task, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		currentPlugin := p
		tasks = append(tasks, func() interface{} {
			finishPluginRequest := e.beginPluginMetricRequest(currentPlugin.Name())
			defer finishPluginRequest()
			concurrentRequests := e.currentPluginMetricConcurrency(currentPlugin.Name())

			startedAt := time.Now()
			result, searchErr := e.searchPluginWithTimeout(currentPlugin, keyword, e.extForPlugin(ext, currentPlugin), cacheKey, timeoutCalculator.CalculateTimeout(currentPlugin.Name()))
			duration := time.Since(startedAt)
			if searchErr != nil {
				return pluginTaskResult{
					name:               currentPlugin.Name(),
					err:                searchErr,
					duration:           duration,
					concurrentRequests: concurrentRequests,
				}
			}
			return pluginTaskResult{
				name:               currentPlugin.Name(),
				results:            result.GetResults(),
				isFinal:            result.IsFinal,
				duration:           duration,
				concurrentRequests: concurrentRequests,
			}
		})
	}

	results, submittedTasks, timedOut := pool.ExecuteBatchWithTimeoutDetailed(tasks, effectivePluginWorkers, pluginTimeout)
	if timedOut {
		warnings = append(warnings, model.SearchSourceWarning{
			Source:  "plugin",
			Message: "部分搜索源响应超时，已返回其他来源结果",
		})
		logSearchEvent("plugin_timeout", map[string]interface{}{
			"keyword":         keyword,
			"submitted_tasks": submittedTasks,
			"collected_tasks": len(results),
			"total_tasks":     len(tasks),
			"worker_count":    effectivePluginWorkers,
			"timeout_seconds": pluginTimeout.Seconds(),
		})
	}

	allPluginResultsFinal := true
	completedPluginNames := make(map[string]struct{}, len(results))
	for _, result := range results {
		if result == nil {
			continue
		}
		taskResult := result.(pluginTaskResult)
		completedPluginNames[taskResult.name] = struct{}{}
		if taskResult.err != nil {
			source := "search_failure"
			errorType := "search_failure"
			timeout := false
			message := taskResult.err.Error()
			warningMessage := "该搜索源暂时不可用，已返回其他来源结果"
			if isPluginSearchTimeout(taskResult.err) {
				source = "timeout"
				errorType = "timeout"
				timeout = true
				warningMessage = "该搜索源响应超时，已返回其他来源结果"
				e.metrics.RecordTimeout("plugin", taskResult.name, keyword, message)
			}
			warnings = append(warnings, model.SearchSourceWarning{
				Source:  taskResult.name,
				Message: warningMessage,
			})
			e.recordPluginHealth(taskResult.name, false, message, source)
			e.recordPluginMetric(PluginMetricEvent{
				PluginName:         taskResult.name,
				Keyword:            keyword,
				Duration:           taskResult.duration,
				Success:            false,
				Timeout:            timeout,
				ErrorType:          errorType,
				ErrorMessage:       message,
				ConcurrentRequests: taskResult.concurrentRequests,
				OccurredAt:         time.Now(),
			})
			continue
		}
		e.recordPluginHealth(taskResult.name, true, "", "search_failure")
		e.recordPluginMetric(PluginMetricEvent{
			PluginName:         taskResult.name,
			Keyword:            keyword,
			Duration:           taskResult.duration,
			Success:            true,
			ResultCount:        len(taskResult.results),
			ConcurrentRequests: taskResult.concurrentRequests,
			OccurredAt:         time.Now(),
		})
		if !taskResult.isFinal {
			allPluginResultsFinal = false
		}
		for _, pluginResult := range taskResult.results {
			if len(pluginResult.Links) > 0 {
				allResults = append(allResults, pluginResult)
			}
		}
	}

	if allPluginResultsFinal {
		e.searchCache.Store("plugin", cacheKey, keyword, allResults)
	}
	if timedOut {
		for _, currentPlugin := range availablePlugins {
			pluginName := currentPlugin.Name()
			if _, ok := completedPluginNames[pluginName]; !ok {
				e.metrics.RecordTimeout("plugin", pluginName, keyword, "插件搜索超时")
				e.recordPluginHealth(pluginName, false, "插件搜索超时", "timeout")
				e.recordPluginMetric(PluginMetricEvent{
					PluginName:         pluginName,
					Keyword:            keyword,
					Duration:           pluginTimeout,
					Success:            false,
					Timeout:            true,
					ErrorType:          "timeout",
					ErrorMessage:       "插件搜索超时",
					ConcurrentRequests: e.currentPluginMetricConcurrency(pluginName),
					OccurredAt:         time.Now(),
				})
			}
		}
	}
	return allResults, warnings, nil
}

func (e *pluginSearchExecutor) searchPluginWithTimeout(currentPlugin plugin.AsyncSearchPlugin, keyword string, ext map[string]interface{}, cacheKey string, timeout time.Duration) (model.PluginSearchResult, error) {
	search := func() (model.PluginSearchResult, error) {
		pluginLock := e.lockForPlugin(currentPlugin.Name())
		pluginLock.Lock()
		defer pluginLock.Unlock()

		currentPlugin.SetMainCacheKey(cacheKey)
		currentPlugin.SetCurrentKeyword(keyword)
		return currentPlugin.SearchWithResult(keyword, ext)
	}
	if timeout <= 0 {
		return search()
	}
	resultCh := make(chan pluginSearchCallResult, 1)
	go func() {
		result, err := search()
		resultCh <- pluginSearchCallResult{result: result, err: err}
	}()

	select {
	case result := <-resultCh:
		return result.result, result.err
	case <-time.After(timeout):
		return model.PluginSearchResult{}, errPluginSearchTimeout{}
	}
}

func (e *pluginSearchExecutor) beginPluginMetricRequest(pluginName string) func() {
	if e == nil || e.pluginMetrics == nil {
		return func() {}
	}
	return e.pluginMetrics.BeginPluginRequest(pluginName)
}

func (e *pluginSearchExecutor) currentPluginMetricConcurrency(pluginName string) int {
	if e == nil || e.pluginMetrics == nil {
		return 0
	}
	return e.pluginMetrics.currentConcurrentRequests(pluginName)
}

func (e *pluginSearchExecutor) recordPluginMetric(event PluginMetricEvent) {
	if e == nil || e.pluginMetrics == nil {
		return
	}
	e.pluginMetrics.RecordEvent(event)
}

func (e *pluginSearchExecutor) extForPlugin(ext map[string]interface{}, currentPlugin plugin.AsyncSearchPlugin) map[string]interface{} {
	nextExt := make(map[string]interface{}, len(ext)+1)
	for key, value := range ext {
		nextExt[key] = value
	}
	if snapshots, ok := ext[pluginRuntimeConfigSnapshotExtKey].(map[string]map[string]interface{}); ok {
		if config, exists := snapshots[currentPlugin.Name()]; exists {
			nextExt[PluginRuntimeConfigExtKey] = config
			return nextExt
		}
	}
	if e.pluginRuntimeConfig == nil || currentPlugin == nil {
		return nextExt
	}
	config, err := e.pluginRuntimeConfig.GetConfig(currentPlugin.Name(), plugin.ResolvePluginManifest(currentPlugin))
	if err != nil {
		return nextExt
	}
	nextExt[PluginRuntimeConfigExtKey] = config
	return nextExt
}

func (e *pluginSearchExecutor) runtimeConfigsForPlugins(plugins []plugin.AsyncSearchPlugin) map[string]map[string]interface{} {
	if e.pluginRuntimeConfig == nil || len(plugins) == 0 {
		return nil
	}
	result := make(map[string]map[string]interface{}, len(plugins))
	for _, currentPlugin := range plugins {
		config, err := e.pluginRuntimeConfig.GetConfig(currentPlugin.Name(), plugin.ResolvePluginManifest(currentPlugin))
		if err != nil {
			continue
		}
		result[currentPlugin.Name()] = config
	}
	return result
}

func (e *pluginSearchExecutor) lockForPlugin(name string) *sync.Mutex {
	lock, _ := e.pluginLocks.LoadOrStore(name, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

func (e *pluginSearchExecutor) recordPluginHealth(pluginName string, healthy bool, message string, source string) {
	if e.pluginCircuit != nil {
		_ = e.pluginCircuit.RecordResultWithSource(pluginName, healthy, message, source)
		return
	}
	if e.pluginHealthService == nil {
		return
	}
	if err := e.pluginHealthService.RecordResult(pluginName, healthy, message, source); err != nil {
		logSearchEvent("plugin_health_record_failed", map[string]interface{}{
			"plugin": pluginName,
			"source": source,
			"error":  err.Error(),
		})
	}
}

type pluginSearchCallResult struct {
	result model.PluginSearchResult
	err    error
}

type errPluginSearchTimeout struct{}

func (errPluginSearchTimeout) Error() string {
	return "插件搜索超时"
}

func isPluginSearchTimeout(err error) bool {
	_, ok := err.(errPluginSearchTimeout)
	return ok
}

func calculatePluginWorkerCount(concurrency int, pluginCount int) int {
	if pluginCount <= 0 {
		return 0
	}

	if concurrency <= 0 {
		if config.AppConfig != nil && config.AppConfig.DefaultConcurrency > 0 {
			concurrency = config.AppConfig.DefaultConcurrency
		} else {
			concurrency = 1
		}
	}

	maxBackgroundWorkers := concurrency
	if config.AppConfig != nil && config.AppConfig.AsyncMaxBackgroundWorkers > 0 {
		maxBackgroundWorkers = config.AppConfig.AsyncMaxBackgroundWorkers
	}

	effectiveWorkers := concurrency
	if maxBackgroundWorkers < effectiveWorkers {
		effectiveWorkers = maxBackgroundWorkers
	}
	if pluginCount < effectiveWorkers {
		effectiveWorkers = pluginCount
	}

	return effectiveWorkers
}
