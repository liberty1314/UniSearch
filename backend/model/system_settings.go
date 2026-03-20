package model

import (
	"time"
)

// SystemSettings 系统设置模型
type SystemSettings struct {
	ID                        uint      `gorm:"primaryKey" json:"id"`                                              // 设置ID（主键，自增）
	EnableUserAuth            bool      `gorm:"not null;default:true" json:"enable_user_auth"`                     // 是否启用用户登录注册功能（默认启用）
	EnableUserLogin           bool      `gorm:"not null;default:true" json:"enable_user_login"`                    // 是否启用用户登录功能（默认启用）
	EnableUserSignup          bool      `gorm:"not null;default:true" json:"enable_user_signup"`                   // 是否启用用户注册功能（默认启用）
	AnnouncementEnabled       bool      `gorm:"not null;default:false" json:"announcement_enabled"`                // 是否启用公告功能（默认禁用）
	PublicSiteURL             string    `gorm:"size:255;not null;default:''" json:"public_site_url"`               // 公开站点 URL（为空时由前端环境变量兜底）
	DefaultCopyFormatTemplate string    `gorm:"size:1024;not null;default:''" json:"default_copy_format_template"` // API Key 复制默认模板
	CreatedAt                 time.Time `json:"created_at"`                                                        // 创建时间
	UpdatedAt                 time.Time `json:"updated_at"`                                                        // 更新时间
}

// TableName 指定表名
func (SystemSettings) TableName() string {
	return "system_settings"
}
