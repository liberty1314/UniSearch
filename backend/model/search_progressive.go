package model

// SearchProgressiveEvent 是 /api/search/progressive 的 NDJSON 事件。
// complete 事件中的 Response 与现有 /api/search 的 data 字段同形。
type SearchProgressiveEvent struct {
	Type             string                `json:"type" sonic:"type"`
	Keyword          string                `json:"keyword,omitempty" sonic:"keyword,omitempty"`
	Source           string                `json:"source,omitempty" sonic:"source,omitempty"`
	Message          string                `json:"message,omitempty" sonic:"message,omitempty"`
	ErrorCode        string                `json:"error_code,omitempty" sonic:"error_code,omitempty"`
	RequestID        string                `json:"request_id,omitempty" sonic:"request_id,omitempty"`
	Resources        []ResourceObject      `json:"resources,omitempty" sonic:"resources,omitempty"`
	Warnings         []SearchSourceWarning `json:"warnings,omitempty" sonic:"warnings,omitempty"`
	CompletedSources int                   `json:"completed_sources,omitempty" sonic:"completed_sources,omitempty"`
	TotalSources     int                   `json:"total_sources,omitempty" sonic:"total_sources,omitempty"`
	ReceivedBatches  int                   `json:"received_batches,omitempty" sonic:"received_batches,omitempty"`
	IsFinal          bool                  `json:"is_final,omitempty" sonic:"is_final,omitempty"`
	Response         *SearchResponse       `json:"response,omitempty" sonic:"response,omitempty"`
}

// SearchObservabilitySnapshot 是后台搜索可观测性只读快照。
type SearchObservabilitySnapshot struct {
	SearchCount       map[string]int      `json:"search_count" sonic:"search_count"`
	SearchErrorCount  map[string]int      `json:"search_error_count" sonic:"search_error_count"`
	CacheHitCount     map[string]int      `json:"cache_hit_count" sonic:"cache_hit_count"`
	CacheMissCount    map[string]int      `json:"cache_miss_count" sonic:"cache_miss_count"`
	CacheHitRate      map[string]float64  `json:"cache_hit_rate" sonic:"cache_hit_rate"`
	AverageDurationMS map[string]int64    `json:"average_duration_ms" sonic:"average_duration_ms"`
	ResultBuckets     map[string]int      `json:"result_buckets" sonic:"result_buckets"`
	TimeoutCount      int                 `json:"timeout_count" sonic:"timeout_count"`
	WarningCount      int                 `json:"warning_count" sonic:"warning_count"`
	RecentErrors      []SearchMetricError `json:"recent_errors" sonic:"recent_errors"`
	TopKeywords       []SearchKeywordStat `json:"top_keywords" sonic:"top_keywords"`
}

type SearchKeywordStat struct {
	Keyword string `json:"keyword" sonic:"keyword"`
	Count   int    `json:"count" sonic:"count"`
}

type SearchMetricError struct {
	Scope      string `json:"scope" sonic:"scope"`
	PluginName string `json:"plugin_name,omitempty" sonic:"plugin_name,omitempty"`
	Keyword    string `json:"keyword" sonic:"keyword"`
	Message    string `json:"message" sonic:"message"`
}
