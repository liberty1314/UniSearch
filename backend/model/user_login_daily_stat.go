package model

import "time"

// UserLoginDailyStat 记录用户每天是否登录以及当天登录次数。
type UserLoginDailyStat struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"uniqueIndex:idx_user_login_day;not null" json:"user_id"`
	LoginDate  string    `gorm:"uniqueIndex:idx_user_login_day;size:10;not null" json:"login_date"`
	LoginCount int       `gorm:"not null;default:1" json:"login_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (UserLoginDailyStat) TableName() string {
	return "user_login_daily_stats"
}
