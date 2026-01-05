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

	// 验证密码
	err := bcrypt.CompareHashAndPassword(
		[]byte(config.AppConfig.AdminPasswordHash),
		[]byte(req.Password),
	)
	if err != nil {
		c.JSON(401, gin.H{
			"error": "密码错误",
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

// GetPluginsStatusHandler 获取插件状态
func GetPluginsStatusHandler(c *gin.Context) {
	// TODO: 实现插件状态获取逻辑
	// 这里暂时返回一个示例响应
	c.JSON(200, gin.H{
		"plugins": []gin.H{
			{
				"name":        "duoduo",
				"status":      "active",
				"last_update": time.Now().Add(-2 * time.Minute).Unix(),
			},
			{
				"name":        "hdr4k",
				"status":      "active",
				"last_update": time.Now().Add(-5 * time.Minute).Unix(),
			},
			{
				"name":        "panta",
				"status":      "inactive",
				"last_update": time.Now().Add(-1 * time.Hour).Unix(),
			},
		},
	})
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
