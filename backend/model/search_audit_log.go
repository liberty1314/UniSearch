package model

import (
	"time"
)

// SearchAuditLog 记录每一次搜索的审计明细，用于后台可追溯查询。
// 与内存聚合指标（SearchMetricsRecorder）不同，本表逐条落库并持久化。
type SearchAuditLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`               // 记录ID（主键，自增）
	UserID      uint      `gorm:"index" json:"user_id"`               // 搜索用户ID
	Username    string    `gorm:"size:32;index" json:"username"`      // 搜索用户名
	Keyword     string    `gorm:"size:255;index" json:"keyword"`      // 搜索关键词
	ResultCount int       `json:"result_count"`                       // 结果数
	Scope       string    `gorm:"size:16" json:"scope"`               // 搜索作用域：all | progressive
	ClientIP    string    `gorm:"size:64;index" json:"client_ip"`     // 客户端 IP
	RequestID   string    `gorm:"size:64" json:"request_id"`          // 请求 ID（便于串联日志）
	CreatedAt   time.Time `gorm:"index" json:"created_at"`            // 搜索发生时间
}

// TableName 指定表名
func (SearchAuditLog) TableName() string {
	return "search_audit_logs"
}
