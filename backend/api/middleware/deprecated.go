package middleware

import (
	"log"

	"github.com/gin-gonic/gin"
)

// DeprecatedMiddleware 创建弃用警告中间件
// 功能：
//  1. 为弃用的 API 接口添加警告头部
//  2. 记录旧接口的使用情况到日志
//  3. 帮助追踪需要迁移的客户端
//
// 验证需求：7.1, 7.2, 7.3
// 参数：
//   - message: 弃用警告消息，建议包含新接口的路径
//
// 返回：
//   - gin.HandlerFunc: Gin 中间件函数
//
// 使用示例：
//
//	router.GET("/old-path", DeprecatedMiddleware("请使用 GET /api/new-path"), handler)
func DeprecatedMiddleware(message string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 添加弃用警告头部
		c.Header("X-Deprecated-API", "true")
		c.Header("X-Deprecation-Message", message)

		// 2. 记录日志 - 记录旧接口的使用情况
		log.Printf("⚠️ [DEPRECATED API] 方法: %s, 路径: %s, 客户端IP: %s, User-Agent: %s, 警告: %s",
			c.Request.Method,
			c.Request.URL.Path,
			c.ClientIP(),
			c.GetHeader("User-Agent"),
			message,
		)

		// 3. 继续处理请求
		c.Next()
	}
}
