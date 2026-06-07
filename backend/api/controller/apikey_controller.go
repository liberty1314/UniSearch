package controller

import (
	"errors"
	"log"
	"strconv"
	"strings"
	"unisearch/model"
	"unisearch/service"
	"unisearch/util/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// APIKeyController API Key 控制器
// 处理 API Key 生成、绑定、查询、管理等 HTTP 请求
type APIKeyController struct {
	apiKeyService *service.APIKeyService
}

// NewAPIKeyController 创建 API Key 控制器实例
func NewAPIKeyController(apiKeyService *service.APIKeyService) *APIKeyController {
	return &APIKeyController{
		apiKeyService: apiKeyService,
	}
}

// ============================================================================
// 请求和响应结构体定义
// ============================================================================

// GenerateAPIKeyRequest 生成 API Key 请求结构（管理员）
type GenerateAPIKeyRequest struct {
	TTLHours         int    `json:"ttl_hours"`          // 有效期（小时，0表示永不过期）
	DailySearchLimit int    `json:"daily_search_limit"` // 每日搜索次数限制（0表示不限制）
	Description      string `json:"description"`        // 描述信息
}

// GenerateAPIKeyResponse 生成 API Key 响应结构
type GenerateAPIKeyResponse struct {
	Code    int           `json:"code"`           // 响应码
	Message string        `json:"message"`        // 响应消息
	Data    *model.APIKey `json:"data,omitempty"` // 响应数据（成功时包含 API Key 信息）
}

// BindAPIKeyRequest 绑定 API Key 请求结构（用户）
type BindAPIKeyRequest struct {
	Key string `json:"key" binding:"required"` // 要绑定的 API Key
}

// BindAPIKeyResponse 绑定 API Key 响应结构
type BindAPIKeyResponse struct {
	Code    int           `json:"code"`           // 响应码
	Message string        `json:"message"`        // 响应消息
	Data    *model.APIKey `json:"data,omitempty"` // 响应数据（成功时包含 API Key 信息）
}

// GetAPIKeyInfoResponse 查询 API Key 信息响应结构
type GetAPIKeyInfoResponse struct {
	Code    int           `json:"code"`           // 响应码
	Message string        `json:"message"`        // 响应消息
	Data    *model.APIKey `json:"data,omitempty"` // 响应数据（成功时包含 API Key 信息）
}

// ListAPIKeysResponse 列出所有 API Keys 响应结构（管理员）
type ListAPIKeysResponse struct {
	Code    int         `json:"code"`           // 响应码
	Message string      `json:"message"`        // 响应消息
	Data    interface{} `json:"data,omitempty"` // 响应数据
}

// ListAPIKeysData 列出 API Keys 的数据结构
type ListAPIKeysData struct {
	Keys  []model.APIKey `json:"keys"`  // API Key 列表
	Total int64          `json:"total"` // 总数
	Page  int            `json:"page"`  // 当前页码
	Size  int            `json:"size"`  // 每页数量
}

// UpdateAPIKeyStatusRequest 更新 API Key 状态请求结构（管理员）
type UpdateAPIKeyStatusRequest struct {
	IsEnabled bool `json:"is_enabled"` // 是否启用
}

// UpdateAPIKeyStatusResponse 更新 API Key 状态响应结构
type UpdateAPIKeyStatusResponse struct {
	Code    int         `json:"code"`           // 响应码
	Message string      `json:"message"`        // 响应消息
	Data    interface{} `json:"data,omitempty"` // 响应数据
}

// ============================================================================
// 管理员接口
// ============================================================================

// GenerateAPIKey 生成新的 API Key（管理员）
// POST /api/admin/apikey/generate
// 验证需求：7.1-7.10
func (ctrl *APIKeyController) GenerateAPIKey(c *gin.Context) {
	var req GenerateAPIKeyRequest

	// 参数验证（使用 Gin binding 标签）
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 生成 API Key 请求参数验证失败: %v", err)
		c.JSON(400, GenerateAPIKeyResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 验证参数范围
	if req.TTLHours < 0 {
		c.JSON(400, GenerateAPIKeyResponse{
			Code:    400,
			Message: "有效期不能为负数",
			Data:    nil,
		})
		return
	}

	if req.DailySearchLimit < 0 {
		c.JSON(400, GenerateAPIKeyResponse{
			Code:    400,
			Message: "每日搜索限制不能为负数",
			Data:    nil,
		})
		return
	}

	// 去除描述信息的首尾空白
	req.Description = strings.TrimSpace(req.Description)

	// 调用服务层生成 API Key
	apiKey, err := ctrl.apiKeyService.GenerateAPIKey(req.TTLHours, req.DailySearchLimit, req.Description)
	if err != nil {
		log.Printf("✗ 生成 API Key 失败: %v", err)
		c.JSON(500, GenerateAPIKeyResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 生成成功，返回 API Key 信息
	logger.Info(
		"api_key_generated",
		logger.Any("api_key", apiKey.Key),
		logger.Any("id", apiKey.ID),
	)
	c.JSON(200, GenerateAPIKeyResponse{
		Code:    200,
		Message: "生成成功",
		Data:    apiKey,
	})
}

// ListAPIKeys 列出所有 API Keys（管理员）
// GET /api/admin/apikey/list
// 支持分页：?page=1&size=10
// 支持搜索：?keyword=xxx
// 支持状态筛选：?status=enabled|disabled|pending|expired
// 验证需求：管理员接口
func (ctrl *APIKeyController) ListAPIKeys(c *gin.Context) {
	// 获取分页参数
	pageStr := c.DefaultQuery("page", "1")
	sizeStr := c.DefaultQuery("size", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	size, err := strconv.Atoi(sizeStr)
	if err != nil || size < 1 || size > 100 {
		size = 10
	}

	// 获取搜索和筛选参数
	keyword := strings.TrimSpace(c.Query("keyword"))
	status := strings.TrimSpace(c.Query("status"))

	// 校验 status 参数值
	validStatuses := map[string]bool{"": true, "enabled": true, "disabled": true, "pending": true, "expired": true}
	if !validStatuses[status] {
		status = ""
	}

	// 调用服务层查询 API Keys
	keys, total, err := ctrl.apiKeyService.ListAPIKeys(page, size, keyword, status)
	if err != nil {
		log.Printf("✗ 查询 API Key 列表失败: %v", err)
		c.JSON(500, ListAPIKeysResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 返回 API Key 列表
	log.Printf("✓ 查询 API Key 列表成功: 共 %d 条记录，当前第 %d 页", total, page)
	c.JSON(200, ListAPIKeysResponse{
		Code:    200,
		Message: "查询成功",
		Data: ListAPIKeysData{
			Keys:  keys,
			Total: total,
			Page:  page,
			Size:  size,
		},
	})
}

// DeleteAPIKey 删除 API Key（管理员）
// DELETE /api/admin/apikey/:id
// 验证需求：管理员接口
func (ctrl *APIKeyController) DeleteAPIKey(c *gin.Context) {
	// 获取 API Key ID
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{
			"code":    400,
			"message": "无效的 API Key ID",
			"data":    nil,
		})
		return
	}

	// 调用服务层删除 API Key
	if err := ctrl.apiKeyService.DeleteAPIKey(uint(id)); err != nil {
		log.Printf("✗ 删除 API Key 失败: %v", err)
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务暂时不可用",
			"data":    nil,
		})
		return
	}

	// 删除成功
	log.Printf("✓ API Key 删除成功: ID=%d", id)
	c.JSON(200, gin.H{
		"code":    200,
		"message": "删除成功",
		"data":    nil,
	})
}

// UpdateAPIKeyStatus 更新 API Key 状态（管理员）
// PUT /api/admin/apikey/:id/status
// 验证需求：管理员接口
func (ctrl *APIKeyController) UpdateAPIKeyStatus(c *gin.Context) {
	// 获取 API Key ID
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(400, UpdateAPIKeyStatusResponse{
			Code:    400,
			Message: "无效的 API Key ID",
			Data:    nil,
		})
		return
	}

	var req UpdateAPIKeyStatusRequest

	// 参数验证
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 更新 API Key 状态请求参数验证失败: %v", err)
		c.JSON(400, UpdateAPIKeyStatusResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 调用服务层更新状态
	if err := ctrl.apiKeyService.UpdateAPIKeyStatus(uint(id), req.IsEnabled); err != nil {
		log.Printf("✗ 更新 API Key 状态失败: %v", err)
		c.JSON(500, UpdateAPIKeyStatusResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 更新成功
	statusText := "禁用"
	if req.IsEnabled {
		statusText = "启用"
	}
	log.Printf("✓ API Key 状态更新成功: ID=%d, 状态=%s", id, statusText)
	c.JSON(200, UpdateAPIKeyStatusResponse{
		Code:    200,
		Message: "更新成功",
		Data:    nil,
	})
}

// ============================================================================
// 用户接口
// ============================================================================

// BindAPIKey 绑定 API Key（用户）
// POST /api/user/apikey/bind
// 验证需求：6.1-6.7
func (ctrl *APIKeyController) BindAPIKey(c *gin.Context) {
	var req BindAPIKeyRequest

	// 参数验证
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 绑定 API Key 请求参数验证失败: %v", err)
		c.JSON(400, BindAPIKeyResponse{
			Code:    400,
			Message: "请求参数无效: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 去除 Key 的首尾空白
	req.Key = strings.TrimSpace(req.Key)

	// 验证 Key 非空
	if req.Key == "" {
		c.JSON(400, BindAPIKeyResponse{
			Code:    400,
			Message: "API Key 不能为空",
			Data:    nil,
		})
		return
	}

	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, BindAPIKeyResponse{
			Code:    401,
			Message: "未授权",
			Data:    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, BindAPIKeyResponse{
			Code:    500,
			Message: "服务器内部错误",
			Data:    nil,
		})
		return
	}

	// 调用服务层绑定 API Key
	if err := ctrl.apiKeyService.BindAPIKey(uid, req.Key); err != nil {
		// 根据错误类型返回不同的状态码
		if strings.Contains(err.Error(), "API Key 不存在") {
			logger.Warn(
				"api_key_bind_not_found",
				logger.Any("api_key", req.Key),
				logger.Any("user_id", uid),
			)
			c.JSON(404, BindAPIKeyResponse{
				Code:    404,
				Message: "API Key 不存在",
				Data:    nil,
			})
			return
		}

		if strings.Contains(err.Error(), "API Key 已被绑定") {
			logger.Warn(
				"api_key_bind_already_used",
				logger.Any("api_key", req.Key),
				logger.Any("user_id", uid),
			)
			c.JSON(400, BindAPIKeyResponse{
				Code:    400,
				Message: "API Key 已被绑定",
				Data:    nil,
			})
			return
		}

		// 其他错误（数据库错误等）
		log.Printf("✗ 绑定失败: %v", err)
		c.JSON(500, BindAPIKeyResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 绑定成功，查询 API Key 信息返回
	apiKey, err := ctrl.apiKeyService.GetUserAPIKey(uid)
	if err != nil {
		log.Printf("✗ 查询绑定的 API Key 失败: %v", err)
		c.JSON(500, BindAPIKeyResponse{
			Code:    500,
			Message: "绑定成功，但查询信息失败",
			Data:    nil,
		})
		return
	}

	logger.Info(
		"api_key_bound",
		logger.Any("api_key", req.Key),
		logger.Any("user_id", uid),
	)
	c.JSON(200, BindAPIKeyResponse{
		Code:    200,
		Message: "绑定成功",
		Data:    apiKey,
	})
}

// GetAPIKeyInfo 查询用户绑定的 API Key 信息（用户）
// GET /api/user/apikey/info
// 验证需求：8.1-8.5
func (ctrl *APIKeyController) GetAPIKeyInfo(c *gin.Context) {
	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, GetAPIKeyInfoResponse{
			Code:    401,
			Message: "未授权",
			Data:    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, GetAPIKeyInfoResponse{
			Code:    500,
			Message: "服务器内部错误",
			Data:    nil,
		})
		return
	}

	// 调用服务层查询用户绑定的 API Key
	apiKey, err := ctrl.apiKeyService.GetUserAPIKey(uid)
	if err != nil {
		// 根据错误类型返回不同的状态码
		if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(err.Error(), "未绑定 API Key") {
			log.Printf("✗ 查询失败: 用户未绑定 API Key - 用户ID=%d", uid)
			c.JSON(404, GetAPIKeyInfoResponse{
				Code:    404,
				Message: "未绑定 API Key",
				Data:    nil,
			})
			return
		}

		// 其他错误（数据库错误等）
		log.Printf("✗ 查询 API Key 信息失败: %v", err)
		c.JSON(500, GetAPIKeyInfoResponse{
			Code:    500,
			Message: "服务暂时不可用",
			Data:    nil,
		})
		return
	}

	// 查询成功，返回 API Key 信息
	logger.Info(
		"api_key_info_loaded",
		logger.Any("api_key", apiKey.Key),
		logger.Any("user_id", uid),
	)
	c.JSON(200, GetAPIKeyInfoResponse{
		Code:    200,
		Message: "查询成功",
		Data:    apiKey,
	})
}
