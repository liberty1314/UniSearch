package api

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"pansou/config"
	"pansou/service"
	"pansou/util"
)

// AdminLoginRequest 管理员登录请求
type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AdminLoginResponse 管理员登录响应
type AdminLoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
}

// APIKeyCreateRequest 创建API Key请求
type APIKeyCreateRequest struct {
	TTLHours    int    `json:"ttl_hours" binding:"required,min=1"`
	Description string `json:"description"`
}

// RateLimiter 简单的内存速率限制器
type RateLimiter struct {
	attempts    map[string][]time.Time
	mu          sync.Mutex
	maxAttempts int
	window      time.Duration
}

// NewRateLimiter 创建速率限制器实例
func NewRateLimiter(maxAttempts int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		attempts:    make(map[string][]time.Time),
		maxAttempts: maxAttempts,
		window:      window,
	}
}

// Allow 检查是否允许请求
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// 清理过期记录
	attempts := rl.attempts[ip]
	valid := []time.Time{}
	for _, t := range attempts {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	// 检查是否超限
	if len(valid) >= rl.maxAttempts {
		return false
	}

	// 记录本次尝试
	valid = append(valid, now)
	rl.attempts[ip] = valid
	return true
}

// 全局速率限制器实例（5次尝试/分钟）
var loginRateLimiter = NewRateLimiter(5, time.Minute)

// AdminLoginHandler 管理员登录
func AdminLoginHandler(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"error": "请求参数错误",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	// 速率限制检查
	if !loginRateLimiter.Allow(c.ClientIP()) {
		c.JSON(429, gin.H{
			"error": "请求过于频繁，请稍后再试",
			"code":  "RATE_LIMIT_EXCEEDED",
		})
		return
	}

	// 检查是否配置了管理员密码
	if config.AppConfig.AdminPasswordHash == "" {
		c.JSON(500, gin.H{
			"error": "管理员功能未配置",
			"code":  "ADMIN_NOT_CONFIGURED",
		})
		return
	}

	// 验证用户名（默认为 admin）
	if req.Username != "admin" {
		c.JSON(401, gin.H{
			"error": "用户名或密码错误",
			"code":  "ADMIN_LOGIN_FAILED",
		})
		return
	}

	// 验证密码
	err := bcrypt.CompareHashAndPassword(
		[]byte(config.AppConfig.AdminPasswordHash),
		[]byte(req.Password),
	)
	if err != nil {
		c.JSON(401, gin.H{
			"error": "用户名或密码错误",
			"code":  "ADMIN_LOGIN_FAILED",
		})
		return
	}

	// 生成 JWT
	token, err := util.GenerateToken(
		"admin",
		true,
		config.AppConfig.AuthJWTSecret,
		config.AppConfig.AuthTokenExpiry,
	)
	if err != nil {
		c.JSON(500, gin.H{
			"error": "令牌生成失败",
			"code":  "TOKEN_GENERATION_FAILED",
		})
		return
	}

	c.JSON(200, gin.H{
		"token":      token,
		"expires_at": time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
	})
}

// ListAPIKeysHandler 列出所有API Keys
func ListAPIKeysHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		keys, err := apiKeyService.ListKeys()
		if err != nil {
			c.JSON(500, gin.H{
				"error": "获取密钥列表失败",
				"code":  "APIKEY_LIST_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"keys": keys,
		})
	}
}

// CreateAPIKeyHandler 创建新API Key
func CreateAPIKeyHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req APIKeyCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 转换 TTL 为 Duration
		ttl := time.Duration(req.TTLHours) * time.Hour

		// 生成密钥
		key, err := apiKeyService.GenerateKey(ttl, req.Description)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "密钥生成失败: " + err.Error(),
				"code":  "APIKEY_GENERATION_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"key": key,
		})
	}
}

// DeleteAPIKeyHandler 删除API Key
func DeleteAPIKeyHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Param("key")
		if key == "" {
			c.JSON(400, gin.H{
				"error": "密钥参数缺失",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		err := apiKeyService.RevokeKey(key)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "删除密钥失败: " + err.Error(),
				"code":  "APIKEY_DELETE_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"message": "密钥已删除",
		})
	}
}

// SystemInfoResponse 系统信息响应
type SystemInfoResponse struct {
	// 插件信息
	Plugins []PluginInfoResponse `json:"plugins"`
	
	// 系统统计
	Stats SystemStatsResponse `json:"stats"`
	
	// 系统配置
	Config SystemConfigResponse `json:"config"`
}

// PluginInfoResponse 插件信息响应
type PluginInfoResponse struct {
	Name        string `json:"name"`
	Priority    int    `json:"priority"`
	Status      string `json:"status"`
	Description string `json:"description"`
}

// SystemStatsResponse 系统统计响应
type SystemStatsResponse struct {
	PluginCount       int  `json:"plugin_count"`
	ActivePluginCount int  `json:"active_plugin_count"`
	ChannelCount      int  `json:"channel_count"`
	CacheEnabled      bool `json:"cache_enabled"`
	ProxyEnabled      bool `json:"proxy_enabled"`
}

// SystemConfigResponse 系统配置响应
type SystemConfigResponse struct {
	// 缓存配置
	CachePath       string `json:"cache_path"`
	CacheMaxSizeMB  int    `json:"cache_max_size_mb"`
	CacheTTLMinutes int    `json:"cache_ttl_minutes"`
	
	// 并发配置
	DefaultConcurrency int `json:"default_concurrency"`
	
	// 代理配置
	ProxyURL string `json:"proxy_url"`
	
	// 异步插件配置
	AsyncPluginEnabled         bool `json:"async_plugin_enabled"`
	AsyncResponseTimeout       int  `json:"async_response_timeout"`
	AsyncMaxBackgroundWorkers  int  `json:"async_max_background_workers"`
	AsyncMaxBackgroundTasks    int  `json:"async_max_background_tasks"`
	
	// HTTP服务器配置
	HTTPMaxConns int `json:"http_max_conns"`
	
	// 频道列表
	Channels []string `json:"channels"`
}

// GetSystemInfoHandler 获取系统信息（插件状态 + 系统配置）
func GetSystemInfoHandler(searchService *service.SearchService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取插件管理器
		pluginManager := searchService.GetPluginManager()
		if pluginManager == nil {
			c.JSON(500, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}
		
		// 获取所有插件
		plugins := pluginManager.GetPlugins()
		
		// 构建插件信息列表
		pluginInfos := make([]PluginInfoResponse, 0, len(plugins))
		for _, p := range plugins {
			pluginInfos = append(pluginInfos, PluginInfoResponse{
				Name:        p.Name(),
				Priority:    p.Priority(),
				Status:      "active", // 所有已注册的插件都是活跃状态
				Description: getPluginDescription(p.Name()),
			})
		}
		
		// 构建系统统计信息
		stats := SystemStatsResponse{
			PluginCount:       len(plugins),
			ActivePluginCount: len(plugins), // 所有已注册的插件都是活跃的
			ChannelCount:      len(config.AppConfig.DefaultChannels),
			CacheEnabled:      config.AppConfig.CacheEnabled,
			ProxyEnabled:      config.AppConfig.UseProxy,
		}
		
		// 构建系统配置信息
		systemConfig := SystemConfigResponse{
			CachePath:                  config.AppConfig.CachePath,
			CacheMaxSizeMB:             config.AppConfig.CacheMaxSizeMB,
			CacheTTLMinutes:            config.AppConfig.CacheTTLMinutes,
			DefaultConcurrency:         config.AppConfig.DefaultConcurrency,
			ProxyURL:                   config.AppConfig.ProxyURL,
			AsyncPluginEnabled:         config.AppConfig.AsyncPluginEnabled,
			AsyncResponseTimeout:       config.AppConfig.AsyncResponseTimeout,
			AsyncMaxBackgroundWorkers:  config.AppConfig.AsyncMaxBackgroundWorkers,
			AsyncMaxBackgroundTasks:    config.AppConfig.AsyncMaxBackgroundTasks,
			HTTPMaxConns:               config.AppConfig.HTTPMaxConns,
			Channels:                   config.AppConfig.DefaultChannels,
		}
		
		// 构建完整响应
		response := SystemInfoResponse{
			Plugins: pluginInfos,
			Stats:   stats,
			Config:  systemConfig,
		}
		
		c.JSON(200, response)
	}
}

// getPluginDescription 获取插件描述（根据插件名称返回中文描述）
func getPluginDescription(name string) string {
	descriptions := map[string]string{
		"duoduo":       "多多搜索 - 综合网盘资源搜索",
		"hdr4k":        "HDR4K - 高清4K影视资源",
		"hunhepan":     "混合盘 - 多源网盘聚合",
		"jikepan":      "极客盘 - 技术资源分享",
		"pan666":       "盘666 - 网盘资源搜索",
		"pansearch":    "盘搜 - 百度网盘搜索",
		"panta":        "盘他 - 网盘资源搜索",
		"qupansou":     "趣盘搜 - 趣味资源搜索",
		"susu":         "素素 - 学习资源搜索",
		"thepiratebay": "海盗湾 - 磁力链接搜索",
		"wanou":        "玩偶 - 影视资源搜索",
		"xuexizhinan":  "学习指南 - 教育资源搜索",
		"panyq":        "盘友圈 - 网盘资源分享",
		"zhizhen":      "纸镇 - 文档资源搜索",
		"labi":         "拉比 - 综合资源搜索",
		"muou":         "木偶 - 影视资源搜索",
		"ouge":         "欧歌 - 音乐资源搜索",
		"shandian":     "闪电 - 快速资源搜索",
		"huban":        "虎斑 - 综合资源搜索",
		"fox4k":        "Fox4K - 4K影视资源",
		"cyg":          "CYG - 综合资源搜索",
	}
	
	if desc, ok := descriptions[name]; ok {
		return desc
	}
	return "网盘资源搜索插件"
}

// UpdateAPIKeyRequest 更新API Key请求
type UpdateAPIKeyRequest struct {
	ExpiresAt   *time.Time `json:"expires_at"`   // 可选：直接设置过期时间
	ExtendHours *int       `json:"extend_hours"` // 可选：延长小时数
}

// UpdateAPIKeyHandler 更新API Key有效期
func UpdateAPIKeyHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Param("key")
		if key == "" {
			c.JSON(400, gin.H{
				"error": "密钥参数缺失",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		var req UpdateAPIKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 验证参数：至少要提供一个更新方式
		if req.ExpiresAt == nil && (req.ExtendHours == nil || *req.ExtendHours <= 0) {
			c.JSON(400, gin.H{
				"error": "参数错误：必须提供 expires_at 或 extend_hours",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 调用服务层更新密钥
		extendHours := 0
		if req.ExtendHours != nil {
			extendHours = *req.ExtendHours
		}
		
		updatedKey, err := apiKeyService.UpdateKeyExpiry(key, req.ExpiresAt, extendHours)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "更新密钥失败: " + err.Error(),
				"code":  "APIKEY_UPDATE_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"key": updatedKey,
		})
	}
}

// BatchExtendAPIKeysRequest 批量延长API Key请求
type BatchExtendAPIKeysRequest struct {
	Keys        []string `json:"keys" binding:"required"`
	ExtendHours int      `json:"extend_hours" binding:"required,min=1"`
}

// BatchExtendAPIKeysHandler 批量延长API Key有效期
func BatchExtendAPIKeysHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BatchExtendAPIKeysRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 验证密钥列表不为空
		if len(req.Keys) == 0 {
			c.JSON(400, gin.H{
				"error": "密钥列表不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 调用服务层批量延长
		results, err := apiKeyService.BatchExtendKeys(req.Keys, req.ExtendHours)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量延长失败: " + err.Error(),
				"code":  "BATCH_EXTEND_FAILED",
			})
			return
		}

		// 统计成功和失败数量
		successCount := 0
		failedCount := 0
		for _, result := range results {
			if result.Success {
				successCount++
			} else {
				failedCount++
			}
		}

		c.JSON(200, gin.H{
			"success_count": successCount,
			"failed_count":  failedCount,
			"results":       results,
		})
	}
}

// BatchCreateAPIKeysRequest 批量创建API Key请求
type BatchCreateAPIKeysRequest struct {
	Count             int    `json:"count" binding:"required,min=1,max=100"`
	TTLHours          int    `json:"ttl_hours" binding:"required,min=1"`
	DescriptionPrefix string `json:"description_prefix"`
}

// BatchCreateAPIKeysHandler 批量创建API Key
func BatchCreateAPIKeysHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BatchCreateAPIKeysRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 转换 TTL 为 Duration
		ttl := time.Duration(req.TTLHours) * time.Hour

		// 调用服务层批量生成
		result, err := apiKeyService.BatchGenerateKeys(req.Count, ttl, req.DescriptionPrefix)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量创建失败: " + err.Error(),
				"code":  "BATCH_CREATE_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"success_count": result.SuccessCount,
			"failed_count":  result.FailedCount,
			"keys":          result.Keys,
		})
	}
}

// BatchDeleteAPIKeysRequest 批量删除API Key请求
type BatchDeleteAPIKeysRequest struct {
	Keys []string `json:"keys" binding:"required"`
}

// BatchDeleteAPIKeysHandler 批量删除API Key
func BatchDeleteAPIKeysHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BatchDeleteAPIKeysRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 验证密钥列表不为空
		if len(req.Keys) == 0 {
			c.JSON(400, gin.H{
				"error": "密钥列表不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 调用服务层批量删除
		results, err := apiKeyService.BatchDeleteKeys(req.Keys)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量删除失败: " + err.Error(),
				"code":  "BATCH_DELETE_FAILED",
			})
			return
		}

		// 统计成功和失败数量
		successCount := 0
		failedCount := 0
		for _, result := range results {
			if result.Success {
				successCount++
			} else {
				failedCount++
			}
		}

		c.JSON(200, gin.H{
			"success_count": successCount,
			"failed_count":  failedCount,
			"results":       results,
		})
	}
}
