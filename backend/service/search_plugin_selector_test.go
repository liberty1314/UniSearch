package service

import (
	"fmt"
	"testing"

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
