package service

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func newTGChannelMetricsTestCollector(t *testing.T) (*TGChannelMetricsCollector, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.TGChannelPerformanceMetric{}, &model.TGChannelErrorLog{}); err != nil {
		t.Fatalf("迁移频道指标测试表失败: %v", err)
	}
	collector := newTGChannelMetricsCollectorWithConfig(db, tgChannelMetricsCollectorConfig{
		capacity:      10,
		flushInterval: time.Hour,
	})
	return collector, db
}

func TestTGChannelMetricsCollectorReturnsErrorWhenSchemaMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	collector := newTGChannelMetricsCollectorWithConfig(db, tgChannelMetricsCollectorConfig{
		capacity:      10,
		flushInterval: time.Hour,
	})
	collector.RecordEvent(TGChannelMetricEvent{
		ChannelName: "missing-schema",
		Success:     true,
		OccurredAt:  time.Now(),
	})

	if err := collector.Flush(context.Background()); err == nil {
		t.Fatal("缺少频道指标表时必须返回错误")
	}
	if db.Migrator().HasTable(&model.TGChannelPerformanceMetric{}) || db.Migrator().HasTable(&model.TGChannelErrorLog{}) {
		t.Fatal("服务运行路径不得创建频道指标表")
	}
}

func TestTGChannelMetricsCollectorAggregatesAndFlushesMetrics(t *testing.T) {
	collector, db := newTGChannelMetricsTestCollector(t)
	now := time.Date(2026, 7, 5, 9, 0, 0, 0, time.UTC)

	collector.RecordEvent(TGChannelMetricEvent{
		ChannelName:        "YunPanPan",
		Keyword:            "仙逆",
		Duration:           10 * time.Millisecond,
		Success:            true,
		ResultCount:        3,
		ConcurrentRequests: 1,
		OccurredAt:         now,
	})
	collector.RecordEvent(TGChannelMetricEvent{
		ChannelName:        "yunpanpan",
		Keyword:            "仙逆",
		Duration:           30 * time.Millisecond,
		Timeout:            true,
		ErrorMessage:       "频道搜索超时",
		ConcurrentRequests: 2,
		OccurredAt:         now.Add(time.Minute),
	})

	snapshot := collector.RealtimeSnapshot()
	if snapshot.ActiveChannelCount != 1 || len(snapshot.Items) != 1 {
		t.Fatalf("实时快照应包含一个频道，实际为 %#v", snapshot)
	}
	if snapshot.Items[0].RequestCount != 2 || snapshot.Items[0].TimeoutCount != 1 || snapshot.Items[0].ResultCount != 3 {
		t.Fatalf("实时快照统计不正确: %#v", snapshot.Items[0])
	}

	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	var metrics []model.TGChannelPerformanceMetric
	if err := db.Find(&metrics).Error; err != nil {
		t.Fatalf("查询聚合指标失败: %v", err)
	}
	if len(metrics) != 1 {
		t.Fatalf("期望一条聚合指标，实际为 %d", len(metrics))
	}
	metric := metrics[0]
	if metric.ChannelName != "yunpanpan" {
		t.Fatalf("频道名应归一化，实际为 %q", metric.ChannelName)
	}
	if metric.RequestCount != 2 || metric.SuccessCount != 1 || metric.TimeoutCount != 1 || metric.ErrorCount != 1 {
		t.Fatalf("聚合计数不正确: %#v", metric)
	}
	if metric.ResultCount != 3 || metric.AvgResponseMS != 20 || metric.P50ResponseMS != 10 || metric.P95ResponseMS != 30 {
		t.Fatalf("聚合指标不正确: %#v", metric)
	}

	var logs []model.TGChannelErrorLog
	if err := db.Find(&logs).Error; err != nil {
		t.Fatalf("查询错误日志失败: %v", err)
	}
	if len(logs) != 1 || logs[0].ErrorType != "timeout" || logs[0].KeywordHash == "" {
		t.Fatalf("错误日志字段不正确: %#v", logs)
	}
}

func TestTGChannelMetricsCollectorKeepsRingBufferCapacity(t *testing.T) {
	collector, _ := newTGChannelMetricsTestCollector(t)

	for i := 0; i < 12; i++ {
		collector.RecordEvent(TGChannelMetricEvent{
			ChannelName: "capacity-channel",
			Keyword:     "关键词",
			Success:     true,
			OccurredAt:  time.Now(),
		})
	}

	snapshot := collector.RealtimeSnapshot()
	if len(snapshot.Items) != 1 {
		t.Fatalf("期望一个频道快照，实际为 %#v", snapshot.Items)
	}
	if snapshot.Items[0].RequestCount != 10 {
		t.Fatalf("环形缓冲区应保留最近 10 条，实际为 %d", snapshot.Items[0].RequestCount)
	}
}

func TestTGChannelMetricsCollectorListsMetricsAndErrors(t *testing.T) {
	collector, _ := newTGChannelMetricsTestCollector(t)
	now := time.Date(2026, 7, 5, 9, 0, 0, 0, time.UTC)
	collector.RecordEvent(TGChannelMetricEvent{
		ChannelName:  "query-channel",
		Keyword:      "测试",
		Duration:     time.Millisecond,
		ErrorMessage: "上游失败",
		OccurredAt:   now,
	})
	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	from := now.Add(-time.Minute)
	items, err := collector.ListMetrics(TGChannelMetricsQuery{ChannelName: "QUERY-channel", From: &from})
	if err != nil {
		t.Fatalf("查询聚合指标失败: %v", err)
	}
	if len(items) != 1 || items[0].ChannelName != "query-channel" {
		t.Fatalf("聚合指标查询结果不正确: %#v", items)
	}

	logs, total, err := collector.ListErrorLogs(TGChannelErrorLogQuery{ChannelName: "query-channel", Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("查询错误日志失败: %v", err)
	}
	if total != 1 || len(logs) != 1 {
		t.Fatalf("错误日志分页结果不正确 total=%d logs=%#v", total, logs)
	}
}
