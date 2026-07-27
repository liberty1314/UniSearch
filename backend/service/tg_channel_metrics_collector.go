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
	defaultTGChannelMetricsBufferCapacity = 10000
	defaultTGChannelMetricsFlushInterval  = 5 * time.Minute
)

// TGChannelMetricEvent 表示一次 Telegram 频道搜索或缓存命中的原始观测事件。
type TGChannelMetricEvent struct {
	ChannelName        string
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

type tgChannelMetricsCollectorConfig struct {
	capacity      int
	flushInterval time.Duration
}

// TGChannelMetricsCollector 采集频道原始执行事件，并定期聚合写入数据库。
type TGChannelMetricsCollector struct {
	db            *gorm.DB
	capacity      int
	flushInterval time.Duration

	mu      sync.Mutex
	events  []TGChannelMetricEvent
	active  map[string]int
	started bool
}

// NewTGChannelMetricsCollector 创建频道指标采集器。
func NewTGChannelMetricsCollector(db *gorm.DB) *TGChannelMetricsCollector {
	return newTGChannelMetricsCollectorWithConfig(db, tgChannelMetricsCollectorConfig{
		capacity:      defaultTGChannelMetricsBufferCapacity,
		flushInterval: defaultTGChannelMetricsFlushInterval,
	})
}

func newTGChannelMetricsCollectorWithConfig(db *gorm.DB, cfg tgChannelMetricsCollectorConfig) *TGChannelMetricsCollector {
	if cfg.capacity <= 0 {
		cfg.capacity = defaultTGChannelMetricsBufferCapacity
	}
	if cfg.flushInterval <= 0 {
		cfg.flushInterval = defaultTGChannelMetricsFlushInterval
	}
	return &TGChannelMetricsCollector{
		db:            db,
		capacity:      cfg.capacity,
		flushInterval: cfg.flushInterval,
		active:        make(map[string]int),
	}
}

// Start 启动定时聚合任务。重复调用只会启动一次。
func (c *TGChannelMetricsCollector) Start(ctx context.Context) {
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

// BeginChannelRequest 记录频道进入执行队列时的并发数量，并返回结束回调。
func (c *TGChannelMetricsCollector) BeginChannelRequest(channelName string) func() {
	if c == nil {
		return func() {}
	}
	normalizedName := normalizeChannelName(channelName)
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

func (c *TGChannelMetricsCollector) currentConcurrentRequests(channelName string) int {
	if c == nil {
		return 0
	}
	normalizedName := normalizeChannelName(channelName)
	if normalizedName == "" {
		return 0
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.active[normalizedName]
}

// RecordEvent 将原始观测事件写入环形缓冲区。
func (c *TGChannelMetricsCollector) RecordEvent(event TGChannelMetricEvent) {
	if c == nil {
		return
	}
	event.ChannelName = normalizeChannelName(event.ChannelName)
	if event.ChannelName == "" {
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
func (c *TGChannelMetricsCollector) Flush(ctx context.Context) error {
	if c == nil || c.db == nil {
		return nil
	}
	c.mu.Lock()
	events := make([]TGChannelMetricEvent, len(c.events))
	copy(events, c.events)
	c.events = c.events[:0]
	c.mu.Unlock()

	if len(events) == 0 {
		return nil
	}

	metrics, logs := buildTGChannelMetricRows(events)
	db := c.db
	if ctx != nil {
		db = db.WithContext(ctx)
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if len(metrics) > 0 {
			if err := tx.Create(&metrics).Error; err != nil {
				return fmt.Errorf("写入频道性能指标失败: %w", err)
			}
		}
		if len(logs) > 0 {
			if err := tx.Create(&logs).Error; err != nil {
				return fmt.Errorf("写入频道错误日志失败: %w", err)
			}
		}
		return nil
	})
}

// RealtimeSnapshot 返回当前内存窗口中的实时指标。
func (c *TGChannelMetricsCollector) RealtimeSnapshot() model.TGChannelMetricsRealtimeSnapshot {
	if c == nil {
		return model.TGChannelMetricsRealtimeSnapshot{}
	}
	c.mu.Lock()
	events := make([]TGChannelMetricEvent, len(c.events))
	copy(events, c.events)
	active := make(map[string]int, len(c.active))
	for name, count := range c.active {
		active[name] = count
	}
	c.mu.Unlock()

	items := buildTGChannelRealtimeItems(events, active)
	snapshot := model.TGChannelMetricsRealtimeSnapshot{Items: items}
	for _, item := range items {
		snapshot.ActiveChannelCount++
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

type TGChannelMetricsQuery struct {
	ChannelName string
	From        *time.Time
	To          *time.Time
	Limit       int
}

func (c *TGChannelMetricsCollector) ListMetrics(query TGChannelMetricsQuery) ([]model.TGChannelPerformanceMetric, error) {
	if c == nil || c.db == nil {
		return []model.TGChannelPerformanceMetric{}, nil
	}
	db := c.db.Model(&model.TGChannelPerformanceMetric{}).Order("bucket_started_at DESC")
	if channelName := normalizeChannelName(query.ChannelName); channelName != "" {
		db = db.Where("channel_name = ?", channelName)
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

	var items []model.TGChannelPerformanceMetric
	if err := db.Limit(query.Limit).Find(&items).Error; err != nil {
		return nil, fmt.Errorf("查询频道性能指标失败: %w", err)
	}
	return items, nil
}

type TGChannelErrorLogQuery struct {
	ChannelName string
	Page        int
	PageSize    int
}

func (c *TGChannelMetricsCollector) ListErrorLogs(query TGChannelErrorLogQuery) ([]model.TGChannelErrorLog, int64, error) {
	if c == nil || c.db == nil {
		return []model.TGChannelErrorLog{}, 0, nil
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}

	db := c.db.Model(&model.TGChannelErrorLog{})
	if channelName := normalizeChannelName(query.ChannelName); channelName != "" {
		db = db.Where("channel_name = ?", channelName)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("统计频道错误日志失败: %w", err)
	}

	var items []model.TGChannelErrorLog
	if err := db.Order("occurred_at DESC").
		Limit(query.PageSize).
		Offset((query.Page - 1) * query.PageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("查询频道错误日志失败: %w", err)
	}
	return items, total, nil
}

type tgChannelMetricBucket struct {
	channelName           string
	startedAt             time.Time
	endedAt               time.Time
	requestCount          int
	successCount          int
	timeoutCount          int
	errorCount            int
	cacheHitCount         int
	resultCount           int
	maxConcurrentRequests int
	durationsMS           []int64
	lastError             string
}

func buildTGChannelMetricRows(events []TGChannelMetricEvent) ([]model.TGChannelPerformanceMetric, []model.TGChannelErrorLog) {
	buckets := make(map[string]*tgChannelMetricBucket)
	logs := make([]model.TGChannelErrorLog, 0)
	for _, event := range events {
		channelName := normalizeChannelName(event.ChannelName)
		if channelName == "" {
			continue
		}
		occurredAt := event.OccurredAt
		if occurredAt.IsZero() {
			occurredAt = time.Now()
		}
		bucketKey := channelName + "|" + occurredAt.Truncate(defaultTGChannelMetricsFlushInterval).Format(time.RFC3339)
		bucket, exists := buckets[bucketKey]
		if !exists {
			startedAt := occurredAt.Truncate(defaultTGChannelMetricsFlushInterval)
			bucket = &tgChannelMetricBucket{
				channelName: channelName,
				startedAt:   startedAt,
				endedAt:     startedAt.Add(defaultTGChannelMetricsFlushInterval),
			}
			buckets[bucketKey] = bucket
		}
		applyTGChannelMetricEvent(bucket, event)
		if event.Timeout || event.ErrorMessage != "" {
			logs = append(logs, buildTGChannelErrorLog(event))
		}
	}

	metrics := make([]model.TGChannelPerformanceMetric, 0, len(buckets))
	for _, bucket := range buckets {
		metrics = append(metrics, bucket.toMetric())
	}
	sort.Slice(metrics, func(i, j int) bool {
		if metrics[i].BucketStartedAt.Equal(metrics[j].BucketStartedAt) {
			return metrics[i].ChannelName < metrics[j].ChannelName
		}
		return metrics[i].BucketStartedAt.Before(metrics[j].BucketStartedAt)
	})
	return metrics, logs
}

func buildTGChannelRealtimeItems(events []TGChannelMetricEvent, active map[string]int) []model.TGChannelMetricsRealtimeItem {
	buckets := make(map[string]*tgChannelMetricBucket)
	for _, event := range events {
		channelName := normalizeChannelName(event.ChannelName)
		if channelName == "" {
			continue
		}
		bucket, exists := buckets[channelName]
		if !exists {
			bucket = &tgChannelMetricBucket{channelName: channelName}
			buckets[channelName] = bucket
		}
		applyTGChannelMetricEvent(bucket, event)
	}
	for channelName, count := range active {
		bucket, exists := buckets[channelName]
		if !exists {
			bucket = &tgChannelMetricBucket{channelName: channelName}
			buckets[channelName] = bucket
		}
		if count > bucket.maxConcurrentRequests {
			bucket.maxConcurrentRequests = count
		}
	}

	items := make([]model.TGChannelMetricsRealtimeItem, 0, len(buckets))
	for _, bucket := range buckets {
		metric := bucket.toMetric()
		item := model.TGChannelMetricsRealtimeItem{
			ChannelName:           bucket.channelName,
			RequestCount:          bucket.requestCount,
			SuccessCount:          bucket.successCount,
			TimeoutCount:          bucket.timeoutCount,
			ErrorCount:            bucket.errorCount,
			CacheHitCount:         bucket.cacheHitCount,
			ResultCount:           bucket.resultCount,
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
		return items[i].ChannelName < items[j].ChannelName
	})
	return items
}

func applyTGChannelMetricEvent(bucket *tgChannelMetricBucket, event TGChannelMetricEvent) {
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
	if event.ResultCount > 0 {
		bucket.resultCount += event.ResultCount
	}
	if event.ConcurrentRequests > bucket.maxConcurrentRequests {
		bucket.maxConcurrentRequests = event.ConcurrentRequests
	}
	if event.Duration > 0 {
		bucket.durationsMS = append(bucket.durationsMS, event.Duration.Milliseconds())
	}
}

func (b *tgChannelMetricBucket) toMetric() model.TGChannelPerformanceMetric {
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
	return model.TGChannelPerformanceMetric{
		ChannelName:           b.channelName,
		BucketStartedAt:       b.startedAt,
		BucketEndedAt:         b.endedAt,
		RequestCount:          b.requestCount,
		SuccessCount:          b.successCount,
		TimeoutCount:          b.timeoutCount,
		ErrorCount:            b.errorCount,
		CacheHitCount:         b.cacheHitCount,
		ResultCount:           b.resultCount,
		MaxConcurrentRequests: b.maxConcurrentRequests,
		AvgResponseMS:         avg,
		P50ResponseMS:         percentileNearestRank(b.durationsMS, 0.50),
		P95ResponseMS:         percentileNearestRank(b.durationsMS, 0.95),
		P99ResponseMS:         percentileNearestRank(b.durationsMS, 0.99),
	}
}

func buildTGChannelErrorLog(event TGChannelMetricEvent) model.TGChannelErrorLog {
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
		errorMessage = "频道搜索超时"
	}
	occurredAt := event.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now()
	}
	return model.TGChannelErrorLog{
		ChannelName:  normalizeChannelName(event.ChannelName),
		KeywordHash:  hashTGChannelMetricKeyword(event.Keyword),
		ErrorType:    errorType,
		ErrorMessage: errorMessage,
		DurationMS:   event.Duration.Milliseconds(),
		OccurredAt:   occurredAt,
	}
}

func hashTGChannelMetricKeyword(keyword string) string {
	sum := sha256.Sum256([]byte(keyword))
	return hex.EncodeToString(sum[:])[:16]
}
