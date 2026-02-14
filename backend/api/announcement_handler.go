package api

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

// ============ 请求/响应结构体 ============

// CreateAnnouncementRequest 创建公告请求
type CreateAnnouncementRequest struct {
	Title     string     `json:"title" binding:"required,max=200"`
	Content   string     `json:"content" binding:"required"`
	Priority  string     `json:"priority" binding:"required,oneof=high medium low"`
	StartTime time.Time  `json:"start_time" binding:"required"`
	EndTime   *time.Time `json:"end_time"`
	IsEnabled bool       `json:"is_enabled"`
}

// UpdateAnnouncementRequest 更新公告请求
type UpdateAnnouncementRequest struct {
	Title     string     `json:"title" binding:"required,max=200"`
	Content   string     `json:"content" binding:"required"`
	Priority  string     `json:"priority" binding:"required,oneof=high medium low"`
	StartTime time.Time  `json:"start_time" binding:"required"`
	EndTime   *time.Time `json:"end_time"`
	IsEnabled bool       `json:"is_enabled"`
}

// SetAnnouncementStatusRequest 设置公告状态请求
type SetAnnouncementStatusRequest struct {
	IsEnabled bool `json:"is_enabled"`
}

// ListAnnouncementsRequest 公告列表查询请求
type ListAnnouncementsRequest struct {
	Page      int    `form:"page" binding:"omitempty,min=1"`
	PageSize  int    `form:"page_size" binding:"omitempty,min=1,max=100"`
	SortBy    string `form:"sort_by" binding:"omitempty,oneof=created_at priority start_time"`
	SortOrder string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

// AnnouncementInfo 公告信息
type AnnouncementInfo struct {
	ID        uint       `json:"id"`
	Title     string     `json:"title"`
	Content   string     `json:"content"`
	Priority  string     `json:"priority"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time"`
	IsEnabled bool       `json:"is_enabled"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	CreatedBy string     `json:"created_by"`
	UpdatedBy string     `json:"updated_by"`
}

// ListAnnouncementsResponse 公告列表查询响应
type ListAnnouncementsResponse struct {
	Announcements []AnnouncementInfo `json:"announcements"`
	Total         int64              `json:"total"`
	Page          int                `json:"page"`
	PageSize      int                `json:"page_size"`
	TotalPages    int                `json:"total_pages"`
}

// ============ 辅助函数 ============

// convertToAnnouncementInfo 将 model.Announcement 转换为 AnnouncementInfo
func convertToAnnouncementInfo(announcement *model.Announcement) AnnouncementInfo {
	return AnnouncementInfo{
		ID:        announcement.ID,
		Title:     announcement.Title,
		Content:   announcement.Content,
		Priority:  announcement.Priority,
		StartTime: announcement.StartTime,
		EndTime:   announcement.EndTime,
		IsEnabled: announcement.IsEnabled,
		CreatedAt: announcement.CreatedAt,
		UpdatedAt: announcement.UpdatedAt,
		CreatedBy: announcement.CreatedBy,
		UpdatedBy: announcement.UpdatedBy,
	}
}

// convertToAnnouncementInfoList 将 []model.Announcement 转换为 []AnnouncementInfo
func convertToAnnouncementInfoList(announcements []model.Announcement) []AnnouncementInfo {
	result := make([]AnnouncementInfo, len(announcements))
	for i, announcement := range announcements {
		result[i] = convertToAnnouncementInfo(&announcement)
	}
	return result
}

// getCurrentUsername 从上下文获取当前用户名
func getCurrentUsername(c *gin.Context) string {
	username, exists := c.Get("username")
	if !exists {
		return "unknown"
	}

	usernameStr, ok := username.(string)
	if !ok {
		return "unknown"
	}

	return usernameStr
}

// ============ 处理器函数 ============

// CreateAnnouncementHandler 创建公告
// 需求: 10.1, 10.6, 10.7, 12.1, 12.3
func CreateAnnouncementHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析请求体
		var req CreateAnnouncementRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("❌ 创建公告请求参数错误: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "请求参数错误",
				"data": gin.H{
					"error": err.Error(),
				},
			})
			return
		}

		// 验证时间逻辑（需求 12.3）
		if req.EndTime != nil && !req.EndTime.After(req.StartTime) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "数据验证失败",
				"data": gin.H{
					"error": "失效时间必须晚于生效时间",
					"field": "end_time",
				},
			})
			return
		}

		// 获取当前用户名
		username := getCurrentUsername(c)

		// 构建公告对象
		announcement := &model.Announcement{
			Title:     req.Title,
			Content:   req.Content,
			Priority:  req.Priority,
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
			IsEnabled: req.IsEnabled,
		}

		// 调用服务层创建公告
		created, err := announcementService.CreateAnnouncement(announcement, username)
		if err != nil {
			log.Printf("❌ 创建公告失败: %v", err)
			// 根据错误类型返回不同的状态码（需求 10.6, 12.1）
			switch err.Error() {
			case "标题不能为空", "内容不能为空":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
					},
				})
			case "失效时间必须晚于生效时间":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
						"field": "end_time",
					},
				})
			case "优先级必须是 high、medium 或 low":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
						"field": "priority",
					},
				})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "服务器内部错误",
				})
			}
			return
		}

		log.Printf("✓ 公告创建成功: %s (ID: %d, Priority: %s)", created.Title, created.ID, created.Priority)
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "创建成功",
			"data":    convertToAnnouncementInfo(created),
		})
	}
}

// UpdateAnnouncementHandler 更新公告
// 需求: 10.2, 10.6, 10.7, 12.1, 12.3
func UpdateAnnouncementHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取公告ID
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "无效的公告ID",
			})
			return
		}

		// 解析请求体
		var req UpdateAnnouncementRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("❌ 更新公告请求参数错误: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "请求参数错误",
				"data": gin.H{
					"error": err.Error(),
				},
			})
			return
		}

		// 验证时间逻辑（需求 12.3）
		if req.EndTime != nil && !req.EndTime.After(req.StartTime) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "数据验证失败",
				"data": gin.H{
					"error": "失效时间必须晚于生效时间",
					"field": "end_time",
				},
			})
			return
		}

		// 获取当前用户名
		username := getCurrentUsername(c)

		// 构建公告对象
		announcement := &model.Announcement{
			Title:     req.Title,
			Content:   req.Content,
			Priority:  req.Priority,
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
			IsEnabled: req.IsEnabled,
		}

		// 调用服务层更新公告
		updated, err := announcementService.UpdateAnnouncement(uint(id), announcement, username)
		if err != nil {
			log.Printf("❌ 更新公告失败: %v", err)
			// 根据错误类型返回不同的状态码（需求 10.6, 12.1）
			switch err.Error() {
			case "公告不存在":
				c.JSON(http.StatusNotFound, gin.H{
					"code":    404,
					"message": "公告不存在",
				})
			case "标题不能为空", "内容不能为空":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
					},
				})
			case "失效时间必须晚于生效时间":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
						"field": "end_time",
					},
				})
			case "优先级必须是 high、medium 或 low":
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "数据验证失败",
					"data": gin.H{
						"error": err.Error(),
						"field": "priority",
					},
				})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "服务器内部错误",
				})
			}
			return
		}

		log.Printf("✓ 公告更新成功: %s (ID: %d)", updated.Title, updated.ID)
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "更新成功",
			"data":    convertToAnnouncementInfo(updated),
		})
	}
}

// DeleteAnnouncementHandler 删除公告
// 需求: 10.3, 10.6, 10.7, 12.1
func DeleteAnnouncementHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取公告ID
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "无效的公告ID",
			})
			return
		}

		// 调用服务层删除公告
		err = announcementService.DeleteAnnouncement(uint(id))
		if err != nil {
			log.Printf("❌ 删除公告失败: %v", err)
			// 根据错误类型返回不同的状态码（需求 10.6, 12.1）
			if err.Error() == "公告不存在" {
				c.JSON(http.StatusNotFound, gin.H{
					"code":    404,
					"message": "公告不存在",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "服务器内部错误",
				})
			}
			return
		}

		log.Printf("✓ 公告删除成功: ID %d", id)
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "删除成功",
		})
	}
}

// GetAnnouncementHandler 获取单个公告
// 需求: 10.4, 10.6, 10.7, 12.1
func GetAnnouncementHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取公告ID
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "无效的公告ID",
			})
			return
		}

		// 调用服务层查询公告
		announcement, err := announcementService.GetAnnouncement(uint(id))
		if err != nil {
			log.Printf("❌ 查询公告失败: %v", err)
			// 根据错误类型返回不同的状态码（需求 10.6, 12.1）
			if err.Error() == "公告不存在" {
				c.JSON(http.StatusNotFound, gin.H{
					"code":    404,
					"message": "公告不存在",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "服务器内部错误",
				})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "查询成功",
			"data":    convertToAnnouncementInfo(announcement),
		})
	}
}

// ListAnnouncementsHandler 获取公告列表
// 需求: 10.4, 10.6, 10.7, 12.1
func ListAnnouncementsHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析查询参数
		var req ListAnnouncementsRequest
		if err := c.ShouldBindQuery(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "请求参数错误",
			})
			return
		}

		// 设置默认值
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		if req.SortBy == "" {
			req.SortBy = "created_at"
		}
		if req.SortOrder == "" {
			req.SortOrder = "desc"
		}

		// 调用服务层查询公告列表
		params := service.ListAnnouncementsParams{
			Page:      req.Page,
			PageSize:  req.PageSize,
			SortBy:    req.SortBy,
			SortOrder: req.SortOrder,
		}

		result, err := announcementService.ListAnnouncements(params)
		if err != nil {
			log.Printf("❌ 查询公告列表失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "服务器内部错误",
			})
			return
		}

		// 转换为响应格式
		response := ListAnnouncementsResponse{
			Announcements: convertToAnnouncementInfoList(result.Announcements),
			Total:         result.Total,
			Page:          result.Page,
			PageSize:      result.PageSize,
			TotalPages:    result.TotalPages,
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "查询成功",
			"data":    response,
		})
	}
}

// SetAnnouncementStatusHandler 设置公告状态
// 需求: 10.6, 10.7, 12.1
func SetAnnouncementStatusHandler(announcementService *service.AnnouncementService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取公告ID
		idStr := c.Param("id")
		id, err := strconv.ParseUint(idStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "无效的公告ID",
			})
			return
		}

		// 解析请求体
		var req SetAnnouncementStatusRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "请求参数错误",
			})
			return
		}

		// 调用服务层设置公告状态
		err = announcementService.SetAnnouncementStatus(uint(id), req.IsEnabled)
		if err != nil {
			log.Printf("❌ 设置公告状态失败: %v", err)
			// 根据错误类型返回不同的状态码（需求 10.6, 12.1）
			if err.Error() == "公告不存在" {
				c.JSON(http.StatusNotFound, gin.H{
					"code":    404,
					"message": "公告不存在",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "服务器内部错误",
				})
			}
			return
		}

		statusText := "启用"
		if !req.IsEnabled {
			statusText = "禁用"
		}
		log.Printf("✓ 公告状态更新成功: ID %d (%s)", id, statusText)
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "状态更新成功",
		})
	}
}

// GetActiveAnnouncementsHandler 获取当前有效公告
// 需求: 10.5, 12.1, 13.2
func GetActiveAnnouncementsHandler(
	announcementService *service.AnnouncementService,
	systemSettingsService *service.SystemSettingsService,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 调用服务层获取有效公告
		announcements, err := announcementService.GetActiveAnnouncements(systemSettingsService)
		if err != nil {
			log.Printf("❌ 获取有效公告失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "服务器内部错误",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "查询成功",
			"data":    convertToAnnouncementInfoList(announcements),
		})
	}
}

// ============ 功能开关接口 ============

// GetAnnouncementFeatureEnabledHandler 获取公告功能启用状态
// GET /api/system-settings/announcement-enabled
// 需求: 13.1
func GetAnnouncementFeatureEnabledHandler(systemSettingsService *service.SystemSettingsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		enabled, err := systemSettingsService.GetAnnouncementEnabled()
		if err != nil {
			log.Printf("❌ 获取公告功能状态失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "查询失败",
				"data": gin.H{
					"error": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "查询成功",
			"data": gin.H{
				"enabled": enabled,
			},
		})
	}
}

// SetAnnouncementFeatureEnabledRequest 设置公告功能启用状态请求
type SetAnnouncementFeatureEnabledRequest struct {
	Enabled bool `json:"enabled"`
}

// SetAnnouncementFeatureEnabledHandler 设置公告功能启用状态
// POST /api/system-settings/announcement-enabled
// 需求: 13.4
func SetAnnouncementFeatureEnabledHandler(systemSettingsService *service.SystemSettingsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SetAnnouncementFeatureEnabledRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "数据验证失败",
				"data": gin.H{
					"error": err.Error(),
				},
			})
			return
		}

		err := systemSettingsService.SetAnnouncementEnabled(req.Enabled)
		if err != nil {
			log.Printf("❌ 设置公告功能状态失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "设置失败",
				"data": gin.H{
					"error": err.Error(),
				},
			})
			return
		}

		statusText := "启用"
		if !req.Enabled {
			statusText = "禁用"
		}
		log.Printf("✓ 公告功能状态更新成功: %s", statusText)
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "设置成功",
		})
	}
}
