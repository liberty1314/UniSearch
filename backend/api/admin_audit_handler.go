package api

import (
	"net/http"
	"strconv"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var adminAuditService *service.AdminAuditService

// SetAdminAuditService 设置操作审计服务实例。
func SetAdminAuditService(svc *service.AdminAuditService) {
	adminAuditService = svc
}

// AdminAuditServiceInstance 返回已装配的操作审计服务，供中间件复用。
func AdminAuditServiceInstance() *service.AdminAuditService {
	return adminAuditService
}

type AdminAuditListResponse struct {
	Items []model.AdminAuditLog `json:"items"`
	Total int64                 `json:"total"`
	Page  int                   `json:"page"`
	Size  int                   `json:"size"`
}

// ListAdminAuditHandler 分页查询操作审计记录。
func ListAdminAuditHandler(c *gin.Context) {
	if adminAuditService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "操作审计服务未初始化",
			"code":  "ADMIN_AUDIT_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	filter := service.AdminAuditFilter{
		Operator: c.Query("operator"),
		Action:   c.Query("action"),
		Path:     c.Query("path"),
	}
	if start := parseAuditTimeQuery(c.Query("start")); start != nil {
		filter.Start = start
	}
	if end := parseAuditTimeQuery(c.Query("end")); end != nil {
		filter.End = end
	}

	items, total, err := adminAuditService.List(page, size, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "LIST_ADMIN_AUDIT_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, AdminAuditListResponse{
		Items: items,
		Total: total,
		Page:  page,
		Size:  size,
	})
}

// CleanupAdminAuditHandler 手动清理指定留存天数之前的操作审计记录。
func CleanupAdminAuditHandler(c *gin.Context) {
	if adminAuditService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "操作审计服务未初始化",
			"code":  "ADMIN_AUDIT_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	days, _ := strconv.Atoi(c.DefaultQuery("days", "90"))
	deleted, err := adminAuditService.Cleanup(days)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "CLEANUP_ADMIN_AUDIT_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"deleted": deleted,
	})
}
