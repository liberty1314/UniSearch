package database

import (
	"fmt"
	"log"
	"unisearch/model"

	"gorm.io/gorm"
)

var removedPluginNames = []string{
	"clmao",
	"panta",
	"panyq",
	"xinjuc",
	"ouge",
	"wanou",
}

// RemovedPluginNames 返回已下线且需要清理历史数据的插件名称副本。
func RemovedPluginNames() []string {
	return append([]string(nil), removedPluginNames...)
}

// RemovedPluginPurgeResult 记录各插件历史表的删除行数。
type RemovedPluginPurgeResult struct {
	PluginStatesDeleted             int64
	PluginHealthStatusesDeleted     int64
	PluginRuntimeConfigsDeleted     int64
	PluginPerformanceMetricsDeleted int64
	PluginErrorLogsDeleted          int64
}

// TotalDeleted 返回本次清理删除的总行数。
func (r RemovedPluginPurgeResult) TotalDeleted() int64 {
	return r.PluginStatesDeleted +
		r.PluginHealthStatusesDeleted +
		r.PluginRuntimeConfigsDeleted +
		r.PluginPerformanceMetricsDeleted +
		r.PluginErrorLogsDeleted
}

// AutoMigrate 执行数据库自动迁移
// 使用 GORM AutoMigrate 创建账号体系所需表。
// 验证需求：2.2
func AutoMigrate() error {
	log.Println("开始执行数据库迁移...")

	err := DB.AutoMigrate(
		&model.User{},
		&model.AdminTag{},                   // 创建 admin_tags 表（后台标签词库）
		&model.SystemSettings{},             // 创建 system_settings 表
		&model.RefreshToken{},               // 创建 refresh_tokens 表（记住密码功能）
		&model.Secret{},                     // 创建 secrets 表（密钥管理）
		&model.Announcement{},               // 创建 announcements 表（系统公告）
		&model.TGChannel{},                  // 创建 tg_channels 表（Telegram 频道管理）
		&model.PluginState{},                // 创建 plugin_states 表（插件启用状态）
		&model.PluginHealthStatus{},         // 创建 plugin_health_statuses 表（插件健康状态）
		&model.PluginRuntimeConfig{},        // 创建 plugin_runtime_configs 表（插件运行配置）
		&model.PluginPerformanceMetric{},    // 创建 plugin_performance_metrics 表（插件性能聚合指标）
		&model.PluginErrorLog{},             // 创建 plugin_error_logs 表（插件错误日志）
		&model.TGChannelHealthStatus{},      // 创建 tg_channel_health_statuses 表（TG 频道健康状态）
		&model.TGChannelPerformanceMetric{}, // 创建 tg_channel_performance_metrics 表（TG 频道性能聚合指标）
		&model.TGChannelErrorLog{},          // 创建 tg_channel_error_logs 表（TG 频道错误日志）
		&model.UserLoginDailyStat{},         // 创建 user_login_daily_stats 表（用户日登录统计）
	)

	if err != nil {
		log.Printf("✗ 数据库迁移失败: %v", err)
		return err
	}

	log.Println("✓ 数据库迁移完成")
	log.Println("  - users 表已创建/更新")
	log.Println("  - admin_tags 表已创建/更新")
	log.Println("  - system_settings 表已创建/更新")
	log.Println("  - refresh_tokens 表已创建/更新")
	log.Println("  - secrets 表已创建/更新")
	log.Println("  - announcements 表已创建/更新")
	log.Println("  - tg_channels 表已创建/更新")
	log.Println("  - plugin_states 表已创建/更新")
	log.Println("  - plugin_health_statuses 表已创建/更新")
	log.Println("  - plugin_runtime_configs 表已创建/更新")
	log.Println("  - plugin_performance_metrics 表已创建/更新")
	log.Println("  - plugin_error_logs 表已创建/更新")
	log.Println("  - tg_channel_health_statuses 表已创建/更新")
	log.Println("  - tg_channel_performance_metrics 表已创建/更新")
	log.Println("  - tg_channel_error_logs 表已创建/更新")
	log.Println("  - user_login_daily_stats 表已创建/更新")

	return nil
}

// PurgeRemovedPluginData 显式清理已下线插件的历史数据。
// 该操作具有破坏性，只能由独立迁移命令调用，绝不能在应用启动时隐式执行。
func PurgeRemovedPluginData(db *gorm.DB) (RemovedPluginPurgeResult, error) {
	if db == nil {
		return RemovedPluginPurgeResult{}, fmt.Errorf("数据库连接未初始化")
	}

	pluginNames := RemovedPluginNames()
	result := RemovedPluginPurgeResult{}
	err := db.Transaction(func(tx *gorm.DB) error {
		deleteOperations := []struct {
			name    string
			model   interface{}
			deleted *int64
		}{
			{"plugin_states", &model.PluginState{}, &result.PluginStatesDeleted},
			{"plugin_health_statuses", &model.PluginHealthStatus{}, &result.PluginHealthStatusesDeleted},
			{"plugin_runtime_configs", &model.PluginRuntimeConfig{}, &result.PluginRuntimeConfigsDeleted},
			{"plugin_performance_metrics", &model.PluginPerformanceMetric{}, &result.PluginPerformanceMetricsDeleted},
			{"plugin_error_logs", &model.PluginErrorLog{}, &result.PluginErrorLogsDeleted},
		}

		for _, operation := range deleteOperations {
			deleteResult := tx.Where("plugin_name IN ?", pluginNames).Delete(operation.model)
			if deleteResult.Error != nil {
				return fmt.Errorf("清理 %s 中的已下线插件数据失败: %w", operation.name, deleteResult.Error)
			}
			*operation.deleted = deleteResult.RowsAffected
		}

		return nil
	})
	if err != nil {
		return RemovedPluginPurgeResult{}, err
	}

	return result, nil
}

// DropDeprecatedTables 显式删除已经下线的旧表。
// 该操作具有破坏性，只允许由独立迁移命令触发，避免应用启动时隐式删表。
func DropDeprecatedTables() error {
	if DB.Migrator().HasTable(&model.APIKey{}) {
		if err := DB.Migrator().DropTable(&model.APIKey{}); err != nil {
			log.Printf("⚠️  删除 api_keys 表失败: %v", err)
			return err
		} else {
			log.Println("  - 已删除废弃的 api_keys 表")
		}
	}

	return nil
}
