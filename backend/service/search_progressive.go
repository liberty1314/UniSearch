package service

import (
	"context"
	"errors"
	"sync"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util/cache"
)

type SearchProgressiveEmitter func(model.SearchProgressiveEvent) error

type progressiveSourceResult struct {
	source   string
	results  []model.SearchResult
	warnings []model.SearchSourceWarning
	err      error
}

// SearchProgressive 按来源逐步返回搜索结果，最终 complete 事件与 /api/search 响应同形。
func (s *SearchService) SearchProgressive(ctx context.Context, req model.SearchRequest, emit SearchProgressiveEmitter) error {
	if emit == nil {
		return errors.New("渐进式搜索事件发送器不能为空")
	}
	s.ensureSearchDependencies()

	normalized := s.normalizer.Normalize(
		req.Keyword,
		req.Channels,
		req.Concurrency,
		req.ForceRefresh,
		req.ResultType,
		req.SourceType,
		req.Plugins,
		req.CloudTypes,
		req.Ext,
	)
	normalized.Plugins = s.pluginSelector.NormalizeRequestedPlugins(normalized.SourceType, normalized.Plugins)
	s.metrics.RecordKeyword(normalized.Keyword)

	availablePlugins := []plugin.AsyncSearchPlugin{}
	if normalized.SourceType == "all" || normalized.SourceType == "plugin" {
		availablePlugins = s.pluginSelector.ResolvePlugins(normalized.Plugins)
	}

	totalSources := len(availablePlugins)
	if normalized.SourceType == "all" || normalized.SourceType == "tg" {
		if len(normalized.Channels) > 0 {
			totalSources++
		}
	}

	if err := emit(model.SearchProgressiveEvent{
		Type:         "started",
		Keyword:      normalized.Keyword,
		TotalSources: totalSources,
		Message:      "搜索已开始",
	}); err != nil {
		return err
	}

	startedAt := time.Now()
	resultCh := make(chan progressiveSourceResult, maxInt(totalSources, 1))
	var wg sync.WaitGroup

	if normalized.SourceType == "all" || normalized.SourceType == "tg" {
		if len(normalized.Channels) > 0 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				results, err := s.searchTG(normalized.Keyword, normalized.Channels, normalized.ForceRefresh)
				resultCh <- progressiveSourceResult{
					source:  "tg",
					results: results,
					err:     err,
				}
			}()
		}
	}

	if normalized.SourceType == "all" || normalized.SourceType == "plugin" {
		s.startProgressivePluginTasks(ctx, normalized, availablePlugins, resultCh, &wg)
	}

	go func() {
		wg.Wait()
		close(resultCh)
	}()

	completedSources := 0
	receivedBatches := 0
	collectedResults := []model.SearchResult{}
	collectedWarnings := []model.SearchSourceWarning{}

	for sourceResult := range resultCh {
		if sourceResult.err != nil {
			collectedWarnings = append(collectedWarnings, model.SearchSourceWarning{
				Source:  sourceResult.source,
				Message: "该搜索源暂时不可用，已返回其他来源结果",
			})
		}
		collectedWarnings = append(collectedWarnings, sourceResult.warnings...)
		collectedResults = s.resultMerger.Merge(collectedResults, filterLinkedResults(sourceResult.results))
		completedSources++
		receivedBatches++

		currentResponse := s.responseBuilder.Build(collectedResults, normalized)
		currentResponse.Warnings = append([]model.SearchSourceWarning(nil), collectedWarnings...)
		if len(sourceResult.warnings) > 0 || sourceResult.err != nil {
			if err := emit(model.SearchProgressiveEvent{
				Type:             "warning",
				Keyword:          normalized.Keyword,
				Source:           sourceResult.source,
				Warnings:         append([]model.SearchSourceWarning(nil), currentResponse.Warnings...),
				CompletedSources: completedSources,
				TotalSources:     totalSources,
				ReceivedBatches:  receivedBatches,
				Message:          "部分来源返回异常",
			}); err != nil {
				return err
			}
		}
		if err := emit(model.SearchProgressiveEvent{
			Type:             "batch",
			Keyword:          normalized.Keyword,
			Source:           sourceResult.source,
			Resources:        currentResponse.Resources,
			Warnings:         currentResponse.Warnings,
			CompletedSources: completedSources,
			TotalSources:     totalSources,
			ReceivedBatches:  receivedBatches,
			IsFinal:          completedSources == totalSources,
		}); err != nil {
			return err
		}
	}

	finalResponse := s.responseBuilder.Build(collectedResults, normalized)
	finalResponse.Warnings = append([]model.SearchSourceWarning(nil), collectedWarnings...)
	s.metrics.RecordWarning(len(collectedWarnings))
	s.metrics.RecordSearch("progressive", normalized.Keyword, time.Since(startedAt), finalResponse.Total, nil)

	return emit(model.SearchProgressiveEvent{
		Type:             "complete",
		Keyword:          normalized.Keyword,
		Resources:        finalResponse.Resources,
		Warnings:         finalResponse.Warnings,
		CompletedSources: completedSources,
		TotalSources:     totalSources,
		ReceivedBatches:  receivedBatches,
		IsFinal:          true,
		Response:         &finalResponse,
	})
}

func (s *SearchService) ensureSearchDependencies() {
	if s.searchCache == nil {
		s.searchCache = newSearchCache(s.cache, s.metrics)
	}
	if s.responseBuilder == nil {
		s.responseBuilder = newSearchResponseBuilder()
	}
	if s.resultMerger == nil {
		s.resultMerger = newResultMerger()
	}
	if s.normalizer == nil {
		s.normalizer = newSearchRequestNormalizer()
	}
	if s.pluginSelector == nil {
		s.pluginSelector = newPluginSelector(s.pluginManager, s.pluginStateService)
	}
	if s.tgExecutor == nil {
		s.tgExecutor = newTGSearchExecutor(s.searchCache, s.metrics, s.searchChannel)
	}
	if s.pluginExecutor == nil {
		s.pluginExecutor = newPluginSearchExecutor(s.pluginSelector, s.searchCache, s.metrics, &s.pluginLocks, s.pluginHealth)
	}
}

func (s *SearchService) startProgressivePluginTasks(ctx context.Context, normalized NormalizedSearchRequest, plugins []plugin.AsyncSearchPlugin, resultCh chan<- progressiveSourceResult, wg *sync.WaitGroup) {
	if len(plugins) == 0 {
		return
	}

	pluginNames := make([]string, 0, len(plugins))
	for _, currentPlugin := range plugins {
		pluginNames = append(pluginNames, currentPlugin.Name())
	}

	cacheKey := cache.GeneratePluginCacheKey(normalized.Keyword, pluginNames, normalized.Ext)
	workerCount := calculatePluginWorkerCount(normalized.Concurrency, len(plugins))
	if workerCount <= 0 {
		workerCount = 1
	}
	sem := make(chan struct{}, workerCount)
	pluginTimeout := effectivePluginTimeout()

	for _, p := range plugins {
		currentPlugin := p
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
				defer func() { <-sem }()
			case <-ctx.Done():
				resultCh <- progressiveSourceResult{source: currentPlugin.Name(), err: ctx.Err()}
				return
			}

			done := make(chan progressiveSourceResult, 1)
			go func() {
				results, err := s.searchSinglePlugin(currentPlugin, normalized.Keyword, normalized.Ext, cacheKey)
				done <- progressiveSourceResult{
					source:  currentPlugin.Name(),
					results: results,
					err:     err,
				}
			}()

			select {
			case result := <-done:
				if result.err != nil {
					s.recordPluginHealth(currentPlugin.Name(), false, result.err.Error(), "search_failure")
				} else {
					s.recordPluginHealth(currentPlugin.Name(), true, "", "search_failure")
				}
				resultCh <- result
			case <-time.After(pluginTimeout):
				message := "插件搜索超时"
				pluginName := currentPlugin.Name()
				s.metrics.RecordTimeout("plugin", pluginName, normalized.Keyword, message)
				s.recordPluginHealth(pluginName, false, message, "timeout")
				resultCh <- progressiveSourceResult{
					source: pluginName,
					warnings: []model.SearchSourceWarning{{
						Source:  pluginName,
						Message: "该搜索源响应超时，已返回其他来源结果",
					}},
				}
			case <-ctx.Done():
				resultCh <- progressiveSourceResult{source: currentPlugin.Name(), err: ctx.Err()}
			}
		}()
	}
}

func (s *SearchService) searchSinglePlugin(currentPlugin plugin.AsyncSearchPlugin, keyword string, ext map[string]interface{}, cacheKey string) ([]model.SearchResult, error) {
	pluginLock := s.lockForPlugin(currentPlugin.Name())
	pluginLock.Lock()
	defer pluginLock.Unlock()

	currentPlugin.SetMainCacheKey(cacheKey)
	currentPlugin.SetCurrentKeyword(keyword)

	result, err := currentPlugin.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.GetResults(), nil
}

func (s *SearchService) lockForPlugin(name string) *sync.Mutex {
	lock, _ := s.pluginLocks.LoadOrStore(name, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

func (s *SearchService) recordPluginHealth(pluginName string, healthy bool, message string, source string) {
	if s.pluginHealth == nil {
		return
	}
	_ = s.pluginHealth.RecordResult(pluginName, healthy, message, source)
}

func filterLinkedResults(results []model.SearchResult) []model.SearchResult {
	filtered := make([]model.SearchResult, 0, len(results))
	for _, result := range results {
		if len(result.Links) > 0 {
			filtered = append(filtered, result)
		}
	}
	return filtered
}

func effectivePluginTimeout() time.Duration {
	if config.AppConfig != nil && config.AppConfig.PluginTimeout > 0 {
		return config.AppConfig.PluginTimeout
	}
	return 30 * time.Second
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
