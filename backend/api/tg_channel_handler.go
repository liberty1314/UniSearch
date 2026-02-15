package api

import (
	"net/http"
	"strconv"
	"strings"
	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
)

// tgChannelService 全局 TG 频道服务实例
var tgChannelService *service.TGChannelService

// SetTGChannelService 设置 TG 频道服务
func SetTGChannelService(svc *service.TGChannelService) {
	tgChannelService = svc
}

// GetTGChannelService 获取 TG 频道服务实例（供其他 handler 使用）
func GetTGChannelService() *service.TGChannelService {
	return tgChannelService
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

	c.JSON(http.StatusOK, gin.H{
		"channels": channels,
		"total":    len(channels),
	})
}

// AddTGChannelRequest 添加频道请求
type AddTGChannelRequest struct {
	Name string `json:"name" binding:"required"`
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

	channel, err := tgChannelService.AddChannel(req.Name)
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
}

// UpdateTGChannelRequest 更新频道请求
type UpdateTGChannelRequest struct {
	Name      *string `json:"name"`
	IsEnabled *bool   `json:"is_enabled"`
	SortOrder *int    `json:"sort_order"`
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

	if req.Name == nil && req.IsEnabled == nil && req.SortOrder == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "至少需要提供一个更新字段"})
		return
	}

	channel, err := tgChannelService.UpdateChannel(uint(id), req.Name, req.IsEnabled, req.SortOrder)
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

	if err := tgChannelService.DeleteChannel(uint(id)); err != nil {
		if strings.Contains(err.Error(), "不存在") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "频道删除成功"})
}

// TestTGChannelHandler 测试频道可用性
func TestTGChannelHandler(c *gin.Context) {
	if tgChannelService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "频道服务未初始化"})
		return
	}

	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "频道名称不能为空"})
		return
	}

	accessible, err := tgChannelService.TestChannel(name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"accessible": false,
			"error":      err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"accessible": accessible,
		"name":       name,
	})
}

// BatchUpdateTGChannelsRequest 批量更新频道请求
type BatchUpdateTGChannelsRequest struct {
	Channels []model.TGChannel `json:"channels" binding:"required"`
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
