package api

import (
	"net/http"
	"strings"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var systemSettingsService *service.SystemSettingsService

// SetSystemSettingsService 设置系统设置服务
func SetSystemSettingsService(service *service.SystemSettingsService) {
	systemSettingsService = service
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
