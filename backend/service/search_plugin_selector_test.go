package service

import (
	"fmt"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/plugin"
)

func TestPluginSelectorNormalizeRequestedPluginsCollapsesFullSelection(t *testing.T) {
	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "weibo"})
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "kkmao"})

	selector := newPluginSelector(pm, nil)
	plugins := selector.NormalizeRequestedPlugins("plugin", []string{"kkmao", "weibo"})
	if plugins != nil {
		t.Fatalf("expected all selected plugins to collapse to nil, got %v", plugins)
	}
}

func TestPluginSelectorResolvePluginsFiltersRequestedNames(t *testing.T) {
	pm := plugin.NewPluginManager()
	for _, name := range []string{"weibo", "kkmao", "pansearch"} {
		pm.RegisterPlugin(&mockAsyncSearchPlugin{name: name})
	}

	selector := newPluginSelector(pm, nil)
	plugins := selector.ResolvePlugins([]string{"kkmao", "pansearch"})
	if len(plugins) != 2 {
		t.Fatalf("expected 2 plugins, got %d", len(plugins))
	}

	for _, candidate := range plugins {
		if candidate.Name() == "weibo" {
			t.Fatalf("unexpected plugin returned: %s", candidate.Name())
		}
	}
}

func TestPluginSelectorResolvePluginsReturnsAllWhenNothingRequested(t *testing.T) {
	pm := plugin.NewPluginManager()
	for i := 0; i < 3; i++ {
		pm.RegisterPlugin(&mockAsyncSearchPlugin{name: fmt.Sprintf("plugin-%d", i)})
	}

	selector := newPluginSelector(pm, nil)
	plugins := selector.ResolvePlugins(nil)
	if len(plugins) != 3 {
		t.Fatalf("expected all plugins, got %d", len(plugins))
	}
}

func TestPluginSelectorCachesEnabledBuiltinPlugins(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		PluginStateCacheTTL: 30 * time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "weibo"})
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "kkmao"})

	loadCalls := 0
	selector := newPluginSelector(pm, nil)
	selector.pluginStateService = &PluginStateService{}
	selector.statusLoader = func(pluginNames []string) (map[string]bool, error) {
		loadCalls++
		return map[string]bool{"weibo": true, "kkmao": false}, nil
	}

	plugins := selector.EnabledBuiltinPlugins()
	if len(plugins) != 1 || plugins[0].Name() != "weibo" {
		t.Fatalf("unexpected enabled plugins: %+v", plugins)
	}

	plugins = selector.EnabledBuiltinPlugins()
	if len(plugins) != 1 || plugins[0].Name() != "weibo" {
		t.Fatalf("unexpected cached plugins: %+v", plugins)
	}
	if loadCalls != 1 {
		t.Fatalf("expected status loader to be called once, got %d", loadCalls)
	}
}

func TestPluginSelectorCacheExpiresAndInvalidates(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		PluginStateCacheTTL: 20 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "weibo"})

	loadCalls := 0
	selector := newPluginSelector(pm, nil)
	selector.pluginStateService = &PluginStateService{}
	selector.statusLoader = func(pluginNames []string) (map[string]bool, error) {
		loadCalls++
		return map[string]bool{"weibo": true}, nil
	}

	selector.EnabledBuiltinPlugins()
	time.Sleep(30 * time.Millisecond)
	selector.EnabledBuiltinPlugins()
	if loadCalls != 2 {
		t.Fatalf("expected cache expiration to trigger reload, got %d loads", loadCalls)
	}

	selector.InvalidateCache()
	selector.EnabledBuiltinPlugins()
	if loadCalls != 3 {
		t.Fatalf("expected manual invalidation to trigger reload, got %d loads", loadCalls)
	}
}
