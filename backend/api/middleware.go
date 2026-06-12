package api

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
	"unisearch/util/logger"
)

func recordAuthenticatedRequestActivity(c *gin.Context) {
	if authService == nil {
		return
	}

	rawUserID, exists := c.Get("user_id")
	if !exists {
		return
	}

	var userID uint
	switch value := rawUserID.(type) {
	case uint:
		userID = value
	case uint64:
		userID = uint(value)
	case int:
		if value > 0 {
			userID = uint(value)
		}
	}

	if userID == 0 {
		return
	}

	if err := authService.MarkUserActiveByUserID(userID); err != nil {
		logger.Warn(
			"auth_activity_record_failed",
			logger.String("path", c.Request.URL.Path),
			logger.Any("user_id", userID),
			logger.Any("error", err),
		)
	}
}

// CORSMiddleware 跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// LoggerMiddleware 日志中间件
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("%x", startTime.UnixNano())
		}
		c.Set("request_id", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		c.Next()

		latencyTime := time.Since(startTime)
		reqMethod := c.Request.Method
		reqURI := c.Request.RequestURI

		displayURI := reqURI
		if strings.Contains(reqURI, "/api/search") && strings.Contains(reqURI, "kw=") {
			if parsedURL, err := url.Parse(reqURI); err == nil {
				if keyword := parsedURL.Query().Get("kw"); keyword != "" {
					if decodedKeyword, err := url.QueryUnescape(keyword); err == nil {
						displayURI = strings.Replace(reqURI, "kw="+keyword, "kw="+decodedKeyword, 1)
					}
				}
			}
		}

		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()

		logger.Info(
			"http_request",
			logger.String("client_ip", clientIP),
			logger.String("method", reqMethod),
			logger.String("path", displayURI),
			logger.String("request_id", requestID),
			logger.Int("status", statusCode),
			logger.Int64("latency_ms", latencyTime.Milliseconds()),
		)
	}
}

// AuthMiddleware 基础认证中间件，仅接受 JWT。
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !config.AppConfig.AuthEnabled {
			c.Next()
			return
		}

		if isPublicPath(c.Request.URL.Path) {
			c.Next()
			return
		}

		if token := extractBearerToken(c); token != "" {
			if claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret); err == nil {
				c.Set("user_id", claims.UserID)
				c.Set("username", claims.Username)
				c.Set("role", claims.Role)
				recordAuthenticatedRequestActivity(c)
				c.Next()
				return
			}
		}
		c.JSON(401, gin.H{
			"error": "未授权：缺少有效的认证凭据",
			"code":  "AUTH_REQUIRED",
		})
		c.Abort()
	}
}

// AdminMiddleware 管理员专用中间件（仅允许JWT）
// AdminMiddleware 管理员专用中间件（仅允许JWT）
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 必须包含 JWT
		token := extractBearerToken(c)
		if token == "" {
			c.JSON(401, gin.H{
				"error": "未授权：需要管理员令牌",
				"code":  "ADMIN_TOKEN_REQUIRED",
			})
			c.Abort()
			return
		}

		// 2. 验证 JWT（使用新版本的 ValidateJWTToken）
		claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret)
		if err != nil {
			c.JSON(401, gin.H{
				"error": "未授权：令牌无效或已过期",
				"code":  "ADMIN_TOKEN_INVALID",
			})
			c.Abort()
			return
		}

		// 3. 检查管理员权限（使用 Role 字段）
		if claims.Role != "admin" {
			c.JSON(403, gin.H{
				"error": "禁止访问：需要管理员权限",
				"code":  "ADMIN_PERMISSION_REQUIRED",
			})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// JWTMiddleware JWT 专用中间件（仅验证 JWT Token）
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 提取 JWT Token
		token := extractBearerToken(c)
		if token == "" {
			c.JSON(401, gin.H{
				"error": "未授权：需要 JWT 令牌",
				"code":  "JWT_TOKEN_REQUIRED",
			})
			c.Abort()
			return
		}

		// 2. 验证 JWT（使用新版本的 ValidateJWTToken）
		claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret)
		if err != nil {
			c.JSON(401, gin.H{
				"error": "未授权：令牌无效或已过期",
				"code":  "JWT_TOKEN_INVALID",
			})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		recordAuthenticatedRequestActivity(c)
		c.Next()
	}
}

// SearchJWTMiddleware 为搜索接口提供专用登录提示。
func SearchJWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			c.JSON(401, gin.H{
				"code":    401,
				"message": "请先登录后再进行搜索",
			})
			c.Abort()
			return
		}

		claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret)
		if err != nil {
			c.JSON(401, gin.H{
				"code":    401,
				"message": "登录状态已失效，请重新登录",
			})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		recordAuthenticatedRequestActivity(c)
		c.Next()
	}
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// extractBearerToken 从请求头提取 Bearer Token
func extractBearerToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	const bearerPrefix = "Bearer "
	if !strings.HasPrefix(authHeader, bearerPrefix) {
		return ""
	}

	return strings.TrimPrefix(authHeader, bearerPrefix)
}

// isPublicPath 检查是否为公开路径
func isPublicPath(path string) bool {
	publicPaths := []string{
		"/api/auth/register",       // 新增：用户注册接口
		"/api/auth/check-username", // 新增：用户名校验接口
		"/api/auth/login",
		"/api/auth/refresh",  // 新增：刷新令牌
		"/api/auth/revoke",   // 新增：撤销令牌
		"/api/auth/validate", // 新增：Token 验证接口
		"/api/auth/logout",
		"/api/health",
		"/api/admin/login",          // 管理员登录接口无需认证
		"/api/admin/login-remember", // 新增：支持记住我的管理员登录
	}

	for _, p := range publicPaths {
		if strings.HasPrefix(path, p) {
			return true
		}
	}

	return false
}
