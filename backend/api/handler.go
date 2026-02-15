package api

import (
	// "fmt"
	"net/http"
	// "os"

	"github.com/gin-gonic/gin"
	"strings"
	"unisearch/config"
	"unisearch/model"
	"unisearch/service"
	"unisearch/util"
	jsonutil "unisearch/util/json"
)

// 保存搜索服务的实例
var searchService *service.SearchService

// 保存API Key服务的实例
var apiKeyService *service.APIKeyService

// SetSearchService 设置搜索服务实例
func SetSearchService(service *service.SearchService) {
	searchService = service
}

// SetAPIKeyService 设置API Key服务实例
func SetAPIKeyService(service *service.APIKeyService) {
	apiKeyService = service
}

// SearchHandler 搜索处理函数
// 实现混合访问模式：
// 1. 优先使用请求中的手动输入 API Key（从 Header X-API-Key 或查询参数 key）
// 2. 如果无 API Key 但有 JWT Token，使用用户绑定的 Key
// 3. 如果既无 API Key 也无 Token，返回错误
// 验证需求：9.1-9.9, 10.5, 14.2, 14.3
func SearchHandler(c *gin.Context) {
	var req model.SearchRequest
	var err error
	var apiKeyStr string

	// ========== 混合访问模式：获取 API Key ==========

	// 1. 优先使用请求中的手动输入 API Key（从 Header 或查询参数）
	apiKeyStr = c.GetHeader("X-API-Key")
	if apiKeyStr == "" {
		apiKeyStr = c.Query("key")
	}

	// 2. 如果无手动输入的 API Key，尝试从 JWT Token 获取用户绑定的 Key
	if apiKeyStr == "" {
		// 检查是否有 JWT Token（从 Authorization Header）
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			// 验证 JWT Token（使用新版本的 ValidateJWTToken）
			claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret)
			if err == nil && claims.UserID > 0 {
				// 从数据库获取用户绑定的 API Key
				if apiKeyService != nil {
					userAPIKey, err := apiKeyService.GetUserAPIKey(claims.UserID)
					if err == nil && userAPIKey != nil {
						apiKeyStr = userAPIKey.Key
					}
				}
			}
		}
	}

	// 3. 如果既无 API Key 也无有效的 JWT Token，返回错误
	if apiKeyStr == "" {
		c.JSON(http.StatusUnauthorized, model.NewErrorResponse(401, "请提供 API Key 或登录后使用"))
		return
	}

	// ========== 验证 API Key 有效性 ==========

	if apiKeyService == nil {
		c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "API Key 服务未初始化"))
		return
	}

	// 验证 API Key（检查 is_enabled 和 expires_at）
	apiKey, err := apiKeyService.ValidateAPIKey(apiKeyStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, model.NewErrorResponse(401, "API Key 无效或已过期"))
		return
	}

	// ========== 检查每日搜索限额 ==========

	// 检查并重置每日计数（如果是新的一天）
	if err := apiKeyService.CheckAndResetDailyCount(apiKey); err != nil {
		c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "检查搜索限制失败: "+err.Error()))
		return
	}

	// 检查是否可以搜索（每日限额）
	if !apiKey.CanSearch() {
		c.JSON(http.StatusTooManyRequests, model.NewErrorResponse(429, "今日搜索次数已达上限"))
		return
	}

	// 根据请求方法不同处理参数
	if c.Request.Method == http.MethodGet {
		// GET方式：从URL参数获取
		// 获取keyword，必填参数
		keyword := c.Query("kw")

		// 处理channels参数，支持逗号分隔
		channelsStr := c.Query("channels")
		var channels []string
		// 只有当参数非空时才处理
		if channelsStr != "" && channelsStr != " " {
			parts := strings.Split(channelsStr, ",")
			for _, part := range parts {
				trimmed := strings.TrimSpace(part)
				if trimmed != "" {
					channels = append(channels, trimmed)
				}
			}
		}

		// 处理并发数
		concurrency := 0
		concStr := c.Query("conc")
		if concStr != "" && concStr != " " {
			concurrency = util.StringToInt(concStr)
		}

		// 处理强制刷新
		forceRefresh := false
		refreshStr := c.Query("refresh")
		if refreshStr != "" && refreshStr != " " && refreshStr == "true" {
			forceRefresh = true
		}

		// 处理结果类型和来源类型
		resultType := c.Query("res")
		if resultType == "" || resultType == " " {
			resultType = "merge" // 直接设置为默认值merge
		}

		sourceType := c.Query("src")
		if sourceType == "" || sourceType == " " {
			sourceType = "all" // 直接设置为默认值all
		}

		// 处理plugins参数，支持逗号分隔
		var plugins []string
		// 检查请求中是否存在plugins参数
		if c.Request.URL.Query().Has("plugins") {
			pluginsStr := c.Query("plugins")
			// 判断参数是否非空
			if pluginsStr != "" && pluginsStr != " " {
				parts := strings.Split(pluginsStr, ",")
				for _, part := range parts {
					trimmed := strings.TrimSpace(part)
					if trimmed != "" {
						plugins = append(plugins, trimmed)
					}
				}
			}
		} else {
			// 如果请求中不存在plugins参数，设置为nil
			plugins = nil
		}

		// 处理cloud_types参数，支持逗号分隔
		var cloudTypes []string
		// 检查请求中是否存在cloud_types参数
		if c.Request.URL.Query().Has("cloud_types") {
			cloudTypesStr := c.Query("cloud_types")
			// 判断参数是否非空
			if cloudTypesStr != "" && cloudTypesStr != " " {
				parts := strings.Split(cloudTypesStr, ",")
				for _, part := range parts {
					trimmed := strings.TrimSpace(part)
					if trimmed != "" {
						cloudTypes = append(cloudTypes, trimmed)
					}
				}
			}
		} else {
			// 如果请求中不存在cloud_types参数，设置为nil
			cloudTypes = nil
		}

		// 处理ext参数，JSON格式
		var ext map[string]interface{}
		extStr := c.Query("ext")
		if extStr != "" && extStr != " " {
			// 处理特殊情况：ext={}
			if extStr == "{}" {
				ext = make(map[string]interface{})
			} else {
				if err := jsonutil.Unmarshal([]byte(extStr), &ext); err != nil {
					c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "无效的ext参数格式: "+err.Error()))
					return
				}
			}
		}
		// 确保ext不为nil
		if ext == nil {
			ext = make(map[string]interface{})
		}

		// 处理filter参数，JSON格式
		var filter *model.FilterConfig
		filterStr := c.Query("filter")
		if filterStr != "" && filterStr != " " {
			filter = &model.FilterConfig{}
			if err := jsonutil.Unmarshal([]byte(filterStr), filter); err != nil {
				c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "无效的filter参数格式: "+err.Error()))
				return
			}
		}

		req = model.SearchRequest{
			Keyword:      keyword,
			Channels:     channels,
			Concurrency:  concurrency,
			ForceRefresh: forceRefresh,
			ResultType:   resultType,
			SourceType:   sourceType,
			Plugins:      plugins,
			CloudTypes:   cloudTypes, // 添加cloud_types到请求中
			Ext:          ext,
			Filter:       filter,
		}
	} else {
		// POST方式：从请求体获取
		data, err := c.GetRawData()
		if err != nil {
			c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "读取请求数据失败: "+err.Error()))
			return
		}

		if err := jsonutil.Unmarshal(data, &req); err != nil {
			c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, "无效的请求参数: "+err.Error()))
			return
		}
	}

	// 检查并设置默认值
	if len(req.Channels) == 0 {
		// 优先从 TGChannelService 获取数据库中的启用频道
		if tgChannelService != nil {
			dbChannels, err := tgChannelService.GetEnabledChannels()
			if err == nil && len(dbChannels) > 0 {
				req.Channels = dbChannels
			} else {
				req.Channels = config.AppConfig.DefaultChannels
			}
		} else {
			req.Channels = config.AppConfig.DefaultChannels
		}
	}

	// 如果未指定结果类型，默认返回merge并转换为merged_by_type
	if req.ResultType == "" {
		req.ResultType = "merged_by_type"
	} else if req.ResultType == "merge" {
		// 将merge转换为merged_by_type，以兼容内部处理
		req.ResultType = "merged_by_type"
	}

	// 如果未指定数据来源类型，默认为全部
	if req.SourceType == "" {
		req.SourceType = "all"
	}

	// 参数互斥逻辑：当src=tg时忽略plugins参数，当src=plugin时忽略channels参数
	if req.SourceType == "tg" {
		req.Plugins = nil // 忽略plugins参数
	} else if req.SourceType == "plugin" {
		req.Channels = nil // 忽略channels参数
	} else if req.SourceType == "all" {
		// 对于all类型，如果plugins为空或不存在，统一设为nil
		if req.Plugins == nil || len(req.Plugins) == 0 {
			req.Plugins = nil
		}
	}

	// 可选：启用调试输出（生产环境建议注释掉）
	// fmt.Printf("🔧 [调试] 搜索参数: keyword=%s, channels=%v, concurrency=%d, refresh=%v, resultType=%s, sourceType=%s, plugins=%v, cloudTypes=%v, ext=%v\n",
	//	req.Keyword, req.Channels, req.Concurrency, req.ForceRefresh, req.ResultType, req.SourceType, req.Plugins, req.CloudTypes, req.Ext)

	// 执行搜索
	result, err := searchService.Search(req.Keyword, req.Channels, req.Concurrency, req.ForceRefresh, req.ResultType, req.SourceType, req.Plugins, req.CloudTypes, req.Ext)

	if err != nil {
		response := model.NewErrorResponse(500, "搜索失败: "+err.Error())
		jsonData, _ := jsonutil.Marshal(response)
		c.Data(http.StatusInternalServerError, "application/json", jsonData)
		return
	}

	// 应用过滤器
	if req.Filter != nil {
		result = applyResultFilter(result, req.Filter, req.ResultType)
	}

	// ========== 搜索成功后，更新 API Key 使用统计 ==========

	// 更新 first_used_at（如果是首次使用）、today_search_count、last_search_date
	if err := apiKeyService.UpdateAPIKeyUsage(apiKeyStr); err != nil {
		// 记录错误但不影响搜索结果返回
		// 可以考虑记录日志：log.Printf("更新 API Key 使用统计失败: %v", err)
	}

	// 包装SearchResponse到标准响应格式中
	response := model.NewSuccessResponse(result)
	jsonData, _ := jsonutil.Marshal(response)
	c.Data(http.StatusOK, "application/json", jsonData)
}
