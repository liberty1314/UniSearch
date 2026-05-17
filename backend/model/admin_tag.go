package model

import "time"

const (
	AdminTagScopePlugin  = "plugin"
	AdminTagScopeChannel = "channel"
)

// AdminTag 后台标签词库条目，用 scope 区分插件和频道两套独立候选集。
type AdminTag struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Scope          string    `gorm:"type:varchar(32);index:idx_admin_tag_scope_normalized_name,unique;not null" json:"scope"`
	Name           string    `gorm:"type:varchar(255);not null" json:"name"`
	NormalizedName string    `gorm:"type:varchar(255);index:idx_admin_tag_scope_normalized_name,unique;not null" json:"-"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TableName 指定后台标签词库表名。
func (AdminTag) TableName() string {
	return "admin_tags"
}
