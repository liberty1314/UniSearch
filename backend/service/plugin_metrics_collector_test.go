package service

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func newPluginMetricsTestCollector(t *testing.T) (*PluginMetricsCollector, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.PluginPerformanceMetric{}, &model.PluginErrorLog{}); err != nil {
		t.Fatalf("迁移插件指标测试表失败: %v", err)
	}
	collector := newPluginMetricsCollectorWithConfig(db, pluginMetricsCollectorConfig{
		capacity:      10,
		flushInterval: time.Hour,
	})
	return collector, db
}

func TestPluginMetricsCollectorReturnsErrorWhenSchemaMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	collector := newPluginMetricsCollectorWithConfig(db, pluginMetricsCollectorConfig{
		capacity:      10,
		flushInterval: time.Hour,
	})
	collector.RecordEvent(PluginMetricEvent{
		PluginName: "missing-schema",
		Success:    true,
		OccurredAt: time.Now(),
	})

	if err := collector.Flush(context.Background()); err == nil {
		t.Fatal("缺少插件指标表时必须返回错误")
	}
	if db.Migrator().HasTable(&model.PluginPerformanceMetric{}) || db.Migrator().HasTable(&model.PluginErrorLog{}) {
		t.Fatal("服务运行路径不得创建插件指标表")
	}
}

func TestPluginMetricsCollectorAggregatesAndFlushesMetrics(t *testing.T) {
	collector, db := newPluginMetricsTestCollector(t)
	now := time.Date(2026, 7, 4, 20, 0, 0, 0, time.UTC)

	collector.RecordEvent(PluginMetricEvent{
		PluginName:         "PanSearch",
		Keyword:            "仙逆",
		Duration:           10 * time.Millisecond,
		Success:            true,
		ConcurrentRequests: 1,
		OccurredAt:         now,
	})
	collector.RecordEvent(PluginMetricEvent{
		PluginName:         "pansearch",
		Keyword:            "仙逆",
		Duration:           30 * time.Millisecond,
		Timeout:            true,
		ErrorMessage:       "插件搜索超时",
		ConcurrentRequests: 2,
		OccurredAt:         now.Add(time.Minute),
	})

	snapshot := collector.RealtimeSnapshot()
	if snapshot.ActivePluginCount != 1 || len(snapshot.Items) != 1 {
		t.Fatalf("实时快照应包含一个插件，实际为 %#v", snapshot)
	}
	if snapshot.Items[0].RequestCount != 2 || snapshot.Items[0].TimeoutCount != 1 {
		t.Fatalf("实时快照统计不正确: %#v", snapshot.Items[0])
	}

	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	var metrics []model.PluginPerformanceMetric
	if err := db.Find(&metrics).Error; err != nil {
		t.Fatalf("查询聚合指标失败: %v", err)
	}
	if len(metrics) != 1 {
		t.Fatalf("期望一条聚合指标，实际为 %d", len(metrics))
	}
	metric := metrics[0]
	if metric.PluginName != "pansearch" {
		t.Fatalf("插件名应归一化，实际为 %q", metric.PluginName)
	}
	if metric.RequestCount != 2 || metric.SuccessCount != 1 || metric.TimeoutCount != 1 || metric.ErrorCount != 1 {
		t.Fatalf("聚合计数不正确: %#v", metric)
	}
	if metric.AvgResponseMS != 20 || metric.P50ResponseMS != 10 || metric.P95ResponseMS != 30 || metric.P99ResponseMS != 30 {
		t.Fatalf("响应时间百分位不正确: %#v", metric)
	}
	if metric.MaxConcurrentRequests != 2 {
		t.Fatalf("最大并发应为 2，实际为 %d", metric.MaxConcurrentRequests)
	}

	var logs []model.PluginErrorLog
	if err := db.Find(&logs).Error; err != nil {
		t.Fatalf("查询错误日志失败: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("期望一条错误日志，实际为 %d", len(logs))
	}
	if logs[0].ErrorType != "timeout" || logs[0].KeywordHash == "" {
		t.Fatalf("错误日志字段不正确: %#v", logs[0])
	}

	afterFlush := collector.RealtimeSnapshot()
	if len(afterFlush.Items) != 0 {
		t.Fatalf("Flush 后内存窗口应清空，实际为 %#v", afterFlush.Items)
	}
}

func TestPluginMetricsCollectorAggregatesDeferredPartialAndSidHubDetailCounts(t *testing.T) {
	collector, db := newPluginMetricsTestCollector(t)
	now := time.Date(2026, 7, 4, 20, 0, 0, 0, time.UTC)

	collector.RecordEvent(PluginMetricEvent{
		PluginName:         "sidhub",
		Keyword:            "后台处理中",
		Success:            true,
		Deferred:           true,
		ErrorType:          "deferred",
		DetailSuccessCount: 0,
		FallbackCount:      0,
		OccurredAt:         now,
	})
	collector.RecordEvent(PluginMetricEvent{
		PluginName:         "sidhub",
		Keyword:            "部分成功",
		Success:            true,
		PartialSuccess:     true,
		ErrorType:          "partial_success",
		DetailSuccessCount: 2,
		FallbackCount:      3,
		OccurredAt:         now.Add(time.Minute),
	})

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 {
		t.Fatalf("期望一个实时指标项，实际为 %#v", snapshot.Items)
	}
	item := snapshot.Items[0]
	if item.DeferredCount != 1 || item.PartialSuccessCount != 1 || item.DetailSuccessCount != 2 || item.FallbackCount != 3 {
		t.Fatalf("实时 sidhub 语义计数不正确: %#v", item)
	}
	if item.TimeoutCount != 0 || item.ErrorCount != 0 {
		t.Fatalf("deferred/partial_success 不应计入 timeout/error，实际为 %#v", item)
	}

	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	var metric model.PluginPerformanceMetric
	if err := db.Where("plugin_name = ?", "sidhub").First(&metric).Error; err != nil {
		t.Fatalf("查询 sidhub 聚合指标失败: %v", err)
	}
	if metric.DeferredCount != 1 || metric.PartialSuccessCount != 1 || metric.DetailSuccessCount != 2 || metric.FallbackCount != 3 {
		t.Fatalf("聚合 sidhub 语义计数不正确: %#v", metric)
	}
	if metric.TimeoutCount != 0 || metric.ErrorCount != 0 {
		t.Fatalf("deferred/partial_success 聚合不应计入 timeout/error，实际为 %#v", metric)
	}

	var logs []model.PluginErrorLog
	if err := db.Where("plugin_name = ?", "sidhub").Order("error_type ASC").Find(&logs).Error; err != nil {
		t.Fatalf("查询 sidhub 语义日志失败: %v", err)
	}
	if len(logs) != 2 || logs[0].ErrorType != "deferred" || logs[1].ErrorType != "partial_success" {
		t.Fatalf("期望错误日志可区分 deferred/partial_success，实际为 %#v", logs)
	}
	if logs[0].ErrorMessage == "" || logs[1].ErrorMessage == "" {
		t.Fatalf("deferred/partial_success 日志应包含可读说明，实际为 %#v", logs)
	}
}

func TestPluginMetricsCollectorKeepsRingBufferCapacity(t *testing.T) {
	collector, _ := newPluginMetricsTestCollector(t)

	for i := 0; i < 12; i++ {
		collector.RecordEvent(PluginMetricEvent{
			PluginName: "capacity-plugin",
			Keyword:    "关键词",
			Success:    true,
			OccurredAt: time.Now(),
		})
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 {
		t.Fatalf("期望一个插件快照，实际为 %#v", snapshot.Items)
	}
	if snapshot.Items[0].RequestCount != 10 {
		t.Fatalf("环形缓冲区应保留最近 10 条，实际为 %d", snapshot.Items[0].RequestCount)
	}
}

func TestPluginMetricsCollectorListsMetricsAndErrors(t *testing.T) {
	collector, _ := newPluginMetricsTestCollector(t)
	now := time.Date(2026, 7, 4, 20, 0, 0, 0, time.UTC)
	collector.RecordEvent(PluginMetricEvent{
		PluginName:   "query-plugin",
		Keyword:      "测试",
		Duration:     time.Millisecond,
		ErrorMessage: "上游失败",
		OccurredAt:   now,
	})
	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	from := now.Add(-time.Minute)
	items, err := collector.ListMetrics(PluginMetricsQuery{PluginName: "QUERY-plugin", From: &from})
	if err != nil {
		t.Fatalf("查询聚合指标失败: %v", err)
	}
	if len(items) != 1 || items[0].PluginName != "query-plugin" {
		t.Fatalf("聚合指标查询结果不正确: %#v", items)
	}

	logs, total, err := collector.ListErrorLogs(PluginErrorLogQuery{PluginName: "query-plugin", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("查询错误日志失败: %v", err)
	}
	if total != 1 || len(logs) != 1 {
		t.Fatalf("错误日志分页结果不正确 total=%d logs=%#v", total, logs)
	}
}
