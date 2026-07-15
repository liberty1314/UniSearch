package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
)

func runtimeConfigNumber(value float64) *float64 {
	return &value
}

type runtimeConfigTestPlugin struct {
	*plugin.BaseAsyncPlugin
}

func newRuntimeConfigTestPlugin() *runtimeConfigTestPlugin {
	base := plugin.NewBaseAsyncPlugin("sidhub", 3)
	base.SetManifest(model.PluginManifest{
		ID:              "search.sidhub",
		Name:            "SeedHub",
		Version:         "1.0.0",
		Category:        "search",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		ConfigSchema: []model.PluginConfigField{
			{
				Key:     "max_resource_entries_per_type",
				Label:   "每类资源获取数量",
				Type:    "number",
				Default: float64(10),
				Minimum: runtimeConfigNumber(1),
				Maximum: runtimeConfigNumber(40),
				Integer: true,
			},
			{
				Key:               "pre_resolved_link_start_per_type",
				Label:             "每类完整解析数量",
				Type:              "number",
				Default:           float64(3),
				Minimum:           runtimeConfigNumber(0),
				Maximum:           runtimeConfigNumber(20),
				Integer:           true,
				LessThanOrEqualTo: "max_resource_entries_per_type",
			},
		},
	})
	return &runtimeConfigTestPlugin{BaseAsyncPlugin: base}
}

func (p *runtimeConfigTestPlugin) SearchWithResult(_ string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{IsFinal: true, Source: p.Name()}, nil
}

func newPluginRuntimeConfigTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开测试数据库失败: %v", err)
	}
	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(newRuntimeConfigTestPlugin())
	searchService := service.NewSearchService(manager, nil, nil)
	configService := service.NewPluginRuntimeConfigService(db)
	router := gin.New()
	router.GET("/plugins/:pluginName/config", GetPluginRuntimeConfigHandler(searchService, configService))
	router.PUT("/plugins/:pluginName/config", SavePluginRuntimeConfigHandler(searchService, configService))
	return router
}

func TestPluginRuntimeConfigHandlersSaveAndRead(t *testing.T) {
	router := newPluginRuntimeConfigTestRouter(t)

	putReq := httptest.NewRequest(http.MethodPut, "/plugins/sidhub/config", strings.NewReader(`{"config":{"max_resource_entries_per_type":10,"pre_resolved_link_start_per_type":5}}`))
	putReq.Header.Set("Content-Type", "application/json")
	putRecorder := httptest.NewRecorder()
	router.ServeHTTP(putRecorder, putReq)
	if putRecorder.Code != http.StatusOK {
		t.Fatalf("期望保存配置返回 200，实际为 %d: %s", putRecorder.Code, putRecorder.Body.String())
	}

	getReq := httptest.NewRequest(http.MethodGet, "/plugins/sidhub/config", nil)
	getRecorder := httptest.NewRecorder()
	router.ServeHTTP(getRecorder, getReq)
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("期望读取配置返回 200，实际为 %d: %s", getRecorder.Code, getRecorder.Body.String())
	}

	var body struct {
		PluginName string                 `json:"plugin_name"`
		Config     map[string]interface{} `json:"config"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("解析配置响应失败: %v", err)
	}
	if body.PluginName != "sidhub" || body.Config["max_resource_entries_per_type"] != float64(10) || body.Config["pre_resolved_link_start_per_type"] != float64(5) {
		t.Fatalf("期望读取保存后的配置，实际为 %#v", body)
	}
}

func TestPluginRuntimeConfigHandlersRejectInvalidConfigWithoutPersisting(t *testing.T) {
	router := newPluginRuntimeConfigTestRouter(t)

	validReq := httptest.NewRequest(http.MethodPut, "/plugins/sidhub/config", strings.NewReader(`{"config":{"max_resource_entries_per_type":10,"pre_resolved_link_start_per_type":5}}`))
	validReq.Header.Set("Content-Type", "application/json")
	validRecorder := httptest.NewRecorder()
	router.ServeHTTP(validRecorder, validReq)
	if validRecorder.Code != http.StatusOK {
		t.Fatalf("期望初始配置保存成功，实际为 %d: %s", validRecorder.Code, validRecorder.Body.String())
	}

	invalidReq := httptest.NewRequest(http.MethodPut, "/plugins/sidhub/config", strings.NewReader(`{"config":{"max_resource_entries_per_type":10,"pre_resolved_link_start_per_type":11}}`))
	invalidReq.Header.Set("Content-Type", "application/json")
	invalidRecorder := httptest.NewRecorder()
	router.ServeHTTP(invalidRecorder, invalidReq)
	if invalidRecorder.Code != http.StatusBadRequest {
		t.Fatalf("期望非法配置返回 400，实际为 %d: %s", invalidRecorder.Code, invalidRecorder.Body.String())
	}

	var invalidBody struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(invalidRecorder.Body.Bytes(), &invalidBody); err != nil {
		t.Fatal(err)
	}
	if invalidBody.Code != "PLUGIN_CONFIG_INVALID" {
		t.Fatalf("期望 PLUGIN_CONFIG_INVALID，实际为 %#v", invalidBody)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/plugins/sidhub/config", nil)
	getRecorder := httptest.NewRecorder()
	router.ServeHTTP(getRecorder, getReq)
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("期望读取配置成功，实际为 %d: %s", getRecorder.Code, getRecorder.Body.String())
	}

	var body struct {
		Config map[string]interface{} `json:"config"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Config["max_resource_entries_per_type"] != float64(10) || body.Config["pre_resolved_link_start_per_type"] != float64(5) {
		t.Fatalf("非法配置不应覆盖已保存值，实际为 %#v", body.Config)
	}
}
