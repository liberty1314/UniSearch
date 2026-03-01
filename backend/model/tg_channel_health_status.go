package model

import "time"

// TGChannelHealthStatus TG 频道健康状态模型（最近一次测试结果）
type TGChannelHealthStatus struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ChannelName   string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"channel_name"`
	IsHealthy     bool      `gorm:"not null;default:true" json:"is_healthy"`
	LastCheckedAt time.Time `gorm:"index;not null" json:"last_checked_at"`
	LastError     string    `gorm:"type:text" json:"last_error"`
	CheckSource   string    `gorm:"type:varchar(20);not null;default:'manual_test'" json:"check_source"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// TableName 指定表名
func (TGChannelHealthStatus) TableName() string {
	return "tg_channel_health_statuses"
}
