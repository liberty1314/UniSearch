package model

import (
	"gorm.io/gorm"
	"time"
)

// APIKey API密钥结构
type APIKey struct {
	ID               uint           `gorm:"primaryKey" json:"id"`                                   // API Key ID（主键，自增）
	Key              string         `gorm:"column:api_key;uniqueIndex;not null;size:50" json:"key"` // 密钥，格式：sk-{40位十六进制}（唯一索引）
	UserID           *uint          `gorm:"index" json:"user_id"`                                   // 关联用户ID（可为NULL，表示未绑定）
	CreatedAt        time.Time      `json:"created_at"`                                             // 创建时间
	FirstUsedAt      *time.Time     `json:"first_used_at"`                                          // 首次使用时间（nil表示未使用）
	ExpiresAt        *time.Time     `json:"expires_at"`                                             // 过期时间（可为NULL）
	TTLHours         int            `gorm:"default:0" json:"ttl_hours"`                             // 有效期（小时，0表示永不过期）
	IsEnabled        bool           `gorm:"default:true" json:"is_enabled"`                         // 是否启用
	Description      string         `gorm:"size:255" json:"description"`                            // 描述信息
	DailySearchLimit int            `gorm:"default:0" json:"daily_search_limit"`                    // 每日搜索次数限制（0表示不限制）
	TodaySearchCount int            `gorm:"default:0" json:"today_search_count"`                    // 今日已搜索次数
	LastSearchDate   string         `gorm:"size:10" json:"last_search_date"`                        // 上次搜索日期（格式：2006-01-02）
	IsPermanent      bool           `gorm:"default:false" json:"is_permanent"`                      // 是否为永久密钥（管理员专用）
	IsUnlimited      bool           `gorm:"default:false" json:"is_unlimited"`                      // 是否无限制（无搜索次数限制）
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`                                         // 软删除时间（索引，不在JSON中序列化）

	// 关联关系：属于某个用户（可选）
	User *User `gorm:"foreignKey:UserID" json:"-"` // 关联的用户（不在JSON中序列化）
}

// TableName 指定表名
func (APIKey) TableName() string {
	return "api_keys"
}

// IsValid 检查密钥是否有效（已启用且未过期）
func (k *APIKey) IsValid() bool {
	if !k.IsEnabled {
		return false
	}

	// 永久密钥跳过过期检查
	if k.IsPermanent {
		return true
	}

	// 如果从未使用过，则认为有效（等待首次使用）
	if k.FirstUsedAt == nil {
		return true
	}

	// 如果没有设置过期时间（TTLHours=0），则永不过期
	if k.ExpiresAt == nil {
		return true
	}

	// 已使用过，检查是否过期
	return time.Now().Before(*k.ExpiresAt)
}

// IsExpired 检查密钥是否已过期
func (k *APIKey) IsExpired() bool {
	// 如果从未使用过，则不算过期
	if k.FirstUsedAt == nil {
		return false
	}

	// 如果没有设置过期时间，则永不过期
	if k.ExpiresAt == nil {
		return false
	}

	return time.Now().After(*k.ExpiresAt)
}

// ActivateIfNeeded 激活密钥（首次使用时调用）
// 返回是否是首次激活
func (k *APIKey) ActivateIfNeeded() bool {
	if k.FirstUsedAt == nil {
		now := time.Now()
		k.FirstUsedAt = &now
		// 从首次使用时间开始计算过期时间（如果设置了TTL）
		if k.TTLHours > 0 {
			expiresAt := now.Add(time.Duration(k.TTLHours) * time.Hour)
			k.ExpiresAt = &expiresAt
		}
		return true
	}
	return false
}

// CanSearch 检查是否可以进行搜索（检查每日限制）
func (k *APIKey) CanSearch() bool {
	if !k.IsValid() {
		return false
	}

	// 无限制密钥跳过搜索次数检查
	if k.IsUnlimited {
		return true
	}

	// 如果没有设置每日限制，则不限制
	if k.DailySearchLimit <= 0 {
		return true
	}

	today := time.Now().Format("2006-01-02")

	// 如果是新的一天，重置计数
	if k.LastSearchDate != today {
		return true
	}

	// 检查是否超过每日限制
	return k.TodaySearchCount < k.DailySearchLimit
}

// IncrementSearchCount 增加搜索计数
// 返回是否成功（如果超过限制则返回false）
func (k *APIKey) IncrementSearchCount() bool {
	today := time.Now().Format("2006-01-02")

	// 如果是新的一天，重置计数
	if k.LastSearchDate != today {
		k.LastSearchDate = today
		k.TodaySearchCount = 0
	}

	// 如果没有设置每日限制，直接增加计数
	if k.DailySearchLimit <= 0 {
		k.TodaySearchCount++
		return true
	}

	// 检查是否超过每日限制
	if k.TodaySearchCount >= k.DailySearchLimit {
		return false
	}

	k.TodaySearchCount++
	return true
}

// GetRemainingSearches 获取今日剩余搜索次数
func (k *APIKey) GetRemainingSearches() int {
	if k.DailySearchLimit <= 0 {
		return -1 // -1 表示无限制
	}

	today := time.Now().Format("2006-01-02")

	// 如果是新的一天，返回完整限制
	if k.LastSearchDate != today {
		return k.DailySearchLimit
	}

	remaining := k.DailySearchLimit - k.TodaySearchCount
	if remaining < 0 {
		return 0
	}
	return remaining
}
