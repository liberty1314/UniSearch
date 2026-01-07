package api

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"pansou/config"
	"pansou/service"
	"pansou/util"
)

// CORSMiddleware 跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-API-Key")
		
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

// AuthMiddleware JWT和API Key双层认证中间件
func AuthMiddleware(apiKeyService *service.APIKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 检查是否启用认证
		if !config.AppConfig.AuthEnabled && !config.AppConfig.APIKeyEnabled {
			c.Next()
			return
		}

		// 2. 检查公开路径
		if isPublicPath(c.Request.URL.Path) {
			c.Next()
			return
		}

		// 3. 优先检查 JWT
		if token := extractBearerToken(c); token != "" {
			if claims, err := util.ValidateToken(token, config.AppConfig.AuthJWTSecret); err == nil {
				c.Set("username", claims.Username)
				c.Set("is_admin", claims.IsAdmin)
				c.Set("auth_type", "jwt")
				c.Next()
				return
			}
		}

		// 4. 降级检查 API Key
		if config.AppConfig.APIKeyEnabled && apiKeyService != nil {
			if apiKey := extractAPIKey(c); apiKey != "" {
				if valid, err := apiKeyService.ValidateKey(apiKey); err == nil && valid {
					c.Set("auth_type", "apikey")
					c.Next()
					return
				}
			}
		}

		// 5. 认证失败
		c.JSON(401, gin.H{
			"error": "未授权：缺少有效的认证凭据",
			"code":  "AUTH_REQUIRED",
		})
		c.Abort()
	}
}

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

		// 2. 验证 JWT
		claims, err := util.ValidateToken(token, config.AppConfig.AuthJWTSecret)
		if err != nil {
			c.JSON(401, gin.H{
				"error": "未授权：令牌无效或已过期",
				"code":  "ADMIN_TOKEN_INVALID",
			})
			c.Abort()
			return
		}

		// 3. 检查管理员权限
		if !claims.IsAdmin {
			c.JSON(403, gin.H{
				"error": "禁止访问：需要管理员权限",
				"code":  "ADMIN_PERMISSION_REQUIRED",
			})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("is_admin", true)
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

		// 2. 验证 JWT
		claims, err := util.ValidateToken(token, config.AppConfig.AuthJWTSecret)
		if err != nil {
			c.JSON(401, gin.H{
				"error": "未授权：令牌无效或已过期",
				"code":  "JWT_TOKEN_INVALID",
			})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
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

// extractAPIKey 从请求头或查询参数提取 API Key
func extractAPIKey(c *gin.Context) string {
	// 优先从请求头获取
	apiKey := c.GetHeader("X-API-Key")
	if apiKey != "" {
		return apiKey
	}

	// 降级从查询参数获取
	return c.Query("key")
}

// isPublicPath 检查是否为公开路径
func isPublicPath(path string) bool {
	publicPaths := []string{
		"/api/auth/login",
		"/api/auth/logout",
		"/api/health",
		"/api/admin/login", // 管理员登录接口无需认证
	}

	for _, p := range publicPaths {
		if strings.HasPrefix(path, p) {
			return true
		}
	}

	return false
}
