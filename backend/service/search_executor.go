package service

import (
	"log"
	"net/http"
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
	Search(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) ([]model.SearchResult, error)
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
		cacheHit, cacheErr := e.searchCache.Load("tg", cacheKey, keyword, &cachedResults)
		if cacheHit {
			return cachedResults, nil
		}
		if cacheErr != nil {
			log.Printf("⚠️ [TG搜索:%s] Redis 缓存读取失败: %v，降级到数据源查询", keyword, cacheErr)
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
}

func newPluginSearchExecutor(pluginSelector PluginSelector, searchCache SearchCache, metrics *SearchMetricsRecorder) PluginSearchExecutor {
	return &pluginSearchExecutor{
		pluginSelector: pluginSelector,
		searchCache:    searchCache,
		metrics:        metrics,
	}
}

func (e *pluginSearchExecutor) Search(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) (allResults []model.SearchResult, err error) {
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
		cacheHit, cacheErr := e.searchCache.Load("plugin", cacheKey, keyword, &cachedResults)
		if cacheHit {
			return cachedResults, nil
		}
		if cacheErr != nil {
			log.Printf("⚠️ [插件搜索] Redis 缓存读取失败，降级到直接查询 - 关键词: %s, 错误: %v", keyword, cacheErr)
		}
	}

	if len(availablePlugins) == 0 {
		return []model.SearchResult{}, nil
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
			currentPlugin.SetMainCacheKey(cacheKey)
			currentPlugin.SetCurrentKeyword(keyword)

			results, searchErr := currentPlugin.AsyncSearch(keyword, func(client *http.Client, kw string, extParams map[string]interface{}) ([]model.SearchResult, error) {
				return currentPlugin.Search(kw, extParams)
			}, cacheKey, ext)
			if searchErr != nil {
				return nil
			}
			return results
		})
	}

	results, submittedTasks, timedOut := pool.ExecuteBatchWithTimeoutDetailed(tasks, effectivePluginWorkers, pluginTimeout)
	if timedOut {
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
		for _, pluginResult := range result.([]model.SearchResult) {
			if len(pluginResult.Links) > 0 {
				allResults = append(allResults, pluginResult)
			}
		}
	}

	e.searchCache.Store("plugin", cacheKey, keyword, allResults)
	return allResults, nil
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
