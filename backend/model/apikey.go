package model

import "time"

// APIKey API密钥结构
type APIKey struct {
	Key         string    `json:"key"`          // 密钥，格式：sk-{40位十六进制}
	CreatedAt   time.Time `json:"created_at"`   // 创建时间
	ExpiresAt   time.Time `json:"expires_at"`   // 过期时间
	IsEnabled   bool      `json:"is_enabled"`   // 是否启用
	Description string    `json:"description"`  // 描述信息
}

// IsValid 检查密钥是否有效（已启用且未过期）
func (k *APIKey) IsValid() bool {
	return k.IsEnabled && time.Now().Before(k.ExpiresAt)
}

// IsExpired 检查密钥是否已过期
func (k *APIKey) IsExpired() bool {
	return time.Now().After(k.ExpiresAt)
}
