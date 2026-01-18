package database

import (
	"log"
	"pansou/model"
)

// AutoMigrate 执行数据库自动迁移
// 使用 GORM AutoMigrate 创建 users 和 api_keys 表
// 确保外键约束正确创建
// 验证需求：2.2
func AutoMigrate() error {
	log.Println("开始执行数据库迁移...")

	// 使用 GORM AutoMigrate 自动创建或更新表结构
	// 迁移顺序很重要：先迁移 User（父表），再迁移 APIKey（子表，包含外键）
	err := DB.AutoMigrate(
		&model.User{},   // 创建 users 表
		&model.APIKey{}, // 创建 api_keys 表（包含外键 user_id）
	)

	if err != nil {
		log.Printf("✗ 数据库迁移失败: %v", err)
		return err
	}

	log.Println("✓ 数据库迁移完成")
	log.Println("  - users 表已创建/更新")
	log.Println("  - api_keys 表已创建/更新")
	log.Println("  - 外键约束已创建（api_keys.user_id -> users.id）")

	return nil
}
