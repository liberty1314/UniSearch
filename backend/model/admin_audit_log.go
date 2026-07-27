package model

import (
	"time"
)

// AdminAuditLog 记录管理员的写操作（POST/PUT/DELETE/PATCH），用于敏感操作留痕。
// 由 AdminAuditMiddleware 统一采集，关键处理器可通过 c.Set 补充语义字段。
type AdminAuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`             // 记录ID（主键，自增）
	OperatorID uint      `gorm:"index" json:"operator_id"`         // 操作人用户ID
	Operator   string    `gorm:"size:32;index" json:"operator"`    // 操作人用户名
	Method     string    `gorm:"size:8" json:"method"`             // HTTP 方法
	Path       string    `gorm:"size:255;index" json:"path"`       // 路由路径
	Action     string    `gorm:"size:64;index" json:"action"`      // 语义化操作名，如 ban_ip、delete_user
	Target     string    `gorm:"size:255" json:"target"`           // 目标对象描述
	StatusCode int       `json:"status_code"`                      // 响应状态码
	ClientIP   string    `gorm:"size:64" json:"client_ip"`         // 客户端 IP
	RequestID  string    `gorm:"size:64" json:"request_id"`        // 请求 ID
	CreatedAt  time.Time `gorm:"index" json:"created_at"`          // 操作发生时间
}

// TableName 指定表名
func (AdminAuditLog) TableName() string {
	return "admin_audit_logs"
}
