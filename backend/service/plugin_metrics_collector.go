package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"

	"gorm.io/gorm"

	"unisearch/model"
)

const (
	defaultPluginMetricsBufferCapacity = 10000
	defaultPluginMetricsFlushInterval  = 5 * time.Minute
)

// PluginMetricEvent 表示一次插件执行或缓存命中的原始观测事件。
type PluginMetricEvent struct {
	PluginName         string
	Keyword            string
	Duration           time.Duration
	Success            bool
	Timeout            bool
	CacheHit           bool
	ResultCount        int
	ErrorType          string
	ErrorMessage       string
	ConcurrentRequests int
	OccurredAt         time.Time
}

type pluginMetricsCollectorConfig struct {
	capacity      int
	flushInterval time.Duration
}

// PluginMetricsCollector 采集插件原始执行事件，并定期聚合写入数据库。
type PluginMetricsCollector struct {
	db            *gorm.DB
	capacity      int
	flushInterval time.Duration

	mu          sync.Mutex
	events      []PluginMetricEvent
	active      map[string]int
	started     bool
	closed      bool
	migrateErr  error
	migrateOnce sync.Once
}

// NewPluginMetricsCollector 创建插件指标采集器。
func NewPluginMetricsCollector(db *gorm.DB) *PluginMetricsCollector {
	return newPluginMetricsCollectorWithConfig(db, pluginMetricsCollectorConfig{
		capacity:      defaultPluginMetricsBufferCapacity,
		flushInterval: defaultPluginMetricsFlushInterval,
	})
}

func newPluginMetricsCollectorWithConfig(db *gorm.DB, cfg pluginMetricsCollectorConfig) *PluginMetricsCollector {
	if cfg.capacity <= 0 {
		cfg.capacity = defaultPluginMetricsBufferCapacity
	}
	if cfg.flushInterval <= 0 {
		cfg.flushInterval = defaultPluginMetricsFlushInterval
	}
	return &PluginMetricsCollector{
		db:            db,
		capacity:      cfg.capacity,
		flushInterval: cfg.flushInterval,
		active:        make(map[string]int),
	}
}

func (c *PluginMetricsCollector) ensureMigrated() error {
	if c == nil || c.db == nil {
		return nil
	}
	c.migrateOnce.Do(func() {
		c.migrateErr = c.db.AutoMigrate(&model.PluginPerformanceMetric{}, &model.PluginErrorLog{})
	})
	return c.migrateErr
}

// Start 启动定时聚合任务。重复调用只会启动一次。
func (c *PluginMetricsCollector) Start(ctx context.Context) {
	if c == nil || c.db == nil {
		return
	}
	c.mu.Lock()
	if c.started {
		c.mu.Unlock()
		return
	}
	c.started = true
	c.mu.Unlock()

	go func() {
		ticker := time.NewTicker(c.flushInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				_ = c.Flush(context.Background())
				return
			case <-ticker.C:
				_ = c.Flush(ctx)
			}
		}
	}()
}

// BeginPluginRequest 记录插件进入执行队列时的并发数量，并返回结束回调。
func (c *PluginMetricsCollector) BeginPluginRequest(pluginName string) func() {
	if c == nil {
		return func() {}
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return func() {}
	}

	c.mu.Lock()
	c.active[normalizedName]++
	c.mu.Unlock()

	return func() {
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.active[normalizedName] <= 1 {
			delete(c.active, normalizedName)
			return
		}
		c.active[normalizedName]--
	}
}

func (c *PluginMetricsCollector) currentConcurrentRequests(pluginName string) int {
	if c == nil {
		return 0
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return 0
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.active[normalizedName]
}

// RecordEvent 将原始观测事件写入环形缓冲区。
func (c *PluginMetricsCollector) RecordEvent(event PluginMetricEvent) {
	if c == nil {
		return
	}
	event.PluginName = normalizePluginName(event.PluginName)
	if event.PluginName == "" {
		return
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now()
	}
	if event.ErrorType == "" {
		switch {
		case event.Timeout:
			event.ErrorType = "timeout"
		case event.ErrorMessage != "":
			event.ErrorType = "error"
		default:
			event.ErrorType = "none"
		}
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.events) >= c.capacity {
		copy(c.events, c.events[1:])
		c.events[len(c.events)-1] = event
		return
	}
	c.events = append(c.events, event)
}

// Flush 聚合当前缓冲区中的事件并批量写入数据库。
func (c *PluginMetricsCollector) Flush(ctx context.Context) error {
	if c == nil || c.db == nil {
		return nil
	}
	if err := c.ensureMigrated(); err != nil {
		return fmt.Errorf("迁移插件指标表失败: %w", err)
	}

	c.mu.Lock()
	events := make([]PluginMetricEvent, len(c.events))
	copy(events, c.events)
	c.events = c.events[:0]
	c.mu.Unlock()

	if len(events) == 0 {
		return nil
	}

	metrics, logs := buildPluginMetricRows(events)
	db := c.db
	if ctx != nil {
		db = db.WithContext(ctx)
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if len(metrics) > 0 {
			if err := tx.Create(&metrics).Error; err != nil {
				return fmt.Errorf("写入插件性能指标失败: %w", err)
			}
		}
		if len(logs) > 0 {
			if err := tx.Create(&logs).Error; err != nil {
				return fmt.Errorf("写入插件错误日志失败: %w", err)
			}
		}
		return nil
	})
}

// RealtimeSnapshot 返回当前内存窗口中的实时指标。
func (c *PluginMetricsCollector) RealtimeSnapshot() model.PluginMetricsRealtimeSnapshot {
	if c == nil {
		return model.PluginMetricsRealtimeSnapshot{}
	}
	c.mu.Lock()
	events := make([]PluginMetricEvent, len(c.events))
	copy(events, c.events)
	active := make(map[string]int, len(c.active))
	for name, count := range c.active {
		active[name] = count
	}
	c.mu.Unlock()

	items := buildPluginRealtimeItems(events, active)
	snapshot := model.PluginMetricsRealtimeSnapshot{Items: items}
	for _, item := range items {
		snapshot.ActivePluginCount++
		snapshot.AvgResponseMS += item.AvgResponseMS * int64(item.RequestCount)
		snapshot.ErrorCount += item.ErrorCount
		snapshot.SuccessRate += float64(item.SuccessCount)
		snapshot.TimeoutRate += float64(item.TimeoutCount)
	}
	var totalRequests int
	for _, item := range items {
		totalRequests += item.RequestCount
	}
	if totalRequests > 0 {
		snapshot.AvgResponseMS /= int64(totalRequests)
		snapshot.SuccessRate /= float64(totalRequests)
		snapshot.TimeoutRate /= float64(totalRequests)
	}
	return snapshot
}

type PluginMetricsQuery struct {
	PluginName string
	From       *time.Time
	To         *time.Time
	Limit      int
}

func (c *PluginMetricsCollector) ListMetrics(query PluginMetricsQuery) ([]model.PluginPerformanceMetric, error) {
	if c == nil || c.db == nil {
		return []model.PluginPerformanceMetric{}, nil
	}
	if err := c.ensureMigrated(); err != nil {
		return nil, fmt.Errorf("迁移插件指标表失败: %w", err)
	}

	db := c.db.Model(&model.PluginPerformanceMetric{}).Order("bucket_started_at DESC")
	if pluginName := normalizePluginName(query.PluginName); pluginName != "" {
		db = db.Where("plugin_name = ?", pluginName)
	}
	if query.From != nil {
		db = db.Where("bucket_started_at >= ?", *query.From)
	}
	if query.To != nil {
		db = db.Where("bucket_started_at <= ?", *query.To)
	}
	if query.Limit <= 0 || query.Limit > 500 {
		query.Limit = 200
	}

	var items []model.PluginPerformanceMetric
	if err := db.Limit(query.Limit).Find(&items).Error; err != nil {
		return nil, fmt.Errorf("查询插件性能指标失败: %w", err)
	}
	return items, nil
}

type PluginErrorLogQuery struct {
	PluginName string
	Page       int
	PageSize   int
}

func (c *PluginMetricsCollector) ListErrorLogs(query PluginErrorLogQuery) ([]model.PluginErrorLog, int64, error) {
	if c == nil || c.db == nil {
		return []model.PluginErrorLog{}, 0, nil
	}
	if err := c.ensureMigrated(); err != nil {
		return nil, 0, fmt.Errorf("迁移插件指标表失败: %w", err)
	}

	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}

	db := c.db.Model(&model.PluginErrorLog{})
	if pluginName := normalizePluginName(query.PluginName); pluginName != "" {
		db = db.Where("plugin_name = ?", pluginName)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("统计插件错误日志失败: %w", err)
	}

	var items []model.PluginErrorLog
	if err := db.Order("occurred_at DESC").
		Limit(query.PageSize).
		Offset((query.Page - 1) * query.PageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("查询插件错误日志失败: %w", err)
	}
	return items, total, nil
}

type pluginMetricBucket struct {
	pluginName            string
	startedAt             time.Time
	endedAt               time.Time
	requestCount          int
	successCount          int
	timeoutCount          int
	errorCount            int
	cacheHitCount         int
	maxConcurrentRequests int
	durationsMS           []int64
	lastError             string
}

func buildPluginMetricRows(events []PluginMetricEvent) ([]model.PluginPerformanceMetric, []model.PluginErrorLog) {
	buckets := make(map[string]*pluginMetricBucket)
	logs := make([]model.PluginErrorLog, 0)
	for _, event := range events {
		pluginName := normalizePluginName(event.PluginName)
		if pluginName == "" {
			continue
		}
		occurredAt := event.OccurredAt
		if occurredAt.IsZero() {
			occurredAt = time.Now()
		}
		bucketKey := pluginName + "|" + occurredAt.Truncate(defaultPluginMetricsFlushInterval).Format(time.RFC3339)
		bucket, exists := buckets[bucketKey]
		if !exists {
			startedAt := occurredAt.Truncate(defaultPluginMetricsFlushInterval)
			bucket = &pluginMetricBucket{
				pluginName: pluginName,
				startedAt:  startedAt,
				endedAt:    startedAt.Add(defaultPluginMetricsFlushInterval),
			}
			buckets[bucketKey] = bucket
		}
		applyPluginMetricEvent(bucket, event)
		if event.Timeout || event.ErrorMessage != "" {
			logs = append(logs, buildPluginErrorLog(event))
		}
	}

	metrics := make([]model.PluginPerformanceMetric, 0, len(buckets))
	for _, bucket := range buckets {
		metrics = append(metrics, bucket.toMetric())
	}
	sort.Slice(metrics, func(i, j int) bool {
		if metrics[i].BucketStartedAt.Equal(metrics[j].BucketStartedAt) {
			return metrics[i].PluginName < metrics[j].PluginName
		}
		return metrics[i].BucketStartedAt.Before(metrics[j].BucketStartedAt)
	})
	return metrics, logs
}

func buildPluginRealtimeItems(events []PluginMetricEvent, active map[string]int) []model.PluginMetricsRealtimeItem {
	buckets := make(map[string]*pluginMetricBucket)
	for _, event := range events {
		pluginName := normalizePluginName(event.PluginName)
		if pluginName == "" {
			continue
		}
		bucket, exists := buckets[pluginName]
		if !exists {
			bucket = &pluginMetricBucket{pluginName: pluginName}
			buckets[pluginName] = bucket
		}
		applyPluginMetricEvent(bucket, event)
	}
	for pluginName, count := range active {
		bucket, exists := buckets[pluginName]
		if !exists {
			bucket = &pluginMetricBucket{pluginName: pluginName}
			buckets[pluginName] = bucket
		}
		if count > bucket.maxConcurrentRequests {
			bucket.maxConcurrentRequests = count
		}
	}

	items := make([]model.PluginMetricsRealtimeItem, 0, len(buckets))
	for _, bucket := range buckets {
		metric := bucket.toMetric()
		item := model.PluginMetricsRealtimeItem{
			PluginName:            bucket.pluginName,
			RequestCount:          bucket.requestCount,
			SuccessCount:          bucket.successCount,
			TimeoutCount:          bucket.timeoutCount,
			ErrorCount:            bucket.errorCount,
			CacheHitCount:         bucket.cacheHitCount,
			MaxConcurrentRequests: bucket.maxConcurrentRequests,
			AvgResponseMS:         metric.AvgResponseMS,
			P50ResponseMS:         metric.P50ResponseMS,
			P95ResponseMS:         metric.P95ResponseMS,
			P99ResponseMS:         metric.P99ResponseMS,
			LastError:             bucket.lastError,
		}
		if bucket.requestCount > 0 {
			item.SuccessRate = float64(bucket.successCount) / float64(bucket.requestCount)
			item.TimeoutRate = float64(bucket.timeoutCount) / float64(bucket.requestCount)
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].PluginName < items[j].PluginName
	})
	return items
}

func applyPluginMetricEvent(bucket *pluginMetricBucket, event PluginMetricEvent) {
	bucket.requestCount++
	if event.Success {
		bucket.successCount++
	}
	if event.Timeout {
		bucket.timeoutCount++
	}
	if event.ErrorMessage != "" || event.Timeout {
		bucket.errorCount++
		bucket.lastError = event.ErrorMessage
	}
	if event.CacheHit {
		bucket.cacheHitCount++
	}
	if event.ConcurrentRequests > bucket.maxConcurrentRequests {
		bucket.maxConcurrentRequests = event.ConcurrentRequests
	}
	if event.Duration > 0 {
		bucket.durationsMS = append(bucket.durationsMS, event.Duration.Milliseconds())
	}
}

func (b *pluginMetricBucket) toMetric() model.PluginPerformanceMetric {
	sort.Slice(b.durationsMS, func(i, j int) bool {
		return b.durationsMS[i] < b.durationsMS[j]
	})
	var total int64
	for _, duration := range b.durationsMS {
		total += duration
	}
	var avg int64
	if len(b.durationsMS) > 0 {
		avg = total / int64(len(b.durationsMS))
	}
	return model.PluginPerformanceMetric{
		PluginName:            b.pluginName,
		BucketStartedAt:       b.startedAt,
		BucketEndedAt:         b.endedAt,
		RequestCount:          b.requestCount,
		SuccessCount:          b.successCount,
		TimeoutCount:          b.timeoutCount,
		ErrorCount:            b.errorCount,
		CacheHitCount:         b.cacheHitCount,
		MaxConcurrentRequests: b.maxConcurrentRequests,
		AvgResponseMS:         avg,
		P50ResponseMS:         percentileNearestRank(b.durationsMS, 0.50),
		P95ResponseMS:         percentileNearestRank(b.durationsMS, 0.95),
		P99ResponseMS:         percentileNearestRank(b.durationsMS, 0.99),
	}
}

func percentileNearestRank(sortedValues []int64, percentile float64) int64 {
	if len(sortedValues) == 0 {
		return 0
	}
	if percentile <= 0 {
		return sortedValues[0]
	}
	if percentile >= 1 {
		return sortedValues[len(sortedValues)-1]
	}
	rank := int(percentile*float64(len(sortedValues)) + 0.999999)
	if rank < 1 {
		rank = 1
	}
	if rank > len(sortedValues) {
		rank = len(sortedValues)
	}
	return sortedValues[rank-1]
}

func buildPluginErrorLog(event PluginMetricEvent) model.PluginErrorLog {
	errorType := event.ErrorType
	if errorType == "" || errorType == "none" {
		if event.Timeout {
			errorType = "timeout"
		} else {
			errorType = "error"
		}
	}
	errorMessage := event.ErrorMessage
	if errorMessage == "" && event.Timeout {
		errorMessage = "插件搜索超时"
	}
	occurredAt := event.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now()
	}
	return model.PluginErrorLog{
		PluginName:   normalizePluginName(event.PluginName),
		KeywordHash:  hashPluginMetricKeyword(event.Keyword),
		ErrorType:    errorType,
		ErrorMessage: errorMessage,
		DurationMS:   event.Duration.Milliseconds(),
		OccurredAt:   occurredAt,
	}
}

func hashPluginMetricKeyword(keyword string) string {
	sum := sha256.Sum256([]byte(keyword))
	return hex.EncodeToString(sum[:])[:16]
}
