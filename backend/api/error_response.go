package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"unisearch/util/logger"
)

type apiErrorResponse struct {
	Code      int    `json:"code" sonic:"code"`
	Message   string `json:"message" sonic:"message"`
	ErrorCode string `json:"error_code" sonic:"error_code"`
	RequestID string `json:"request_id,omitempty" sonic:"request_id,omitempty"`
}

func writeAPIError(c *gin.Context, status int, errorCode string, message string, internalErr error, fields ...logger.Field) {
	requestID := requestIDFromContext(c)
	if internalErr != nil {
		logFields := []logger.Field{
			logger.String("request_id", requestID),
			logger.String("error_code", errorCode),
			logger.Int("status", status),
			logger.String("path", c.Request.URL.Path),
			logger.Any("error", internalErr),
		}
		logFields = append(logFields, fields...)
		logger.Error("api_error", logFields...)
	}

	c.JSON(status, apiErrorResponse{
		Code:      status,
		Message:   message,
		ErrorCode: errorCode,
		RequestID: requestID,
	})
}

func requestIDFromContext(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if requestID := c.GetString("request_id"); requestID != "" {
		return requestID
	}
	if c.Request != nil {
		if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
			return requestID
		}
	}
	return ""
}

func writeRequestBodyTooLargeError(c *gin.Context, errorCode string) {
	writeAPIError(c, http.StatusRequestEntityTooLarge, errorCode, "请求体过大", nil)
}
