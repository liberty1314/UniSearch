package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"

	"unisearch/model"
)

const (
	defaultPluginMetricsRetention = 30 * 24 * time.Hour
	defaultPluginErrorsRetention  = 7 * 24 * time.Hour
	defaultPluginCleanupInterval  = 24 * time.Hour
)

type PluginMetricsCleanerConfig struct {
	MetricsRetention time.Duration
	ErrorsRetention  time.Duration
	Interval         time.Duration
	Now              func() time.Time
}

type PluginMetricsCleanupResult struct {
	MetricsDeleted        int64
	ErrorsDeleted         int64
	ChannelMetricsDeleted int64
	ChannelErrorsDeleted  int64
	MetricsCutoff         time.Time
	ErrorsCutoff          time.Time
}

// PluginMetricsCleaner 负责清理过期插件指标和错误日志。
type PluginMetricsCleaner struct {
	db     *gorm.DB
	config PluginMetricsCleanerConfig
}

func NewPluginMetricsCleaner(db *gorm.DB) *PluginMetricsCleaner {
	return newPluginMetricsCleanerWithConfig(db, PluginMetricsCleanerConfig{})
}

func newPluginMetricsCleanerWithConfig(db *gorm.DB, config PluginMetricsCleanerConfig) *PluginMetricsCleaner {
	if config.MetricsRetention <= 0 {
		config.MetricsRetention = defaultPluginMetricsRetention
	}
	if config.ErrorsRetention <= 0 {
		config.ErrorsRetention = defaultPluginErrorsRetention
	}
	if config.Interval <= 0 {
		config.Interval = defaultPluginCleanupInterval
	}
	if config.Now == nil {
		config.Now = time.Now
	}
	return &PluginMetricsCleaner{
		db:     db,
		config: config,
	}
}

func (c *PluginMetricsCleaner) Start(ctx context.Context) {
	if c == nil || c.db == nil {
		return
	}
	ticker := time.NewTicker(c.config.Interval)
	go func() {
		defer ticker.Stop()
		c.runAndLog(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.runAndLog(ctx)
			}
		}
	}()
}

func (c *PluginMetricsCleaner) Cleanup(ctx context.Context) (PluginMetricsCleanupResult, error) {
	if c == nil || c.db == nil {
		return PluginMetricsCleanupResult{}, nil
	}
	now := c.config.Now()
	result := PluginMetricsCleanupResult{
		MetricsCutoff: now.Add(-c.config.MetricsRetention),
		ErrorsCutoff:  now.Add(-c.config.ErrorsRetention),
	}

	db := c.db
	if ctx != nil {
		db = db.WithContext(ctx)
	}

	metricDelete := db.
		Where("bucket_ended_at < ?", result.MetricsCutoff).
		Delete(&model.PluginPerformanceMetric{})
	if metricDelete.Error != nil {
		return result, fmt.Errorf("清理插件性能指标失败: %w", metricDelete.Error)
	}
	result.MetricsDeleted = metricDelete.RowsAffected

	errorDelete := db.
		Where("occurred_at < ?", result.ErrorsCutoff).
		Delete(&model.PluginErrorLog{})
	if errorDelete.Error != nil {
		return result, fmt.Errorf("清理插件错误日志失败: %w", errorDelete.Error)
	}
	result.ErrorsDeleted = errorDelete.RowsAffected

	channelMetricDelete := db.
		Where("bucket_ended_at < ?", result.MetricsCutoff).
		Delete(&model.TGChannelPerformanceMetric{})
	if channelMetricDelete.Error != nil {
		return result, fmt.Errorf("清理频道性能指标失败: %w", channelMetricDelete.Error)
	}
	result.ChannelMetricsDeleted = channelMetricDelete.RowsAffected

	channelErrorDelete := db.
		Where("occurred_at < ?", result.ErrorsCutoff).
		Delete(&model.TGChannelErrorLog{})
	if channelErrorDelete.Error != nil {
		return result, fmt.Errorf("清理频道错误日志失败: %w", channelErrorDelete.Error)
	}
	result.ChannelErrorsDeleted = channelErrorDelete.RowsAffected

	return result, nil
}

func (c *PluginMetricsCleaner) runAndLog(ctx context.Context) {
	result, err := c.Cleanup(ctx)
	if err != nil {
		log.Printf("event=plugin_metrics_cleanup status=failed error=%q", err.Error())
		return
	}
	log.Printf(
		"event=plugin_metrics_cleanup status=success metrics_deleted=%d errors_deleted=%d channel_metrics_deleted=%d channel_errors_deleted=%d metrics_cutoff=%s errors_cutoff=%s",
		result.MetricsDeleted,
		result.ErrorsDeleted,
		result.ChannelMetricsDeleted,
		result.ChannelErrorsDeleted,
		result.MetricsCutoff.Format(time.RFC3339),
		result.ErrorsCutoff.Format(time.RFC3339),
	)
}
