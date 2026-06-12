package service

import (
	"net/http"
	"strings"
	"testing"

	"unisearch/model"
	"unisearch/plugin"
)

type catalogTestPlugin struct {
	*plugin.BaseAsyncPlugin
}

func newCatalogTestPlugin(name string, priority int) *catalogTestPlugin {
	base := plugin.NewBaseAsyncPlugin(name, priority)
	base.SetManifest(model.PluginManifest{
		ID:              "search." + name,
		Name:            "测试插件",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "内置测试插件",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel: "测试插件",
			SourceGroup: "search",
			TargetTypes: []string{"share"},
			Priority:    priority,
		},
	})
	return &catalogTestPlugin{BaseAsyncPlugin: base}
}

func (p *catalogTestPlugin) Search(_ string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return nil, nil
}

func (p *catalogTestPlugin) AsyncSearch(
	_ string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	return nil, nil
}

func TestPluginCatalogServiceReturnsOnlyBuiltinCatalog(t *testing.T) {
	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(newCatalogTestPlugin("builtin-local", 3))
	service := &PluginCatalogService{
		pluginManager: manager,
	}

	catalog, err := service.ListCatalog("all", false)
	if err != nil {
		t.Fatalf("list catalog: %v", err)
	}

	if catalog.Version != "local" || catalog.Source != "local" {
		t.Fatalf("期望目录固定为本地内置来源，实际为 version=%q source=%q", catalog.Version, catalog.Source)
	}
	if len(catalog.Items) != 1 {
		t.Fatalf("期望只返回 1 个内置插件，实际为 %d: %#v", len(catalog.Items), catalog.Items)
	}
	item := catalog.Items[0]
	if item.Name != "builtin-local" || item.PluginType != "builtin" || !item.Installed || !item.IsLocal || item.IsRemote {
		t.Fatalf("期望返回内置插件条目，实际为 %#v", item)
	}
	if item.URL != "" || item.Install.Type != "" {
		t.Fatalf("内置插件目录不应包含自定义 URL 或安装信息，实际为 %#v", item)
	}
	if containsAction(item.AvailableActions, "install") || containsAction(item.AvailableActions, "delete") {
		t.Fatalf("内置插件动作不应包含 install/delete，实际为 %#v", item.AvailableActions)
	}
}

func TestPluginCatalogServiceIgnoresRemoteSource(t *testing.T) {
	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(newCatalogTestPlugin("builtin-local", 3))
	service := &PluginCatalogService{pluginManager: manager}

	catalog, err := service.ListCatalog("remote", true)
	if err != nil {
		t.Fatalf("list remote catalog: %v", err)
	}
	if catalog.Source != "local" || len(catalog.Items) != 1 || catalog.Items[0].Name != "builtin-local" {
		t.Fatalf("source=remote 应被忽略并返回内置目录，实际为 %#v", catalog)
	}
}

func TestPluginCatalogServiceMarksMigratedPluginsAsBuiltin(t *testing.T) {
	manager := plugin.NewPluginManager()


	service := &PluginCatalogService{pluginManager: manager}

	catalog, err := service.ListCatalog("all", false)
	if err != nil {
		t.Fatalf("list catalog: %v", err)
	}

	itemsByName := make(map[string]model.PluginCatalogItem, len(catalog.Items))
	for _, item := range catalog.Items {
		if item.PluginType == "custom" {
			t.Fatalf("迁移后的插件目录不应返回自定义插件，实际为 %#v", item)
		}
		itemsByName[item.Name] = item
	}

	for _, name := range []string{} {
		item, ok := itemsByName[name]
		if !ok {
			t.Fatalf("期望插件目录包含 %s，实际为 %#v", name, catalog.Items)
		}
		if item.PluginType != "builtin" || !item.Installed || !item.IsLocal || item.IsRemote {
			t.Fatalf("期望 %s 显示为本地内置插件，实际为 %#v", name, item)
		}
	}
}

func TestPluginCatalogServiceInstallIsDisabled(t *testing.T) {
	service := &PluginCatalogService{
		pluginManager: plugin.NewPluginManager(),
	}

	_, err := service.InstallCatalogItem(model.PluginCatalogInstallRequest{ID: "search.install-me"})
	if err == nil || !strings.Contains(err.Error(), "插件导入功能已下线") {
		t.Fatalf("期望导入功能返回下线错误，实际为 %v", err)
	}
}

func containsAction(actions []string, target string) bool {
	for _, action := range actions {
		if action == target {
			return true
		}
	}
	return false
}
