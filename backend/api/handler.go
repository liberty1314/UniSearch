package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/model"
	"unisearch/service"
	jsonutil "unisearch/util/json"
	"unisearch/util/logger"
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
		if isRequestBodyTooLargeError(err) {
			writeRequestBodyTooLargeError(c, "SEARCH_REQUEST_BODY_TOO_LARGE")
			return
		}
		writeAPIError(c, http.StatusBadRequest, "SEARCH_INVALID_REQUEST", "搜索请求参数无效", nil)
		return
	}

	result, err := searchWithFilterRefreshFallback(req, func(forceRefresh bool) (model.SearchResponse, error) {
		return searchService.Search(req.Keyword, req.Channels, req.Concurrency, forceRefresh, req.ResultType, req.SourceType, req.Plugins, req.CloudTypes, req.Ext)
	})
	if err != nil {
		logger.Error(
			"search_failed",
			logger.String("request_id", requestIDFromContext(c)),
			logger.String("keyword", req.Keyword),
			logger.Any("error", err),
		)
		response := apiErrorResponse{
			Code:      http.StatusInternalServerError,
			Message:   "搜索服务暂时不可用，请稍后重试",
			ErrorCode: "SEARCH_FAILED",
			RequestID: requestIDFromContext(c),
		}
		jsonData, _ := jsonutil.Marshal(response)
		c.Data(http.StatusInternalServerError, "application/json", jsonData)
		return
	}

	// 包装SearchResponse到标准响应格式中
	response := model.NewSuccessResponse(result)
	jsonData, _ := jsonutil.Marshal(response)
	c.Data(http.StatusOK, "application/json", jsonData)
}

type searchResponseLoader func(forceRefresh bool) (model.SearchResponse, error)

func searchWithFilterRefreshFallback(req model.SearchRequest, load searchResponseLoader) (model.SearchResponse, error) {
	result, err := load(req.ForceRefresh)
	if err != nil {
		return model.SearchResponse{}, err
	}
	if req.Filter == nil || isResourceFilterEmpty(req.Filter) {
		return result, nil
	}

	filtered := applyResultFilter(result, req.Filter, req.ResultType)
	if req.ForceRefresh || filtered.Total > 0 {
		return filtered, nil
	}

	refreshed, refreshErr := load(true)
	if refreshErr != nil {
		return filtered, nil
	}
	return applyResultFilter(refreshed, req.Filter, req.ResultType), nil
}
