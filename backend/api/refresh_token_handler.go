package api

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
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

		// 如果勾选"记住我"，生成 Refresh Token 并以 httpOnly cookie 下发。
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
				// 加密刷新令牌后经 httpOnly cookie 下发（不再返回 body）。
				encryptedToken, err := refreshTokenService.EncryptForClient(refreshToken.Token)
				if err == nil {
					util.SetRefreshTokenCookie(c, encryptedToken)
				}
			}
		}

		c.JSON(200, response)
	}
}

// RefreshAccessTokenHandler 使用刷新令牌获取新的访问令牌
func RefreshAccessTokenHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 设备指纹仍可从 body 传入（可选），刷新令牌只从 httpOnly cookie 读取。
		var req RefreshTokenRequest
		_ = c.ShouldBindJSON(&req)

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

		// 解密客户端发送的刷新令牌
		decryptedToken, err := refreshTokenService.DecryptFromClient(cookieToken)
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
			// 重放检测：已撤销（轮转弃用）的令牌被再次使用，视为可能泄露。
			// ValidateToken 已吊销该用户全部刷新令牌；此处清除本端 cookie 并要求重新登录。
			if errors.Is(err, service.ErrRefreshTokenReuse) {
				log.Printf("安全: 检测到刷新令牌重放，已吊销用户全部令牌")
				util.ClearRefreshTokenCookie(c)
				c.JSON(401, gin.H{
					"error": "检测到异常登录活动，请重新登录",
					"code":  "REFRESH_TOKEN_REUSE_DETECTED",
				})
				return
			}
			log.Printf("刷新令牌验证失败: %v", err)
			c.JSON(401, gin.H{
				"error": "刷新令牌无效或已过期",
				"code":  "REFRESH_TOKEN_VALIDATION_FAILED",
			})
			return
		}

		// 生成新的 Access Token（使用新版 JWT Claims）
		accessToken, err := generateAccessTokenFromRefreshRecord(token.Username)
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

		// 轮转后的刷新令牌通过 httpOnly cookie 下发，不再进入响应体。
		util.SetRefreshTokenCookie(c, encryptedNewToken)

		c.JSON(200, RefreshTokenResponse{
			AccessToken: accessToken,
			ExpiresAt:   time.Now().Add(config.AppConfig.AuthTokenExpiry).Unix(),
		})
	}
}

// generateAccessTokenFromRefreshRecord 根据刷新令牌记录生成新版 JWT Token。
// 刷新令牌必须对应一个真实的数据库用户；找不到用户即视为无效（不再降级兜底）。
func generateAccessTokenFromRefreshRecord(username string) (string, error) {
	authService := service.NewAuthService()
	dbUser, err := authService.GetUserByUsername(username)
	if err != nil || dbUser == nil {
		return "", fmt.Errorf("刷新令牌对应的用户不存在: %s", username)
	}

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
		dbUser.TokenVersion,
		config.AppConfig.AuthJWTSecret,
		config.AppConfig.AuthTokenExpiry,
	)
}

// RevokeRefreshTokenHandler 撤销刷新令牌（用户登出）
func RevokeRefreshTokenHandler(refreshTokenService *service.RefreshTokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 登出：将当前 access token 的 JTI 加入吊销名单，使其立即失效。
		revokeRequestAccessToken(c)

		// 无论后续流程如何，都清除客户端的刷新令牌 cookie。
		defer util.ClearRefreshTokenCookie(c)

		if !config.AppConfig.RefreshTokenEnabled || refreshTokenService == nil {
			c.JSON(200, gin.H{"message": "退出成功"})
			return
		}

		// 从 httpOnly cookie 读取刷新令牌。
		encryptedToken := util.ReadRefreshTokenCookie(c)
		if encryptedToken == "" {
			c.JSON(200, gin.H{"message": "退出成功"})
			return
		}

		// 解密刷新令牌
		decryptedToken, err := refreshTokenService.DecryptFromClient(encryptedToken)
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
