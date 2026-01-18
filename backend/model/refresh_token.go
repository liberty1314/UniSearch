package model

import (
	"crypto/rand"
	"encoding/base64"
	"time"
)

// RefreshToken 刷新令牌模型
type RefreshToken struct {
	Token             string     `json:"token"`              // 刷新令牌（加密存储）
	Username          string     `json:"username"`           // 用户名
	IsAdmin           bool       `json:"is_admin"`           // 是否为管理员
	DeviceFingerprint string     `json:"device_fingerprint"` // 设备指纹
	CreatedAt         time.Time  `json:"created_at"`         // 创建时间
	ExpiresAt         time.Time  `json:"expires_at"`         // 过期时间
	LastUsedAt        *time.Time `json:"last_used_at"`       // 最后使用时间
	IsRevoked         bool       `json:"is_revoked"`         // 是否已撤销
}

// GenerateRefreshToken 生成安全的刷新令牌
func GenerateRefreshToken() (string, error) {
	// 生成 32 字节随机数据
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// Base64 编码（URL 安全）
	return base64.URLEncoding.EncodeToString(b), nil
}

// IsExpired 检查令牌是否过期
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

// IsValid 检查令牌是否有效
func (rt *RefreshToken) IsValid() bool {
	return !rt.IsRevoked && !rt.IsExpired()
}
