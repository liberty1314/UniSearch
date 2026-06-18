package api

import (
	"net/http"
	"strings"
	"time"
	"unisearch/config"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var systemSettingsService *service.SystemSettingsService
var hotRankingCacheAdminService hotRankingCacheAdminController

type hotRankingCacheAdminController interface {
	WarmCache(settingsService *service.SystemSettingsService, cfg service.HotRankingPreloaderConfig) service.HotRankingPreloadResult
	ClearCache(settingsService *service.SystemSettingsService) error
	HasCacheBackend() bool
	GetLastPreloadSnapshot() *service.HotRankingPreloadSnapshot
}

// SetSystemSettingsService 设置系统设置服务
func SetSystemSettingsService(service *service.SystemSettingsService) {
	systemSettingsService = service
}

func SetHotRankingCacheAdminService(adminService hotRankingCacheAdminController) {
	hotRankingCacheAdminService = adminService
}

// GetSystemSettingsHandler 获取系统设置（公开接口）
// 验证需求：允许未登录用户访问，用于登录页面判断是否显示用户登录选项
func GetSystemSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "系统设置服务未初始化",
		})
		return
	}

	settings, err := systemSettingsService.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系统设置失败：" + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"enable_user_auth":             settings.EnableUserAuth,
		"enable_user_login":            settings.EnableUserLogin,
		"enable_user_signup":           settings.EnableUserSignup,
		"auth_username_min_length":     config.AppConfig.AuthUsernameMinLength,
		"auth_username_max_length":     config.AppConfig.AuthUsernameMaxLength,
		"auth_password_min_length":     config.AppConfig.AuthPasswordMinLength,
		"auth_password_max_length":     config.AppConfig.AuthPasswordMaxLength,
		"enable_resource_detail_page":  settings.EnableResourceDetailPage,
		"public_site_url":              settings.PublicSiteURL,
		"default_copy_format_template": settings.DefaultCopyFormatTemplate,
	})
}

// UpdateSystemSettingsHandler 更新系统设置（管理员接口）
// 验证需求：仅管理员可访问
func UpdateSystemSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "系统设置服务未初始化",
		})
		return
	}

	// 解析请求体
	var req struct {
		EnableUserAuth            *bool   `json:"enable_user_auth"`
		EnableUserLogin           *bool   `json:"enable_user_login"`
		EnableUserSignup          *bool   `json:"enable_user_signup"`
		EnableResourceDetailPage  *bool   `json:"enable_resource_detail_page"`
		PublicSiteURL             *string `json:"public_site_url"`
		DefaultCopyFormatTemplate *string `json:"default_copy_format_template"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误：" + err.Error(),
		})
		return
	}

	// 至少需要提供一个字段
	if req.EnableUserAuth == nil &&
		req.EnableUserLogin == nil &&
		req.EnableUserSignup == nil &&
		req.EnableResourceDetailPage == nil &&
		req.PublicSiteURL == nil &&
		req.DefaultCopyFormatTemplate == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误：至少需要提供一个设置字段",
		})
		return
	}

	// 获取当前设置
	currentSettings, err := systemSettingsService.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取当前设置失败：" + err.Error(),
		})
		return
	}

	// 确定主开关的值
	// 更新设置
	input := service.SystemSettingsUpdateInput{
		EnableUserLogin:           req.EnableUserLogin,
		EnableUserSignup:          req.EnableUserSignup,
		EnableResourceDetailPage:  req.EnableResourceDetailPage,
		PublicSiteURL:             req.PublicSiteURL,
		DefaultCopyFormatTemplate: req.DefaultCopyFormatTemplate,
	}
	if req.EnableUserAuth != nil {
		input.EnableUserAuth = req.EnableUserAuth
	} else {
		input.EnableUserAuth = &currentSettings.EnableUserAuth
	}

	settings, err := systemSettingsService.UpdateSettings(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新系统设置失败：" + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":                      "系统设置已更新",
		"enable_user_auth":             settings.EnableUserAuth,
		"enable_user_login":            settings.EnableUserLogin,
		"enable_user_signup":           settings.EnableUserSignup,
		"enable_resource_detail_page":  settings.EnableResourceDetailPage,
		"public_site_url":              settings.PublicSiteURL,
		"default_copy_format_template": settings.DefaultCopyFormatTemplate,
	})
}

// GetTMDBAdminSettingsHandler 获取 TMDB 管理配置状态
func GetTMDBAdminSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "系统设置服务未初始化",
		})
		return
	}

	settings, err := systemSettingsService.GetTMDBSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取 TMDB 配置状态失败：" + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"configured":        settings.Configured,
		"updated_at":        settings.UpdatedAt,
		"source":            settings.Source,
		"read_access_token": settings.ReadAccessToken,
	})
}

// UpdateTMDBAdminSettingsHandler 更新 TMDB 读取令牌
func UpdateTMDBAdminSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "系统设置服务未初始化",
		})
		return
	}

	var req struct {
		TMDBReadAccessToken string `json:"tmdb_read_access_token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误：" + err.Error(),
		})
		return
	}

	if strings.TrimSpace(req.TMDBReadAccessToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误：tmdb_read_access_token 不能为空",
		})
		return
	}

	if err := systemSettingsService.UpdateTMDBReadAccessToken(req.TMDBReadAccessToken); err != nil {
		statusCode := http.StatusInternalServerError
		if strings.Contains(err.Error(), "后台不可写") {
			statusCode = http.StatusBadRequest
		}
		c.JSON(statusCode, gin.H{
			"error": "更新 TMDB 配置失败：" + err.Error(),
		})
		return
	}

	settings, err := systemSettingsService.GetTMDBSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取 TMDB 配置状态失败：" + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "TMDB 配置已更新",
		"configured":        settings.Configured,
		"updated_at":        settings.UpdatedAt,
		"source":            settings.Source,
		"read_access_token": settings.ReadAccessToken,
	})
}

func GetCacheSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}

	settings, err := systemSettingsService.GetCacheSettings()
	if err != nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "获取缓存配置失败："+err.Error())
		return
	}

	response := buildCacheSettingsResponse(settings)
	c.JSON(http.StatusOK, response)
}

func UpdateCacheSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}

	var req struct {
		CacheEnabled                    *bool   `json:"cache_enabled"`
		SearchCacheTTLSeconds           *int    `json:"search_cache_ttl_seconds"`
		CacheWriteQueueSize             *int    `json:"cache_write_queue_size"`
		CacheWriteWorkers               *int    `json:"cache_write_workers"`
		HotRankingCacheEnabled          *bool   `json:"hot_ranking_cache_enabled"`
		HotRankingPreloadEnabled        *bool   `json:"hot_ranking_preload_enabled"`
		HotRankingPreloadTime           *string `json:"hot_ranking_preload_time"`
		HotRankingPreloadLimit          *int    `json:"hot_ranking_preload_limit"`
		HotRankingCacheTTLSeconds       *int    `json:"hot_ranking_cache_ttl_seconds"`
		HotRankingPreloadConcurrency    *int    `json:"hot_ranking_preload_concurrency"`
		HotRankingPreloadTimeoutSeconds *int    `json:"hot_ranking_preload_timeout_seconds"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		writeCacheAdminError(c, http.StatusBadRequest, "请求参数错误："+err.Error())
		return
	}

	if req.CacheEnabled == nil &&
		req.SearchCacheTTLSeconds == nil &&
		req.CacheWriteQueueSize == nil &&
		req.CacheWriteWorkers == nil &&
		req.HotRankingCacheEnabled == nil &&
		req.HotRankingPreloadEnabled == nil &&
		req.HotRankingPreloadTime == nil &&
		req.HotRankingPreloadLimit == nil &&
		req.HotRankingCacheTTLSeconds == nil &&
		req.HotRankingPreloadConcurrency == nil &&
		req.HotRankingPreloadTimeoutSeconds == nil {
		writeCacheAdminError(c, http.StatusBadRequest, "请求参数错误：至少需要提供一个缓存设置字段")
		return
	}

	settings, err := systemSettingsService.UpdateCacheSettings(service.CacheSettingsUpdateInput{
		CacheEnabled:                    req.CacheEnabled,
		SearchCacheTTLSeconds:           req.SearchCacheTTLSeconds,
		CacheWriteQueueSize:             req.CacheWriteQueueSize,
		CacheWriteWorkers:               req.CacheWriteWorkers,
		HotRankingCacheEnabled:          req.HotRankingCacheEnabled,
		HotRankingPreloadEnabled:        req.HotRankingPreloadEnabled,
		HotRankingPreloadTime:           req.HotRankingPreloadTime,
		HotRankingPreloadLimit:          req.HotRankingPreloadLimit,
		HotRankingCacheTTLSeconds:       req.HotRankingCacheTTLSeconds,
		HotRankingPreloadConcurrency:    req.HotRankingPreloadConcurrency,
		HotRankingPreloadTimeoutSeconds: req.HotRankingPreloadTimeoutSeconds,
	})
	if err != nil {
		writeCacheAdminError(c, http.StatusBadRequest, "更新缓存配置失败："+err.Error())
		return
	}

	response := buildCacheSettingsResponse(settings)
	response["message"] = "缓存配置已更新"
	c.JSON(http.StatusOK, response)
}

func GetRuntimeSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeRuntimeAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}

	settings, err := systemSettingsService.GetRuntimeSettings()
	if err != nil {
		writeRuntimeAdminError(c, http.StatusInternalServerError, "获取运行配置失败："+err.Error())
		return
	}

	c.JSON(http.StatusOK, buildRuntimeSettingsResponse(settings))
}

func UpdateRuntimeSettingsHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeRuntimeAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}

	var req struct {
		DefaultConcurrency        *int    `json:"default_concurrency"`
		HTTPMaxConns              *int    `json:"http_max_conns"`
		AsyncPluginEnabled        *bool   `json:"async_plugin_enabled"`
		AsyncResponseTimeout      *int    `json:"async_response_timeout"`
		AsyncMaxBackgroundWorkers *int    `json:"async_max_background_workers"`
		AsyncMaxBackgroundTasks   *int    `json:"async_max_background_tasks"`
		ProxyEnabled              *bool   `json:"proxy_enabled"`
		ProxyURL                  *string `json:"proxy_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		writeRuntimeAdminError(c, http.StatusBadRequest, "请求参数错误："+err.Error())
		return
	}

	if req.DefaultConcurrency == nil &&
		req.HTTPMaxConns == nil &&
		req.AsyncPluginEnabled == nil &&
		req.AsyncResponseTimeout == nil &&
		req.AsyncMaxBackgroundWorkers == nil &&
		req.AsyncMaxBackgroundTasks == nil &&
		req.ProxyEnabled == nil &&
		req.ProxyURL == nil {
		writeRuntimeAdminError(c, http.StatusBadRequest, "请求参数错误：至少需要提供一个运行配置字段")
		return
	}

	settings, err := systemSettingsService.UpdateRuntimeSettings(service.RuntimeSettingsUpdateInput{
		DefaultConcurrency:        req.DefaultConcurrency,
		HTTPMaxConns:              req.HTTPMaxConns,
		AsyncPluginEnabled:        req.AsyncPluginEnabled,
		AsyncResponseTimeout:      req.AsyncResponseTimeout,
		AsyncMaxBackgroundWorkers: req.AsyncMaxBackgroundWorkers,
		AsyncMaxBackgroundTasks:   req.AsyncMaxBackgroundTasks,
		ProxyEnabled:              req.ProxyEnabled,
		ProxyURL:                  req.ProxyURL,
	})
	if err != nil {
		writeRuntimeAdminError(c, http.StatusBadRequest, "更新运行配置失败："+err.Error())
		return
	}

	response := buildRuntimeSettingsResponse(settings)
	response["message"] = "运行配置已更新"
	c.JSON(http.StatusOK, response)
}

func TriggerHotRankingPreloadHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}
	if hotRankingCacheAdminService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "热门榜单缓存服务未初始化")
		return
	}

	cacheSettings, err := systemSettingsService.GetCacheSettings()
	if err != nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "获取缓存配置失败："+err.Error())
		return
	}

	result := hotRankingCacheAdminService.WarmCache(systemSettingsService, service.HotRankingPreloaderConfig{
		Enabled:     true,
		DailyTime:   cacheSettings.HotRankingPreloadTime,
		Timeout:     time.Duration(cacheSettings.HotRankingPreloadTimeoutSeconds) * time.Second,
		Concurrency: cacheSettings.HotRankingPreloadConcurrency,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "热门榜单预热已完成",
		"result":  result,
	})
}

func ClearHotRankingCacheHandler(c *gin.Context) {
	if systemSettingsService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "系统设置服务未初始化")
		return
	}
	if hotRankingCacheAdminService == nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "热门榜单缓存服务未初始化")
		return
	}

	if err := hotRankingCacheAdminService.ClearCache(systemSettingsService); err != nil {
		writeCacheAdminError(c, http.StatusInternalServerError, "清理热门榜单缓存失败："+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "热门榜单缓存已清理",
	})
}

func buildCacheSettingsResponse(settings *service.CacheSettings) gin.H {
	response := gin.H{
		"cache_enabled":                       settings.CacheEnabled,
		"search_cache_ttl_seconds":            settings.SearchCacheTTLSeconds,
		"cache_write_queue_size":              settings.CacheWriteQueueSize,
		"cache_write_workers":                 settings.CacheWriteWorkers,
		"hot_ranking_cache_enabled":           settings.HotRankingCacheEnabled,
		"hot_ranking_preload_enabled":         settings.HotRankingPreloadEnabled,
		"hot_ranking_preload_time":            settings.HotRankingPreloadTime,
		"hot_ranking_preload_limit":           settings.HotRankingPreloadLimit,
		"hot_ranking_cache_ttl_seconds":       settings.HotRankingCacheTTLSeconds,
		"hot_ranking_preload_concurrency":     settings.HotRankingPreloadConcurrency,
		"hot_ranking_preload_timeout_seconds": settings.HotRankingPreloadTimeoutSeconds,
		"config_source":                       "database",
		"cache_setting_options":               systemSettingsService.GetCacheSettingOptions(),
		"redis_connected":                     hotRankingCacheAdminService != nil && hotRankingCacheAdminService.HasCacheBackend(),
	}

	if hotRankingCacheAdminService != nil {
		if snapshot := hotRankingCacheAdminService.GetLastPreloadSnapshot(); snapshot != nil {
			response["last_preload_result"] = snapshot.Result
			response["last_preload_at"] = snapshot.UpdatedAt
			response["last_preload_status"] = snapshot.Status
		}
	}

	return response
}

func buildRuntimeSettingsResponse(settings *service.RuntimeSettings) gin.H {
	return gin.H{
		"default_concurrency":          settings.DefaultConcurrency,
		"http_max_conns":               settings.HTTPMaxConns,
		"async_plugin_enabled":         settings.AsyncPluginEnabled,
		"async_response_timeout":       settings.AsyncResponseTimeout,
		"async_max_background_workers": settings.AsyncMaxBackgroundWorkers,
		"async_max_background_tasks":   settings.AsyncMaxBackgroundTasks,
		"proxy_enabled":                settings.ProxyEnabled,
		"proxy_url":                    settings.ProxyURL,
		"config_source":                "database",
		"restart_required_fields":      []string{"http_max_conns"},
	}
}

func writeCacheAdminError(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"error": message,
	})
}

func writeRuntimeAdminError(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"error": message,
	})
}
