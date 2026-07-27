package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
	"unisearch/service"
)

func newChannelMetricsHandlerTestCollector(t *testing.T) *service.TGChannelMetricsCollector {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.TGChannelPerformanceMetric{}, &model.TGChannelErrorLog{}); err != nil {
		t.Fatalf("迁移频道指标测试表失败: %v", err)
	}
	return service.NewTGChannelMetricsCollector(db)
}

func TestChannelMetricsHandlersReturnRealtimeMetricsAndPersistedData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	collector := newChannelMetricsHandlerTestCollector(t)
	now := time.Date(2026, 7, 5, 9, 0, 0, 0, time.UTC)
	collector.RecordEvent(service.TGChannelMetricEvent{
		ChannelName:  "ApiChannel",
		Keyword:      "测试",
		Duration:     15 * time.Millisecond,
		ErrorMessage: "上游失败",
		OccurredAt:   now,
	})

	router := gin.New()
	router.GET("/realtime", ChannelMetricsRealtimeHandler(collector))
	router.GET("/metrics", ChannelMetricsListHandler(collector))
	router.GET("/errors", ChannelMetricsErrorLogsHandler(collector))

	realtimeReq := httptest.NewRequest(http.MethodGet, "/realtime", nil)
	realtimeResp := httptest.NewRecorder()
	router.ServeHTTP(realtimeResp, realtimeReq)
	if realtimeResp.Code != http.StatusOK {
		t.Fatalf("实时指标接口应返回 200，实际为 %d: %s", realtimeResp.Code, realtimeResp.Body.String())
	}
	if !strings.Contains(realtimeResp.Body.String(), `"channel_name":"apichannel"`) {
		t.Fatalf("实时指标应包含归一化频道名，实际为 %s", realtimeResp.Body.String())
	}

	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics?channel_name=apichannel", nil)
	metricsResp := httptest.NewRecorder()
	router.ServeHTTP(metricsResp, metricsReq)
	if metricsResp.Code != http.StatusOK {
		t.Fatalf("聚合指标接口应返回 200，实际为 %d: %s", metricsResp.Code, metricsResp.Body.String())
	}
	if !strings.Contains(metricsResp.Body.String(), `"channel_name":"apichannel"`) {
		t.Fatalf("聚合指标应包含频道名，实际为 %s", metricsResp.Body.String())
	}

	errorsReq := httptest.NewRequest(http.MethodGet, "/errors?channel_name=apichannel&page=1&page_size=10", nil)
	errorsResp := httptest.NewRecorder()
	router.ServeHTTP(errorsResp, errorsReq)
	if errorsResp.Code != http.StatusOK {
		t.Fatalf("错误日志接口应返回 200，实际为 %d: %s", errorsResp.Code, errorsResp.Body.String())
	}
	if !strings.Contains(errorsResp.Body.String(), `"total":1`) || !strings.Contains(errorsResp.Body.String(), `"error_type":"error"`) {
		t.Fatalf("错误日志响应不正确，实际为 %s", errorsResp.Body.String())
	}
}

func TestChannelMetricsListHandlerRejectsInvalidTime(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/metrics", ChannelMetricsListHandler(newChannelMetricsHandlerTestCollector(t)))

	req := httptest.NewRequest(http.MethodGet, "/metrics?from=not-a-time", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("非法时间应返回 400，实际为 %d: %s", resp.Code, resp.Body.String())
	}
}

func TestChannelMetricsHandlersReturnEmptyPayloadWhenCollectorMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/realtime", ChannelMetricsRealtimeHandler(nil))
	router.GET("/metrics", ChannelMetricsListHandler(nil))
	router.GET("/errors", ChannelMetricsErrorLogsHandler(nil))

	for _, path := range []string{"/realtime", "/metrics", "/errors"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		resp := httptest.NewRecorder()
		router.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Fatalf("%s 空采集器应返回 200，实际为 %d: %s", path, resp.Code, resp.Body.String())
		}
	}
}
