package api

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unisearch/model"
	"unisearch/service"
	"unisearch/util"

	"github.com/gin-gonic/gin"
)

// tgChannelService 全局 TG 频道服务实例
var tgChannelService *service.TGChannelService
var tgChannelHealthService *service.TGChannelHealthService

// SetTGChannelService 设置 TG 频道服务
func SetTGChannelService(svc *service.TGChannelService) {
	tgChannelService = svc
}

// SetTGChannelHealthService 设置 TG 频道健康状态服务
func SetTGChannelHealthService(svc *service.TGChannelHealthService) {
	tgChannelHealthService = svc
}

// GetTGChannelService 获取 TG 频道服务实例（供其他 handler 使用）
func GetTGChannelService() *service.TGChannelService {
	return tgChannelService
}

// GetTGChannelHealthService 获取 TG 频道健康状态服务实例（供其他 handler 使用）
func GetTGChannelHealthService() *service.TGChannelHealthService {
	return tgChannelHealthService
}

type TGChannelWithHealthResponse struct {
	ID            uint       `json:"id"`
	Name          string     `json:"name"`
	IsEnabled     bool       `json:"is_enabled"`
	SortOrder     int        `json:"sort_order"`
	Tags          []string   `json:"tags,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	HealthStatus  string     `json:"health_status"` // healthy | error | untested
	LastCheckedAt *time.Time `json:"last_checked_at"`
	LastError     string     `json:"last_error"`
	CheckSource   *string    `json:"check_source"`
}

type TGChannelHealthSummaryResponse struct {
	Total        int `json:"total"`
	Healthy      int `json:"healthy"`
	Error        int `json:"error"`
	Untested     int `json:"untested"`
	EnabledError int `json:"enabled_error"`
}

func buildTGChannelWithHealthResponse(channel model.TGChannel, snapshot service.TGChannelHealthSnapshot, ok bool) TGChannelWithHealthResponse {
	response := TGChannelWithHealthResponse{
		ID:           channel.ID,
		Name:         channel.Name,
		IsEnabled:    channel.IsEnabled,
		SortOrder:    channel.SortOrder,
		Tags:         append([]string(nil), channel.Tags...),
		CreatedAt:    channel.CreatedAt,
		UpdatedAt:    channel.UpdatedAt,
		HealthStatus: "untested",
		LastError:    "",
	}
	if !ok {
		return response
	}

	if snapshot.IsHealthy {
		response.HealthStatus = "healthy"
	} else {
		response.HealthStatus = "error"
		response.LastError = snapshot.LastError
	}
	if !snapshot.LastCheckedAt.IsZero() {
		lastCheckedAt := snapshot.LastCheckedAt
		response.LastCheckedAt = &lastCheckedAt
	}
	if snapshot.CheckSource != "" {
		checkSource := snapshot.CheckSource
		response.CheckSource = &checkSource
	}

	return response
}

func normalizeTGChannelName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// ListTGChannelsHandler 获取所有 TG 频道列表
func ListTGChannelsHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	channels, err := tgChannelService.GetAllChannels()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取频道列表失败：" + err.Error()})
		return
	}

	channelNames := make([]string, 0, len(channels))
	for _, channel := range channels {
		channelNames = append(channelNames, channel.Name)
	}

	healthMap := make(map[string]service.TGChannelHealthSnapshot)
	if tgChannelHealthService != nil {
		statusMap, err := tgChannelHealthService.GetStatusMap(channelNames)
		if err != nil {
			log.Printf("⚠️  获取 TG 频道健康状态失败，使用未测试状态: %v", err)
		} else {
			healthMap = statusMap
		}
	}

	channelResponses := make([]TGChannelWithHealthResponse, 0, len(channels))
	summary := TGChannelHealthSummaryResponse{
		Total: len(channels),
	}

	for _, channel := range channels {
		snapshot, ok := healthMap[channel.Name]
		channelWithHealth := buildTGChannelWithHealthResponse(channel, snapshot, ok)
		channelResponses = append(channelResponses, channelWithHealth)

		switch channelWithHealth.HealthStatus {
		case "healthy":
			summary.Healthy++
		case "error":
			summary.Error++
			if channel.IsEnabled {
				summary.EnabledError++
			}
		default:
			summary.Untested++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"channels":       channelResponses,
		"total":          len(channels),
		"health_summary": summary,
	})
}

// AddTGChannelRequest 添加频道请求
type AddTGChannelRequest struct {
	Name string   `json:"name" binding:"required"`
	Tags []string `json:"tags"`
}

// AddTGChannelHandler 添加新频道
func AddTGChannelHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	var req AddTGChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}

	channel, err := tgChannelService.AddChannel(req.Name, util.NormalizeTags(req.Tags))
	if err != nil {
		// 判断是否为重复错误
		if strings.Contains(err.Error(), "已存在") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "频道添加成功",
		"channel": channel,
	})

	if adminTagService != nil {
		if err := adminTagService.EnsureTags(model.AdminTagScopeChannel, channel.Tags); err != nil {
			log.Printf("⚠️  同步频道标签词库失败(%s): %v", channel.Name, err)
		}
	}

	if tgChannelHealthService != nil {
		if err := tgChannelHealthService.ClearStatus(channel.Name); err != nil {
			log.Printf("⚠️  清理新增频道健康状态失败(%s): %v", channel.Name, err)
		}
	}
}

// UpdateTGChannelRequest 更新频道请求
type UpdateTGChannelRequest struct {
	Name      *string   `json:"name"`
	IsEnabled *bool     `json:"is_enabled"`
	SortOrder *int      `json:"sort_order"`
	Tags      *[]string `json:"tags"`
}

// UpdateTGChannelHandler 更新频道信息
func UpdateTGChannelHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的频道 ID"})
		return
	}

	var req UpdateTGChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}

	if req.Name == nil && req.IsEnabled == nil && req.SortOrder == nil && req.Tags == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "至少需要提供一个更新字段"})
		return
	}

	oldChannel, err := tgChannelService.GetChannelByID(uint(id))
	if err != nil {
		if strings.Contains(err.Error(), "不存在") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	channel, err := tgChannelService.UpdateChannel(uint(id), req.Name, req.IsEnabled, req.SortOrder, req.Tags)
	if err != nil {
		if strings.Contains(err.Error(), "不存在") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if strings.Contains(err.Error(), "已被使用") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "频道更新成功",
		"channel": channel,
	})

	if adminTagService != nil {
		if err := adminTagService.EnsureTags(model.AdminTagScopeChannel, channel.Tags); err != nil {
			log.Printf("⚠️  同步频道标签词库失败(%s): %v", channel.Name, err)
		}
	}

	if tgChannelHealthService != nil && req.Name != nil {
		oldName := normalizeTGChannelName(oldChannel.Name)
		newName := normalizeTGChannelName(channel.Name)
		if oldName != newName {
			if err := tgChannelHealthService.ClearStatus(oldChannel.Name); err != nil {
				log.Printf("⚠️  清理旧频道健康状态失败(%s): %v", oldChannel.Name, err)
			}
			if err := tgChannelHealthService.ClearStatus(channel.Name); err != nil {
				log.Printf("⚠️  清理新频道健康状态失败(%s): %v", channel.Name, err)
			}
		}
	}
}

// DeleteTGChannelHandler 删除频道
func DeleteTGChannelHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的频道 ID"})
		return
	}

	channel, err := tgChannelService.GetChannelByID(uint(id))
	if err != nil {
		if strings.Contains(err.Error(), "不存在") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tgChannelService.DeleteChannel(uint(id)); err != nil {
		if strings.Contains(err.Error(), "不存在") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "频道删除成功"})

	if tgChannelHealthService != nil {
		if err := tgChannelHealthService.ClearStatus(channel.Name); err != nil {
			log.Printf("⚠️  清理删除频道健康状态失败(%s): %v", channel.Name, err)
		}
	}
}

// TestTGChannelHandler 测试频道可用性
func TestTGChannelHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	name := strings.TrimSpace(c.Param("name"))
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "频道名称不能为空"})
		return
	}

	accessible, err := tgChannelService.TestChannel(name)
	if err != nil {
		if tgChannelHealthService != nil {
			if recordErr := tgChannelHealthService.RecordResult(name, false, err.Error(), "manual_test"); recordErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":      "记录频道测试结果失败: " + recordErr.Error(),
					"accessible": false,
					"name":       name,
				})
				return
			}
		}
		lastCheckedAt := time.Now()
		c.JSON(http.StatusOK, gin.H{
			"accessible":      false,
			"name":            name,
			"error":           err.Error(),
			"health_status":   "error",
			"last_checked_at": lastCheckedAt,
			"last_error":      err.Error(),
			"check_source":    "manual_test",
		})
		return
	}

	if tgChannelHealthService != nil {
		if recordErr := tgChannelHealthService.RecordResult(name, true, "", "manual_test"); recordErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":      "记录频道测试结果失败: " + recordErr.Error(),
				"accessible": true,
				"name":       name,
			})
			return
		}
	}
	lastCheckedAt := time.Now()
	c.JSON(http.StatusOK, gin.H{
		"accessible":      accessible,
		"name":            name,
		"health_status":   "healthy",
		"last_checked_at": lastCheckedAt,
		"last_error":      "",
		"check_source":    "manual_test",
	})
}

// BatchUpdateTGChannelsRequest 批量更新频道请求
type BatchUpdateTGChannelsRequest struct {
	Channels []model.TGChannel `json:"channels" binding:"required"`
}

type BatchSetTGChannelsStatusRequest struct {
	ChannelIDs []uint `json:"channel_ids" binding:"required"`
	IsEnabled  *bool  `json:"is_enabled" binding:"required"`
}

type BatchDeleteTGChannelsRequest struct {
	ChannelIDs []uint `json:"channel_ids" binding:"required"`
}

type BatchTGChannelOperationError struct {
	ChannelID uint   `json:"channel_id"`
	Error     string `json:"error"`
	Code      string `json:"code"`
}

// BatchSetTGChannelsStatusHandler 批量更新频道启用状态
func BatchSetTGChannelsStatusHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	var req BatchSetTGChannelsStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.IsEnabled == nil {
		errMsg := "请求参数错误"
		if err != nil {
			errMsg += "：" + err.Error()
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	if len(req.ChannelIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "频道 ID 列表不能为空"})
		return
	}

	isEnabled := *req.IsEnabled
	success := make([]uint, 0, len(req.ChannelIDs))
	failed := make([]BatchTGChannelOperationError, 0)

	seen := make(map[uint]struct{}, len(req.ChannelIDs))
	for _, channelID := range req.ChannelIDs {
		if channelID == 0 {
			failed = append(failed, BatchTGChannelOperationError{
				ChannelID: channelID,
				Error:     "无效的频道 ID",
				Code:      "INVALID_CHANNEL_ID",
			})
			continue
		}
		if _, exists := seen[channelID]; exists {
			continue
		}
		seen[channelID] = struct{}{}

		if _, err := tgChannelService.UpdateChannel(channelID, nil, &isEnabled, nil, nil); err != nil {
			errMsg := err.Error()
			errCode := "CHANNEL_UPDATE_FAILED"
			if strings.Contains(errMsg, "不存在") {
				errCode = "CHANNEL_NOT_FOUND"
			}
			failed = append(failed, BatchTGChannelOperationError{
				ChannelID: channelID,
				Error:     errMsg,
				Code:      errCode,
			})
			continue
		}
		success = append(success, channelID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success_count": len(success),
		"failed_count":  len(failed),
		"success":       success,
		"failed":        failed,
	})
}

// BatchDeleteTGChannelsHandler 批量删除频道
func BatchDeleteTGChannelsHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	var req BatchDeleteTGChannelsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}

	if len(req.ChannelIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "频道 ID 列表不能为空"})
		return
	}

	success := make([]uint, 0, len(req.ChannelIDs))
	failed := make([]BatchTGChannelOperationError, 0)

	seen := make(map[uint]struct{}, len(req.ChannelIDs))
	for _, channelID := range req.ChannelIDs {
		if channelID == 0 {
			failed = append(failed, BatchTGChannelOperationError{
				ChannelID: channelID,
				Error:     "无效的频道 ID",
				Code:      "INVALID_CHANNEL_ID",
			})
			continue
		}
		if _, exists := seen[channelID]; exists {
			continue
		}
		seen[channelID] = struct{}{}

		channel, err := tgChannelService.GetChannelByID(channelID)
		if err != nil {
			errMsg := err.Error()
			errCode := "CHANNEL_DELETE_FAILED"
			if strings.Contains(errMsg, "不存在") {
				errCode = "CHANNEL_NOT_FOUND"
			}
			failed = append(failed, BatchTGChannelOperationError{
				ChannelID: channelID,
				Error:     errMsg,
				Code:      errCode,
			})
			continue
		}

		if err := tgChannelService.DeleteChannel(channelID); err != nil {
			errMsg := err.Error()
			errCode := "CHANNEL_DELETE_FAILED"
			if strings.Contains(errMsg, "不存在") {
				errCode = "CHANNEL_NOT_FOUND"
			}
			failed = append(failed, BatchTGChannelOperationError{
				ChannelID: channelID,
				Error:     errMsg,
				Code:      errCode,
			})
			continue
		}

		if tgChannelHealthService != nil {
			if err := tgChannelHealthService.ClearStatus(channel.Name); err != nil {
				log.Printf("⚠️  清理删除频道健康状态失败(%s): %v", channel.Name, err)
			}
		}

		success = append(success, channelID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success_count": len(success),
		"failed_count":  len(failed),
		"success":       success,
		"failed":        failed,
	})
}

// BatchUpdateTGChannelsHandler 批量更新频道列表
func BatchUpdateTGChannelsHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	var req BatchUpdateTGChannelsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误：" + err.Error()})
		return
	}

	// 验证频道名称不为空
	for i, ch := range req.Channels {
		if strings.TrimSpace(ch.Name) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "第 " + strconv.Itoa(i+1) + " 个频道名称不能为空"})
			return
		}
	}

	if err := tgChannelService.BatchUpdateChannels(req.Channels); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tgChannelHealthService != nil {
		names := make([]string, 0, len(req.Channels))
		for _, ch := range req.Channels {
			names = append(names, ch.Name)
		}
		if err := tgChannelHealthService.ClearStatusesNotIn(names); err != nil {
			log.Printf("⚠️  清理孤儿频道健康状态失败: %v", err)
		}
	}

	// 同步到运行时配置
	tgChannelService.SyncToConfig()

	// 返回更新后的列表
	channels, _ := tgChannelService.GetAllChannels()
	c.JSON(http.StatusOK, gin.H{
		"message":  "频道列表更新成功",
		"channels": channels,
		"total":    len(channels),
	})
}
