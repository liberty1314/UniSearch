package model

import "time"

// RefreshTokenSession 保存刷新令牌摘要及会话元数据，不保存原始令牌。
type RefreshTokenSession struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	UserID            uint       `gorm:"index;not null" json:"user_id"`
	TokenDigest       string     `gorm:"uniqueIndex;size:64;not null" json:"-"`
	DeviceFingerprint string     `gorm:"size:255;not null" json:"device_fingerprint"`
	ExpiresAt         time.Time  `gorm:"index;not null" json:"expires_at"`
	LastUsedAt        *time.Time `json:"last_used_at"`
	IsRevoked         bool       `gorm:"index;not null;default:false" json:"is_revoked"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}
