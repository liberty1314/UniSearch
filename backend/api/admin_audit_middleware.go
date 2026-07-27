package api

import (
	"strings"

	"unisearch/model"

	"github.com/gin-gonic/gin"
)

// auditActionContextKey 关键处理器通过 c.Set 补充语义化操作名。
const auditActionContextKey = "audit_action"

// auditTargetContextKey 关键处理器通过 c.Set 补充操作目标描述。
const auditTargetContextKey = "audit_target"

// SetAuditAction 供关键处理器补充语义化操作名（如 ban_ip、delete_user）。
func SetAuditAction(c *gin.Context, action string) {
	c.Set(auditActionContextKey, action)
}

// SetAuditTarget 供关键处理器补充操作目标描述（如被封 IP、被删用户名）。
func SetAuditTarget(c *gin.Context, target string) {
	c.Set(auditTargetContextKey, target)
}

// AdminAuditMiddleware 统一采集管理员写操作（POST/PUT/DELETE/PATCH）。
// 只读方法（GET/HEAD/OPTIONS）跳过。语义字段由关键处理器通过 c.Set 增强，
// 未增强时以路由路径兜底。写入异步执行，不阻塞响应。
func AdminAuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !isAuditableMethod(c.Request.Method) {
			c.Next()
			return
		}

		c.Next()

		if adminAuditService == nil {
			return
		}

		action := c.GetString(auditActionContextKey)
		if action == "" {
			action = fallbackAuditAction(c)
		}

		adminAuditService.Record(model.AdminAuditLog{
			OperatorID: c.GetUint("user_id"),
			Operator:   c.GetString("username"),
			Method:     c.Request.Method,
			Path:       auditRequestPath(c),
			Action:     action,
			Target:     c.GetString(auditTargetContextKey),
			StatusCode: c.Writer.Status(),
			ClientIP:   c.ClientIP(),
			RequestID:  requestIDFromContext(c),
		})
	}
}

func isAuditableMethod(method string) bool {
	switch method {
	case "POST", "PUT", "DELETE", "PATCH":
		return true
	default:
		return false
	}
}

// fallbackAuditAction 在处理器未显式设置语义操作名时，用「方法 路由模板」兜底。
func fallbackAuditAction(c *gin.Context) string {
	path := c.FullPath()
	if path == "" {
		path = auditRequestPath(c)
	}
	return strings.ToLower(c.Request.Method) + " " + path
}

// auditRequestPath 优先取路由模板（含 :id 占位），回退到实际请求路径。
func auditRequestPath(c *gin.Context) string {
	if path := c.FullPath(); path != "" {
		return path
	}
	if c.Request != nil && c.Request.URL != nil {
		return c.Request.URL.Path
	}
	return ""
}
