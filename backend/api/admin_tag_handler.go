package api

import (
	"net/http"
	"strconv"
	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

var adminTagService *service.AdminTagService

// SetAdminTagService 设置后台标签词库服务。
func SetAdminTagService(svc *service.AdminTagService) {
	adminTagService = svc
}

type CreateAdminTagRequest struct {
	Scope string `json:"scope" binding:"required"`
	Name  string `json:"name" binding:"required"`
}

type AdminTagListResponse struct {
	Items []model.AdminTag `json:"items"`
}

type UpdateAdminTagRequest struct {
	Name string `json:"name" binding:"required"`
}

// ListAdminTagsHandler 获取指定作用域的标签词库。
func ListAdminTagsHandler(c *gin.Context) {
	if adminTagService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "标签词库服务未初始化",
			"code":  "TAG_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	scope := c.Query("scope")
	items, err := adminTagService.ListTags(scope)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "INVALID_TAG_SCOPE",
		})
		return
	}

	c.JSON(http.StatusOK, AdminTagListResponse{Items: items})
}

// CreateAdminTagHandler 创建后台标签词库条目。
func CreateAdminTagHandler(c *gin.Context) {
	if adminTagService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "标签词库服务未初始化",
			"code":  "TAG_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	var req CreateAdminTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	item, err := adminTagService.CreateTag(req.Scope, req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "CREATE_TAG_FAILED",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"item":    item,
	})
}

// UpdateAdminTagHandler 更新后台标签词库条目。
func UpdateAdminTagHandler(c *gin.Context) {
	if adminTagService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "标签词库服务未初始化",
			"code":  "TAG_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "标签 ID 无效",
			"code":  "INVALID_TAG_ID",
		})
		return
	}

	var req UpdateAdminTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数错误",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	item, err := adminTagService.UpdateTag(uint(id), req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "UPDATE_TAG_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"item":    item,
	})
}

// DeleteAdminTagHandler 删除后台标签词库条目。
func DeleteAdminTagHandler(c *gin.Context) {
	if adminTagService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "标签词库服务未初始化",
			"code":  "TAG_SERVICE_NOT_INITIALIZED",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "标签 ID 无效",
			"code":  "INVALID_TAG_ID",
		})
		return
	}

	if err := adminTagService.DeleteTag(uint(id)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "DELETE_TAG_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
