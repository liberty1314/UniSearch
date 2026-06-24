package service

import (
	"sort"
	"sync"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util/logger"
)

type SearchMetricsRecorder struct {
	mu               sync.Mutex
	topKeywords      map[string]int
	cacheHitCount    map[string]int
	cacheMissCount   map[string]int
	searchCount      map[string]int
	searchErrorCount map[string]int
	durationTotalMS  map[string]int64
	resultBuckets    map[string]int
	timeoutCount     int
	warningCount     int
	recentErrors     []model.SearchMetricError
}

func newSearchMetricsRecorder() *SearchMetricsRecorder {
	return &SearchMetricsRecorder{
		topKeywords:      make(map[string]int),
		cacheHitCount:    make(map[string]int),
		cacheMissCount:   make(map[string]int),
		searchCount:      make(map[string]int),
		searchErrorCount: make(map[string]int),
		durationTotalMS:  make(map[string]int64),
		resultBuckets:    make(map[string]int),
		recentErrors:     make([]model.SearchMetricError, 0, 20),
	}
}

func (r *SearchMetricsRecorder) RecordKeyword(keyword string) {
	if keyword == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.topKeywords[keyword]++
}

func (r *SearchMetricsRecorder) RecordCache(scope string, hit bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if hit {
		r.cacheHitCount[scope]++
		return
	}

	r.cacheMissCount[scope]++
}

func (r *SearchMetricsRecorder) RecordSearch(scope string, keyword string, duration time.Duration, resultCount int, err error) {
	r.mu.Lock()
	r.searchCount[scope]++
	r.durationTotalMS[scope] += duration.Milliseconds()
	r.resultBuckets[resultCountBucket(resultCount)]++
	if err != nil {
		r.searchErrorCount[scope]++
		r.appendRecentErrorLocked(scope, "", keyword, err.Error())
	}
	r.mu.Unlock()

	fields := map[string]interface{}{
		"scope":        scope,
		"keyword":      keyword,
		"duration_ms":  duration.Milliseconds(),
		"result_count": resultCount,
		"error_class":  classifySearchError(err),
	}
	if err != nil {
		logSearchEvent("search", fields)
		return
	}
	logSearchEventIfEnabled("search", fields)
}

func (r *SearchMetricsRecorder) RecordWarning(count int) {
	if count <= 0 {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.warningCount += count
}

func (r *SearchMetricsRecorder) RecordTimeout(scope string, pluginName string, keyword string, message string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.timeoutCount++
	r.appendRecentErrorLocked(scope, pluginName, keyword, message)
}

func (r *SearchMetricsRecorder) Snapshot() model.SearchObservabilitySnapshot {
	r.mu.Lock()
	defer r.mu.Unlock()

	searchCount := cloneIntMap(r.searchCount)
	averageDurationMS := make(map[string]int64, len(r.durationTotalMS))
	for scope, total := range r.durationTotalMS {
		count := r.searchCount[scope]
		if count > 0 {
			averageDurationMS[scope] = total / int64(count)
		}
	}

	return model.SearchObservabilitySnapshot{
		SearchCount:       searchCount,
		SearchErrorCount:  cloneIntMap(r.searchErrorCount),
		CacheHitCount:     cloneIntMap(r.cacheHitCount),
		CacheMissCount:    cloneIntMap(r.cacheMissCount),
		CacheHitRate:      cacheHitRateSnapshot(r.cacheHitCount, r.cacheMissCount),
		AverageDurationMS: averageDurationMS,
		ResultBuckets:     cloneIntMap(r.resultBuckets),
		TimeoutCount:      r.timeoutCount,
		WarningCount:      r.warningCount,
		RecentErrors:      append([]model.SearchMetricError(nil), r.recentErrors...),
		TopKeywords:       topKeywordStats(r.topKeywords, 10),
	}
}

func cacheHitRateSnapshot(hitCount map[string]int, missCount map[string]int) map[string]float64 {
	scopes := make(map[string]struct{}, len(hitCount)+len(missCount))
	for scope := range hitCount {
		scopes[scope] = struct{}{}
	}
	for scope := range missCount {
		scopes[scope] = struct{}{}
	}

	output := make(map[string]float64, len(scopes))
	for scope := range scopes {
		total := hitCount[scope] + missCount[scope]
		if total == 0 {
			continue
		}
		output[scope] = float64(hitCount[scope]) / float64(total)
	}
	return output
}

func resultCountBucket(count int) string {
	switch {
	case count <= 0:
		return "0"
	case count <= 10:
		return "1-10"
	case count <= 50:
		return "11-50"
	case count <= 200:
		return "51-200"
	default:
		return "200+"
	}
}

func (r *SearchMetricsRecorder) appendRecentErrorLocked(scope string, pluginName string, keyword string, message string) {
	r.recentErrors = append([]model.SearchMetricError{{
		Scope:      scope,
		PluginName: pluginName,
		Keyword:    keyword,
		Message:    message,
	}}, r.recentErrors...)
	if len(r.recentErrors) > 20 {
		r.recentErrors = r.recentErrors[:20]
	}
}

func cloneIntMap(input map[string]int) map[string]int {
	output := make(map[string]int, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func topKeywordStats(input map[string]int, limit int) []model.SearchKeywordStat {
	items := make([]model.SearchKeywordStat, 0, len(input))
	for keyword, count := range input {
		items = append(items, model.SearchKeywordStat{Keyword: keyword, Count: count})
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Count != items[j].Count {
			return items[i].Count > items[j].Count
		}
		return items[i].Keyword < items[j].Keyword
	})
	if len(items) > limit {
		return items[:limit]
	}
	return items
}

func logSearchEvent(event string, fields map[string]interface{}) {
	loggerFields := make([]logger.Field, 0, len(fields))
	for key, value := range fields {
		loggerFields = append(loggerFields, logger.Any(key, value))
	}

	logger.Info(event, loggerFields...)
}

func logSearchEventIfEnabled(event string, fields map[string]interface{}) {
	if config.AppConfig == nil || !config.AppConfig.SearchEventLogEnabled {
		return
	}
	logSearchEvent(event, fields)
}

func classifySearchError(err error) string {
	if err == nil {
		return "none"
	}
	return "error"
}
