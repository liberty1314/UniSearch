package model

import (
	"time"
)

// TGChannel Telegram 频道模型
type TGChannel struct {
	ID        uint      `gorm:"primaryKey" json:"id"`                                 // 频道ID（主键，自增）
	Name      string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"name"` // 频道名（如 tgsearchers3）
	IsEnabled bool      `gorm:"not null;default:true" json:"is_enabled"`            // 是否启用
	SortOrder int       `gorm:"not null;default:0" json:"sort_order"`    // 排序权重（越小越靠前）
	CreatedAt time.Time `json:"created_at"`                              // 创建时间
	UpdatedAt time.Time `json:"updated_at"`                              // 更新时间
}

// TableName 指定表名
func (TGChannel) TableName() string {
	return "tg_channels"
}
