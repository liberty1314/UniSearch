package model

import "time"

// PluginHealthStatus 插件健康状态模型（最近一次测试结果）
type PluginHealthStatus struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	PluginName    string    `gorm:"type:varchar(128);uniqueIndex;not null" json:"plugin_name"`
	IsHealthy     bool      `gorm:"not null;default:true" json:"is_healthy"`
	LastCheckedAt time.Time `gorm:"index;not null" json:"last_checked_at"`
	LastError     string    `gorm:"type:text" json:"last_error"`
	CheckSource   string    `gorm:"type:varchar(20);not null;default:'manual_test'" json:"check_source"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// TableName 指定表名
func (PluginHealthStatus) TableName() string {
	return "plugin_health_statuses"
}
