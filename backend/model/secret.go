package model

import (
	"time"
)

// SecretType 密钥类型
type SecretType string

const (
	SecretTypeJWT          SecretType = "jwt_secret"           // JWT 签名密钥
	SecretTypeRefreshToken SecretType = "refresh_token_key"    // 刷新令牌加密密钥
	SecretTypeAPIKeyMaster SecretType = "api_key_master"       // API Key 主密钥
	SecretTypeCustom       SecretType = "custom"               // 自定义密钥
)

// Secret 密钥模型
// 密钥在数据库中加密存储，使用主密钥（MASTER_KEY）加密
type Secret struct {
	ID          uint       `gorm:"primaryKey" json:"id"`                                    // 主键ID
	Name        string     `gorm:"uniqueIndex;size:100;not null" json:"name"`               // 密钥名称（唯一）
	Type        SecretType `gorm:"index;size:50;not null" json:"type"`                      // 密钥类型
	Value       string     `gorm:"type:text;not null" json:"-"`                             // 密钥值（加密存储，不返回给客户端）
	Version     int        `gorm:"not null;default:1" json:"version"`                       // 密钥版本号
	IsActive    bool       `gorm:"index;not null;default:true" json:"is_active"`            // 是否激活
	Description string     `gorm:"size:500" json:"description"`                             // 密钥描述
	CreatedAt   time.Time  `gorm:"not null" json:"created_at"`                              // 创建时间
	UpdatedAt   time.Time  `gorm:"not null" json:"updated_at"`                              // 更新时间
	ExpiresAt   *time.Time `json:"expires_at"`                                              // 过期时间（可选）
	CreatedBy   string     `gorm:"size:100" json:"created_by"`                              // 创建者
}

// TableName 指定表名
func (Secret) TableName() string {
	return "secrets"
}

// IsExpired 检查密钥是否过期
func (s *Secret) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}

// IsValid 检查密钥是否有效
func (s *Secret) IsValid() bool {
	return s.IsActive && !s.IsExpired()
}
