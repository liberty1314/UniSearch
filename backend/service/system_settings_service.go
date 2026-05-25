package service

import (
	"errors"
	"strings"
	"time"
	"unisearch/config"
	"unisearch/model"

	"gorm.io/gorm"
)

type SystemSettingsUpdateInput struct {
	EnableUserAuth            *bool
	EnableUserLogin           *bool
	EnableUserSignup          *bool
	EnableResourceDetailPage  *bool
	PublicSiteURL             *string
	DefaultCopyFormatTemplate *string
}

// SystemSettingsService 系统设置服务
type SystemSettingsService struct {
	db *gorm.DB
}

type TMDBAdminSettings struct {
	Configured bool
	UpdatedAt  *time.Time
	Source     string
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
				EnableUserAuth:            true,  // 默认启用用户登录注册
				EnableUserLogin:           true,  // 默认启用用户登录
				EnableUserSignup:          true,  // 默认启用用户注册
				AnnouncementEnabled:       false, // 默认禁用公告功能（需求 13.5）
				EnableResourceDetailPage:  false, // 默认关闭资源详情页
				PublicSiteURL:             "",
				DefaultCopyFormatTemplate: "",
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
func (s *SystemSettingsService) UpdateSettings(input SystemSettingsUpdateInput) (*model.SystemSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}

	// 更新主开关
	if input.EnableUserAuth != nil {
		settings.EnableUserAuth = *input.EnableUserAuth
	}

	// 更新子选项（如果提供）
	if input.EnableUserLogin != nil {
		settings.EnableUserLogin = *input.EnableUserLogin
	}
	if input.EnableUserSignup != nil {
		settings.EnableUserSignup = *input.EnableUserSignup
	}
	if input.EnableResourceDetailPage != nil {
		settings.EnableResourceDetailPage = *input.EnableResourceDetailPage
	}
	if input.PublicSiteURL != nil {
		settings.PublicSiteURL = strings.TrimSpace(*input.PublicSiteURL)
	}
	if input.DefaultCopyFormatTemplate != nil {
		settings.DefaultCopyFormatTemplate = strings.TrimSpace(*input.DefaultCopyFormatTemplate)
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
//
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

// GetTMDBSettings 获取 TMDB 后台配置状态
func (s *SystemSettingsService) GetTMDBSettings() (*TMDBAdminSettings, error) {
	manager := GetGlobalSecretManager()
	if manager == nil {
		return nil, errors.New("密钥管理服务未初始化")
	}

	settings := &TMDBAdminSettings{
		Configured: false,
		Source:     "unconfigured",
	}

	if _, err := manager.GetSecret(SecretNameTMDBReadAccessKey); err == nil {
		var secret model.Secret
		if dbManager, ok := manager.(*DatabaseSecretManager); ok {
			queryErr := dbManager.db.Where("name = ? AND is_active = ?", SecretNameTMDBReadAccessKey, true).
				Order("version DESC").
				First(&secret).Error
			if queryErr != nil {
				return nil, queryErr
			}
			settings.Configured = true
			settings.Source = "secret_manager"
			settings.UpdatedAt = &secret.UpdatedAt
			return settings, nil
		}

		now := time.Now()
		settings.Configured = true
		settings.Source = "env_fallback"
		settings.UpdatedAt = &now
		return settings, nil
	}

	if config.AppConfig != nil && strings.TrimSpace(config.AppConfig.TMDBReadAccessToken) != "" {
		now := time.Now()
		settings.Configured = true
		settings.Source = "env_fallback"
		settings.UpdatedAt = &now
	}

	return settings, nil
}

// UpdateTMDBReadAccessToken 更新 TMDB 访问令牌
func (s *SystemSettingsService) UpdateTMDBReadAccessToken(token string) error {
	manager := GetGlobalSecretManager()
	if manager == nil {
		return errors.New("密钥管理服务未初始化")
	}

	trimmedToken := strings.TrimSpace(token)
	if trimmedToken == "" {
		return errors.New("TMDB 读取令牌不能为空")
	}

	if _, ok := manager.(*EnvironmentSecretManager); ok {
		return errors.New("当前部署为环境变量密钥后端，后台不可写，请改环境变量或切换数据库密钥后端")
	}

	return manager.SetSecret(
		SecretNameTMDBReadAccessKey,
		trimmedToken,
		model.SecretTypeCustom,
		"TMDB 读取令牌",
	)
}
