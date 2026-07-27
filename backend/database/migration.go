package database

import (
	"fmt"
	"log"
	"sort"
	"strings"
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

type schemaRequirement struct {
	name  string
	model any
}

func schemaRequirements() []schemaRequirement {
	return []schemaRequirement{
		{name: "users", model: &model.User{}},
		{name: "admin_tags", model: &model.AdminTag{}},
		{name: "system_settings", model: &model.SystemSettings{}},
		{name: "refresh_token_sessions", model: &model.RefreshTokenSession{}},
		{name: "secrets", model: &model.Secret{}},
		{name: "announcements", model: &model.Announcement{}},
		{name: "tg_channels", model: &model.TGChannel{}},
		{name: "plugin_states", model: &model.PluginState{}},
		{name: "plugin_health_statuses", model: &model.PluginHealthStatus{}},
		{name: "plugin_runtime_configs", model: &model.PluginRuntimeConfig{}},
		{name: "plugin_performance_metrics", model: &model.PluginPerformanceMetric{}},
		{name: "plugin_error_logs", model: &model.PluginErrorLog{}},
		{name: "tg_channel_health_statuses", model: &model.TGChannelHealthStatus{}},
		{name: "tg_channel_performance_metrics", model: &model.TGChannelPerformanceMetric{}},
		{name: "tg_channel_error_logs", model: &model.TGChannelErrorLog{}},
		{name: "user_login_daily_stats", model: &model.UserLoginDailyStat{}},
		{name: "banned_ips", model: &model.BannedIP{}},
		{name: "search_audit_logs", model: &model.SearchAuditLog{}},
		{name: "admin_audit_logs", model: &model.AdminAuditLog{}},
	}
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
	if DB == nil {
		return fmt.Errorf("数据库连接未初始化")
	}
	log.Println("开始执行数据库迁移...")

	requirements := schemaRequirements()
	models := make([]any, 0, len(requirements))
	for _, requirement := range requirements {
		models = append(models, requirement.model)
	}
	err := DB.AutoMigrate(models...)

	if err != nil {
		log.Printf("✗ 数据库迁移失败: %v", err)
		return err
	}

	log.Println("✓ 数据库迁移完成")
	for _, requirement := range requirements {
		log.Printf("  - %s 表已创建/更新", requirement.name)
	}

	return nil
}

// ValidateRuntimeSchema 只读检查运行所需表，缺失迁移时拒绝启动。
func ValidateRuntimeSchema(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("数据库连接未初始化")
	}

	missing := make([]string, 0)
	for _, requirement := range schemaRequirements() {
		if !db.Migrator().HasTable(requirement.model) {
			missing = append(missing, requirement.name)
		}
	}
	if len(missing) == 0 {
		return nil
	}

	sort.Strings(missing)
	return fmt.Errorf(
		"数据库结构未完成迁移，缺少表: %s；请先运行 unisearch-migrate",
		strings.Join(missing, ", "),
	)
}

// MigrateRefreshTokenSessions 创建摘要会话表并清空旧原文刷新令牌。
func MigrateRefreshTokenSessions(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("数据库连接未初始化")
	}
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&model.RefreshTokenSession{}); err != nil {
			return fmt.Errorf("创建刷新会话表失败: %w", err)
		}
		if tx.Migrator().HasTable("refresh_tokens") {
			if err := tx.Exec("DELETE FROM refresh_tokens").Error; err != nil {
				return fmt.Errorf("清空旧刷新令牌失败: %w", err)
			}
		}
		return nil
	})
}

// EnsureLegacyRefreshTokensEmpty 阻止仍含原文刷新令牌的数据库启动新应用。
func EnsureLegacyRefreshTokensEmpty(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("数据库连接未初始化")
	}
	if !db.Migrator().HasTable("refresh_tokens") {
		return nil
	}
	var count int64
	if err := db.Table("refresh_tokens").Count(&count).Error; err != nil {
		return fmt.Errorf("检查旧刷新令牌表失败: %w", err)
	}
	if count != 0 {
		return fmt.Errorf("旧刷新令牌表仍有 %d 条原文记录，拒绝启动", count)
	}
	return nil
}

// DropLegacyRefreshTokens 仅在旧原文表为空时显式删除该表。
func DropLegacyRefreshTokens(db *gorm.DB) error {
	if err := EnsureLegacyRefreshTokensEmpty(db); err != nil {
		return err
	}
	if !db.Migrator().HasTable("refresh_tokens") {
		return nil
	}
	if err := db.Migrator().DropTable("refresh_tokens"); err != nil {
		return fmt.Errorf("删除旧刷新令牌表失败: %w", err)
	}
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
