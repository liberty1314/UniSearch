package service

import (
	"errors"
	"pansou/model"

	"gorm.io/gorm"
)

// SystemSettingsService 系统设置服务
type SystemSettingsService struct {
	db *gorm.DB
}

// NewSystemSettingsService 创建系统设置服务实例
func NewSystemSettingsService(db *gorm.DB) *SystemSettingsService {
	return &SystemSettingsService{db: db}
}

// GetSettings 获取系统设置（如果不存在则创建默认设置）
func (s *SystemSettingsService) GetSettings() (*model.SystemSettings, error) {
	var settings model.SystemSettings
	
	// 尝试获取第一条记录
	err := s.db.First(&settings).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果不存在，创建默认设置
			settings = model.SystemSettings{
				EnableUserAuth:   true, // 默认启用用户登录注册
				EnableUserLogin:  true, // 默认启用用户登录
				EnableUserSignup: true, // 默认启用用户注册
			}
			if err := s.db.Create(&settings).Error; err != nil {
				return nil, err
			}
			return &settings, nil
		}
		return nil, err
	}
	
	return &settings, nil
}

// UpdateSettings 更新系统设置
func (s *SystemSettingsService) UpdateSettings(enableUserAuth bool, enableUserLogin *bool, enableUserSignup *bool) (*model.SystemSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}
	
	// 更新主开关
	settings.EnableUserAuth = enableUserAuth
	
	// 更新子选项（如果提供）
	if enableUserLogin != nil {
		settings.EnableUserLogin = *enableUserLogin
	}
	if enableUserSignup != nil {
		settings.EnableUserSignup = *enableUserSignup
	}
	
	if err := s.db.Save(settings).Error; err != nil {
		return nil, err
	}
	
	return settings, nil
}
