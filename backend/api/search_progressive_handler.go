package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/config"
	"unisearch/model"
	"unisearch/service"
	jsonutil "unisearch/util/json"
	"unisearch/util/logger"
)

func SearchProgressiveHandler(searchService *service.SearchService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if searchService == nil {
			writeAPIError(c, http.StatusInternalServerError, "SEARCH_SERVICE_NOT_INITIALIZED", "搜索服务暂时不可用，请稍后重试", nil)
			return
		}
		if config.AppConfig != nil && !config.AppConfig.ProgressiveSearchEnabled {
			writeAPIError(c, http.StatusConflict, "SEARCH_PROGRESSIVE_DISABLED", "渐进式搜索已关闭", nil)
			return
		}

		req, err := parseSearchRequest(c)
		if err != nil {
			if isRequestBodyTooLargeError(err) {
				writeRequestBodyTooLargeError(c, "SEARCH_REQUEST_BODY_TOO_LARGE")
				return
			}
			writeAPIError(c, http.StatusBadRequest, "SEARCH_INVALID_REQUEST", "搜索请求参数无效", nil)
			return
		}

		c.Header("Content-Type", "application/x-ndjson; charset=utf-8")
		c.Header("Cache-Control", "no-cache, no-transform")
		c.Header("X-Accel-Buffering", "no")
		c.Status(http.StatusOK)

		flusher, _ := c.Writer.(http.Flusher)
		emit := func(event model.SearchProgressiveEvent) error {
			payload, marshalErr := jsonutil.Marshal(event)
			if marshalErr != nil {
				return marshalErr
			}
			if _, writeErr := c.Writer.Write(append(payload, '\n')); writeErr != nil {
				return writeErr
			}
			if flusher != nil {
				flusher.Flush()
			}
			return nil
		}

		if err := searchService.SearchProgressive(c.Request.Context(), req, emit); err != nil {
			logger.Error(
				"search_progressive_failed",
				logger.String("request_id", requestIDFromContext(c)),
				logger.String("keyword", req.Keyword),
				logger.Any("error", err),
			)
			_ = emit(model.SearchProgressiveEvent{
				Type:      "error",
				Message:   "渐进式搜索暂时不可用，请稍后重试",
				ErrorCode: "SEARCH_PROGRESSIVE_FAILED",
				RequestID: requestIDFromContext(c),
			})
		}
	}
}

func SearchObservabilityHandler(searchService *service.SearchService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if searchService == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "搜索服务未初始化",
				"code":  "SEARCH_SERVICE_NOT_INITIALIZED",
			})
			return
		}
		c.JSON(http.StatusOK, searchService.ObservabilitySnapshot())
	}
}
