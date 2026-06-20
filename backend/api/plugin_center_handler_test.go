package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
)

type pluginCenterTestPlugin struct {
	*plugin.BaseAsyncPlugin
}

func newPluginCenterTestPlugin(name string) *pluginCenterTestPlugin {
	base := plugin.NewBaseAsyncPlugin(name, 3)
	base.SetManifest(model.PluginManifest{
		ID:              "search." + name,
		Name:            "插件中心测试插件",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "用于验证插件中心只返回内置插件",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel: "插件中心测试插件",
			SourceGroup: "search",
			TargetTypes: []string{"share"},
			Priority:    3,
		},
	})
	return &pluginCenterTestPlugin{BaseAsyncPlugin: base}
}

func (p *pluginCenterTestPlugin) SearchWithResult(_ string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{IsFinal: true, Source: p.Name()}, nil
}

func newPluginCenterTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(newPluginCenterTestPlugin("builtin-only"))
	searchSvc := service.NewSearchService(pm, nil, nil)
	router := gin.New()
	router.GET("/catalog", PluginCenterCatalogHandler(searchSvc, nil, nil))
	return router
}

func TestPluginCenterCatalogHandlerReturnsBuiltinCatalog(t *testing.T) {
	router := newPluginCenterTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/catalog?source=remote&refresh=true", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("期望 200，实际为 %d: %s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if !strings.Contains(body, `"source":"local"`) || !strings.Contains(body, `"id":"search.builtin-only"`) {
		t.Fatalf("期望返回内置插件本地目录，实际为 %s", body)
	}
	if strings.Contains(body, `"plugin_type":"custom"`) || strings.Contains(body, `"custom_url"`) || strings.Contains(body, `"install"`) && strings.Contains(body, `"available_actions":["install"`) {
		t.Fatalf("插件中心目录不应包含 custom 或可导入动作，实际为 %s", body)
	}
	if strings.Contains(body, "merged_by_type") {
		t.Fatalf("plugin center response should not include search legacy fields, got %s", body)
	}
}
