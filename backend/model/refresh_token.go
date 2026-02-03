package model

import (
	"crypto/rand"
	"encoding/base64"
	"time"
)

// RefreshToken 刷新令牌模型
// 支持数据库存储和文件存储两种方式
type RefreshToken struct {
	ID                uint       `gorm:"primaryKey" json:"id"`                                      // 主键ID
	Token             string     `gorm:"uniqueIndex;size:255;not null" json:"token"`                // 刷新令牌（唯一索引）
	Username          string     `gorm:"index;size:100;not null" json:"username"`                   // 用户名（索引）
	IsAdmin           bool       `gorm:"not null;default:false" json:"is_admin"`                    // 是否为管理员
	DeviceFingerprint string     `gorm:"size:255" json:"device_fingerprint"`                        // 设备指纹
	CreatedAt         time.Time  `gorm:"not null" json:"created_at"`                                // 创建时间
	ExpiresAt         time.Time  `gorm:"index;not null" json:"expires_at"`                          // 过期时间（索引，用于快速查询）
	LastUsedAt        *time.Time `json:"last_used_at"`                                              // 最后使用时间
	IsRevoked         bool       `gorm:"index;not null;default:false" json:"is_revoked"`            // 是否已撤销（索引）
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
