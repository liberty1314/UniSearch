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

func newPluginMetricsHandlerTestCollector(t *testing.T) *service.PluginMetricsCollector {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.PluginPerformanceMetric{}, &model.PluginErrorLog{}); err != nil {
		t.Fatalf("迁移插件指标测试表失败: %v", err)
	}
	return service.NewPluginMetricsCollector(db)
}

func TestPluginMetricsHandlersReturnRealtimeMetricsAndPersistedData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	collector := newPluginMetricsHandlerTestCollector(t)
	now := time.Date(2026, 7, 4, 20, 0, 0, 0, time.UTC)
	collector.RecordEvent(service.PluginMetricEvent{
		PluginName:   "ApiPlugin",
		Keyword:      "测试",
		Duration:     15 * time.Millisecond,
		ErrorMessage: "上游失败",
		OccurredAt:   now,
	})

	router := gin.New()
	router.GET("/realtime", PluginMetricsRealtimeHandler(collector))
	router.GET("/metrics", PluginMetricsListHandler(collector))
	router.GET("/errors", PluginMetricsErrorLogsHandler(collector))

	realtimeReq := httptest.NewRequest(http.MethodGet, "/realtime", nil)
	realtimeResp := httptest.NewRecorder()
	router.ServeHTTP(realtimeResp, realtimeReq)
	if realtimeResp.Code != http.StatusOK {
		t.Fatalf("实时指标接口应返回 200，实际为 %d: %s", realtimeResp.Code, realtimeResp.Body.String())
	}
	if !strings.Contains(realtimeResp.Body.String(), `"plugin_name":"apiplugin"`) {
		t.Fatalf("实时指标应包含归一化插件名，实际为 %s", realtimeResp.Body.String())
	}

	if err := collector.Flush(context.Background()); err != nil {
		t.Fatalf("聚合写入失败: %v", err)
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics?plugin_name=apiplugin", nil)
	metricsResp := httptest.NewRecorder()
	router.ServeHTTP(metricsResp, metricsReq)
	if metricsResp.Code != http.StatusOK {
		t.Fatalf("聚合指标接口应返回 200，实际为 %d: %s", metricsResp.Code, metricsResp.Body.String())
	}
	if !strings.Contains(metricsResp.Body.String(), `"plugin_name":"apiplugin"`) {
		t.Fatalf("聚合指标应包含插件名，实际为 %s", metricsResp.Body.String())
	}

	errorsReq := httptest.NewRequest(http.MethodGet, "/errors?plugin_name=apiplugin&page=1&page_size=10", nil)
	errorsResp := httptest.NewRecorder()
	router.ServeHTTP(errorsResp, errorsReq)
	if errorsResp.Code != http.StatusOK {
		t.Fatalf("错误日志接口应返回 200，实际为 %d: %s", errorsResp.Code, errorsResp.Body.String())
	}
	if !strings.Contains(errorsResp.Body.String(), `"total":1`) || !strings.Contains(errorsResp.Body.String(), `"error_type":"error"`) {
		t.Fatalf("错误日志响应不正确，实际为 %s", errorsResp.Body.String())
	}
}

func TestPluginMetricsListHandlerRejectsInvalidTime(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/metrics", PluginMetricsListHandler(newPluginMetricsHandlerTestCollector(t)))

	req := httptest.NewRequest(http.MethodGet, "/metrics?from=not-a-time", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("非法时间应返回 400，实际为 %d: %s", resp.Code, resp.Body.String())
	}
}
