package api

import (
	"net/http"
	"strconv"
	"time"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var searchAuditService *service.SearchAuditService

// SetSearchAuditService 设置搜索审计服务实例。
func SetSearchAuditService(svc *service.SearchAuditService) {
	searchAuditService = svc
}

// SearchAuditServiceInstance 返回已装配的搜索审计服务，供采集 hook 复用。
func SearchAuditServiceInstance() *service.SearchAuditService {
	return searchAuditService
}

type SearchAuditListResponse struct {
	Items []model.SearchAuditLog `json:"items"`
	Total int64                  `json:"total"`
	Page  int                    `json:"page"`
	Size  int                    `json:"size"`
}

// recordSearchAudit 从 gin 上下文提取身份/IP 并异步写入一条搜索审计记录。
// scope 为搜索作用域（all | progressive）。开关关闭时由 service 层直接跳过。
func recordSearchAudit(c *gin.Context, scope, keyword string, resultCount int) {
	if searchAuditService == nil {
		return
	}
	searchAuditService.Record(model.SearchAuditLog{
		UserID:      c.GetUint("user_id"),
		Username:    c.GetString("username"),
		Keyword:     keyword,
		ResultCount: resultCount,
		Scope:       scope,
		ClientIP:    c.ClientIP(),
		RequestID:   requestIDFromContext(c),
	})
}

// ListSearchAuditHandler 分页查询搜索审计记录。
func ListSearchAuditHandler(c *gin.Context) {
	if searchAuditService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "搜索审计服务未初始化",
			"code":  "SEARCH_AUDIT_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	filter := service.SearchAuditFilter{
		Username: c.Query("username"),
		Keyword:  c.Query("keyword"),
		ClientIP: c.Query("ip"),
	}
	if start := parseAuditTimeQuery(c.Query("start")); start != nil {
		filter.Start = start
	}
	if end := parseAuditTimeQuery(c.Query("end")); end != nil {
		filter.End = end
	}

	items, total, err := searchAuditService.List(page, size, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "LIST_SEARCH_AUDIT_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, SearchAuditListResponse{
		Items: items,
		Total: total,
		Page:  page,
		Size:  size,
	})
}

// CleanupSearchAuditHandler 手动清理指定留存天数之前的搜索审计记录。
func CleanupSearchAuditHandler(c *gin.Context) {
	if searchAuditService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "搜索审计服务未初始化",
			"code":  "SEARCH_AUDIT_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	deleted, err := searchAuditService.Cleanup(days)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "CLEANUP_SEARCH_AUDIT_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"deleted": deleted,
	})
}

// parseAuditTimeQuery 解析审计时间过滤参数，支持 RFC3339 与 date-only 格式。
func parseAuditTimeQuery(value string) *time.Time {
	if value == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return &t
	}
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return &t
	}
	return nil
}
