package model

import "time"

const (
	BannedIPSourceAuto   = "auto"
	BannedIPSourceManual = "manual"
)

// BannedIP 封禁 IP 名单条目。ExpiresAt 为空表示永久封禁。
type BannedIP struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	IP        string     `gorm:"size:64;not null;uniqueIndex" json:"ip"`
	Reason    string     `gorm:"size:255;not null;default:''" json:"reason"`
	Source    string     `gorm:"size:32;not null;default:'auto'" json:"source"` // auto | manual
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedBy string     `gorm:"size:64;not null;default:''" json:"created_by"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// TableName 指定封禁 IP 表名。
func (BannedIP) TableName() string {
	return "banned_ips"
}
