package service

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func newPluginMetricsCleanerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(
		&model.PluginPerformanceMetric{},
		&model.PluginErrorLog{},
		&model.TGChannelPerformanceMetric{},
		&model.TGChannelErrorLog{},
	); err != nil {
		t.Fatalf("迁移插件指标测试表失败: %v", err)
	}
	return db
}

func TestPluginMetricsCleanerDeletesOnlyExpiredRows(t *testing.T) {
	db := newPluginMetricsCleanerTestDB(t)
	now := time.Date(2026, 7, 4, 12, 0, 0, 0, time.UTC)
	metricsCutoff := now.Add(-defaultPluginMetricsRetention)
	errorsCutoff := now.Add(-defaultPluginErrorsRetention)

	metrics := []model.PluginPerformanceMetric{
		{PluginName: "old-metric", BucketStartedAt: metricsCutoff.Add(-10 * time.Minute), BucketEndedAt: metricsCutoff.Add(-time.Nanosecond)},
		{PluginName: "boundary-metric", BucketStartedAt: metricsCutoff.Add(-5 * time.Minute), BucketEndedAt: metricsCutoff},
		{PluginName: "fresh-metric", BucketStartedAt: metricsCutoff.Add(time.Minute), BucketEndedAt: metricsCutoff.Add(time.Minute)},
	}
	if err := db.Create(&metrics).Error; err != nil {
		t.Fatalf("写入指标测试数据失败: %v", err)
	}

	logs := []model.PluginErrorLog{
		{PluginName: "old-error", KeywordHash: "old", ErrorType: "timeout", OccurredAt: errorsCutoff.Add(-time.Nanosecond)},
		{PluginName: "boundary-error", KeywordHash: "boundary", ErrorType: "error", OccurredAt: errorsCutoff},
		{PluginName: "fresh-error", KeywordHash: "fresh", ErrorType: "error", OccurredAt: errorsCutoff.Add(time.Minute)},
	}
	if err := db.Create(&logs).Error; err != nil {
		t.Fatalf("写入错误日志测试数据失败: %v", err)
	}

	channelMetrics := []model.TGChannelPerformanceMetric{
		{ChannelName: "old-channel-metric", BucketStartedAt: metricsCutoff.Add(-10 * time.Minute), BucketEndedAt: metricsCutoff.Add(-time.Nanosecond)},
		{ChannelName: "boundary-channel-metric", BucketStartedAt: metricsCutoff.Add(-5 * time.Minute), BucketEndedAt: metricsCutoff},
		{ChannelName: "fresh-channel-metric", BucketStartedAt: metricsCutoff.Add(time.Minute), BucketEndedAt: metricsCutoff.Add(time.Minute)},
	}
	if err := db.Create(&channelMetrics).Error; err != nil {
		t.Fatalf("写入频道指标测试数据失败: %v", err)
	}

	channelLogs := []model.TGChannelErrorLog{
		{ChannelName: "old-channel-error", KeywordHash: "old", ErrorType: "timeout", OccurredAt: errorsCutoff.Add(-time.Nanosecond)},
		{ChannelName: "boundary-channel-error", KeywordHash: "boundary", ErrorType: "error", OccurredAt: errorsCutoff},
		{ChannelName: "fresh-channel-error", KeywordHash: "fresh", ErrorType: "error", OccurredAt: errorsCutoff.Add(time.Minute)},
	}
	if err := db.Create(&channelLogs).Error; err != nil {
		t.Fatalf("写入频道错误日志测试数据失败: %v", err)
	}

	cleaner := newPluginMetricsCleanerWithConfig(db, PluginMetricsCleanerConfig{
		Now: func() time.Time { return now },
	})
	result, err := cleaner.Cleanup(context.Background())
	if err != nil {
		t.Fatalf("清理插件指标失败: %v", err)
	}
	if result.MetricsDeleted != 1 {
		t.Fatalf("应删除 1 条过期指标，实际为 %d", result.MetricsDeleted)
	}
	if result.ErrorsDeleted != 1 {
		t.Fatalf("应删除 1 条过期错误日志，实际为 %d", result.ErrorsDeleted)
	}
	if result.ChannelMetricsDeleted != 1 {
		t.Fatalf("应删除 1 条过期频道指标，实际为 %d", result.ChannelMetricsDeleted)
	}
	if result.ChannelErrorsDeleted != 1 {
		t.Fatalf("应删除 1 条过期频道错误日志，实际为 %d", result.ChannelErrorsDeleted)
	}

	var metricNames []string
	if err := db.Model(&model.PluginPerformanceMetric{}).Order("plugin_name").Pluck("plugin_name", &metricNames).Error; err != nil {
		t.Fatalf("查询剩余指标失败: %v", err)
	}
	expectedMetrics := []string{"boundary-metric", "fresh-metric"}
	if len(metricNames) != len(expectedMetrics) {
		t.Fatalf("剩余指标数量不正确，实际为 %#v", metricNames)
	}
	for index, expected := range expectedMetrics {
		if metricNames[index] != expected {
			t.Fatalf("剩余指标不正确，实际为 %#v", metricNames)
		}
	}

	var errorNames []string
	if err := db.Model(&model.PluginErrorLog{}).Order("plugin_name").Pluck("plugin_name", &errorNames).Error; err != nil {
		t.Fatalf("查询剩余错误日志失败: %v", err)
	}
	expectedErrors := []string{"boundary-error", "fresh-error"}
	if len(errorNames) != len(expectedErrors) {
		t.Fatalf("剩余错误日志数量不正确，实际为 %#v", errorNames)
	}
	for index, expected := range expectedErrors {
		if errorNames[index] != expected {
			t.Fatalf("剩余错误日志不正确，实际为 %#v", errorNames)
		}
	}

	var channelMetricNames []string
	if err := db.Model(&model.TGChannelPerformanceMetric{}).Order("channel_name").Pluck("channel_name", &channelMetricNames).Error; err != nil {
		t.Fatalf("查询剩余频道指标失败: %v", err)
	}
	expectedChannelMetrics := []string{"boundary-channel-metric", "fresh-channel-metric"}
	if len(channelMetricNames) != len(expectedChannelMetrics) {
		t.Fatalf("剩余频道指标数量不正确，实际为 %#v", channelMetricNames)
	}
	for index, expected := range expectedChannelMetrics {
		if channelMetricNames[index] != expected {
			t.Fatalf("剩余频道指标不正确，实际为 %#v", channelMetricNames)
		}
	}

	var channelErrorNames []string
	if err := db.Model(&model.TGChannelErrorLog{}).Order("channel_name").Pluck("channel_name", &channelErrorNames).Error; err != nil {
		t.Fatalf("查询剩余频道错误日志失败: %v", err)
	}
	expectedChannelErrors := []string{"boundary-channel-error", "fresh-channel-error"}
	if len(channelErrorNames) != len(expectedChannelErrors) {
		t.Fatalf("剩余频道错误日志数量不正确，实际为 %#v", channelErrorNames)
	}
	for index, expected := range expectedChannelErrors {
		if channelErrorNames[index] != expected {
			t.Fatalf("剩余频道错误日志不正确，实际为 %#v", channelErrorNames)
		}
	}
}

func TestPluginMetricsCleanerReturnsErrorWhenSchemaMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	cleaner := newPluginMetricsCleanerWithConfig(db, PluginMetricsCleanerConfig{
		Now: func() time.Time { return time.Date(2026, 7, 4, 12, 0, 0, 0, time.UTC) },
	})

	if _, err := cleaner.Cleanup(context.Background()); err == nil {
		t.Fatal("表结构缺失时应返回清理错误")
	}
}

func TestPluginMetricsCleanerNilServiceDoesNotFail(t *testing.T) {
	var cleaner *PluginMetricsCleaner
	result, err := cleaner.Cleanup(context.Background())
	if err != nil {
		t.Fatalf("空清理器不应返回错误: %v", err)
	}
	if result.MetricsDeleted != 0 || result.ErrorsDeleted != 0 || result.ChannelMetricsDeleted != 0 || result.ChannelErrorsDeleted != 0 {
		t.Fatalf("空清理器不应删除数据，实际为 %#v", result)
	}
}
