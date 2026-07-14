package service

import (
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"

	"gorm.io/gorm"
)

type SystemSettingsUpdateInput struct {
	EnableUserAuth              *bool
	EnableUserLogin             *bool
	EnableUserSignup            *bool
	EnableResourceDetailPage    *bool
	EnableResourceSourceBadges  *bool
	EnableSearchSourceDiversity *bool
	SearchFirstPageMaxPerSource *int
	PublicSiteURL               *string
	DefaultCopyFormatTemplate   *string
}

type CacheSettings struct {
	CacheEnabled                    bool   `json:"cache_enabled"`
	SearchCacheTTLSeconds           int    `json:"search_cache_ttl_seconds"`
	CacheWriteQueueSize             int    `json:"cache_write_queue_size"`
	CacheWriteWorkers               int    `json:"cache_write_workers"`
	HotRankingCacheEnabled          bool   `json:"hot_ranking_cache_enabled"`
	HotRankingPreloadEnabled        bool   `json:"hot_ranking_preload_enabled"`
	HotRankingPreloadTime           string `json:"hot_ranking_preload_time"`
	HotRankingPreloadLimit          int    `json:"hot_ranking_preload_limit"`
	HotRankingCacheTTLSeconds       int    `json:"hot_ranking_cache_ttl_seconds"`
	HotRankingPreloadConcurrency    int    `json:"hot_ranking_preload_concurrency"`
	HotRankingPreloadTimeoutSeconds int    `json:"hot_ranking_preload_timeout_seconds"`
}

type RuntimeSettings struct {
	DefaultConcurrency        int    `json:"default_concurrency"`
	HTTPMaxConns              int    `json:"http_max_conns"`
	AsyncPluginEnabled        bool   `json:"async_plugin_enabled"`
	AsyncResponseTimeout      int    `json:"async_response_timeout"`
	AsyncMaxBackgroundWorkers int    `json:"async_max_background_workers"`
	AsyncMaxBackgroundTasks   int    `json:"async_max_background_tasks"`
	ProxyEnabled              bool   `json:"proxy_enabled"`
	ProxyURL                  string `json:"proxy_url"`
	ProgressiveSearchEnabled  bool   `json:"progressive_search_enabled"`
}

type CacheSettingOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type CacheSettingOptions struct {
	SearchCacheTTLSeconds           []CacheSettingOption `json:"search_cache_ttl_seconds"`
	CacheWriteQueueSize             []CacheSettingOption `json:"cache_write_queue_size"`
	CacheWriteWorkers               []CacheSettingOption `json:"cache_write_workers"`
	HotRankingPreloadTime           []CacheSettingOption `json:"hot_ranking_preload_time"`
	HotRankingPreloadLimit          []CacheSettingOption `json:"hot_ranking_preload_limit"`
	HotRankingCacheTTLSeconds       []CacheSettingOption `json:"hot_ranking_cache_ttl_seconds"`
	HotRankingPreloadConcurrency    []CacheSettingOption `json:"hot_ranking_preload_concurrency"`
	HotRankingPreloadTimeoutSeconds []CacheSettingOption `json:"hot_ranking_preload_timeout_seconds"`
}

type CacheSettingsUpdateInput struct {
	CacheEnabled                    *bool
	SearchCacheTTLSeconds           *int
	CacheWriteQueueSize             *int
	CacheWriteWorkers               *int
	HotRankingCacheEnabled          *bool
	HotRankingPreloadEnabled        *bool
	HotRankingPreloadTime           *string
	HotRankingPreloadLimit          *int
	HotRankingCacheTTLSeconds       *int
	HotRankingPreloadConcurrency    *int
	HotRankingPreloadTimeoutSeconds *int
}

type RuntimeSettingsUpdateInput struct {
	DefaultConcurrency        *int
	HTTPMaxConns              *int
	AsyncPluginEnabled        *bool
	AsyncResponseTimeout      *int
	AsyncMaxBackgroundWorkers *int
	AsyncMaxBackgroundTasks   *int
	ProxyEnabled              *bool
	ProxyURL                  *string
	ProgressiveSearchEnabled  *bool
}

const (
	minSearchCacheTTLSeconds                = 60
	maxSearchCacheTTLSeconds                = 86400
	minCacheWriteQueueSize                  = 1
	maxCacheWriteQueueSize                  = 10000
	minCacheWriteWorkers                    = 1
	maxCacheWriteWorkers                    = 64
	minHotRankingPreloadLimit               = 1
	maxHotRankingPreloadLimit               = 100
	minHotRankingCacheTTLSeconds            = 300
	maxHotRankingCacheTTLSeconds            = 604800
	minHotRankingPreloadConcurrency         = 1
	maxHotRankingPreloadConcurrency         = 16
	minHotRankingPreloadTimeoutSeconds      = 5
	maxHotRankingPreloadTimeoutSeconds      = 300
	defaultSearchCacheTTLSeconds            = 3600
	defaultCacheWriteQueueSize              = 256
	defaultCacheWriteWorkers                = 4
	defaultHotRankingPreloadTime            = "00:00"
	defaultHotRankingPreloadLimit           = 50
	defaultHotRankingCacheTTLSeconds        = 86400
	defaultHotRankingPreloadConcurrency     = 2
	defaultHotRankingPreloadTimeoutSeconds  = 30
	minRuntimeDefaultConcurrency            = 1
	maxRuntimeDefaultConcurrency            = 500
	minRuntimeHTTPMaxConns                  = 1
	maxRuntimeHTTPMaxConns                  = 100000
	minRuntimeAsyncResponseTimeout          = 1
	maxRuntimeAsyncResponseTimeout          = 120
	minRuntimeAsyncMaxBackgroundWorkers     = 1
	maxRuntimeAsyncMaxBackgroundWorkers     = 1000
	minRuntimeAsyncMaxBackgroundTasks       = 1
	maxRuntimeAsyncMaxBackgroundTasks       = 100000
	defaultRuntimeDefaultConcurrency        = 50
	defaultRuntimeHTTPMaxConns              = 1000
	defaultRuntimeAsyncResponseTimeout      = 4
	defaultRuntimeAsyncMaxBackgroundWorkers = 20
	defaultRuntimeAsyncMaxBackgroundTasks   = 100
	minSearchFirstPageMaxPerSource          = 1
	maxSearchFirstPageMaxPerSource          = 48
	defaultSearchFirstPageMaxPerSource      = 16
)

// SystemSettingsService 系统设置服务
type SystemSettingsService struct {
	db               *gorm.DB
	ensureSchemaOnce sync.Once
	ensureSchemaErr  error
}

type TMDBAdminSettings struct {
	Configured      bool
	UpdatedAt       *time.Time
	Source          string
	ReadAccessToken string
	TokenPreview    string
}

// NewSystemSettingsService 创建系统设置服务实例
func NewSystemSettingsService(db *gorm.DB) *SystemSettingsService {
	return &SystemSettingsService{db: db}
}

func (s *SystemSettingsService) ensureSchema() error {
	s.ensureSchemaOnce.Do(func() {
		if s.db == nil {
			s.ensureSchemaErr = errors.New("数据库连接未初始化")
			return
		}

		s.ensureSchemaErr = s.db.AutoMigrate(&model.SystemSettings{})
	})

	return s.ensureSchemaErr
}

// GetSettings 获取系统设置（如果不存在则创建默认设置）
func (s *SystemSettingsService) GetSettings() (*model.SystemSettings, error) {
	if err := s.ensureSchema(); err != nil {
		return nil, err
	}

	var settings model.SystemSettings

	// 尝试获取第一条记录
	err := s.db.First(&settings).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			cacheDefaults := resolveDefaultCacheSettings()
			runtimeDefaults := resolveDefaultRuntimeSettings()
			// 如果不存在，创建默认设置
			settings = model.SystemSettings{
				EnableUserAuth:                   true,  // 默认启用用户登录注册
				EnableUserLogin:                  true,  // 默认启用用户登录
				EnableUserSignup:                 true,  // 默认启用用户注册
				AnnouncementEnabled:              false, // 默认禁用公告功能（需求 13.5）
				EnableResourceDetailPage:         false, // 默认关闭资源详情页
				EnableResourceSourceBadges:       false, // 默认关闭搜索结果来源标签
				EnableSearchSourceDiversity:      false, // 默认关闭搜索结果首屏来源配额
				SearchFirstPageMaxPerSource:      defaultSearchFirstPageMaxPerSource,
				PublicSiteURL:                    "",
				DefaultCopyFormatTemplate:        "",
				CacheEnabled:                     cacheDefaults.CacheEnabled,
				SearchCacheTTLSeconds:            cacheDefaults.SearchCacheTTLSeconds,
				CacheWriteQueueSize:              cacheDefaults.CacheWriteQueueSize,
				CacheWriteWorkers:                cacheDefaults.CacheWriteWorkers,
				HotRankingCacheEnabled:           cacheDefaults.HotRankingCacheEnabled,
				HotRankingPreloadEnabled:         cacheDefaults.HotRankingPreloadEnabled,
				HotRankingPreloadTime:            cacheDefaults.HotRankingPreloadTime,
				HotRankingPreloadLimit:           cacheDefaults.HotRankingPreloadLimit,
				HotRankingCacheTTLSeconds:        cacheDefaults.HotRankingCacheTTLSeconds,
				HotRankingPreloadConcurrency:     cacheDefaults.HotRankingPreloadConcurrency,
				HotRankingPreloadTimeoutSeconds:  cacheDefaults.HotRankingPreloadTimeoutSeconds,
				RuntimeDefaultConcurrency:        runtimeDefaults.DefaultConcurrency,
				RuntimeHTTPMaxConns:              runtimeDefaults.HTTPMaxConns,
				RuntimeAsyncPluginEnabled:        runtimeDefaults.AsyncPluginEnabled,
				RuntimeAsyncResponseTimeout:      runtimeDefaults.AsyncResponseTimeout,
				RuntimeAsyncMaxBackgroundWorkers: runtimeDefaults.AsyncMaxBackgroundWorkers,
				RuntimeAsyncMaxBackgroundTasks:   runtimeDefaults.AsyncMaxBackgroundTasks,
				RuntimeProxyEnabled:              runtimeDefaults.ProxyEnabled,
				RuntimeProxyURL:                  runtimeDefaults.ProxyURL,
				RuntimeProgressiveSearchEnabled:  runtimeDefaults.ProgressiveSearchEnabled,
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
	if input.SearchFirstPageMaxPerSource != nil {
		value := *input.SearchFirstPageMaxPerSource
		if value < minSearchFirstPageMaxPerSource || value > maxSearchFirstPageMaxPerSource {
			return nil, fmt.Errorf("首屏单来源上限必须在 %d 到 %d 之间", minSearchFirstPageMaxPerSource, maxSearchFirstPageMaxPerSource)
		}
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
	if input.EnableResourceSourceBadges != nil {
		settings.EnableResourceSourceBadges = *input.EnableResourceSourceBadges
	}
	if input.EnableSearchSourceDiversity != nil {
		settings.EnableSearchSourceDiversity = *input.EnableSearchSourceDiversity
	}
	if input.SearchFirstPageMaxPerSource != nil {
		settings.SearchFirstPageMaxPerSource = *input.SearchFirstPageMaxPerSource
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

func (s *SystemSettingsService) GetCacheSettings() (*CacheSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}

	return buildCacheSettings(settings), nil
}

func (s *SystemSettingsService) UpdateCacheSettings(input CacheSettingsUpdateInput) (*CacheSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}

	if err := validateCacheSettingsInput(input); err != nil {
		return nil, err
	}

	if input.CacheEnabled != nil {
		settings.CacheEnabled = *input.CacheEnabled
	}
	if input.SearchCacheTTLSeconds != nil {
		settings.SearchCacheTTLSeconds = *input.SearchCacheTTLSeconds
	}
	if input.CacheWriteQueueSize != nil {
		settings.CacheWriteQueueSize = *input.CacheWriteQueueSize
	}
	if input.CacheWriteWorkers != nil {
		settings.CacheWriteWorkers = *input.CacheWriteWorkers
	}
	if input.HotRankingCacheEnabled != nil {
		settings.HotRankingCacheEnabled = *input.HotRankingCacheEnabled
	}
	if input.HotRankingPreloadEnabled != nil {
		settings.HotRankingPreloadEnabled = *input.HotRankingPreloadEnabled
	}
	if input.HotRankingPreloadTime != nil {
		settings.HotRankingPreloadTime = normalizeHotRankingPreloadTime(*input.HotRankingPreloadTime)
	}
	if input.HotRankingPreloadLimit != nil {
		settings.HotRankingPreloadLimit = *input.HotRankingPreloadLimit
	}
	if input.HotRankingCacheTTLSeconds != nil {
		settings.HotRankingCacheTTLSeconds = *input.HotRankingCacheTTLSeconds
	}
	if input.HotRankingPreloadConcurrency != nil {
		settings.HotRankingPreloadConcurrency = *input.HotRankingPreloadConcurrency
	}
	if input.HotRankingPreloadTimeoutSeconds != nil {
		settings.HotRankingPreloadTimeoutSeconds = *input.HotRankingPreloadTimeoutSeconds
	}

	if err := s.db.Save(settings).Error; err != nil {
		return nil, err
	}

	return buildCacheSettings(settings), nil
}

func (s *SystemSettingsService) GetRuntimeSettings() (*RuntimeSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}

	return buildRuntimeSettings(settings), nil
}

func (s *SystemSettingsService) UpdateRuntimeSettings(input RuntimeSettingsUpdateInput) (*RuntimeSettings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		return nil, err
	}

	current := buildRuntimeSettings(settings)
	next := *current
	if input.DefaultConcurrency != nil {
		next.DefaultConcurrency = *input.DefaultConcurrency
	}
	if input.HTTPMaxConns != nil {
		next.HTTPMaxConns = *input.HTTPMaxConns
	}
	if input.AsyncPluginEnabled != nil {
		next.AsyncPluginEnabled = *input.AsyncPluginEnabled
	}
	if input.AsyncResponseTimeout != nil {
		next.AsyncResponseTimeout = *input.AsyncResponseTimeout
	}
	if input.AsyncMaxBackgroundWorkers != nil {
		next.AsyncMaxBackgroundWorkers = *input.AsyncMaxBackgroundWorkers
	}
	if input.AsyncMaxBackgroundTasks != nil {
		next.AsyncMaxBackgroundTasks = *input.AsyncMaxBackgroundTasks
	}
	if input.ProxyEnabled != nil {
		next.ProxyEnabled = *input.ProxyEnabled
	}
	if input.ProxyURL != nil {
		next.ProxyURL = normalizeRuntimeProxyURL(*input.ProxyURL)
	}
	if input.ProgressiveSearchEnabled != nil {
		next.ProgressiveSearchEnabled = *input.ProgressiveSearchEnabled
	}
	if strings.TrimSpace(next.ProxyURL) == "" {
		next.ProxyEnabled = false
	}

	if err := validateRuntimeSettings(next); err != nil {
		return nil, err
	}

	settings.RuntimeDefaultConcurrency = next.DefaultConcurrency
	settings.RuntimeHTTPMaxConns = next.HTTPMaxConns
	settings.RuntimeAsyncPluginEnabled = next.AsyncPluginEnabled
	settings.RuntimeAsyncResponseTimeout = next.AsyncResponseTimeout
	settings.RuntimeAsyncMaxBackgroundWorkers = next.AsyncMaxBackgroundWorkers
	settings.RuntimeAsyncMaxBackgroundTasks = next.AsyncMaxBackgroundTasks
	settings.RuntimeProxyEnabled = next.ProxyEnabled
	settings.RuntimeProxyURL = next.ProxyURL
	settings.RuntimeProgressiveSearchEnabled = next.ProgressiveSearchEnabled

	if err := s.db.Save(settings).Error; err != nil {
		return nil, err
	}

	s.ApplyRuntimeSettings(&next)
	util.ReloadHTTPClient()

	return &next, nil
}

func (s *SystemSettingsService) ApplyRuntimeSettings(settings *RuntimeSettings) {
	if settings == nil {
		return
	}
	if config.AppConfig == nil {
		config.AppConfig = &config.Config{}
	}

	config.AppConfig.DefaultConcurrency = settings.DefaultConcurrency
	config.AppConfig.HTTPMaxConns = settings.HTTPMaxConns
	config.AppConfig.AsyncPluginEnabled = settings.AsyncPluginEnabled
	config.AppConfig.AsyncResponseTimeout = settings.AsyncResponseTimeout
	config.AppConfig.AsyncResponseTimeoutDur = time.Duration(settings.AsyncResponseTimeout) * time.Second
	config.AppConfig.AsyncMaxBackgroundWorkers = settings.AsyncMaxBackgroundWorkers
	config.AppConfig.AsyncMaxBackgroundTasks = settings.AsyncMaxBackgroundTasks
	config.AppConfig.UseProxy = settings.ProxyEnabled && strings.TrimSpace(settings.ProxyURL) != ""
	config.AppConfig.ProxyURL = strings.TrimSpace(settings.ProxyURL)
	config.AppConfig.ProgressiveSearchEnabled = settings.ProgressiveSearchEnabled
	plugin.SyncConfiguredProxyFromAppConfig()
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
		secretValue, getErr := manager.GetSecret(SecretNameTMDBReadAccessKey)
		if getErr != nil {
			return nil, getErr
		}
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
			settings.TokenPreview = maskSecretPreview(secretValue)
			return settings, nil
		}

		now := time.Now()
		settings.Configured = true
		settings.Source = "env_fallback"
		settings.UpdatedAt = &now
		settings.TokenPreview = maskSecretPreview(secretValue)
		return settings, nil
	}

	if config.AppConfig != nil && strings.TrimSpace(config.AppConfig.TMDBReadAccessToken) != "" {
		now := time.Now()
		settings.Configured = true
		settings.Source = "env_fallback"
		settings.UpdatedAt = &now
		settings.TokenPreview = maskSecretPreview(config.AppConfig.TMDBReadAccessToken)
	}

	return settings, nil
}

func maskSecretPreview(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if len(trimmed) <= 8 {
		return strings.Repeat("*", len(trimmed))
	}
	return trimmed[:4] + strings.Repeat("*", 8) + trimmed[len(trimmed)-4:]
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

func (s *SystemSettingsService) GetCacheSettingOptions() *CacheSettingOptions {
	defaults := resolveDefaultCacheSettings()

	return &CacheSettingOptions{
		SearchCacheTTLSeconds: buildNumberCacheSettingOptions(
			[]int{1800, 3600, 7200, 21600, 43200, 86400},
			defaults.SearchCacheTTLSeconds,
			formatTTLSecondsLabel,
		),
		CacheWriteQueueSize: buildNumberCacheSettingOptions(
			[]int{64, 128, 256, 512, 1024, 2048},
			defaults.CacheWriteQueueSize,
			func(value int) string { return fmt.Sprintf("%d", value) },
		),
		CacheWriteWorkers: buildNumberCacheSettingOptions(
			[]int{1, 2, 4, 8, 16},
			defaults.CacheWriteWorkers,
			func(value int) string { return fmt.Sprintf("%d", value) },
		),
		HotRankingPreloadTime: buildTimeCacheSettingOptions(
			[]string{"00:00", "00:30", "01:00", "02:00", "06:00", "12:00"},
			defaults.HotRankingPreloadTime,
		),
		HotRankingPreloadLimit: buildNumberCacheSettingOptions(
			[]int{20, 30, 50, 80, 100},
			defaults.HotRankingPreloadLimit,
			func(value int) string { return fmt.Sprintf("%d 条", value) },
		),
		HotRankingCacheTTLSeconds: buildNumberCacheSettingOptions(
			[]int{3600, 21600, 43200, 86400, 172800},
			defaults.HotRankingCacheTTLSeconds,
			formatTTLSecondsLabel,
		),
		HotRankingPreloadConcurrency: buildNumberCacheSettingOptions(
			[]int{1, 2, 4, 8, 16},
			defaults.HotRankingPreloadConcurrency,
			func(value int) string { return fmt.Sprintf("%d", value) },
		),
		HotRankingPreloadTimeoutSeconds: buildNumberCacheSettingOptions(
			[]int{10, 20, 30, 45, 60, 120},
			defaults.HotRankingPreloadTimeoutSeconds,
			func(value int) string { return fmt.Sprintf("%d 秒", value) },
		),
	}
}

func buildCacheSettings(settings *model.SystemSettings) *CacheSettings {
	return &CacheSettings{
		CacheEnabled:                    settings.CacheEnabled,
		SearchCacheTTLSeconds:           settings.SearchCacheTTLSeconds,
		CacheWriteQueueSize:             settings.CacheWriteQueueSize,
		CacheWriteWorkers:               settings.CacheWriteWorkers,
		HotRankingCacheEnabled:          settings.HotRankingCacheEnabled,
		HotRankingPreloadEnabled:        settings.HotRankingPreloadEnabled,
		HotRankingPreloadTime:           settings.HotRankingPreloadTime,
		HotRankingPreloadLimit:          settings.HotRankingPreloadLimit,
		HotRankingCacheTTLSeconds:       settings.HotRankingCacheTTLSeconds,
		HotRankingPreloadConcurrency:    settings.HotRankingPreloadConcurrency,
		HotRankingPreloadTimeoutSeconds: settings.HotRankingPreloadTimeoutSeconds,
	}
}

func buildRuntimeSettings(settings *model.SystemSettings) *RuntimeSettings {
	defaults := resolveDefaultRuntimeSettings()
	runtimeSettings := &RuntimeSettings{
		DefaultConcurrency:        settings.RuntimeDefaultConcurrency,
		HTTPMaxConns:              settings.RuntimeHTTPMaxConns,
		AsyncPluginEnabled:        settings.RuntimeAsyncPluginEnabled,
		AsyncResponseTimeout:      settings.RuntimeAsyncResponseTimeout,
		AsyncMaxBackgroundWorkers: settings.RuntimeAsyncMaxBackgroundWorkers,
		AsyncMaxBackgroundTasks:   settings.RuntimeAsyncMaxBackgroundTasks,
		ProxyEnabled:              settings.RuntimeProxyEnabled,
		ProxyURL:                  strings.TrimSpace(settings.RuntimeProxyURL),
		ProgressiveSearchEnabled:  settings.RuntimeProgressiveSearchEnabled,
	}

	if runtimeSettings.DefaultConcurrency <= 0 {
		runtimeSettings.DefaultConcurrency = defaults.DefaultConcurrency
	}
	if runtimeSettings.HTTPMaxConns <= 0 {
		runtimeSettings.HTTPMaxConns = defaults.HTTPMaxConns
	}
	if runtimeSettings.AsyncResponseTimeout <= 0 {
		runtimeSettings.AsyncResponseTimeout = defaults.AsyncResponseTimeout
	}
	if runtimeSettings.AsyncMaxBackgroundWorkers <= 0 {
		runtimeSettings.AsyncMaxBackgroundWorkers = defaults.AsyncMaxBackgroundWorkers
	}
	if runtimeSettings.AsyncMaxBackgroundTasks <= 0 {
		runtimeSettings.AsyncMaxBackgroundTasks = defaults.AsyncMaxBackgroundTasks
	}
	if runtimeSettings.ProxyURL == "" {
		runtimeSettings.ProxyEnabled = false
	}
	if !settings.RuntimeProgressiveSearchEnabled && settings.ID == 0 {
		runtimeSettings.ProgressiveSearchEnabled = defaults.ProgressiveSearchEnabled
	}

	return runtimeSettings
}

func resolveDefaultCacheSettings() CacheSettings {
	defaults := CacheSettings{
		CacheEnabled:                    true,
		SearchCacheTTLSeconds:           defaultSearchCacheTTLSeconds,
		CacheWriteQueueSize:             defaultCacheWriteQueueSize,
		CacheWriteWorkers:               defaultCacheWriteWorkers,
		HotRankingCacheEnabled:          true,
		HotRankingPreloadEnabled:        true,
		HotRankingPreloadTime:           defaultHotRankingPreloadTime,
		HotRankingPreloadLimit:          defaultHotRankingPreloadLimit,
		HotRankingCacheTTLSeconds:       defaultHotRankingCacheTTLSeconds,
		HotRankingPreloadConcurrency:    defaultHotRankingPreloadConcurrency,
		HotRankingPreloadTimeoutSeconds: defaultHotRankingPreloadTimeoutSeconds,
	}

	if config.AppConfig == nil {
		return defaults
	}

	defaults.CacheEnabled = config.AppConfig.CacheEnabled
	defaults.HotRankingCacheEnabled = config.AppConfig.CacheEnabled
	defaults.HotRankingPreloadEnabled = config.AppConfig.HotRankingPreloadEnabled

	if config.AppConfig.RedisTTL > 0 {
		defaults.SearchCacheTTLSeconds = int(config.AppConfig.RedisTTL / time.Second)
	}

	if config.AppConfig.CacheWriteQueueSize > 0 {
		defaults.CacheWriteQueueSize = config.AppConfig.CacheWriteQueueSize
	}
	if config.AppConfig.CacheWriteWorkers > 0 {
		defaults.CacheWriteWorkers = config.AppConfig.CacheWriteWorkers
	}
	if normalizedTime := normalizeHotRankingPreloadTime(config.AppConfig.HotRankingPreloadTime); normalizedTime != "" {
		defaults.HotRankingPreloadTime = normalizedTime
	}
	if config.AppConfig.HotRankingCacheTTLDay > 0 {
		defaults.HotRankingCacheTTLSeconds = int(config.AppConfig.HotRankingCacheTTLDay / time.Second)
	}
	if config.AppConfig.HotRankingPreloadConcurrency > 0 {
		defaults.HotRankingPreloadConcurrency = config.AppConfig.HotRankingPreloadConcurrency
	}
	if config.AppConfig.HotRankingPreloadTimeout > 0 {
		defaults.HotRankingPreloadTimeoutSeconds = int(config.AppConfig.HotRankingPreloadTimeout / time.Second)
	}

	return defaults
}

func resolveDefaultRuntimeSettings() RuntimeSettings {
	defaults := RuntimeSettings{
		DefaultConcurrency:        defaultRuntimeDefaultConcurrency,
		HTTPMaxConns:              defaultRuntimeHTTPMaxConns,
		AsyncPluginEnabled:        true,
		AsyncResponseTimeout:      defaultRuntimeAsyncResponseTimeout,
		AsyncMaxBackgroundWorkers: defaultRuntimeAsyncMaxBackgroundWorkers,
		AsyncMaxBackgroundTasks:   defaultRuntimeAsyncMaxBackgroundTasks,
		ProxyEnabled:              false,
		ProxyURL:                  "",
		ProgressiveSearchEnabled:  true,
	}

	if config.AppConfig == nil {
		return defaults
	}

	if config.AppConfig.DefaultConcurrency > 0 {
		defaults.DefaultConcurrency = config.AppConfig.DefaultConcurrency
	}
	if config.AppConfig.HTTPMaxConns > 0 {
		defaults.HTTPMaxConns = config.AppConfig.HTTPMaxConns
	}
	defaults.AsyncPluginEnabled = config.AppConfig.AsyncPluginEnabled
	if config.AppConfig.AsyncResponseTimeout > 0 {
		defaults.AsyncResponseTimeout = config.AppConfig.AsyncResponseTimeout
	}
	if config.AppConfig.AsyncMaxBackgroundWorkers > 0 {
		defaults.AsyncMaxBackgroundWorkers = config.AppConfig.AsyncMaxBackgroundWorkers
	}
	if config.AppConfig.AsyncMaxBackgroundTasks > 0 {
		defaults.AsyncMaxBackgroundTasks = config.AppConfig.AsyncMaxBackgroundTasks
	}
	defaults.ProxyURL = strings.TrimSpace(config.AppConfig.ProxyURL)
	defaults.ProxyEnabled = config.AppConfig.UseProxy && defaults.ProxyURL != ""
	return defaults
}

func validateCacheSettingsInput(input CacheSettingsUpdateInput) error {
	if input.SearchCacheTTLSeconds != nil {
		if err := validateCacheSettingRange("search_cache_ttl_seconds", *input.SearchCacheTTLSeconds, minSearchCacheTTLSeconds, maxSearchCacheTTLSeconds); err != nil {
			return err
		}
	}
	if input.CacheWriteQueueSize != nil {
		if err := validateCacheSettingRange("cache_write_queue_size", *input.CacheWriteQueueSize, minCacheWriteQueueSize, maxCacheWriteQueueSize); err != nil {
			return err
		}
	}
	if input.CacheWriteWorkers != nil {
		if err := validateCacheSettingRange("cache_write_workers", *input.CacheWriteWorkers, minCacheWriteWorkers, maxCacheWriteWorkers); err != nil {
			return err
		}
	}
	if input.HotRankingPreloadTime != nil {
		if normalizeHotRankingPreloadTime(*input.HotRankingPreloadTime) == "" {
			return errors.New("hot_ranking_preload_time 格式无效，必须为 HH:mm")
		}
	}
	if input.HotRankingPreloadLimit != nil {
		if err := validateCacheSettingRange("hot_ranking_preload_limit", *input.HotRankingPreloadLimit, minHotRankingPreloadLimit, maxHotRankingPreloadLimit); err != nil {
			return err
		}
	}
	if input.HotRankingCacheTTLSeconds != nil {
		if err := validateCacheSettingRange("hot_ranking_cache_ttl_seconds", *input.HotRankingCacheTTLSeconds, minHotRankingCacheTTLSeconds, maxHotRankingCacheTTLSeconds); err != nil {
			return err
		}
	}
	if input.HotRankingPreloadConcurrency != nil {
		if err := validateCacheSettingRange("hot_ranking_preload_concurrency", *input.HotRankingPreloadConcurrency, minHotRankingPreloadConcurrency, maxHotRankingPreloadConcurrency); err != nil {
			return err
		}
	}
	if input.HotRankingPreloadTimeoutSeconds != nil {
		if err := validateCacheSettingRange("hot_ranking_preload_timeout_seconds", *input.HotRankingPreloadTimeoutSeconds, minHotRankingPreloadTimeoutSeconds, maxHotRankingPreloadTimeoutSeconds); err != nil {
			return err
		}
	}

	return nil
}

func validateRuntimeSettings(settings RuntimeSettings) error {
	if err := validateCacheSettingRange("default_concurrency", settings.DefaultConcurrency, minRuntimeDefaultConcurrency, maxRuntimeDefaultConcurrency); err != nil {
		return err
	}
	if err := validateCacheSettingRange("http_max_conns", settings.HTTPMaxConns, minRuntimeHTTPMaxConns, maxRuntimeHTTPMaxConns); err != nil {
		return err
	}
	if err := validateCacheSettingRange("async_response_timeout", settings.AsyncResponseTimeout, minRuntimeAsyncResponseTimeout, maxRuntimeAsyncResponseTimeout); err != nil {
		return err
	}
	if err := validateCacheSettingRange("async_max_background_workers", settings.AsyncMaxBackgroundWorkers, minRuntimeAsyncMaxBackgroundWorkers, maxRuntimeAsyncMaxBackgroundWorkers); err != nil {
		return err
	}
	if err := validateCacheSettingRange("async_max_background_tasks", settings.AsyncMaxBackgroundTasks, minRuntimeAsyncMaxBackgroundTasks, maxRuntimeAsyncMaxBackgroundTasks); err != nil {
		return err
	}
	if settings.AsyncMaxBackgroundTasks < settings.AsyncMaxBackgroundWorkers {
		return errors.New("最大任务数不能小于最大工作者数量")
	}
	if strings.TrimSpace(settings.ProxyURL) != "" {
		if _, err := parseRuntimeProxyURL(settings.ProxyURL); err != nil {
			return err
		}
	}
	return nil
}

func normalizeRuntimeProxyURL(value string) string {
	return strings.TrimSpace(value)
}

func parseRuntimeProxyURL(value string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return nil, fmt.Errorf("代理地址格式无效: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" && parsed.Scheme != "socks5" {
		return nil, errors.New("代理地址只支持 http、https 或 socks5")
	}
	if parsed.Host == "" {
		return nil, errors.New("代理地址必须包含主机")
	}
	return parsed, nil
}

func validateCacheSettingRange(name string, value int, minValue int, maxValue int) error {
	if value < minValue || value > maxValue {
		return fmt.Errorf("%s 超出允许范围 [%d, %d]", name, minValue, maxValue)
	}
	return nil
}

func normalizeHotRankingPreloadTime(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	parsed, err := time.Parse("15:04", trimmed)
	if err != nil {
		return ""
	}
	return parsed.Format("15:04")
}

func buildNumberCacheSettingOptions(values []int, defaultValue int, formatter func(int) string) []CacheSettingOption {
	normalizedValues := append([]int{}, values...)
	if !containsInt(normalizedValues, defaultValue) {
		normalizedValues = append(normalizedValues, defaultValue)
	}
	sort.Ints(normalizedValues)

	options := make([]CacheSettingOption, 0, len(normalizedValues))
	for _, value := range normalizedValues {
		label := formatter(value)
		if value == defaultValue {
			label += "（默认）"
		}
		options = append(options, CacheSettingOption{
			Value: fmt.Sprintf("%d", value),
			Label: label,
		})
	}

	return options
}

func buildTimeCacheSettingOptions(values []string, defaultValue string) []CacheSettingOption {
	normalizedValues := make([]string, 0, len(values)+1)
	seen := make(map[string]struct{}, len(values)+1)

	appendValue := func(value string) {
		if _, exists := seen[value]; exists {
			return
		}
		seen[value] = struct{}{}
		normalizedValues = append(normalizedValues, value)
	}

	for _, value := range values {
		appendValue(value)
	}
	appendValue(defaultValue)
	sort.Strings(normalizedValues)

	options := make([]CacheSettingOption, 0, len(normalizedValues))
	for _, value := range normalizedValues {
		label := value
		if value == defaultValue {
			label += "（默认）"
		}
		options = append(options, CacheSettingOption{
			Value: value,
			Label: label,
		})
	}

	return options
}

func containsInt(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func formatTTLSecondsLabel(value int) string {
	if value%(24*3600) == 0 {
		return fmt.Sprintf("%d 天", value/(24*3600))
	}
	if value%3600 == 0 {
		return fmt.Sprintf("%d 小时", value/3600)
	}
	if value%60 == 0 {
		return fmt.Sprintf("%d 分钟", value/60)
	}
	return fmt.Sprintf("%d 秒", value)
}
