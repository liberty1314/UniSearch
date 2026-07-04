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
	collector := newPluginMetricsCollectorWithConfig(db, pluginMetricsCollectorConfig{
		capacity:      10,
		flushInterval: time.Hour,
	})
	return collector, db
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
