package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/plugin"
	"unisearch/service"
)

func writePluginCenterHandlerCatalog(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "plugin_market.default.json")
	content := `{
  "version": "api-test",
  "items": [
    {
      "id": "search.api-install",
      "name": "api-install",
      "version": "1.0.0",
      "category": "search",
      "description": "API 导入测试",
      "manifest": {"id":"search.api-install","name":"api-install","version":"1.0.0","category":"search","capabilities":["resource.search"],"resource":{"source_label":"api-install","source_group":"search","target_types":["share"],"priority":5}},
      "install": {"type":"custom_url","url":"https://example.com/api-install"}
    }
  ]
}`
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("write catalog: %v", err)
	}
	return path
}

func preparePluginCenterHandlerEnv(t *testing.T) string {
	t.Helper()
	catalogPath := writePluginCenterHandlerCatalog(t)
	customPath := filepath.Join(t.TempDir(), "custom_plugins.json")
	t.Setenv("PLUGIN_MARKET_DEFAULT_CATALOG_PATH", catalogPath)
	t.Setenv("PLUGIN_MARKET_REGISTRY_URL", "http://127.0.0.1:1/unavailable")
	t.Setenv("CUSTOM_PLUGINS_PATH", customPath)
	config.ResetCustomPluginsConfigForTest()
	t.Cleanup(config.ResetCustomPluginsConfigForTest)
	return customPath
}

func newPluginCenterTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	pm := plugin.NewPluginManager()
	searchSvc := service.NewSearchService(pm, nil, nil)
	router := gin.New()
	router.GET("/catalog", PluginCenterCatalogHandler(searchSvc, nil, nil))
	router.POST("/install", PluginCenterInstallHandler(searchSvc, nil, nil))
	return router
}

func TestPluginCenterCatalogHandlerReturnsCatalogItems(t *testing.T) {
	preparePluginCenterHandlerEnv(t)
	router := newPluginCenterTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/catalog?source=remote", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if !strings.Contains(body, `"version":"api-test"`) {
		t.Fatalf("expected catalog version in response, got %s", body)
	}
	if !strings.Contains(body, `"id":"search.api-install"`) {
		t.Fatalf("expected catalog item in response, got %s", body)
	}
	if strings.Contains(body, "merged_by_type") {
		t.Fatalf("plugin center response should not include search legacy fields, got %s", body)
	}
}

func TestPluginCenterInstallHandlerImportsCustomURLPlugin(t *testing.T) {
	customPath := preparePluginCenterHandlerEnv(t)
	router := newPluginCenterTestRouter()

	req := httptest.NewRequest(http.MethodPost, "/install", strings.NewReader(`{"id":"search.api-install"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"installed":true`) {
		t.Fatalf("expected installed item response, got %s", w.Body.String())
	}

	data, err := os.ReadFile(customPath)
	if err != nil {
		t.Fatalf("read custom plugins: %v", err)
	}
	if !strings.Contains(string(data), `"name": "api-install"`) {
		t.Fatalf("expected custom plugin to be persisted, got %s", string(data))
	}
	if !strings.Contains(string(data), `"enabled": true`) {
		t.Fatalf("expected custom plugin to be enabled, got %s", string(data))
	}
}

func TestPluginCenterInstallHandlerRejectsUnknownItem(t *testing.T) {
	preparePluginCenterHandlerEnv(t)
	router := newPluginCenterTestRouter()

	req := httptest.NewRequest(http.MethodPost, "/install", strings.NewReader(`{"id":"missing"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPluginCenterHandlerEnvUsesCustomPluginPath(t *testing.T) {
	customPath := preparePluginCenterHandlerEnv(t)
	plugins := config.GetCustomPluginsConfig().GetPlugins()
	if len(plugins) != 0 {
		t.Fatalf("expected empty test custom config, got %#v", plugins)
	}
	if _, err := os.Stat(customPath); err != nil {
		t.Fatalf("expected custom plugin config file to exist: %v", err)
	}
}
