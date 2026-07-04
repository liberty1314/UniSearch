package model

import "time"

// PluginHealthStatus 插件健康状态模型（最近一次测试结果）
type PluginHealthStatus struct {
	ID                   uint       `gorm:"primaryKey" json:"id"`
	PluginName           string     `gorm:"type:varchar(128);uniqueIndex;not null" json:"plugin_name"`
	IsHealthy            bool       `gorm:"not null;default:true" json:"is_healthy"`
	LastCheckedAt        time.Time  `gorm:"index;not null" json:"last_checked_at"`
	LastError            string     `gorm:"type:text" json:"last_error"`
	CheckSource          string     `gorm:"type:varchar(20);not null;default:'manual_test'" json:"check_source"`
	TotalChecks          int        `gorm:"not null;default:0" json:"total_checks"`
	TimeoutCount         int        `gorm:"not null;default:0" json:"timeout_count"`
	TimeoutRate          float64    `gorm:"not null;default:0" json:"timeout_rate"`
	ConsecutiveFailures  int        `gorm:"not null;default:0" json:"consecutive_failures"`
	CircuitState         string     `gorm:"type:varchar(20);not null;default:'closed'" json:"circuit_state"`
	CircuitOpenedAt      *time.Time `gorm:"index" json:"circuit_opened_at,omitempty"`
	CircuitCooldownUntil *time.Time `gorm:"index" json:"circuit_cooldown_until,omitempty"`
	HalfOpenSuccesses    int        `gorm:"not null;default:0" json:"half_open_successes"`
	LastSuccessAt        *time.Time `gorm:"index" json:"last_success_at,omitempty"`
	LastFailureAt        *time.Time `gorm:"index" json:"last_failure_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// TableName 指定表名
func (PluginHealthStatus) TableName() string {
	return "plugin_health_statuses"
}
