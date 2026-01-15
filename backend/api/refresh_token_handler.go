package api

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"pansou/config"
	"pansou/service"
	"pansou/util"
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
		if !loginRateLimiter.Allow(c.ClientIP()) {
			c.JSON(429, gin.H{
				"error": "请求过于频繁，请稍后再试",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			return
		}

		// 验证管理员密码（复用原有逻辑）
		if config.AppConfig.AdminPasswordHash == "" {
			c.JSON(500, gin.H{
				"error": "管理员功能未配置",
				"code":  "ADMIN_NOT_CONFIGURED",
			})
			return
		}

		if req.Username != "admin" {
			c.JSON(401, gin.H{
				"error": "用户名或密码错误",
				"code":  "ADMIN_LOGIN_FAILED",
			})
			return
		}

		// 验证密码（使用 bcrypt）
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

		// 生成 Access Token（短期）
		accessToken, err := util.GenerateToken(
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

		response := LoginWithRememberResponse{
			AccessToken: accessToken,
			ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
			Username:    "admin",
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
				"admin",
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
func UserLoginWithRememberHandler(apiKeyService *service.APIKeyService, refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginWithRememberRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "参数错误：用户名和密码不能为空"})
			return
		}

		// 检查是否为 API Key 登录
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

			// 生成 Access Token（携带 API Key 信息，用于搜索计数）
			accessToken, err := util.GenerateTokenWithAPIKey(
				"apikey_user",
				false,
				req.Password, // 包含 API Key
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
				Username:    "user",
			}

			// API Key 用户也支持"记住我"
			if req.RememberMe && config.AppConfig.RefreshTokenEnabled && refreshTokenService != nil {
				deviceFingerprint := req.DeviceFingerprint
				if deviceFingerprint == "" {
					deviceFingerprint = generateDeviceFingerprint(c)
				}

				refreshToken, err := refreshTokenService.CreateToken(
					"apikey_user",
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
			return
		}

		// 普通用户登录逻辑（与原有逻辑相同）
		if !config.AppConfig.AuthEnabled {
			c.JSON(403, gin.H{"error": "认证功能未启用"})
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
		accessToken, err := util.GenerateToken(
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
			c.JSON(401, gin.H{
				"error": "刷新令牌验证失败: " + err.Error(),
				"code":  "REFRESH_TOKEN_VALIDATION_FAILED",
			})
			return
		}

		// 生成新的 Access Token
		accessToken, err := util.GenerateToken(
			token.Username,
			token.IsAdmin,
			config.AppConfig.AuthJWTSecret,
			config.AppConfig.AuthTokenExpiry,
		)
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
