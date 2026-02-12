package middleware

import (
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
)

// JWTAuth JWT 认证中间件
// 功能：
//  1. 从 Authorization Header 获取 Token
//  2. 验证 Token 格式（Bearer <token>）
//  3. 验证 Token 有效性
//  4. 将用户信息存入 Gin Context
//
// 验证需求：6.2, 6.3, 8.2, 10.1, 10.3, 10.4
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 从 Header 中获取 Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("⚠️ JWT Auth: 未提供认证令牌 (Path: %s)", c.Request.URL.Path)
			c.JSON(401, gin.H{
				"code":    401,
				"message": "未提供认证令牌",
			})
			c.Abort()
			return
		}

		// 2. 验证 Token 格式（Bearer <token>）
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Printf("⚠️ JWT Auth: 认证令牌格式错误 (Path: %s, Header: %s)", c.Request.URL.Path, authHeader)
			c.JSON(401, gin.H{
				"code":    401,
				"message": "认证令牌格式错误",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		log.Printf("🔐 JWT Auth: 验证 Token (Path: %s, Token: %s...)", c.Request.URL.Path, tokenString[:20])

		// 3. 验证 Token 有效性
		jwtSecret := config.AppConfig.AuthJWTSecret
		claims, err := util.ValidateJWTToken(tokenString, jwtSecret)
		if err != nil {
			log.Printf("❌ JWT Auth: Token 验证失败 (Path: %s, Error: %v)", c.Request.URL.Path, err)
			c.JSON(401, gin.H{
				"code":    401,
				"message": "认证令牌无效或已过期",
			})
			c.Abort()
			return
		}

		log.Printf("✅ JWT Auth: Token 验证成功 (Path: %s, UserID: %d, Username: %s)", c.Request.URL.Path, claims.UserID, claims.Username)

		// 4. 将用户信息存入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		
		// 如果是 API Key 登录，将 API Key 也存入上下文
		if claims.APIKey != "" {
			c.Set("api_key", claims.APIKey)
		}

		c.Next()
	}
}

// ExtractBearerToken 从请求头提取 Bearer Token（辅助函数）
// 参数：
//   - c: Gin Context
//
// 返回：
//   - string: 提取的 Token 字符串（如果不存在或格式错误则返回空字符串）
func ExtractBearerToken(c *gin.Context) string {
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
