package api

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/service"
	"unisearch/util"
)

// RefreshTokenRequest 刷新令牌请求
type RefreshTokenRequest struct {
	RefreshToken      string `json:"refresh_token" binding:"required"`
	DeviceFingerprint string `json:"device_fingerprint" binding:"required"`
}

// RefreshTokenResponse 刷新令牌响应
type RefreshTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresAt    int64  `json:"expires_at"`
	RefreshToken string `json:"refresh_token"` // 新的刷新令牌（Token 轮转）
}

// LoginWithRememberRequest 登录请求（支持记住密码）
type LoginWithRememberRequest struct {
	Username          string `json:"username" binding:"required"`
	Password          string `json:"password" binding:"required"`
	RememberMe        bool   `json:"remember_me"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

// LoginWithRememberResponse 登录响应（支持记住密码）
type LoginWithRememberResponse struct {
	AccessToken  string  `json:"access_token"`
	ExpiresAt    int64   `json:"expires_at"`
	RefreshToken *string `json:"refresh_token,omitempty"` // 仅在 remember_me=true 时返回
	Username     string  `json:"username"`
}

// generateDeviceFingerprint 生成设备指纹（服务端备用方案）
func generateDeviceFingerprint(c *gin.Context) string {
	// 使用 IP + User-Agent 生成简单的设备指纹
	data := c.ClientIP() + c.GetHeader("User-Agent")
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// AdminLoginWithRememberHandler 管理员登录（支持记住密码）
func AdminLoginWithRememberHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginWithRememberRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 速率限制检查
		if !adminLoginRateLimiter.Allow(buildRateLimitKey(c)) {
			c.JSON(429, gin.H{
				"error": "请求过于频繁，请稍后再试",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			return
		}

		// 使用认证服务进行登录验证
		authService := service.NewAuthService()
		accessToken, user, _, err := authService.Login(req.Username, req.Password)
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

		response := LoginWithRememberResponse{
			AccessToken: accessToken,
			ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
			Username:    user.Username,
		}

		// 如果勾选"记住我"，生成 Refresh Token
		if req.RememberMe && config.AppConfig.RefreshTokenEnabled && refreshTokenService != nil {
			// 获取设备指纹
			deviceFingerprint := req.DeviceFingerprint
			if deviceFingerprint == "" {
				deviceFingerprint = generateDeviceFingerprint(c)
			}

			// 创建刷新令牌
			refreshToken, err := refreshTokenService.CreateToken(
				user.Username,
				true,
				deviceFingerprint,
				config.AppConfig.RefreshTokenTTL,
			)
			if err != nil {
				// 记录错误但不影响登录
				println("创建刷新令牌失败:", err.Error())
			} else {
				// 加密刷新令牌后返回给客户端
				encryptedToken, err := refreshTokenService.EncryptForClient(refreshToken.Token)
				if err == nil {
					response.RefreshToken = &encryptedToken
				}
			}
		}

		c.JSON(200, response)
	}
}

// UserLoginWithRememberHandler 普通用户登录（支持记住密码）
func UserLoginWithRememberHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginWithRememberRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "参数错误：用户名和密码不能为空"})
			return
		}

		if !userLoginRateLimiter.Allow(buildRateLimitKey(c, req.Username)) {
			c.JSON(429, gin.H{"error": "请求过于频繁，请稍后再试"})
			return
		}

		// 普通用户登录逻辑
		// 优先尝试数据库用户登录
		authService := service.NewAuthService()
		accessToken, user, _, err := authService.Login(req.Username, req.Password)

		if err == nil {
			// 数据库用户登录成功
			response := LoginWithRememberResponse{
				AccessToken: accessToken,
				ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
				Username:    user.Username,
			}

			// 支持"记住我"
			if req.RememberMe && config.AppConfig.RefreshTokenEnabled && refreshTokenService != nil {
				deviceFingerprint := req.DeviceFingerprint
				if deviceFingerprint == "" {
					deviceFingerprint = generateDeviceFingerprint(c)
				}

				refreshToken, err := refreshTokenService.CreateToken(
					user.Username,
					user.IsAdmin(),
					deviceFingerprint,
					config.AppConfig.RefreshTokenTTL,
				)
				if err == nil {
					encryptedToken, err := refreshTokenService.EncryptForClient(refreshToken.Token)
					if err == nil {
						response.RefreshToken = &encryptedToken
					}
				}
			}

			c.JSON(200, response)
			return
		}

		// 数据库登录失败，尝试配置文件用户登录（向后兼容）
		if !config.AppConfig.AuthEnabled {
			c.JSON(401, gin.H{"error": "用户名或密码错误"})
			return
		}

		if config.AppConfig.AuthUsers == nil || len(config.AppConfig.AuthUsers) == 0 {
			c.JSON(500, gin.H{"error": "认证系统未正确配置"})
			return
		}

		storedPassword, exists := config.AppConfig.AuthUsers[req.Username]
		if !exists || storedPassword != req.Password {
			c.JSON(401, gin.H{"error": "用户名或密码错误"})
			return
		}

		// 生成 Access Token
		accessToken, err = util.GenerateToken(
			req.Username,
			false,
			config.AppConfig.AuthJWTSecret,
			config.AppConfig.AuthTokenExpiry,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": "生成令牌失败"})
			return
		}

		response := LoginWithRememberResponse{
			AccessToken: accessToken,
			ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
			Username:    req.Username,
		}

		// 支持"记住我"
		if req.RememberMe && config.AppConfig.RefreshTokenEnabled && refreshTokenService != nil {
			deviceFingerprint := req.DeviceFingerprint
			if deviceFingerprint == "" {
				deviceFingerprint = generateDeviceFingerprint(c)
			}

			refreshToken, err := refreshTokenService.CreateToken(
				req.Username,
				false,
				deviceFingerprint,
				config.AppConfig.RefreshTokenTTL,
			)
			if err == nil {
				encryptedToken, err := refreshTokenService.EncryptForClient(refreshToken.Token)
				if err == nil {
					response.RefreshToken = &encryptedToken
				}
			}
		}

		c.JSON(200, response)
	}
}

// RefreshAccessTokenHandler 使用刷新令牌获取新的访问令牌
func RefreshAccessTokenHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		// 检查功能是否启用
		if !config.AppConfig.RefreshTokenEnabled || refreshTokenService == nil {
			c.JSON(403, gin.H{
				"error": "刷新令牌功能未启用",
				"code":  "REFRESH_TOKEN_DISABLED",
			})
			return
		}

		// 解密客户端发送的刷新令牌
		decryptedToken, err := refreshTokenService.DecryptFromClient(req.RefreshToken)
		if err != nil {
			c.JSON(401, gin.H{
				"error": "刷新令牌无效",
				"code":  "INVALID_REFRESH_TOKEN",
			})
			return
		}

		// 获取设备指纹
		deviceFingerprint := req.DeviceFingerprint
		if deviceFingerprint == "" {
			deviceFingerprint = generateDeviceFingerprint(c)
		}

		// 验证刷新令牌
		token, err := refreshTokenService.ValidateToken(decryptedToken, deviceFingerprint)
		if err != nil {
			log.Printf("刷新令牌验证失败: %v", err)
			c.JSON(401, gin.H{
				"error": "刷新令牌无效或已过期",
				"code":  "REFRESH_TOKEN_VALIDATION_FAILED",
			})
			return
		}

		// 生成新的 Access Token（使用新版 JWT Claims）
		accessToken, err := generateAccessTokenFromRefreshRecord(token.Username, token.IsAdmin)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "生成访问令牌失败",
				"code":  "TOKEN_GENERATION_FAILED",
			})
			return
		}

		// Token 轮转：撤销旧令牌，生成新令牌
		_ = refreshTokenService.RevokeToken(decryptedToken)
		newRefreshToken, err := refreshTokenService.CreateToken(
			token.Username,
			token.IsAdmin,
			deviceFingerprint,
			config.AppConfig.RefreshTokenTTL,
		)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "生成新刷新令牌失败",
				"code":  "REFRESH_TOKEN_GENERATION_FAILED",
			})
			return
		}

		// 加密新刷新令牌
		encryptedNewToken, err := refreshTokenService.EncryptForClient(newRefreshToken.Token)
		if err != nil {
			c.JSON(500, gin.H{
				"error": "加密刷新令牌失败",
				"code":  "REFRESH_TOKEN_ENCRYPTION_FAILED",
			})
			return
		}

		c.JSON(200, RefreshTokenResponse{
			AccessToken:  accessToken,
			ExpiresAt:    time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
			RefreshToken: encryptedNewToken,
		})
	}
}

// generateAccessTokenFromRefreshRecord 根据刷新令牌记录生成新版 JWT Token。
func generateAccessTokenFromRefreshRecord(username string, isAdmin bool) (string, error) {
	authService := service.NewAuthService()
	dbUser, err := authService.GetUserByUsername(username)
	if err == nil && dbUser != nil {
		role := dbUser.Role
		if role == "" {
			if dbUser.IsAdmin() {
				role = "admin"
			} else {
				role = "user"
			}
		}

		return util.GenerateJWTToken(
			dbUser.ID,
			dbUser.Username,
			role,
			config.AppConfig.AuthJWTSecret,
			config.AppConfig.AuthTokenExpiry,
		)
	}

	// 兼容兜底：处理历史 refresh token（如配置文件用户）
	role := "user"
	if isAdmin {
		role = "admin"
	}
	if username == "" {
		if isAdmin {
			username = "admin"
		} else {
			username = "user"
		}
	}
	log.Printf("⚠ refresh token 用户映射降级: username=%s role=%s", username, role)

	return util.GenerateJWTToken(
		0,
		username,
		role,
		config.AppConfig.AuthJWTSecret,
		config.AppConfig.AuthTokenExpiry,
	)
}

// RevokeRefreshTokenHandler 撤销刷新令牌（用户登出）
func RevokeRefreshTokenHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}

		if !config.AppConfig.RefreshTokenEnabled || refreshTokenService == nil {
			c.JSON(200, gin.H{"message": "退出成功"})
			return
		}

		// 解密刷新令牌
		decryptedToken, err := refreshTokenService.DecryptFromClient(req.RefreshToken)
		if err != nil {
			// 即使解密失败也返回成功（客户端会清除本地存储）
			c.JSON(200, gin.H{"message": "退出成功"})
			return
		}

		// 撤销令牌
		_ = refreshTokenService.RevokeToken(decryptedToken)

		c.JSON(200, gin.H{"message": "退出成功"})
	}
}
