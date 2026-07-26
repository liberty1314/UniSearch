package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
	"unisearch/util/logger"
)

const (
	authRequestBodyLimitBytes   int64 = 16 * 1024
	searchRequestBodyLimitBytes int64 = 128 * 1024
)

var errRequestBodyTooLarge = errors.New("请求体过大")

// BodySizeLimitMiddleware 为高风险入口设置请求体读取上限。
func BodySizeLimitMiddleware(limitBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if limitBytes <= 0 || c.Request == nil || c.Request.Body == nil {
			c.Next()
			return
		}

		if c.Request.ContentLength > limitBytes {
			abortRequestBodyTooLarge(c)
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limitBytes)
		c.Next()
	}
}

func abortRequestBodyTooLarge(c *gin.Context) {
	writeAPIError(c, http.StatusRequestEntityTooLarge, "REQUEST_BODY_TOO_LARGE", "请求体过大", nil)
	c.Abort()
}

func isRequestBodyTooLargeError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, errRequestBodyTooLarge) {
		return true
	}
	var maxBytesErr *http.MaxBytesError
	return errors.As(err, &maxBytesErr)
}

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

// SecurityHeadersMiddleware 设置全站安全响应头，降低点击劫持、MIME 嗅探与降级攻击面。
// 这些头对 API 与页面响应均无副作用，仅生产环境（HTTPS）追加 HSTS。
func SecurityHeadersMiddleware() gin.HandlerFunc {
	isProduction := config.AppConfig != nil && config.AppConfig.IsProduction()
	return func(c *gin.Context) {
		h := c.Writer.Header()
		// 阻止 MIME 嗅探。
		h.Set("X-Content-Type-Options", "nosniff")
		// 禁止被 iframe 嵌套，防点击劫持（等价于 CSP frame-ancestors 'none'）。
		h.Set("X-Frame-Options", "DENY")
		h.Set("Content-Security-Policy", "frame-ancestors 'none'")
		// 限制 Referer 泄漏。
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// 仅生产（HTTPS）启用 HSTS，避免开发环境 HTTP 被强制升级导致无法访问。
		if isProduction {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// CORSMiddleware 跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if origin := c.GetHeader("Origin"); isCORSOriginAllowed(origin) {
			// 回显具体 Origin（而非 *），以便配合 Allow-Credentials 携带 httpOnly Cookie（刷新令牌）。
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Add("Vary", "Origin")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func isCORSOriginAllowed(origin string) bool {
	if strings.TrimSpace(origin) == "" || config.AppConfig == nil {
		return false
	}
	for _, allowedOrigin := range config.AppConfig.AllowedOrigins {
		if allowedOrigin == "*" || allowedOrigin == origin {
			return true
		}
	}
	return false
}

// EnforceSameOriginMiddleware 对 Cookie 驱动的写端点（refresh/revoke/logout）强制校验请求来源。
// httpOnly Cookie 会被浏览器自动携带，SameSite=Strict 是主要防线；此中间件作为 CSRF 的第二道防线：
// 校验 Origin（缺失时回退 Referer）必须落在 ALLOWED_ORIGINS 白名单内，否则 403。
// 说明：非浏览器客户端（无 Origin/Referer）默认放行，避免破坏合法的服务端到服务端调用；
// 真正的 CSRF 依赖浏览器发起并自动带 Cookie，浏览器必定附带 Origin/Referer。
func EnforceSameOriginMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		if origin == "" {
			// 部分浏览器同源 POST 不带 Origin，回退校验 Referer。
			if referer := strings.TrimSpace(c.GetHeader("Referer")); referer != "" {
				if u, err := url.Parse(referer); err == nil && u.Scheme != "" && u.Host != "" {
					origin = u.Scheme + "://" + u.Host
				} else {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
						"error": "请求来源非法",
						"code":  "INVALID_ORIGIN",
					})
					return
				}
			} else {
				// 既无 Origin 也无 Referer：视为非浏览器客户端，放行。
				c.Next()
				return
			}
		}

		if !isCORSOriginAllowed(origin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "请求来源非法",
				"code":  "INVALID_ORIGIN",
			})
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
				if !enforceTokenState(c, claims) {
					return
				}
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

		if !enforceTokenState(c, claims) {
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

		if !enforceTokenState(c, claims) {
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

		if !enforceTokenState(c, claims) {
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
