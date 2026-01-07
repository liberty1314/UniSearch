package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"pansou/config"
	"pansou/service"
	"pansou/util"
)

// LoginRequest 登录请求结构
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应结构
type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
	Username  string `json:"username"`
}

// LoginHandler 处理用户登录（支持普通用户和 API Key 登录）
func LoginHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "参数错误：用户名和密码不能为空"})
			return
		}

		// 检查是否为 API Key 登录（用户名为 "user" 且密码为 API Key 格式）
		if req.Username == "user" && len(req.Password) == 43 && req.Password[:3] == "sk-" {
			// API Key 登录逻辑
			if !config.AppConfig.APIKeyEnabled || apiKeyService == nil {
				c.JSON(403, gin.H{"error": "API Key 认证功能未启用"})
				return
			}

			// 验证 API Key
			valid, err := apiKeyService.ValidateKey(req.Password)
			if err != nil {
				c.JSON(500, gin.H{"error": "验证 API Key 失败"})
				return
			}

			if !valid {
				c.JSON(401, gin.H{"error": "API Key 无效或已过期"})
				return
			}

			// 生成 JWT Token（携带 API Key 信息）
			token, err := util.GenerateToken(
				"apikey_user", // 使用特殊用户名标识 API Key 用户
				false,         // 非管理员
				config.AppConfig.AuthJWTSecret,
				config.AppConfig.AuthTokenExpiry,
			)
			if err != nil {
				c.JSON(500, gin.H{"error": "生成令牌失败"})
				return
			}

			// 返回 token 和过期时间
			expiresAt := time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix()
			c.JSON(200, LoginResponse{
				Token:     token,
				ExpiresAt: expiresAt,
				Username:  "user",
			})
			return
		}

		// 普通用户登录逻辑
		// 验证认证系统是否启用
		if !config.AppConfig.AuthEnabled {
			c.JSON(403, gin.H{"error": "认证功能未启用"})
			return
		}

		// 验证用户配置是否存在
		if config.AppConfig.AuthUsers == nil || len(config.AppConfig.AuthUsers) == 0 {
			c.JSON(500, gin.H{"error": "认证系统未正确配置"})
			return
		}

		// 验证用户名和密码
		storedPassword, exists := config.AppConfig.AuthUsers[req.Username]
		if !exists || storedPassword != req.Password {
			c.JSON(401, gin.H{"error": "用户名或密码错误"})
			return
		}

		// 生成JWT token
		token, err := util.GenerateToken(
			req.Username,
			false, // 普通用户登录，非管理员
			config.AppConfig.AuthJWTSecret,
			config.AppConfig.AuthTokenExpiry,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": "生成令牌失败"})
			return
		}

		// 返回token和过期时间
		expiresAt := time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix()
		c.JSON(200, LoginResponse{
			Token:     token,
			ExpiresAt: expiresAt,
			Username:  req.Username,
		})
	}
}

// VerifyHandler 验证token有效性
func VerifyHandler(c *gin.Context) {
	// 如果未启用认证，直接返回有效
	if !config.AppConfig.AuthEnabled {
		c.JSON(200, gin.H{
			"valid": true,
			"message": "认证功能未启用",
		})
		return
	}

	// 如果能到达这里，说明中间件已经验证通过
	username, exists := c.Get("username")
	if !exists {
		c.JSON(401, gin.H{"error": "未授权"})
		return
	}

	c.JSON(200, gin.H{
		"valid":    true,
		"username": username,
	})
}

// LogoutHandler 退出登录（客户端删除token即可）
func LogoutHandler(c *gin.Context) {
	// JWT是无状态的，服务端不需要处理注销
	// 客户端删除存储的token即可
	c.JSON(200, gin.H{"message": "退出成功"})
}

// APIKeyInfoResponse 用户 API Key 详情响应
type APIKeyInfoResponse struct {
	Key            string  `json:"key"`              // API Key 字符串
	Status         string  `json:"status"`           // 状态：active/expired
	FirstUsedAt    *string `json:"first_used_at"`    // 首次使用时间（北京时间）
	ExpiresAt      string  `json:"expires_at"`       // 到期时间（北京时间）
	ValidityPeriod string  `json:"validity_period"`  // 有效期描述（如"30天"）
	RemainingDays  int     `json:"remaining_days"`   // 剩余天数
	Description    string  `json:"description"`      // 描述信息
}

// GetUserAPIKeyInfoHandler 获取当前用户的 API Key 详情
func GetUserAPIKeyInfoHandler(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取 API Key
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			// 降级从查询参数获取
			apiKey = c.Query("key")
		}

		if apiKey == "" {
			c.JSON(400, gin.H{
				"error": "缺少 API Key",
				"code":  "APIKEY_MISSING",
			})
			return
		}

		// 获取 API Key 详情
		keyInfo, err := apiKeyService.GetKey(apiKey)
		if err != nil {
			c.JSON(404, gin.H{
				"error": "API Key 不存在",
				"code":  "APIKEY_NOT_FOUND",
			})
			return
		}

		// 转换为北京时间（UTC+8）
		beijingLocation := time.FixedZone("CST", 8*3600)
		
		// 计算有效期（小时转天数）
		validityDays := keyInfo.TTLHours / 24
		validityPeriod := fmt.Sprintf("%d天", validityDays)
		
		// 计算剩余天数
		remainingDays := 0
		if keyInfo.FirstUsedAt != nil {
			remainingDuration := time.Until(keyInfo.ExpiresAt)
			remainingDays = int(remainingDuration.Hours() / 24)
			if remainingDays < 0 {
				remainingDays = 0
			}
		} else {
			// 未使用时，剩余天数等于有效期
			remainingDays = validityDays
		}

		// 判断状态
		status := "active"
		if keyInfo.IsExpired() {
			status = "expired"
		}

		// 格式化时间为北京时间
		var firstUsedAtStr *string
		if keyInfo.FirstUsedAt != nil {
			formatted := keyInfo.FirstUsedAt.In(beijingLocation).Format("2006-01-02 15:04:05")
			firstUsedAtStr = &formatted
		}
		
		expiresAtStr := keyInfo.ExpiresAt.In(beijingLocation).Format("2006-01-02 15:04:05")

		// 构建响应
		response := APIKeyInfoResponse{
			Key:            keyInfo.Key,
			Status:         status,
			FirstUsedAt:    firstUsedAtStr,
			ExpiresAt:      expiresAtStr,
			ValidityPeriod: validityPeriod,
			RemainingDays:  remainingDays,
			Description:    keyInfo.Description,
		}

		c.JSON(200, response)
	}
}
