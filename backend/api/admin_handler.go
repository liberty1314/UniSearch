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
