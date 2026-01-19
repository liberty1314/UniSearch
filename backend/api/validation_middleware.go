package api

import (
	"net/http"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
)

// ValidationMiddleware 请求验证中间件
// 用于处理各种边缘情况和错误请求
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		rawPath := c.Request.URL.RawPath

		// 1. 检查路径中的空字节（NULL字符）
		if strings.Contains(path, "\x00") || strings.Contains(rawPath, "%00") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求路径包含非法字符（空字节）",
				"code":  "INVALID_PATH_NULL_BYTE",
			})
			c.Abort()
			return
		}

		// 2. 检查路径中的其他非法字符
		for _, char := range path {
			// 检查控制字符（除了常见的空格、制表符等）
			if unicode.IsControl(char) && char != '\t' && char != '\n' && char != '\r' {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "请求路径包含非法控制字符",
					"code":  "INVALID_PATH_CONTROL_CHAR",
				})
				c.Abort()
				return
			}
			// 检查危险字符
			if strings.ContainsRune("<>\"{}|\\^[]`", char) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "请求路径包含非法字符",
					"code":  "INVALID_PATH_CHAR",
				})
				c.Abort()
				return
			}
		}

		// 3. 检查路径长度（防止过长的URI）
		// RFC 2616 建议服务器至少支持 8000 字节，这里设置为 2048
		if len(c.Request.URL.RequestURI()) > 2048 {
			c.JSON(http.StatusRequestURITooLong, gin.H{
				"error": "请求URI过长",
				"code":  "URI_TOO_LONG",
			})
			c.Abort()
			return
		}

		// 4. 检查是否有多余的斜杠
		// 注意：Gin 默认会将 /api/health/ 重定向到 /api/health
		// 但我们可以在这里拦截并返回错误
		if strings.Contains(path, "//") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "请求路径格式错误（包含多余斜杠）",
				"code":  "INVALID_PATH_FORMAT",
			})
			c.Abort()
			return
		}

		// 5. 检查路径是否以多余的斜杠结尾（可选）
		// 如果需要严格模式，可以启用此检查
		// if len(path) > 1 && strings.HasSuffix(path, "/") {
		// 	c.JSON(http.StatusBadRequest, gin.H{
		// 		"error": "请求路径格式错误（尾部斜杠）",
		// 		"code":  "INVALID_PATH_TRAILING_SLASH",
		// 	})
		// 	c.Abort()
		// 	return
		// }

		// 6. 检查 Authorization Header 格式
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// 检查是否是 Bearer Token 格式
			if strings.HasPrefix(authHeader, "Bearer ") {
				token := strings.TrimPrefix(authHeader, "Bearer ")
				// 检查 Token 是否为空
				if token == "" {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "认证令牌格式错误（Token为空）",
						"code":  "INVALID_AUTH_TOKEN_EMPTY",
					})
					c.Abort()
					return
				}
				// 检查 Token 是否包含非法字符（基本验证）
				if strings.ContainsAny(token, " \t\n\r") {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "认证令牌格式错误（包含空白字符）",
						"code":  "INVALID_AUTH_TOKEN_FORMAT",
					})
					c.Abort()
					return
				}
			} else if authHeader != "" && !strings.HasPrefix(authHeader, "Basic ") {
				// 如果不是 Bearer 也不是 Basic，则格式错误
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "认证令牌格式错误（不支持的认证方式）",
					"code":  "INVALID_AUTH_SCHEME",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// MethodNotAllowedHandler 处理不支持的HTTP方法
// 返回405状态码而不是404
func MethodNotAllowedHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{
			"error": "不支持的HTTP方法: " + c.Request.Method,
			"code":  "METHOD_NOT_ALLOWED",
			"allowed_methods": getAllowedMethods(c.Request.URL.Path),
		})
	}
}

// getAllowedMethods 获取指定路径支持的HTTP方法
func getAllowedMethods(path string) []string {
	// 根据路径返回支持的方法
	switch {
	case strings.HasPrefix(path, "/api/health"):
		return []string{"GET", "HEAD"}
	case strings.HasPrefix(path, "/api/search"):
		return []string{"GET", "POST"}
	case strings.HasPrefix(path, "/api/auth/"):
		return []string{"POST"}
	case strings.HasPrefix(path, "/api/admin/"):
		return []string{"GET", "POST", "PUT", "PATCH", "DELETE"}
	default:
		return []string{"GET", "POST"}
	}
}
