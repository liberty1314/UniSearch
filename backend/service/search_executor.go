package service

import (
	"sync"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util/cache"
	"unisearch/util/pool"
)

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

	cacheKey := cache.GenerateTGCacheKey(keyword)
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
	pluginSelector PluginSelector
	searchCache    SearchCache
	metrics        *SearchMetricsRecorder
	pluginLocks    sync.Map
}

func newPluginSearchExecutor(pluginSelector PluginSelector, searchCache SearchCache, metrics *SearchMetricsRecorder) PluginSearchExecutor {
	return &pluginSearchExecutor{
		pluginSelector: pluginSelector,
		searchCache:    searchCache,
		metrics:        metrics,
	}
}

type pluginTaskResult struct {
	name    string
	results []model.SearchResult
	err     error
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
	availablePluginNames := make([]string, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		availablePluginNames = append(availablePluginNames, p.Name())
	}

	cacheKey := cache.GeneratePluginCacheKey(keyword, availablePluginNames)
	if !forceRefresh {
		var cachedResults []model.SearchResult
		cacheHit, _ := e.searchCache.Load("plugin", cacheKey, keyword, &cachedResults)
		if cacheHit {
			return cachedResults, nil, nil
		}
	}

	if len(availablePlugins) == 0 {
		return []model.SearchResult{}, nil, nil
	}

	effectivePluginWorkers := calculatePluginWorkerCount(concurrency, len(availablePlugins))
	pluginTimeout := 30 * time.Second
	if config.AppConfig != nil && config.AppConfig.PluginTimeout > 0 {
		pluginTimeout = config.AppConfig.PluginTimeout
	}

	tasks := make([]pool.Task, 0, len(availablePlugins))
	for _, p := range availablePlugins {
		currentPlugin := p
		tasks = append(tasks, func() interface{} {
			pluginLock := e.lockForPlugin(currentPlugin.Name())
			pluginLock.Lock()
			defer pluginLock.Unlock()

			currentPlugin.SetMainCacheKey(cacheKey)
			currentPlugin.SetCurrentKeyword(keyword)

			results, searchErr := currentPlugin.Search(keyword, ext)
			if searchErr != nil {
				return pluginTaskResult{
					name: currentPlugin.Name(),
					err:  searchErr,
				}
			}
			return pluginTaskResult{
				name:    currentPlugin.Name(),
				results: results,
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

	for _, result := range results {
		if result == nil {
			continue
		}
		taskResult := result.(pluginTaskResult)
		if taskResult.err != nil {
			warnings = append(warnings, model.SearchSourceWarning{
				Source:  taskResult.name,
				Message: "该搜索源暂时不可用，已返回其他来源结果",
			})
			continue
		}
		for _, pluginResult := range taskResult.results {
			if len(pluginResult.Links) > 0 {
				allResults = append(allResults, pluginResult)
			}
		}
	}

	e.searchCache.Store("plugin", cacheKey, keyword, allResults)
	return allResults, warnings, nil
}

func (e *pluginSearchExecutor) lockForPlugin(name string) *sync.Mutex {
	lock, _ := e.pluginLocks.LoadOrStore(name, &sync.Mutex{})
	return lock.(*sync.Mutex)
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
	if maxBackgroundWorkers > effectiveWorkers {
		effectiveWorkers = maxBackgroundWorkers
	}
	if pluginCount < effectiveWorkers {
		effectiveWorkers = pluginCount
	}

	return effectiveWorkers
}
