package model

import "time"

// APIKey API密钥结构
type APIKey struct {
	Key         string     `json:"key"`           // 密钥，格式：sk-{40位十六进制}
	CreatedAt   time.Time  `json:"created_at"`    // 创建时间
	FirstUsedAt *time.Time `json:"first_used_at"` // 首次使用时间（nil表示未使用）
	ExpiresAt   time.Time  `json:"expires_at"`    // 过期时间
	TTLHours    int        `json:"ttl_hours"`     // 有效期（小时）
	IsEnabled   bool       `json:"is_enabled"`    // 是否启用
	Description string     `json:"description"`   // 描述信息
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
