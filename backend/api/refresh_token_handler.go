package api

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/service"
	"unisearch/util"
)

// RefreshTokenRequest 刷新令牌请求。
// 刷新令牌本身经 httpOnly cookie 传递（不在 body），此处仅携带设备指纹。
type RefreshTokenRequest struct {
	DeviceFingerprint string `json:"device_fingerprint"`
}

// RefreshTokenResponse 刷新令牌响应。
// 新刷新令牌通过 httpOnly cookie 轮转下发，不再返回给前端 JS。
type RefreshTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresAt   int64  `json:"expires_at"`
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
	AccessToken string `json:"access_token"`
	ExpiresAt   int64  `json:"expires_at"`
	Username    string `json:"username"`
}

// generateDeviceFingerprint 生成设备指纹（服务端备用方案）
func generateDeviceFingerprint(c *gin.Context) string {
	// 使用 IP + User-Agent 生成简单的设备指纹
	data := c.ClientIP() + c.GetHeader("User-Agent")
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// AdminLoginWithRememberHandler 管理员登录（支持记住密码）
func AdminLoginWithRememberHandler(authService *service.AuthService, refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
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

		accessToken, user, _, err := authService.Login(req.Username, req.Password)
		if err != nil {
			if writeLoginPolicyResponse(c, err) {
				return
			}
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

		// 如果勾选"记住我"，生成 Refresh Token 并以 httpOnly cookie 下发。
		if req.RememberMe && config.AppConfig.RefreshTokenEnabled && refreshTokenService != nil {
			// 获取设备指纹
			deviceFingerprint := req.DeviceFingerprint
			if deviceFingerprint == "" {
				deviceFingerprint = generateDeviceFingerprint(c)
			}

			refreshToken, err := refreshTokenService.Issue(
				c.Request.Context(),
				user.ID,
				deviceFingerprint,
				config.AppConfig.RefreshTokenTTL,
			)
			if err != nil {
				println("创建刷新令牌失败:", err.Error())
			} else {
				util.SetRefreshTokenCookie(c, refreshToken.RawToken)
			}
		}

		c.JSON(200, response)
	}
}

// RefreshAccessTokenHandler 使用刷新令牌获取新的访问令牌
func RefreshAccessTokenHandler(authService *service.AuthService, refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 设备指纹仍可从 body 传入（可选），刷新令牌只从 httpOnly cookie 读取。
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
			if isRequestBodyTooLargeError(err) {
				abortRequestBodyTooLarge(c)
				return
			}
			c.JSON(400, gin.H{
				"error": "请求参数错误",
				"code":  "INVALID_REQUEST",
			})
			return
		}
		if authService == nil {
			writeLoginPolicyResponse(c, service.ErrAuthPolicyUnavailable)
			return
		}
		if err := authService.RequireLoginEnabled(c.Request.Context()); err != nil {
			writeLoginPolicyResponse(c, err)
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

		// 从 httpOnly cookie 读取刷新令牌（不再从 body）。
		cookieToken := util.ReadRefreshTokenCookie(c)
		if cookieToken == "" {
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

		rotation, err := refreshTokenService.Rotate(c.Request.Context(), cookieToken, deviceFingerprint, config.AppConfig.RefreshTokenTTL)
		if err != nil {
			util.ClearRefreshTokenCookie(c)
			if errors.Is(err, service.ErrRefreshTokenReuse) {
				log.Printf("安全: 检测到刷新令牌重放，已吊销用户全部令牌")
				c.JSON(401, gin.H{
					"error": "检测到异常登录活动，请重新登录",
					"code":  "REFRESH_TOKEN_REUSE_DETECTED",
				})
				return
			}
			if errors.Is(err, service.ErrAuthStateUnavailable) {
				c.JSON(503, gin.H{
					"error":      "账户状态暂时不可用",
					"code":       "AUTH_STATE_UNAVAILABLE",
					"error_code": "AUTH_STATE_UNAVAILABLE",
				})
				return
			}
			if errors.Is(err, service.ErrRefreshTokenInvalid) {
				c.JSON(401, gin.H{
					"error": "刷新令牌无效或已过期",
					"code":  "REFRESH_TOKEN_VALIDATION_FAILED",
				})
				return
			}
			log.Printf("刷新令牌轮转失败: %v", err)
			c.JSON(500, gin.H{
				"error": "刷新令牌轮转失败",
				"code":  "REFRESH_TOKEN_ROTATION_FAILED",
			})
			return
		}

		accessToken, err := util.GenerateJWTToken(
			rotation.State.ID,
			rotation.State.Username,
			rotation.State.Role,
			rotation.State.TokenVersion,
			config.AppConfig.AuthJWTSecret,
			config.AppConfig.AuthTokenExpiry,
		)
		if err != nil {
			util.ClearRefreshTokenCookie(c)
			c.JSON(500, gin.H{
				"error": "生成访问令牌失败",
				"code":  "TOKEN_GENERATION_FAILED",
			})
			return
		}

		util.SetRefreshTokenCookie(c, rotation.RawToken)

		c.JSON(200, RefreshTokenResponse{
			AccessToken: accessToken,
			ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
		})
	}
}

// RevokeRefreshTokenHandler 撤销刷新令牌（用户登出）
func RevokeRefreshTokenHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		revokeRequestAccessToken(c)
		defer util.ClearRefreshTokenCookie(c)

		if !config.AppConfig.RefreshTokenEnabled || refreshTokenService == nil {
			c.JSON(200, gin.H{"message": "退出成功"})
			return
		}

		rawToken := util.ReadRefreshTokenCookie(c)
		if rawToken != "" {
			_ = refreshTokenService.Revoke(c.Request.Context(), rawToken)
		}
		c.JSON(200, gin.H{"message": "退出成功"})
	}
}
