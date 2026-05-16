package service

import (
	"os"
	"path/filepath"
	"testing"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
)

type pluginCatalogTestStore struct {
	plugins []config.CustomPlugin
	added   []config.CustomPlugin
}

func (s *pluginCatalogTestStore) GetPlugins() []config.CustomPlugin {
	result := make([]config.CustomPlugin, len(s.plugins))
	copy(result, s.plugins)
	return result
}

func (s *pluginCatalogTestStore) AddPlugin(plugin config.CustomPlugin) error {
	for _, existing := range s.plugins {
		if existing.Name == plugin.Name {
			return nil
		}
	}
	s.plugins = append(s.plugins, plugin)
	s.added = append(s.added, plugin)
	return nil
}

func writePluginCatalogFixture(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "plugin_market.default.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("write catalog fixture: %v", err)
	}
	return path
}

func TestPluginCatalogServiceMergesLocalAndRemoteCatalog(t *testing.T) {
	defaultCatalogPath := writePluginCatalogFixture(t, `{
  "version": "2026.05",
  "items": [
    {
      "id": "search.custom-local",
      "name": "custom-local",
      "version": "1.1.0",
      "category": "search",
      "description": "远程市场中的本地插件",
      "manifest": {"id":"search.custom-local","name":"custom-local","version":"1.1.0","category":"search","capabilities":["resource.search"],"resource":{"source_label":"custom-local","source_group":"search","target_types":["share"]}},
      "install": {"type":"custom_url","url":"https://example.com/local"}
    },
    {
      "id": "search.remote-only",
      "name": "remote-only",
      "version": "1.0.0",
      "category": "search",
      "description": "远程未安装插件",
      "manifest": {"id":"search.remote-only","name":"remote-only","version":"1.0.0","category":"search","capabilities":["resource.search"],"resource":{"source_label":"remote-only","source_group":"search","target_types":["share"]}},
      "install": {"type":"custom_url","url":"https://example.com/remote"}
    }
  ]
}`)

	store := &pluginCatalogTestStore{plugins: []config.CustomPlugin{{
		Name:         "custom-local",
		URL:          "https://example.com/local",
		Priority:     2,
		Description:  "本地插件",
		Enabled:      true,
		Version:      "1.0.0",
		Category:     "search",
		Capabilities: []string{"resource.search"},
	}}}
	service := &PluginCatalogService{
		pluginManager:       plugin.NewPluginManager(),
		customPlugins:       store,
		defaultCatalogPath:  defaultCatalogPath,
		pluginRegistryURL:   "",
		remoteCatalogClient: defaultPluginCatalogHTTPClient(),
	}

	catalog, err := service.ListCatalog("all", false)
	if err != nil {
		t.Fatalf("list catalog: %v", err)
	}

	if catalog.Version != "2026.05" {
		t.Fatalf("expected remote catalog version, got %q", catalog.Version)
	}
	if len(catalog.Items) != 2 {
		t.Fatalf("expected merged item count 2, got %d: %#v", len(catalog.Items), catalog.Items)
	}

	local := findCatalogItem(catalog.Items, "search.custom-local")
	if local == nil {
		t.Fatal("expected local item to exist")
	}
	if !local.Installed || !local.IsEnabled || !local.IsLocal || !local.IsRemote {
		t.Fatalf("expected local item to be installed and merged with remote, got %#v", local)
	}
	if len(local.AvailableActions) == 0 || local.AvailableActions[0] != "configure" {
		t.Fatalf("expected installed item actions, got %#v", local.AvailableActions)
	}

	remote := findCatalogItem(catalog.Items, "search.remote-only")
	if remote == nil {
		t.Fatal("expected remote item to exist")
	}
	if remote.Installed || !remote.IsRemote || remote.Install.Type != "custom_url" {
		t.Fatalf("expected remote-only installable item, got %#v", remote)
	}
	if len(remote.AvailableActions) == 0 || remote.AvailableActions[0] != "install" {
		t.Fatalf("expected remote install action, got %#v", remote.AvailableActions)
	}
}

func TestPluginCatalogServiceFallsBackToDefaultCatalogWhenRemoteFails(t *testing.T) {
	defaultCatalogPath := writePluginCatalogFixture(t, `{
  "version": "fallback",
  "items": [
    {
      "id": "search.fallback",
      "name": "fallback",
      "version": "1.0.0",
      "category": "search",
      "description": "默认市场",
      "manifest": {"id":"search.fallback","name":"fallback","version":"1.0.0","category":"search","capabilities":["resource.search"],"resource":{"source_label":"fallback","source_group":"search","target_types":["share"]}},
      "install": {"type":"custom_url","url":"https://example.com/fallback"}
    }
  ]
}`)
	service := &PluginCatalogService{
		pluginManager:       plugin.NewPluginManager(),
		customPlugins:       &pluginCatalogTestStore{},
		defaultCatalogPath:  defaultCatalogPath,
		pluginRegistryURL:   "http://127.0.0.1:1/not-available",
		remoteCatalogClient: defaultPluginCatalogHTTPClient(),
	}

	catalog, err := service.ListCatalog("remote", false)
	if err != nil {
		t.Fatalf("list remote catalog: %v", err)
	}

	if catalog.Source != "default" {
		t.Fatalf("expected default source after remote failure, got %q", catalog.Source)
	}
	if len(catalog.Items) != 1 || catalog.Items[0].ID != "search.fallback" {
		t.Fatalf("expected fallback item, got %#v", catalog.Items)
	}
}

func TestPluginCatalogServiceInstallsCustomURLItemOnce(t *testing.T) {
	defaultCatalogPath := writePluginCatalogFixture(t, `{
  "version": "install",
  "items": [
    {
      "id": "search.install-me",
      "name": "install-me",
      "version": "2.0.0",
      "category": "search",
      "description": "可导入插件",
      "manifest": {"id":"search.install-me","name":"install-me","version":"2.0.0","category":"search","capabilities":["resource.search","resource.search.handoff"],"resource":{"source_label":"install-me","source_group":"search","target_types":["share"],"priority":4}},
      "install": {"type":"custom_url","url":"https://example.com/install-me"}
    }
  ]
}`)
	store := &pluginCatalogTestStore{}
	service := &PluginCatalogService{
		pluginManager:       plugin.NewPluginManager(),
		customPlugins:       store,
		defaultCatalogPath:  defaultCatalogPath,
		remoteCatalogClient: defaultPluginCatalogHTTPClient(),
	}

	item, err := service.InstallCatalogItem(model.PluginCatalogInstallRequest{ID: "search.install-me"})
	if err != nil {
		t.Fatalf("install catalog item: %v", err)
	}
	if !item.Installed || !item.IsEnabled {
		t.Fatalf("expected installed enabled item, got %#v", item)
	}
	if len(store.plugins) != 1 {
		t.Fatalf("expected one custom plugin, got %#v", store.plugins)
	}
	installed := store.plugins[0]
	if installed.Name != "install-me" || installed.URL != "https://example.com/install-me" || !installed.Enabled {
		t.Fatalf("unexpected installed plugin: %#v", installed)
	}
	if installed.Version != "2.0.0" || installed.Category != "search" || len(installed.Capabilities) != 2 {
		t.Fatalf("expected manifest metadata to be copied, got %#v", installed)
	}

	if _, err := service.InstallCatalogItem(model.PluginCatalogInstallRequest{ID: "search.install-me"}); err != nil {
		t.Fatalf("second install should be idempotent: %v", err)
	}
	if len(store.plugins) != 1 || len(store.added) != 1 {
		t.Fatalf("expected deduplicated install, got plugins=%#v added=%#v", store.plugins, store.added)
	}
}

func findCatalogItem(items []model.PluginCatalogItem, id string) *model.PluginCatalogItem {
	for i := range items {
		if items[i].ID == id {
			return &items[i]
		}
	}
	return nil
}
