package service

import (
	"sort"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
)

// 本文件负责搜索结果的评分、排序，以及插件优先级元数据的读取与缓存。

var priorityKeywords = []string{"合集", "系列", "全", "完", "最新", "附", "complete"}

// ResultScore 保存单条结果的多维评分。
type ResultScore struct {
	Result       model.SearchResult
	TimeScore    float64
	KeywordScore int
	PluginScore  int
	TotalScore   float64
}

var pluginLevelCache sync.Map
var pluginMetadataCache = struct {
	mu           sync.RWMutex
	priorities   map[string]int
	skipFilters  map[string]bool
	registrySize int
}{}

func filterResultsForDisplay(results []model.SearchResult) []model.SearchResult {
	filtered := make([]model.SearchResult, 0, len(results))
	for _, result := range results {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)

		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filtered = append(filtered, result)
		}
	}
	return filtered
}

func sortResultsByTimeAndKeywords(results []model.SearchResult) {
	scores := make([]ResultScore, len(results))

	for i, result := range results {
		source := getResultSource(result)
		scores[i] = ResultScore{
			Result:       result,
			TimeScore:    calculateTimeScore(result.Datetime),
			KeywordScore: getKeywordPriority(result.Title),
			PluginScore:  getPluginLevelScore(source),
		}
		scores[i].TotalScore = scores[i].TimeScore +
			float64(scores[i].KeywordScore) +
			float64(scores[i].PluginScore)
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].TotalScore > scores[j].TotalScore
	})

	for i, score := range scores {
		results[i] = score.Result
	}
}

func getKeywordPriority(title string) int {
	title = strings.ToLower(title)
	for i, keyword := range priorityKeywords {
		if strings.Contains(title, keyword) {
			return (len(priorityKeywords) - i) * 70
		}
	}
	return 0
}

func getResultSource(result model.SearchResult) string {
	if result.Channel != "" {
		return "tg:" + result.Channel
	}
	if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
		parts := strings.SplitN(result.UniqueID, "-", 2)
		if len(parts) >= 1 {
			return "plugin:" + parts[0]
		}
	}
	return "unknown"
}

func getPluginLevelBySource(source string) int {
	if level, ok := pluginLevelCache.Load(source); ok {
		return level.(int)
	}

	parts := strings.Split(source, ":")
	if len(parts) != 2 {
		pluginLevelCache.Store(source, 3)
		return 3
	}
	if parts[0] == "tg" {
		pluginLevelCache.Store(source, 3)
		return 3
	}
	if parts[0] == "plugin" {
		level := getPluginPriorityByName(parts[1])
		pluginLevelCache.Store(source, level)
		return level
	}

	pluginLevelCache.Store(source, 3)
	return 3
}

func getPluginPriorityByName(pluginName string) int {
	priorities, _ := getPluginMetadata()
	if priority, exists := priorities[pluginName]; exists {
		return priority
	}
	return 3
}

func getPluginLevelScore(source string) int {
	switch getPluginLevelBySource(source) {
	case 1:
		return 1000
	case 2:
		return 500
	case 3:
		return 0
	case 4:
		return -200
	default:
		return 0
	}
}

func calculateTimeScore(datetime time.Time) float64 {
	if datetime.IsZero() {
		return 0
	}

	daysDiff := time.Since(datetime).Hours() / 24
	switch {
	case daysDiff <= 1:
		return 500
	case daysDiff <= 3:
		return 400
	case daysDiff <= 7:
		return 300
	case daysDiff <= 30:
		return 200
	case daysDiff <= 90:
		return 100
	case daysDiff <= 365:
		return 50
	default:
		return 20
	}
}

func getPluginMetadata() (map[string]int, map[string]bool) {
	plugins := plugin.GetRegisteredPlugins()

	pluginMetadataCache.mu.RLock()
	if pluginMetadataCache.priorities != nil && pluginMetadataCache.registrySize == len(plugins) {
		priorities := pluginMetadataCache.priorities
		skipFilters := pluginMetadataCache.skipFilters
		pluginMetadataCache.mu.RUnlock()
		return priorities, skipFilters
	}
	pluginMetadataCache.mu.RUnlock()

	priorities := make(map[string]int, len(plugins))
	skipFilters := make(map[string]bool, len(plugins))
	for _, registeredPlugin := range plugins {
		priorities[registeredPlugin.Name()] = registeredPlugin.Priority()
		skipFilters[registeredPlugin.Name()] = registeredPlugin.SkipServiceFilter()
	}

	pluginMetadataCache.mu.Lock()
	pluginMetadataCache.priorities = priorities
	pluginMetadataCache.skipFilters = skipFilters
	pluginMetadataCache.registrySize = len(plugins)
	pluginMetadataCache.mu.Unlock()

	return priorities, skipFilters
}

func shouldSkipKeywordFilter(result model.SearchResult) bool {
	if result.UniqueID == "" || !strings.Contains(result.UniqueID, "-") {
		return false
	}

	parts := strings.SplitN(result.UniqueID, "-", 2)
	if len(parts) == 0 {
		return false
	}

	_, skipFilters := getPluginMetadata()
	return skipFilters[parts[0]]
}
