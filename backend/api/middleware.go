package api

import (
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
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
		log.Printf("⚠️  记录用户活跃统计失败: path=%s user_id=%d err=%v", c.Request.URL.Path, userID, err)
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
		// 开始时间
		startTime := time.Now()

		// 处理请求
		c.Next()

		// 结束时间
		endTime := time.Now()

		// 执行时间
		latencyTime := endTime.Sub(startTime)

		// 请求方式
		reqMethod := c.Request.Method

		// 请求路由
		reqURI := c.Request.RequestURI

		// 对于搜索API，尝试解码关键词以便更好地显示
		displayURI := reqURI
		if strings.Contains(reqURI, "/api/search") && strings.Contains(reqURI, "kw=") {
			if parsedURL, err := url.Parse(reqURI); err == nil {
				if keyword := parsedURL.Query().Get("kw"); keyword != "" {
					if decodedKeyword, err := url.QueryUnescape(keyword); err == nil {
						// 替换原始URI中的编码关键词为解码后的关键词
						displayURI = strings.Replace(reqURI, "kw="+keyword, "kw="+decodedKeyword, 1)
					}
				}
			}
		}

		// 状态码
		statusCode := c.Writer.Status()

		// 请求IP
		clientIP := c.ClientIP()

		// 日志格式
		gin.DefaultWriter.Write([]byte(
			fmt.Sprintf("| %s | %s | %s | %d | %s\n",
				clientIP, reqMethod, displayURI, statusCode, latencyTime.String())))
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
		"/api/auth/register", // 新增：用户注册接口
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
