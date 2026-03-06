package service

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"
)

type SearchMetricsRecorder struct {
	mu               sync.Mutex
	topKeywords      map[string]int
	cacheHitCount    map[string]int
	cacheMissCount   map[string]int
	searchCount      map[string]int
	searchErrorCount map[string]int
}

func newSearchMetricsRecorder() *SearchMetricsRecorder {
	return &SearchMetricsRecorder{
		topKeywords:      make(map[string]int),
		cacheHitCount:    make(map[string]int),
		cacheMissCount:   make(map[string]int),
		searchCount:      make(map[string]int),
		searchErrorCount: make(map[string]int),
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
	if err != nil {
		r.searchErrorCount[scope]++
	}
	r.mu.Unlock()

	logSearchEvent("search", map[string]interface{}{
		"scope":        scope,
		"keyword":      keyword,
		"duration_ms":  duration.Milliseconds(),
		"result_count": resultCount,
		"error_class":  classifySearchError(err),
	})
}

func logSearchEvent(event string, fields map[string]interface{}) {
	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys)+1)
	parts = append(parts, fmt.Sprintf("event=%s", event))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%v", key, fields[key]))
	}

	log.Printf("[search] %s", strings.Join(parts, " "))
}

func classifySearchError(err error) string {
	if err == nil {
		return "none"
	}
	return "error"
}
