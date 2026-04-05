package api

import (
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/plugin"
	"unisearch/service"
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
	TTLHours         int    `json:"ttl_hours" binding:"required,min=1"`
	Description      string `json:"description"`
	DailySearchLimit int    `json:"daily_search_limit"` // 每日搜索次数限制，0表示不限制
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

func resolvePluginStatusByHealthMap(pluginName, defaultStatus string, healthMap map[string]bool) string {
	healthy, ok := healthMap[pluginName]
	if !ok {
		return defaultStatus
	}
	if healthy {
		return defaultStatus
	}
	return "error"
}

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

	// 使用认证服务进行登录验证
	authService := service.NewAuthService()
	token, user, _, err := authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(401, gin.H{
			"error": "用户名或密码错误",
			"code":  "ADMIN_LOGIN_FAILED",
		})
		return
	}

	// 验证用户是否为管理员
	if !user.IsAdmin() {
		c.JSON(403, gin.H{
			"error": "权限不足，需要管理员权限",
			"code":  "ADMIN_PERMISSION_REQUIRED",
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

		// 生成密钥（直接使用小时数）
		key, err := apiKeyService.GenerateKey(req.TTLHours, req.Description, req.DailySearchLimit)
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
	PluginType  string `json:"plugin_type"` // builtin | custom
	IsEnabled   bool   `json:"is_enabled"`
	Description string `json:"description"`
	URL         string `json:"url,omitempty"`
}

// SystemStatsResponse 系统统计响应
type SystemStatsResponse struct {
	PluginCount       int  `json:"plugin_count"`
	ActivePluginCount int  `json:"active_plugin_count"`
	ChannelCount      int  `json:"channel_count"`
	CacheEnabled      bool `json:"cache_enabled"`
	ProxyEnabled      bool `json:"proxy_enabled"`
	DAU               int  `json:"dau"`
	MAU               int  `json:"mau"`
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
	AsyncPluginEnabled        bool `json:"async_plugin_enabled"`
	AsyncResponseTimeout      int  `json:"async_response_timeout"`
	AsyncMaxBackgroundWorkers int  `json:"async_max_background_workers"`
	AsyncMaxBackgroundTasks   int  `json:"async_max_background_tasks"`

	// HTTP服务器配置
	HTTPMaxConns int `json:"http_max_conns"`

	// 频道列表
	Channels []string `json:"channels"`
}

// GetSystemInfoHandler 获取系统信息（插件状态 + 系统配置 + 用户活跃度统计）
func GetSystemInfoHandler(searchService *service.SearchService, userService *service.UserService, pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
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

		// 获取所有内置插件
		plugins := pluginManager.GetPlugins()
		customPlugins := config.GetCustomPluginsConfig()
		allCustomPlugins := customPlugins.GetPlugins()

		pluginNames := make([]string, 0, len(plugins)+len(allCustomPlugins))
		for _, p := range plugins {
			pluginNames = append(pluginNames, p.Name())
		}
		for _, cp := range allCustomPlugins {
			pluginNames = append(pluginNames, cp.Name)
		}

		healthMap := make(map[string]bool)
		if pluginHealthService != nil {
			statusMap, err := pluginHealthService.GetStatusMap(pluginNames)
			if err != nil {
				log.Printf("⚠️  获取插件健康状态失败，使用默认状态: %v", err)
			} else {
				healthMap = statusMap
			}
		}

		enabledMap := make(map[string]bool)
		if pluginStateService != nil {
			statusMap, err := pluginStateService.GetStatusMap(pluginNames)
			if err != nil {
				log.Printf("⚠️  获取插件启用状态失败，使用默认启用状态: %v", err)
			} else {
				enabledMap = statusMap
			}
		}

		// 构建插件信息列表
		pluginInfos := make([]PluginInfoResponse, 0, len(plugins)+len(allCustomPlugins))
		for _, p := range plugins {
			isEnabled := true
			if value, exists := enabledMap[p.Name()]; exists {
				isEnabled = value
			}

			status := "inactive"
			if isEnabled {
				status = resolvePluginStatusByHealthMap(p.Name(), "active", healthMap)
			}

			pluginInfos = append(pluginInfos, PluginInfoResponse{
				Name:        p.Name(),
				Priority:    p.Priority(),
				Status:      status,
				PluginType:  "builtin",
				IsEnabled:   isEnabled,
				Description: getPluginDescription(p.Name()),
			})
		}

		// 获取自定义插件并添加到列表
		for _, cp := range allCustomPlugins {
			isEnabled := cp.Enabled
			if value, exists := enabledMap[cp.Name]; exists {
				isEnabled = value
			}

			status := "inactive"
			if isEnabled {
				status = resolvePluginStatusByHealthMap(cp.Name, "custom", healthMap)
			}

			pluginInfos = append(pluginInfos, PluginInfoResponse{
				Name:        cp.Name,
				Priority:    cp.Priority,
				Status:      status,
				PluginType:  "custom",
				IsEnabled:   isEnabled,
				Description: cp.Description,
				URL:         cp.URL,
			})
		}

		activePluginCount := 0
		for _, p := range pluginInfos {
			if p.Status == "active" || p.Status == "custom" {
				activePluginCount++
			}
		}

		// 获取日活/月活统计
		var dau, mau int64
		if userService != nil {
			if d, err := userService.GetDAU(); err == nil {
				dau = d
			}
			if m, err := userService.GetMAU(); err == nil {
				mau = m
			}
		}

		// 构建系统统计信息
		stats := SystemStatsResponse{
			PluginCount:       len(pluginInfos),
			ActivePluginCount: activePluginCount,
			ChannelCount:      len(config.AppConfig.DefaultChannels),
			CacheEnabled:      config.AppConfig.CacheEnabled,
			ProxyEnabled:      config.AppConfig.UseProxy,
			DAU:               int(dau),
			MAU:               int(mau),
		}

		// 构建系统配置信息
		systemConfig := SystemConfigResponse{
			CachePath:                 config.AppConfig.CachePath,
			CacheMaxSizeMB:            config.AppConfig.CacheMaxSizeMB,
			CacheTTLMinutes:           config.AppConfig.CacheTTLMinutes,
			DefaultConcurrency:        config.AppConfig.DefaultConcurrency,
			ProxyURL:                  config.AppConfig.ProxyURL,
			AsyncPluginEnabled:        config.AppConfig.AsyncPluginEnabled,
			AsyncResponseTimeout:      config.AppConfig.AsyncResponseTimeout,
			AsyncMaxBackgroundWorkers: config.AppConfig.AsyncMaxBackgroundWorkers,
			AsyncMaxBackgroundTasks:   config.AppConfig.AsyncMaxBackgroundTasks,
			HTTPMaxConns:              config.AppConfig.HTTPMaxConns,
			Channels:                  config.AppConfig.DefaultChannels,
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
		"hdr4k":        "HDR4K - 高清4K影视资源",
		"hunhepan":     "混合盘 - 多源网盘聚合",
		"jikepan":      "极客盘 - 技术资源分享",
		"pan666":       "盘666 - 网盘资源搜索",
		"pansearch":    "盘搜 - 百度网盘搜索",
		"panta":        "盘他 - 网盘资源搜索",
		"qupansou":     "趣盘搜 - 趣味资源搜索",
		"susu":         "素素 - 学习资源搜索",
		"thepiratebay": "海盗湾 - 磁力链接搜索",
		"xuexizhinan":  "学习指南 - 教育资源搜索",
		"panyq":        "盘友圈 - 网盘资源分享",
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
	ExpiresAt        *time.Time `json:"expires_at"`         // 可选：直接设置过期时间
	ExtendHours      *int       `json:"extend_hours"`       // 可选：延长小时数
	DailySearchLimit *int       `json:"daily_search_limit"` // 可选：每日搜索次数限制
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
		if req.ExpiresAt == nil && (req.ExtendHours == nil || *req.ExtendHours <= 0) && req.DailySearchLimit == nil {
			c.JSON(400, gin.H{
				"error": "参数错误：必须提供 expires_at、extend_hours 或 daily_search_limit",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 调用服务层更新密钥
		extendHours := 0
		if req.ExtendHours != nil {
			extendHours = *req.ExtendHours
		}

		dailyLimit := -1 // 默认不更新
		if req.DailySearchLimit != nil {
			dailyLimit = *req.DailySearchLimit
		}

		updatedKey, err := apiKeyService.UpdateKeyExpiry(key, req.ExpiresAt, extendHours, dailyLimit)
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
		result, err := apiKeyService.BatchExtendKeys(req.Keys, req.ExtendHours)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量延长失败: " + err.Error(),
				"code":  "BATCH_EXTEND_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"success_count": len(result.Success),
			"failed_count":  len(result.Failed),
			"success":       result.Success,
			"failed":        result.Failed,
		})
	}
}

// BatchCreateAPIKeysRequest 批量创建API Key请求
type BatchCreateAPIKeysRequest struct {
	Count             int    `json:"count" binding:"required,min=1,max=100"`
	TTLHours          int    `json:"ttl_hours" binding:"required,min=1"`
	DescriptionPrefix string `json:"description_prefix"`
	DailySearchLimit  int    `json:"daily_search_limit"` // 每日搜索次数限制
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

		// 调用服务层批量生成
		result, err := apiKeyService.BatchGenerateKeys(req.Count, req.TTLHours, req.DescriptionPrefix, req.DailySearchLimit)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量创建失败: " + err.Error(),
				"code":  "BATCH_CREATE_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"success_count": result.Count,
			"failed_count":  0,
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
		result, err := apiKeyService.BatchDeleteKeys(req.Keys)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "批量删除失败: " + err.Error(),
				"code":  "BATCH_DELETE_FAILED",
			})
			return
		}

		c.JSON(200, gin.H{
			"success_count": len(result.Success),
			"failed_count":  len(result.Failed),
			"success":       result.Success,
			"failed":        result.Failed,
		})
	}
}

// TestPluginHandler 测试插件功能
func TestPluginHandler(searchService *service.SearchService, pluginHealthService *service.PluginHealthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pluginName := c.Param("pluginName")
		if pluginName == "" {
			c.JSON(400, gin.H{
				"error": "插件名称不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 获取插件管理器
		pluginManager := searchService.GetPluginManager()
		if pluginManager == nil {
			c.JSON(500, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		// 首先在内置插件中查找
		plugins := pluginManager.GetPlugins()
		var targetPlugin plugin.AsyncSearchPlugin
		found := false
		for _, p := range plugins {
			if p.Name() == pluginName {
				targetPlugin = p
				found = true
				break
			}
		}

		// 如果在内置插件中找到，执行测试搜索
		if found {
			testQuery := "test"
			results, err := targetPlugin.Search(testQuery, nil)

			if err != nil {
				if pluginHealthService != nil {
					if recordErr := pluginHealthService.RecordResult(pluginName, false, err.Error(), "manual_test"); recordErr != nil {
						log.Printf("⚠️  记录插件测试失败状态失败(%s): %v", pluginName, recordErr)
					}
				}
				c.JSON(500, gin.H{
					"error":   "插件测试失败",
					"code":    "PLUGIN_TEST_FAILED",
					"message": err.Error(),
				})
				return
			}

			if pluginHealthService != nil {
				if recordErr := pluginHealthService.RecordResult(pluginName, true, "", "manual_test"); recordErr != nil {
					log.Printf("⚠️  记录插件测试成功状态失败(%s): %v", pluginName, recordErr)
				}
			}
			c.JSON(200, gin.H{
				"message":      "插件测试成功",
				"plugin_name":  pluginName,
				"result_count": len(results),
				"status":       "ok",
			})
			return
		}

		// 如果不是内置插件，检查自定义插件
		customPlugins := config.GetCustomPluginsConfig()
		for _, cp := range customPlugins.GetPlugins() {
			if cp.Name == pluginName {
				// 对自定义插件进行URL连通性测试
				client := &http.Client{
					Timeout: 10 * time.Second,
				}

				resp, err := client.Head(cp.URL)
				if err != nil {
					// 如果HEAD失败，尝试GET请求
					resp, err = client.Get(cp.URL)
					if err != nil {
						if pluginHealthService != nil {
							if recordErr := pluginHealthService.RecordResult(pluginName, false, err.Error(), "manual_test"); recordErr != nil {
								log.Printf("⚠️  记录插件测试失败状态失败(%s): %v", pluginName, recordErr)
							}
						}
						c.JSON(500, gin.H{
							"error":   "插件测试失败",
							"code":    "PLUGIN_TEST_FAILED",
							"message": "无法连接到插件URL: " + err.Error(),
						})
						return
					}
				}
				defer resp.Body.Close()

				if resp.StatusCode >= 200 && resp.StatusCode < 400 {
					if pluginHealthService != nil {
						if recordErr := pluginHealthService.RecordResult(pluginName, true, "", "manual_test"); recordErr != nil {
							log.Printf("⚠️  记录插件测试成功状态失败(%s): %v", pluginName, recordErr)
						}
					}
					c.JSON(200, gin.H{
						"message":     "插件测试成功",
						"plugin_name": pluginName,
						"status_code": resp.StatusCode,
						"status":      "ok",
					})
				} else {
					if pluginHealthService != nil {
						errMessage := "URL返回错误状态码"
						if recordErr := pluginHealthService.RecordResult(pluginName, false, errMessage, "manual_test"); recordErr != nil {
							log.Printf("⚠️  记录插件测试失败状态失败(%s): %v", pluginName, recordErr)
						}
					}
					c.JSON(500, gin.H{
						"error":       "插件测试失败",
						"code":        "PLUGIN_TEST_FAILED",
						"message":     "URL返回错误状态码",
						"status_code": resp.StatusCode,
					})
				}
				return
			}
		}

		// 插件不存在
		c.JSON(404, gin.H{
			"error": "插件不存在",
			"code":  "PLUGIN_NOT_FOUND",
		})
	}
}

// TestURLRequest URL测试请求
type TestURLRequest struct {
	URL string `json:"url" binding:"required"`
}

// TestURLHandler 测试URL连通性
func TestURLHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TestURLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 创建HTTP客户端，设置超时
		client := &http.Client{
			Timeout: 10 * time.Second,
		}

		// 发送HEAD请求测试连通性
		resp, err := client.Head(req.URL)
		if err != nil {
			// 如果HEAD失败，尝试GET请求
			resp, err = client.Get(req.URL)
			if err != nil {
				c.JSON(200, gin.H{
					"success": false,
					"message": "无法连接到该URL",
					"error":   err.Error(),
				})
				return
			}
		}
		defer resp.Body.Close()

		// 检查状态码
		if resp.StatusCode >= 200 && resp.StatusCode < 400 {
			c.JSON(200, gin.H{
				"success":     true,
				"message":     "URL连通性测试成功",
				"status_code": resp.StatusCode,
			})
		} else {
			c.JSON(200, gin.H{
				"success":     false,
				"message":     "URL返回错误状态码",
				"status_code": resp.StatusCode,
			})
		}
	}
}

// CreatePluginRequest 创建插件请求
type CreatePluginRequest struct {
	Name        string `json:"name" binding:"required"`
	URL         string `json:"url" binding:"required"`
	Priority    int    `json:"priority"`
	Description string `json:"description"`
}

// CreatePluginHandler 创建插件
func CreatePluginHandler(pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreatePluginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 添加到自定义插件配置
		customPlugins := config.GetCustomPluginsConfig()
		err := customPlugins.AddPlugin(config.CustomPlugin{
			Name:        req.Name,
			URL:         req.URL,
			Priority:    req.Priority,
			Description: req.Description,
			Enabled:     true,
		})

		if err != nil {
			c.JSON(500, gin.H{
				"error": "保存插件配置失败",
				"code":  "SAVE_FAILED",
			})
			return
		}

		if pluginStateService != nil {
			if err := pluginStateService.SetStatus(req.Name, "custom", true); err != nil {
				if rollbackErr := customPlugins.RemovePlugin(req.Name); rollbackErr != nil {
					log.Printf("⚠️  创建插件失败回滚 JSON 配置失败(%s): %v", req.Name, rollbackErr)
				}
				c.JSON(500, gin.H{
					"error": "同步插件启用状态失败: " + err.Error(),
					"code":  "STATUS_SYNC_FAILED",
				})
				return
			}
		}

		if pluginHealthService != nil {
			if err := pluginHealthService.ClearStatus(req.Name); err != nil {
				log.Printf("⚠️  清理插件健康状态失败(%s): %v", req.Name, err)
			}
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "插件添加成功",
			"plugin": gin.H{
				"name":        req.Name,
				"url":         req.URL,
				"priority":    req.Priority,
				"description": req.Description,
				"plugin_type": "custom",
				"is_enabled":  true,
			},
		})
	}
}

// DeletePluginHandler 删除插件
func DeletePluginHandler(pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pluginName := c.Param("pluginName")
		if pluginName == "" {
			c.JSON(400, gin.H{
				"error": "插件名称不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		customPlugins := config.GetCustomPluginsConfig()
		oldPlugin, exists := customPlugins.GetPluginByName(pluginName)
		if !exists {
			c.JSON(404, gin.H{
				"error": "插件不存在",
				"code":  "PLUGIN_NOT_FOUND",
			})
			return
		}

		// 从自定义插件配置中删除
		err := customPlugins.RemovePlugin(pluginName)

		if err != nil {
			c.JSON(500, gin.H{
				"error": "删除插件配置失败",
				"code":  "DELETE_FAILED",
			})
			return
		}

		if pluginStateService != nil {
			if err := pluginStateService.DeleteStatus(pluginName); err != nil {
				if rollbackErr := customPlugins.AddPlugin(oldPlugin); rollbackErr != nil {
					log.Printf("⚠️  删除插件失败回滚 JSON 配置失败(%s): %v", pluginName, rollbackErr)
				}
				c.JSON(500, gin.H{
					"error": "同步插件状态失败: " + err.Error(),
					"code":  "STATUS_SYNC_FAILED",
				})
				return
			}
		}

		if pluginHealthService != nil {
			if err := pluginHealthService.ClearStatus(pluginName); err != nil {
				log.Printf("⚠️  清理插件健康状态失败(%s): %v", pluginName, err)
			}
		}

		c.JSON(200, gin.H{
			"success":     true,
			"message":     "插件已删除",
			"plugin_name": pluginName,
		})
	}
}

// UpdatePluginRequest 更新插件请求
type UpdatePluginRequest struct {
	Priority    int    `json:"priority"`
	Description string `json:"description"`
	URL         string `json:"url"`
}

// UpdatePluginHandler 更新插件
func UpdatePluginHandler(pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pluginName := c.Param("pluginName")
		if pluginName == "" {
			c.JSON(400, gin.H{
				"error": "插件名称不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		var req UpdatePluginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		customPlugins := config.GetCustomPluginsConfig()
		oldPlugin, exists := customPlugins.GetPluginByName(pluginName)
		if !exists {
			c.JSON(404, gin.H{
				"error": "插件不存在",
				"code":  "PLUGIN_NOT_FOUND",
			})
			return
		}

		updatedPlugin := oldPlugin
		updatedPlugin.Name = pluginName
		if strings.TrimSpace(req.URL) != "" {
			updatedPlugin.URL = req.URL
		}
		updatedPlugin.Priority = req.Priority
		updatedPlugin.Description = req.Description

		// 更新自定义插件配置
		err := customPlugins.UpdatePlugin(pluginName, updatedPlugin)

		if err != nil {
			c.JSON(500, gin.H{
				"error": "更新插件配置失败: " + err.Error(),
				"code":  "UPDATE_FAILED",
			})
			return
		}

		if pluginStateService != nil {
			if err := pluginStateService.SetStatus(pluginName, "custom", updatedPlugin.Enabled); err != nil {
				if rollbackErr := customPlugins.UpdatePlugin(pluginName, oldPlugin); rollbackErr != nil {
					log.Printf("⚠️  更新插件失败回滚 JSON 配置失败(%s): %v", pluginName, rollbackErr)
				}
				c.JSON(500, gin.H{
					"error": "同步插件状态失败: " + err.Error(),
					"code":  "STATUS_SYNC_FAILED",
				})
				return
			}
		}

		if pluginHealthService != nil {
			if err := pluginHealthService.ClearStatus(pluginName); err != nil {
				log.Printf("⚠️  清理插件健康状态失败(%s): %v", pluginName, err)
			}
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "插件更新成功",
			"plugin": gin.H{
				"name":        pluginName,
				"url":         updatedPlugin.URL,
				"priority":    updatedPlugin.Priority,
				"description": updatedPlugin.Description,
				"plugin_type": "custom",
				"is_enabled":  updatedPlugin.Enabled,
			},
		})
	}
}

type SetPluginStatusRequest struct {
	IsEnabled *bool `json:"is_enabled" binding:"required"`
}

type BatchPluginStatusRequest struct {
	PluginNames []string `json:"plugin_names" binding:"required"`
	IsEnabled   *bool    `json:"is_enabled" binding:"required"`
}

type BatchDeletePluginsRequest struct {
	PluginNames []string `json:"plugin_names" binding:"required"`
}

type BatchPluginOperationError struct {
	PluginName string `json:"plugin_name"`
	Error      string `json:"error"`
	Code       string `json:"code"`
}

// SetPluginStatusHandler 设置插件启用状态（内置 + 自定义）
func SetPluginStatusHandler(searchService *service.SearchService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		pluginName := strings.TrimSpace(c.Param("pluginName"))
		if pluginName == "" {
			c.JSON(400, gin.H{
				"error": "插件名称不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		var req SetPluginStatusRequest
		if err := c.ShouldBindJSON(&req); err != nil || req.IsEnabled == nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		isEnabled := *req.IsEnabled
		pluginManager := searchService.GetPluginManager()
		if pluginManager == nil {
			c.JSON(500, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		// 优先匹配内置插件
		for _, p := range pluginManager.GetPlugins() {
			if strings.EqualFold(p.Name(), pluginName) {
				if pluginStateService != nil {
					if err := pluginStateService.SetStatus(p.Name(), "builtin", isEnabled); err != nil {
						c.JSON(500, gin.H{
							"error": "更新插件状态失败: " + err.Error(),
							"code":  "STATUS_UPDATE_FAILED",
						})
						return
					}
				}
				searchService.InvalidatePluginSelectorCache()
				c.JSON(200, gin.H{
					"success":     true,
					"plugin_name": p.Name(),
					"is_enabled":  isEnabled,
				})
				return
			}
		}

		// 再匹配自定义插件，双写同步（JSON + DB）
		customPlugins := config.GetCustomPluginsConfig()
		customPlugin, exists := customPlugins.GetPluginByName(pluginName)
		if exists {
			oldEnabled := customPlugin.Enabled
			if err := customPlugins.SetPluginEnabled(customPlugin.Name, isEnabled); err != nil {
				c.JSON(500, gin.H{
					"error": "更新自定义插件配置失败: " + err.Error(),
					"code":  "SAVE_FAILED",
				})
				return
			}

			if pluginStateService != nil {
				if err := pluginStateService.SetStatus(customPlugin.Name, "custom", isEnabled); err != nil {
					if rollbackErr := customPlugins.SetPluginEnabled(customPlugin.Name, oldEnabled); rollbackErr != nil {
						log.Printf("⚠️  同步状态失败后回滚 JSON 失败(%s): %v", customPlugin.Name, rollbackErr)
					}
					c.JSON(500, gin.H{
						"error": "同步插件状态失败: " + err.Error(),
						"code":  "STATUS_SYNC_FAILED",
					})
					return
				}
			}

			searchService.InvalidatePluginSelectorCache()
			c.JSON(200, gin.H{
				"success":     true,
				"plugin_name": customPlugin.Name,
				"is_enabled":  isEnabled,
			})
			return
		}

		c.JSON(404, gin.H{
			"error": "插件不存在",
			"code":  "PLUGIN_NOT_FOUND",
		})
	}
}

// BatchSetPluginStatusHandler 批量设置插件启用状态（内置 + 自定义）
func BatchSetPluginStatusHandler(searchService *service.SearchService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BatchPluginStatusRequest
		if err := c.ShouldBindJSON(&req); err != nil || req.IsEnabled == nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		if len(req.PluginNames) == 0 {
			c.JSON(400, gin.H{
				"error": "插件名称列表不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		pluginManager := searchService.GetPluginManager()
		if pluginManager == nil {
			c.JSON(500, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		isEnabled := *req.IsEnabled
		success := make([]string, 0, len(req.PluginNames))
		failed := make([]BatchPluginOperationError, 0)

		builtinMap := make(map[string]string)
		for _, p := range pluginManager.GetPlugins() {
			builtinMap[strings.ToLower(strings.TrimSpace(p.Name()))] = p.Name()
		}

		customPlugins := config.GetCustomPluginsConfig()
		customMap := make(map[string]config.CustomPlugin)
		for _, cp := range customPlugins.GetPlugins() {
			customMap[strings.ToLower(strings.TrimSpace(cp.Name))] = cp
		}

		seen := make(map[string]struct{}, len(req.PluginNames))
		for _, rawName := range req.PluginNames {
			normalizedName := strings.ToLower(strings.TrimSpace(rawName))
			if normalizedName == "" {
				continue
			}
			if _, exists := seen[normalizedName]; exists {
				continue
			}
			seen[normalizedName] = struct{}{}

			if builtinName, exists := builtinMap[normalizedName]; exists {
				if pluginStateService != nil {
					if err := pluginStateService.SetStatus(builtinName, "builtin", isEnabled); err != nil {
						failed = append(failed, BatchPluginOperationError{
							PluginName: builtinName,
							Error:      "更新插件状态失败: " + err.Error(),
							Code:       "STATUS_UPDATE_FAILED",
						})
						continue
					}
				}
				searchService.InvalidatePluginSelectorCache()
				success = append(success, builtinName)
				continue
			}

			customPlugin, exists := customMap[normalizedName]
			if !exists {
				failed = append(failed, BatchPluginOperationError{
					PluginName: strings.TrimSpace(rawName),
					Error:      "插件不存在",
					Code:       "PLUGIN_NOT_FOUND",
				})
				continue
			}

			oldEnabled := customPlugin.Enabled
			if err := customPlugins.SetPluginEnabled(customPlugin.Name, isEnabled); err != nil {
				failed = append(failed, BatchPluginOperationError{
					PluginName: customPlugin.Name,
					Error:      "更新自定义插件配置失败: " + err.Error(),
					Code:       "SAVE_FAILED",
				})
				continue
			}

			if pluginStateService != nil {
				if err := pluginStateService.SetStatus(customPlugin.Name, "custom", isEnabled); err != nil {
					if rollbackErr := customPlugins.SetPluginEnabled(customPlugin.Name, oldEnabled); rollbackErr != nil {
						log.Printf("⚠️  批量更新插件状态回滚 JSON 配置失败(%s): %v", customPlugin.Name, rollbackErr)
					}
					failed = append(failed, BatchPluginOperationError{
						PluginName: customPlugin.Name,
						Error:      "同步插件状态失败: " + err.Error(),
						Code:       "STATUS_SYNC_FAILED",
					})
					continue
				}
			}

			searchService.InvalidatePluginSelectorCache()
			success = append(success, customPlugin.Name)
		}

		c.JSON(200, gin.H{
			"success_count": len(success),
			"failed_count":  len(failed),
			"success":       success,
			"failed":        failed,
		})
	}
}

// BatchDeletePluginsHandler 批量删除插件（仅删除自定义插件）
func BatchDeletePluginsHandler(searchService *service.SearchService, pluginHealthService *service.PluginHealthService, pluginStateService *service.PluginStateService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BatchDeletePluginsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		if len(req.PluginNames) == 0 {
			c.JSON(400, gin.H{
				"error": "插件名称列表不能为空",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		pluginManager := searchService.GetPluginManager()
		if pluginManager == nil {
			c.JSON(500, gin.H{
				"error": "插件管理器未初始化",
				"code":  "PLUGIN_MANAGER_NOT_INITIALIZED",
			})
			return
		}

		builtinSet := make(map[string]string)
		for _, p := range pluginManager.GetPlugins() {
			builtinSet[strings.ToLower(strings.TrimSpace(p.Name()))] = p.Name()
		}

		customPlugins := config.GetCustomPluginsConfig()
		customMap := make(map[string]config.CustomPlugin)
		for _, cp := range customPlugins.GetPlugins() {
			customMap[strings.ToLower(strings.TrimSpace(cp.Name))] = cp
		}

		success := make([]string, 0, len(req.PluginNames))
		failed := make([]BatchPluginOperationError, 0)

		seen := make(map[string]struct{}, len(req.PluginNames))
		for _, rawName := range req.PluginNames {
			normalizedName := strings.ToLower(strings.TrimSpace(rawName))
			if normalizedName == "" {
				continue
			}
			if _, exists := seen[normalizedName]; exists {
				continue
			}
			seen[normalizedName] = struct{}{}

			if builtinName, exists := builtinSet[normalizedName]; exists {
				failed = append(failed, BatchPluginOperationError{
					PluginName: builtinName,
					Error:      "内置插件不支持删除",
					Code:       "PLUGIN_NOT_DELETABLE",
				})
				continue
			}

			customPlugin, exists := customMap[normalizedName]
			if !exists {
				failed = append(failed, BatchPluginOperationError{
					PluginName: strings.TrimSpace(rawName),
					Error:      "插件不存在",
					Code:       "PLUGIN_NOT_FOUND",
				})
				continue
			}

			if err := customPlugins.RemovePlugin(customPlugin.Name); err != nil {
				failed = append(failed, BatchPluginOperationError{
					PluginName: customPlugin.Name,
					Error:      "删除插件配置失败: " + err.Error(),
					Code:       "DELETE_FAILED",
				})
				continue
			}

			if pluginStateService != nil {
				if err := pluginStateService.DeleteStatus(customPlugin.Name); err != nil {
					if rollbackErr := customPlugins.AddPlugin(customPlugin); rollbackErr != nil {
						log.Printf("⚠️  批量删除插件回滚 JSON 配置失败(%s): %v", customPlugin.Name, rollbackErr)
					}
					failed = append(failed, BatchPluginOperationError{
						PluginName: customPlugin.Name,
						Error:      "同步插件状态失败: " + err.Error(),
						Code:       "STATUS_SYNC_FAILED",
					})
					continue
				}
			}

			if pluginHealthService != nil {
				if err := pluginHealthService.ClearStatus(customPlugin.Name); err != nil {
					log.Printf("⚠️  清理插件健康状态失败(%s): %v", customPlugin.Name, err)
				}
			}

			success = append(success, customPlugin.Name)
		}

		c.JSON(200, gin.H{
			"success_count": len(success),
			"failed_count":  len(failed),
			"success":       success,
			"failed":        failed,
		})
	}
}
