package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSearchHandlerReturnsStableErrorCodeAndRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(LoggerMiddleware())
	router.POST("/api/search", SearchHandler)

	req := httptest.NewRequest(http.MethodPost, "/api/search", bytes.NewBufferString(`{"kw":"仙逆","ext":{"unknown":"value"}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Request-ID", "test-request-id")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("期望无效搜索参数返回 400，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Code      int    `json:"code"`
		Message   string `json:"message"`
		ErrorCode string `json:"error_code"`
		RequestID string `json:"request_id"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("解析错误响应失败：%v", err)
	}

	if response.Code != http.StatusBadRequest {
		t.Fatalf("期望 code 保持 HTTP 数字状态，实际为 %d", response.Code)
	}
	if response.ErrorCode != "SEARCH_INVALID_REQUEST" {
		t.Fatalf("期望稳定错误码 SEARCH_INVALID_REQUEST，实际为 %s", response.ErrorCode)
	}
	if response.Message != "搜索请求参数无效" {
		t.Fatalf("期望稳定用户提示，实际为 %s", response.Message)
	}
	if response.RequestID != "test-request-id" {
		t.Fatalf("期望响应包含 request_id，实际为 %s", response.RequestID)
	}
}
