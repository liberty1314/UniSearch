package model

import "time"

// APIKey API密钥结构
type APIKey struct {
	Key              string     `json:"key"`                // 密钥，格式：sk-{40位十六进制}
	CreatedAt        time.Time  `json:"created_at"`         // 创建时间
	FirstUsedAt      *time.Time `json:"first_used_at"`      // 首次使用时间（nil表示未使用）
	ExpiresAt        time.Time  `json:"expires_at"`         // 过期时间
	TTLHours         int        `json:"ttl_hours"`          // 有效期（小时）
	IsEnabled        bool       `json:"is_enabled"`         // 是否启用
	Description      string     `json:"description"`        // 描述信息
	DailySearchLimit int        `json:"daily_search_limit"` // 每日搜索次数限制
	TodaySearchCount int        `json:"today_search_count"` // 今日已搜索次数
	LastSearchDate   string     `json:"last_search_date"`   // 上次搜索日期（格式：2006-01-02）
}

// IsValid 检查密钥是否有效（已启用且未过期）
func (k *APIKey) IsValid() bool {
	if !k.IsEnabled {
		return false
	}
	
	// 如果从未使用过，则认为有效（等待首次使用）
	if k.FirstUsedAt == nil {
		return true
	}
	
	// 已使用过，检查是否过期
	return time.Now().Before(k.ExpiresAt)
}

// IsExpired 检查密钥是否已过期
func (k *APIKey) IsExpired() bool {
	// 如果从未使用过，则不算过期
	if k.FirstUsedAt == nil {
		return false
	}
	
	return time.Now().After(k.ExpiresAt)
}

// ActivateIfNeeded 激活密钥（首次使用时调用）
// 返回是否是首次激活
func (k *APIKey) ActivateIfNeeded() bool {
	if k.FirstUsedAt == nil {
		now := time.Now()
		k.FirstUsedAt = &now
		// 从首次使用时间开始计算过期时间
		k.ExpiresAt = now.Add(time.Duration(k.TTLHours) * time.Hour)
		return true
	}
	return false
}

// CanSearch 检查是否可以进行搜索（检查每日限制）
func (k *APIKey) CanSearch() bool {
	if !k.IsValid() {
		return false
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
