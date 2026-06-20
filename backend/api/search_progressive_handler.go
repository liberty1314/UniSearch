package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/model"
	"unisearch/service"
	jsonutil "unisearch/util/json"
)

func SearchProgressiveHandler(searchService *service.SearchService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if searchService == nil {
			c.JSON(http.StatusInternalServerError, model.NewErrorResponse(500, "搜索服务未初始化"))
			return
		}

		req, err := parseSearchRequest(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, model.NewErrorResponse(400, err.Error()))
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
			_ = emit(model.SearchProgressiveEvent{
				Type:    "error",
				Message: "渐进式搜索失败: " + err.Error(),
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
