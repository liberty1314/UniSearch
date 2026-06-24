package model

import "time"

// PluginRuntimeConfig 保存内置插件的运行时配置。
type PluginRuntimeConfig struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	PluginName string    `gorm:"type:varchar(128);uniqueIndex;not null" json:"plugin_name"`
	ConfigJSON string    `gorm:"type:text;not null" json:"config_json"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (PluginRuntimeConfig) TableName() string {
	return "plugin_runtime_configs"
}
