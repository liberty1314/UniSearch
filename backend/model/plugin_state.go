package model

import "time"

// PluginState 插件启用状态模型
type PluginState struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	PluginName string    `gorm:"type:varchar(128);uniqueIndex;not null" json:"plugin_name"`
	PluginType string    `gorm:"type:varchar(20);not null;default:'builtin'" json:"plugin_type"` // builtin | custom
	IsEnabled  bool      `gorm:"not null;default:true" json:"is_enabled"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TableName 指定表名
func (PluginState) TableName() string {
	return "plugin_states"
}
