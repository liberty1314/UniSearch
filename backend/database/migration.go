package database

import (
	"fmt"
	"log"
	"time"
	"unisearch/model"
	"unisearch/util"
)

// AutoMigrate 执行数据库自动迁移
// 使用 GORM AutoMigrate 创建 users、api_keys 和 refresh_tokens 表
// 确保外键约束正确创建
// 验证需求：2.2
func AutoMigrate() error {
	log.Println("开始执行数据库迁移...")

	// 使用 GORM AutoMigrate 自动创建或更新表结构
	// 迁移顺序很重要：先迁移 User（父表），再迁移 APIKey（子表，包含外键）
	err := DB.AutoMigrate(
		&model.User{},           // 创建 users 表
		&model.APIKey{},         // 创建 api_keys 表（包含外键 user_id）
		&model.SystemSettings{}, // 创建 system_settings 表
		&model.RefreshToken{},   // 创建 refresh_tokens 表（记住密码功能）
		&model.Secret{},         // 创建 secrets 表（密钥管理）
	)

	if err != nil {
		log.Printf("✗ 数据库迁移失败: %v", err)
		return err
	}

	log.Println("✓ 数据库迁移完成")
	log.Println("  - users 表已创建/更新")
	log.Println("  - api_keys 表已创建/更新")
	log.Println("  - system_settings 表已创建/更新")
	log.Println("  - refresh_tokens 表已创建/更新")
	log.Println("  - secrets 表已创建/更新")
	log.Println("  - 外键约束已创建（api_keys.user_id -> users.id）")

	// 执行数据迁移：为现有管理员创建永久 Key
	if err := MigratePermanentAPIKeys(); err != nil {
		log.Printf("⚠️  为现有管理员创建永久 Key 失败: %v", err)
		// 不影响主迁移流程
	}

	return nil
}

// MigratePermanentAPIKeys 为现有管理员创建永久 API Key
func MigratePermanentAPIKeys() error {
	log.Println("开始为现有管理员创建永久 API Key...")

	// 查询所有管理员用户
	var admins []model.User
	if err := DB.Where("role = ?", "admin").Find(&admins).Error; err != nil {
		return err
	}

	if len(admins) == 0 {
		log.Println("  - 没有管理员用户，跳过")
		return nil
	}

	// 为每个管理员创建永久 Key
	createdCount := 0
	skippedCount := 0

	for _, admin := range admins {
		// 检查是否已存在永久 Key
		var existingKey model.APIKey
		err := DB.Where("user_id = ? AND is_permanent = ?", admin.ID, true).First(&existingKey).Error

		if err == nil {
			// 已存在，跳过
			skippedCount++
			continue
		}

		// 创建永久 Key（直接在这里实现，避免循环导入）
		key := util.GenerateAPIKey()

		// 检查 Key 是否已存在
		var checkKey model.APIKey
		if err := DB.Where("api_key = ?", key).First(&checkKey).Error; err == nil {
			// Key 已存在，重新生成（递归调用会有问题，这里简单跳过）
			log.Printf("  ⚠️  生成的 Key 已存在，跳过管理员 %s", admin.Username)
			continue
		}

		now := time.Now()
		apiKey := &model.APIKey{
			Key:              key,
			UserID:           &admin.ID,
			CreatedAt:        now,
			FirstUsedAt:      &now, // 立即激活
			ExpiresAt:        nil,  // 永不过期
			TTLHours:         0,    // 0 表示永不过期
			IsEnabled:        true,
			Description:      fmt.Sprintf("管理员永久密钥 (User: %s)", admin.Username),
			DailySearchLimit: 0, // 0 表示不限制
			TodaySearchCount: 0,
			LastSearchDate:   "",
			IsPermanent:      true, // 标记为永久密钥
			IsUnlimited:      true, // 标记为无限制
		}

		// 保存到数据库
		if err := DB.Create(apiKey).Error; err != nil {
			log.Printf("  ⚠️  为管理员 %s (ID: %d) 创建永久 Key 失败: %v", admin.Username, admin.ID, err)
			continue
		}

		createdCount++
		log.Printf("  ✓ 为管理员 %s (ID: %d) 创建永久 Key", admin.Username, admin.ID)
	}

	log.Printf("✓ 永久 Key 迁移完成：创建 %d 个，跳过 %d 个", createdCount, skippedCount)
	return nil
}
