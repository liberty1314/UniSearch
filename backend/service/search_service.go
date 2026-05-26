package service

import (
	"context"
	"io/ioutil"
	"net/http"
	"time"

	"sync"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"
	"unisearch/util/cache"
)

// SearchService 搜索服务
type SearchService struct {
	pluginManager      *plugin.PluginManager
	cache              *cache.RedisCache // Redis 缓存客户端
	pluginStateService *PluginStateService
	normalizer         SearchRequestNormalizer
	pluginSelector     PluginSelector
	resultMerger       ResultMerger
	responseBuilder    SearchResponseBuilder
	searchCache        SearchCache
	tgExecutor         TGSearchExecutor
	pluginExecutor     PluginSearchExecutor
	metrics            *SearchMetricsRecorder
}

// NewSearchService 创建搜索服务实例
// 参数:
//   - pluginManager: 插件管理器
//   - redisCache: Redis 缓存客户端实例
//
// 返回:
//   - *SearchService: 搜索服务实例
func NewSearchService(pluginManager *plugin.PluginManager, redisCache *cache.RedisCache, pluginStateService *PluginStateService) *SearchService {
	metrics := newSearchMetricsRecorder()
	service := &SearchService{
		pluginManager:      pluginManager,
		cache:              redisCache,
		pluginStateService: pluginStateService,
		normalizer:         newSearchRequestNormalizer(),
		pluginSelector:     newPluginSelector(pluginManager, pluginStateService),
		resultMerger:       newResultMerger(),
		responseBuilder:    newSearchResponseBuilder(),
		metrics:            metrics,
		searchCache:        newSearchCache(redisCache, metrics),
	}
	service.tgExecutor = newTGSearchExecutor(service.searchCache, service.metrics, service.searchChannel)
	service.pluginExecutor = newPluginSearchExecutor(service.pluginSelector, service.searchCache, service.metrics)
	return service
}

// Search 执行搜索
func (s *SearchService) Search(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) (model.SearchResponse, error) {
	if s.searchCache == nil {
		s.searchCache = newSearchCache(s.cache, s.metrics)
	}
	if s.responseBuilder == nil {
		s.responseBuilder = newSearchResponseBuilder()
	}
	if s.tgExecutor == nil {
		s.tgExecutor = newTGSearchExecutor(s.searchCache, s.metrics, s.searchChannel)
	}
	if s.pluginExecutor == nil {
		s.pluginExecutor = newPluginSearchExecutor(s.pluginSelector, s.searchCache, s.metrics)
	}

	normalized := s.normalizer.Normalize(keyword, channels, concurrency, forceRefresh, resultType, sourceType, plugins, cloudTypes, ext)
	normalized.Plugins = s.pluginSelector.NormalizeRequestedPlugins(normalized.SourceType, normalized.Plugins)
	s.metrics.RecordKeyword(normalized.Keyword)

	startedAt := time.Now()

	// 并行获取TG搜索和插件搜索结果
	var tgResults []model.SearchResult
	var pluginResults []model.SearchResult
	var pluginWarnings []model.SearchSourceWarning

	var wg sync.WaitGroup
	var tgErr, pluginErr error

	// 如果需要搜索TG
	if normalized.SourceType == "all" || normalized.SourceType == "tg" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tgResults, tgErr = s.searchTG(normalized.Keyword, normalized.Channels, normalized.ForceRefresh)
		}()
	}
	// 如果需要搜索插件
	if normalized.SourceType == "all" || normalized.SourceType == "plugin" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			pluginResults, pluginWarnings, pluginErr = s.searchPlugins(normalized.Keyword, normalized.Plugins, normalized.ForceRefresh, normalized.Concurrency, normalized.Ext)
		}()
	}

	// 等待所有搜索完成
	wg.Wait()

	// 检查错误
	if tgErr != nil {
		return model.SearchResponse{}, tgErr
	}
	if pluginErr != nil {
		return model.SearchResponse{}, pluginErr
	}

	allResults := s.resultMerger.Merge(tgResults, pluginResults)
	response := s.responseBuilder.Build(allResults, normalized)
	response.Warnings = pluginWarnings
	s.metrics.RecordSearch("all", normalized.Keyword, time.Since(startedAt), response.Total, nil)
	return response, nil
}

// 搜索单个频道
func (s *SearchService) searchChannel(keyword string, channel string) ([]model.SearchResult, error) {
	// 构建搜索URL
	url := util.BuildSearchURL(channel, keyword, "")

	// 使用全局HTTP客户端（已配置代理）
	client := util.GetHTTPClient()

	// 创建一个带超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 读取响应体
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 解析响应
	results, _, err := util.ParseSearchResults(string(body), channel)
	if err != nil {
		return nil, err
	}

	return results, nil
}

// searchTG 搜索TG频道
func (s *SearchService) searchTG(keyword string, channels []string, forceRefresh bool) (results []model.SearchResult, err error) {
	if s.tgExecutor == nil {
		s.tgExecutor = newTGSearchExecutor(s.searchCache, s.metrics, s.searchChannel)
	}
	return s.tgExecutor.Search(keyword, channels, forceRefresh)
}

// searchPlugins 搜索插件
func (s *SearchService) searchPlugins(keyword string, plugins []string, forceRefresh bool, concurrency int, ext map[string]interface{}) (allResults []model.SearchResult, warnings []model.SearchSourceWarning, err error) {
	if s.pluginExecutor == nil {
		s.pluginExecutor = newPluginSearchExecutor(s.pluginSelector, s.searchCache, s.metrics)
	}
	return s.pluginExecutor.Search(keyword, plugins, forceRefresh, concurrency, ext)
}

// GetPluginManager 获取插件管理器
func (s *SearchService) GetPluginManager() *plugin.PluginManager {
	return s.pluginManager
}

func (s *SearchService) InvalidatePluginSelectorCache() {
	if s == nil || s.pluginSelector == nil {
		return
	}
	s.pluginSelector.InvalidateCache()
}
