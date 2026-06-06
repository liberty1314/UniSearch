package database

import (
	"log"
	"unisearch/model"
)

// AutoMigrate 执行数据库自动迁移
// 使用 GORM AutoMigrate 创建账号体系所需表。
// 验证需求：2.2
func AutoMigrate() error {
	log.Println("开始执行数据库迁移...")

	err := DB.AutoMigrate(
		&model.User{},
		&model.AdminTag{},              // 创建 admin_tags 表（后台标签词库）
		&model.SystemSettings{},        // 创建 system_settings 表
		&model.RefreshToken{},          // 创建 refresh_tokens 表（记住密码功能）
		&model.Secret{},                // 创建 secrets 表（密钥管理）
		&model.Announcement{},          // 创建 announcements 表（系统公告）
		&model.TGChannel{},             // 创建 tg_channels 表（Telegram 频道管理）
		&model.PluginState{},           // 创建 plugin_states 表（插件启用状态）
		&model.PluginHealthStatus{},    // 创建 plugin_health_statuses 表（插件健康状态）
		&model.TGChannelHealthStatus{}, // 创建 tg_channel_health_statuses 表（TG 频道健康状态）
		&model.UserLoginDailyStat{},    // 创建 user_login_daily_stats 表（用户日登录统计）
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
	log.Println("  - tg_channel_health_statuses 表已创建/更新")
	log.Println("  - user_login_daily_stats 表已创建/更新")

	return nil
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
