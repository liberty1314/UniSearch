package model

import (
	"gorm.io/gorm"
	"time"
)

// User 用户模型
type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`                         // 用户ID（主键，自增）
	Username     string         `gorm:"uniqueIndex;not null;size:32" json:"username"` // 用户名（唯一索引，非空，最大32字符）
	PasswordHash string         `gorm:"not null;size:255" json:"-"`                   // 密码哈希（非空，不在JSON中序列化）
	Role         string         `gorm:"not null;default:'user';size:10" json:"role"`  // 角色（admin或user，默认user）
	CreatedAt    time.Time      `json:"created_at"`                                   // 创建时间
	UpdatedAt    time.Time      `json:"updated_at"`                                   // 更新时间
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`                               // 软删除时间（索引，不在JSON中序列化）

	// 关联关系：一个用户可以拥有多个API Key
	APIKeys []APIKey `gorm:"foreignKey:UserID" json:"-"` // 关联的API Keys（不在JSON中序列化）
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// IsAdmin 检查用户是否为管理员
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

// IsRegularUser 检查用户是否为普通用户
func (u *User) IsRegularUser() bool {
	return u.Role == "user"
}
