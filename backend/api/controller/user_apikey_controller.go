package controller

import (
	"log"
	"strings"
	"unisearch/service"
	"unisearch/util/logger"

	"github.com/gin-gonic/gin"
)

// UserAPIKeyController 用户 API Key 管理控制器
// 处理普通用户的 API Key 绑定、查询、更新等操作
type UserAPIKeyController struct {
	apiKeyService *service.APIKeyService
}

// NewUserAPIKeyController 创建用户 API Key 控制器实例
func NewUserAPIKeyController(apiKeyService *service.APIKeyService) *UserAPIKeyController {
	return &UserAPIKeyController{
		apiKeyService: apiKeyService,
	}
}

// BindAPIKey 绑定 API Key 到当前用户
// POST /api/user/apikey
// 需要 JWT 认证中间件
func (ctrl *UserAPIKeyController) BindAPIKey(c *gin.Context) {
	var req BindAPIKeyRequest

	// 参数验证
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("✗ 绑定 API Key 请求参数验证失败: %v", err)
		c.JSON(400, gin.H{
			"code":    400,
			"message": "请求参数无效: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 去除首尾空白字符
	req.Key = strings.TrimSpace(req.Key)

	// 验证 API Key 格式（sk- 开头的43位字符）
	if len(req.Key) != 43 || req.Key[:3] != "sk-" {
		c.JSON(400, gin.H{
			"code":    400,
			"message": "API Key 格式错误",
			"data":    nil,
		})
		return
	}

	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "未授权",
			"data":    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务器内部错误",
			"data":    nil,
		})
		return
	}

	// 检查是否为 API Key 登录用户（user_id = 0）
	if uid == 0 {
		c.JSON(400, gin.H{
			"code":    400,
			"message": "您当前使用 API Key 登录，无需绑定。如需绑定，请使用用户名密码登录",
			"data":    nil,
		})
		return
	}

	// 验证 API Key 是否有效
	apiKey, err := ctrl.apiKeyService.ValidateAPIKey(req.Key)
	if err != nil {
		log.Printf("✗ API Key 验证失败: %v", err)
		c.JSON(400, gin.H{
			"code":    400,
			"message": "API Key 无效或已过期",
			"data":    nil,
		})
		return
	}

	// 检查 API Key 是否已被其他用户绑定
	if apiKey.UserID != nil && *apiKey.UserID != uid {
		c.JSON(400, gin.H{
			"code":    400,
			"message": "该 API Key 已被其他用户绑定",
			"data":    nil,
		})
		return
	}

	// 检查当前用户是否已绑定其他 API Key
	existingKey, err := ctrl.apiKeyService.GetUserAPIKey(uid)
	if err == nil && existingKey != nil {
		// 用户已绑定其他 Key，执行更新操作（解绑旧 Key，绑定新 Key）
		// 解绑旧 Key
		existingKey.UserID = nil
		if err := ctrl.apiKeyService.UpdateAPIKey(existingKey); err != nil {
			log.Printf("✗ 解绑旧 API Key 失败: %v", err)
			c.JSON(500, gin.H{
				"code":    500,
				"message": "更新失败",
				"data":    nil,
			})
			return
		}
	}

	// 绑定新 API Key
	if err := ctrl.apiKeyService.BindAPIKey(uid, req.Key); err != nil {
		log.Printf("✗ 绑定 API Key 失败: %v", err)
		c.JSON(500, gin.H{
			"code":    500,
			"message": "绑定失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	logger.Info(
		"user_api_key_bound",
		logger.Any("api_key", req.Key),
		logger.Any("user_id", uid),
	)
	c.JSON(200, gin.H{
		"code":    200,
		"message": "绑定成功",
		"data": gin.H{
			"api_key": req.Key,
		},
	})
}

// GetAPIKey 获取当前用户绑定的 API Key
// GET /api/user/apikey
// 需要 JWT 认证中间件
func (ctrl *UserAPIKeyController) GetAPIKey(c *gin.Context) {
	// 优先从 Context 获取 API Key（用于 API Key 登录的用户）
	if apiKeyStr, exists := c.Get("api_key"); exists {
		if key, ok := apiKeyStr.(string); ok && key != "" {
			logger.Info("user_api_key_session_detected", logger.Any("api_key", key))
			// 通过 API Key 登录，直接查询该 API Key 的信息
			apiKey, err := ctrl.apiKeyService.GetKey(key)
			if err != nil {
				log.Printf("✗ GetAPIKey: 查询 API Key 失败: %v", err)
				c.JSON(404, gin.H{
					"code":    404,
					"message": "API Key 不存在",
					"data":    nil,
				})
				return
			}

			log.Printf("✓ GetAPIKey: 成功获取 API Key 信息，FirstUsedAt=%v, ExpiresAt=%v", apiKey.FirstUsedAt, apiKey.ExpiresAt)

			// 返回 API Key 信息
			c.JSON(200, gin.H{
				"code":    200,
				"message": "获取成功",
				"data": gin.H{
					"api_key":            apiKey.Key,
					"expires_at":         apiKey.ExpiresAt,
					"daily_search_limit": apiKey.DailySearchLimit,
					"today_search_count": apiKey.TodaySearchCount,
					"remaining_searches": apiKey.GetRemainingSearches(),
					"is_valid":           apiKey.IsValid(),
				},
			})
			return
		}
	}

	log.Printf("🔑 GetAPIKey: 未检测到 API Key 登录，尝试从用户绑定获取")

	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "未授权",
			"data":    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务器内部错误",
			"data":    nil,
		})
		return
	}

	// 查询用户绑定的 API Key
	apiKey, err := ctrl.apiKeyService.GetUserAPIKey(uid)
	if err != nil {
		// 未绑定 API Key
		c.JSON(404, gin.H{
			"code":    404,
			"message": "未绑定 API Key",
			"data":    nil,
		})
		return
	}

	// 返回 API Key 信息（包含完整 Key，前端需要显示）
	c.JSON(200, gin.H{
		"code":    200,
		"message": "获取成功",
		"data": gin.H{
			"api_key":            apiKey.Key,
			"expires_at":         apiKey.ExpiresAt,
			"daily_search_limit": apiKey.DailySearchLimit,
			"today_search_count": apiKey.TodaySearchCount,
			"remaining_searches": apiKey.GetRemainingSearches(),
			"is_valid":           apiKey.IsValid(),
		},
	})
}

// UnbindAPIKey 解绑当前用户的 API Key
// DELETE /api/user/apikey
// 需要 JWT 认证中间件
func (ctrl *UserAPIKeyController) UnbindAPIKey(c *gin.Context) {
	// 从 Context 获取用户 ID（由 JWT 中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{
			"code":    401,
			"message": "未授权",
			"data":    nil,
		})
		return
	}

	// 转换为 uint 类型
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(500, gin.H{
			"code":    500,
			"message": "服务器内部错误",
			"data":    nil,
		})
		return
	}

	// 查询用户绑定的 API Key
	apiKey, err := ctrl.apiKeyService.GetUserAPIKey(uid)
	if err != nil {
		// 未绑定 API Key
		c.JSON(404, gin.H{
			"code":    404,
			"message": "未绑定 API Key",
			"data":    nil,
		})
		return
	}

	// 解绑 API Key（将 user_id 设置为 NULL）
	apiKey.UserID = nil
	if err := ctrl.apiKeyService.UpdateAPIKey(apiKey); err != nil {
		log.Printf("✗ 解绑 API Key 失败: %v", err)
		c.JSON(500, gin.H{
			"code":    500,
			"message": "解绑失败",
			"data":    nil,
		})
		return
	}

	log.Printf("✓ 用户 %d 成功解绑 API Key", uid)
	c.JSON(200, gin.H{
		"code":    200,
		"message": "解绑成功",
		"data":    nil,
	})
}
