package model

import "time"

// PluginPerformanceMetric 保存插件性能的聚合窗口数据。
type PluginPerformanceMetric struct {
	ID                    uint      `gorm:"primaryKey" json:"id"`
	PluginName            string    `gorm:"type:varchar(128);not null;index:idx_plugin_metric_plugin_bucket,priority:1" json:"plugin_name"`
	BucketStartedAt       time.Time `gorm:"not null;index:idx_plugin_metric_plugin_bucket,priority:2;index" json:"bucket_started_at"`
	BucketEndedAt         time.Time `gorm:"not null;index" json:"bucket_ended_at"`
	RequestCount          int       `gorm:"not null;default:0" json:"request_count"`
	SuccessCount          int       `gorm:"not null;default:0" json:"success_count"`
	TimeoutCount          int       `gorm:"not null;default:0" json:"timeout_count"`
	ErrorCount            int       `gorm:"not null;default:0" json:"error_count"`
	CacheHitCount         int       `gorm:"not null;default:0" json:"cache_hit_count"`
	MaxConcurrentRequests int       `gorm:"not null;default:0" json:"max_concurrent_requests"`
	AvgResponseMS         int64     `gorm:"not null;default:0" json:"avg_response_ms"`
	P50ResponseMS         int64     `gorm:"not null;default:0" json:"p50_response_ms"`
	P95ResponseMS         int64     `gorm:"not null;default:0" json:"p95_response_ms"`
	P99ResponseMS         int64     `gorm:"not null;default:0" json:"p99_response_ms"`
	CreatedAt             time.Time `json:"created_at"`
}

func (PluginPerformanceMetric) TableName() string {
	return "plugin_performance_metrics"
}

// PluginErrorLog 保存插件执行错误的排查线索。
type PluginErrorLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PluginName   string    `gorm:"type:varchar(128);not null;index:idx_plugin_error_plugin_time,priority:1" json:"plugin_name"`
	KeywordHash  string    `gorm:"type:varchar(64);not null;index" json:"keyword_hash"`
	ErrorType    string    `gorm:"type:varchar(32);not null;index" json:"error_type"`
	ErrorMessage string    `gorm:"type:text" json:"error_message"`
	DurationMS   int64     `gorm:"not null;default:0" json:"duration_ms"`
	OccurredAt   time.Time `gorm:"not null;index:idx_plugin_error_plugin_time,priority:2;index" json:"occurred_at"`
	CreatedAt    time.Time `json:"created_at"`
}

func (PluginErrorLog) TableName() string {
	return "plugin_error_logs"
}

// PluginMetricsRealtimeSnapshot 是管理后台实时指标卡片的数据源。
type PluginMetricsRealtimeSnapshot struct {
	ActivePluginCount int                         `json:"active_plugin_count"`
	AvgResponseMS     int64                       `json:"avg_response_ms"`
	SuccessRate       float64                     `json:"success_rate"`
	TimeoutRate       float64                     `json:"timeout_rate"`
	ErrorCount        int                         `json:"error_count"`
	Items             []PluginMetricsRealtimeItem `json:"items"`
}

// PluginMetricsRealtimeItem 表示单个插件在内存窗口中的实时表现。
type PluginMetricsRealtimeItem struct {
	PluginName            string  `json:"plugin_name"`
	RequestCount          int     `json:"request_count"`
	SuccessCount          int     `json:"success_count"`
	TimeoutCount          int     `json:"timeout_count"`
	ErrorCount            int     `json:"error_count"`
	CacheHitCount         int     `json:"cache_hit_count"`
	MaxConcurrentRequests int     `json:"max_concurrent_requests"`
	AvgResponseMS         int64   `json:"avg_response_ms"`
	P50ResponseMS         int64   `json:"p50_response_ms"`
	P95ResponseMS         int64   `json:"p95_response_ms"`
	P99ResponseMS         int64   `json:"p99_response_ms"`
	SuccessRate           float64 `json:"success_rate"`
	TimeoutRate           float64 `json:"timeout_rate"`
	LastError             string  `json:"last_error"`
}
