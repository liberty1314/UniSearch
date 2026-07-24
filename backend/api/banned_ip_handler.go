package api

import (
	"net/http"
	"strconv"
	"time"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var bannedIPService *service.BannedIPService

// SetBannedIPService 设置封禁 IP 服务。
func SetBannedIPService(svc *service.BannedIPService) {
	bannedIPService = svc
}

// BannedIPService 返回已装配的封禁服务，供中间件与自动封禁逻辑复用。
func BannedIPServiceInstance() *service.BannedIPService {
	return bannedIPService
}

type CreateBannedIPRequest struct {
	IP     string `json:"ip" binding:"required"`
	Reason string `json:"reason"`
	// DurationMinutes 为 0 表示永久封禁；>0 表示自现在起封禁的分钟数。
	DurationMinutes int `json:"duration_minutes"`
}

type BannedIPListResponse struct {
	Items []model.BannedIP `json:"items"`
	Total int64            `json:"total"`
	Page  int              `json:"page"`
	Size  int              `json:"size"`
}

// ListBannedIPsHandler 分页查询封禁名单。
func ListBannedIPsHandler(c *gin.Context) {
	if bannedIPService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "封禁服务未初始化",
			"code":  "BANNED_IP_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")

	items, total, err := bannedIPService.List(page, size, keyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "LIST_BANNED_IP_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, BannedIPListResponse{
		Items: items,
		Total: total,
		Page:  page,
		Size:  size,
	})
}

// CreateBannedIPHandler 手动封禁一个 IP。
func CreateBannedIPHandler(c *gin.Context) {
	if bannedIPService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "封禁服务未初始化",
			"code":  "BANNED_IP_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	var req CreateBannedIPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	var expiresAt *time.Time
	if req.DurationMinutes > 0 {
		t := time.Now().Add(time.Duration(req.DurationMinutes) * time.Minute)
		expiresAt = &t
	}

	operator, _ := c.Get("username")
	createdBy, _ := operator.(string)

	item, err := bannedIPService.Ban(req.IP, req.Reason, model.BannedIPSourceManual, expiresAt, createdBy)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "CREATE_BANNED_IP_FAILED",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"item":    item,
	})
}

// DeleteBannedIPHandler 解封（按记录 ID）。
func DeleteBannedIPHandler(c *gin.Context) {
	if bannedIPService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "封禁服务未初始化",
			"code":  "BANNED_IP_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "记录 ID 无效",
			"code":  "INVALID_BANNED_IP_ID",
		})
		return
	}

	if err := bannedIPService.UnbanByID(uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "DELETE_BANNED_IP_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
