package model

import (
	"time"

	"gorm.io/gorm"
)

// Announcement 公告模型
type Announcement struct {
	ID        uint       `gorm:"primaryKey" json:"id"`                                 // 公告ID（主键，自增）
	Title     string     `gorm:"not null;size:200" json:"title"`                       // 公告标题（非空，最大200字符）
	Content   string     `gorm:"not null;type:text" json:"content"`                    // 公告内容（HTML格式，非空）
	Priority  string     `gorm:"not null;size:10;default:'medium'" json:"priority"`    // 优先级（high/medium/low，默认medium）
	StartTime time.Time  `gorm:"not null;index:idx_start_time" json:"start_time"`      // 生效时间（非空，索引）
	EndTime   *time.Time `gorm:"index:idx_end_time" json:"end_time"`                   // 失效时间（可为空，NULL表示永久有效，索引）
	IsEnabled bool       `gorm:"not null;default:true;index:idx_is_enabled" json:"is_enabled"` // 是否启用（默认启用，索引）
	CreatedAt time.Time      `gorm:"index:idx_created_at" json:"created_at"`               // 创建时间（索引）
	UpdatedAt time.Time      `json:"updated_at"`                                           // 更新时间
	DeletedAt gorm.DeletedAt `gorm:"index:idx_deleted_at" json:"-"`                        // 软删除时间（索引，不在JSON中序列化）
	CreatedBy string         `gorm:"not null;size:32" json:"created_by"`                   // 创建者用户名（非空，最大32字符）
	UpdatedBy string         `gorm:"size:32" json:"updated_by"`                            // 最后更新者用户名（可为空，最大32字符）
}

// TableName 指定表名
func (Announcement) TableName() string {
	return "announcements"
}

// IsActive 检查公告是否当前有效
// 公告有效的条件：
// 1. 启用状态为 true
// 2. 当前时间不早于生效时间
// 3. 失效时间为空或当前时间不晚于失效时间
func (a *Announcement) IsActive() bool {
	now := time.Now()

	// 必须启用
	if !a.IsEnabled {
		return false
	}

	// 必须已生效
	if now.Before(a.StartTime) {
		return false
	}

	// 如果设置了失效时间，必须未失效
	if a.EndTime != nil && now.After(*a.EndTime) {
		return false
	}

	return true
}
