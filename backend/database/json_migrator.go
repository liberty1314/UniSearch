package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"unisearch/model"
	"time"

	"gorm.io/gorm"
)

// JSONAPIKey JSON 文件中的 API Key 结构
// 用于解析 backend/api_keys.json 文件
type JSONAPIKey struct {
	Key         string     `json:"key"`
	CreatedAt   time.Time  `json:"created_at"`
	FirstUsedAt *time.Time `json:"first_used_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	TTLHours    int        `json:"ttl_hours"`
	IsEnabled   bool       `json:"is_enabled"`
	Description string     `json:"description"`
}

// MigrateFromJSON 从 JSON 文件迁移 API Key 数据到 MySQL 数据库
// 读取 backend/api_keys.json 文件
// 解析 JSON 数据
// 批量插入到 api_keys 表
// 处理重复 key（跳过并记录警告）
// 输出迁移统计信息
// 保留原 JSON 文件
// 验证需求：11.2-11.7
func MigrateFromJSON(jsonFilePath string) error {
	log.Println("开始执行 JSON 数据迁移...")

	// 1. 检查 JSON 文件是否存在
	if _, err := os.Stat(jsonFilePath); os.IsNotExist(err) {
		log.Printf("⚠️  JSON 文件不存在: %s，跳过数据迁移", jsonFilePath)
		return nil
	}

	// 2. 读取 JSON 文件
	log.Printf("读取 JSON 文件: %s", jsonFilePath)
	fileData, err := os.ReadFile(jsonFilePath)
	if err != nil {
		log.Printf("✗ 读取 JSON 文件失败: %v", err)
		return fmt.Errorf("读取 JSON 文件失败: %w", err)
	}

	// 3. 解析 JSON 数据
	var jsonKeys []JSONAPIKey
	if err := json.Unmarshal(fileData, &jsonKeys); err != nil {
		log.Printf("✗ 解析 JSON 数据失败: %v", err)
		return fmt.Errorf("解析 JSON 数据失败: %w", err)
	}

	log.Printf("成功解析 JSON 文件，共 %d 条记录", len(jsonKeys))

	// 如果 JSON 文件为空，直接返回
	if len(jsonKeys) == 0 {
		log.Println("✓ JSON 文件为空，无需迁移")
		return nil
	}

	// 4. 批量插入到数据库
	successCount := 0
	skipCount := 0
	errorCount := 0

	for i, jsonKey := range jsonKeys {
		// 转换为数据库模型
		dbKey := &model.APIKey{
			Key:              jsonKey.Key,
			UserID:           nil, // JSON 中的 Key 都是未绑定状态
			CreatedAt:        jsonKey.CreatedAt,
			FirstUsedAt:      jsonKey.FirstUsedAt,
			ExpiresAt:        jsonKey.ExpiresAt,
			TTLHours:         jsonKey.TTLHours,
			IsEnabled:        jsonKey.IsEnabled,
			Description:      jsonKey.Description,
			DailySearchLimit: 0,    // JSON 中没有此字段，默认为 0（不限制）
			TodaySearchCount: 0,    // 初始化为 0
			LastSearchDate:   "",   // 初始化为空
		}

		// 尝试插入数据库
		err := DB.Create(dbKey).Error
		if err != nil {
			// 检查是否是唯一性约束冲突（重复的 key）
			if err == gorm.ErrDuplicatedKey {
				log.Printf("⚠️  [%d/%d] 跳过重复的 API Key: %s", i+1, len(jsonKeys), jsonKey.Key)
				skipCount++
				continue
			}

			// 其他错误
			log.Printf("✗ [%d/%d] 插入 API Key 失败: %s, 错误: %v", i+1, len(jsonKeys), jsonKey.Key, err)
			errorCount++
			continue
		}

		// 插入成功
		log.Printf("✓ [%d/%d] 成功迁移 API Key: %s", i+1, len(jsonKeys), jsonKey.Key)
		successCount++
	}

	// 5. 输出迁移统计信息
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("  JSON 数据迁移完成")
	log.Printf("  总记录数: %d", len(jsonKeys))
	log.Printf("  成功迁移: %d", successCount)
	log.Printf("  跳过重复: %d", skipCount)
	log.Printf("  迁移失败: %d", errorCount)
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 6. 保留原 JSON 文件（不删除）
	log.Printf("✓ 原 JSON 文件已保留: %s", jsonFilePath)

	// 如果有错误，返回错误信息
	if errorCount > 0 {
		return fmt.Errorf("数据迁移完成，但有 %d 条记录迁移失败", errorCount)
	}

	return nil
}

// MigrateFromDefaultJSONFile 从默认路径迁移 JSON 数据
// 默认路径: api_keys.json（相对于 backend 目录）
func MigrateFromDefaultJSONFile() error {
	return MigrateFromJSON("api_keys.json")
}
