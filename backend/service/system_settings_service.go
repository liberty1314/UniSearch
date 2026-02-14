package service

import (
	"errors"
	"unisearch/model"

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
				EnableUserAuth:      true,  // 默认启用用户登录注册
				EnableUserLogin:     true,  // 默认启用用户登录
				EnableUserSignup:    true,  // 默认启用用户注册
				AnnouncementEnabled: false, // 默认禁用公告功能（需求 13.5）
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

// GetAnnouncementEnabled 获取公告功能启用状态
// 返回: 是否启用和错误信息
// 需求: 13.1
func (s *SystemSettingsService) GetAnnouncementEnabled() (bool, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return false, err
	}
	return settings.AnnouncementEnabled, nil
}

// SetAnnouncementEnabled 设置公告功能启用状态
// 参数:
//   - enabled: 是否启用
// 返回: 错误信息
// 需求: 13.1, 13.4
func (s *SystemSettingsService) SetAnnouncementEnabled(enabled bool) error {
	settings, err := s.GetSettings()
	if err != nil {
		return err
	}

	settings.AnnouncementEnabled = enabled

	if err := s.db.Save(settings).Error; err != nil {
		return err
	}

	return nil
}
