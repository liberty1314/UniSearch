package middleware

import (
	"github.com/gin-gonic/gin"
)

// AdminAuth 管理员权限验证中间件
// 功能：
//   1. 从 Context 获取用户角色（由 JWTAuth 中间件设置）
//   2. 验证 role='admin'
//   3. 返回 403 错误（如果非管理员）
// 验证需求：7.3, 10.2
// 注意：此中间件必须在 JWTAuth 中间件之后使用
func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户角色（由 JWTAuth 中间件设置）
		role, exists := c.Get("role")
		if !exists {
			c.JSON(403, gin.H{
				"code":    403,
				"message": "权限不足",
			})
			c.Abort()
			return
		}

		// 2. 验证是否为管理员
		if role != "admin" {
			c.JSON(403, gin.H{
				"code":    403,
				"message": "需要管理员权限",
			})
			c.Abort()
			return
		}

		// 3. 验证通过，继续处理请求
		c.Next()
	}
}
