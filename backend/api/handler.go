package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/model"
	"unisearch/service"
	jsonutil "unisearch/util/json"
)

// 保存搜索服务的实例
var searchService *service.SearchService
var authService *service.AuthService

// SetSearchService 设置搜索服务实例
func SetSearchService(service *service.SearchService) {
	searchService = service
}

// SetAuthService 设置认证服务实例
func SetAuthService(service *service.AuthService) {
	authService = service
}

// SearchHandler 搜索处理函数
// 仅允许已登录账号执行搜索。
func SearchHandler(c *gin.Context) {
	req, err := parseSearchRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, err.Error()))
		return
	}

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

	// 包装SearchResponse到标准响应格式中
	response := model.NewSuccessResponse(result)
	jsonData, _ := jsonutil.Marshal(response)
	c.Data(http.StatusOK, "application/json", jsonData)
}
