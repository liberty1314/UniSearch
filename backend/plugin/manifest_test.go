package plugin

import (
	"net/http"
	"testing"

	"unisearch/model"
)

type manifestTestPlugin struct {
	*BaseAsyncPlugin
}

func newManifestTestPlugin() *manifestTestPlugin {
	base := NewBaseAsyncPlugin("manifest-test", 2)
	base.SetManifest(model.PluginManifest{
		ID:          "search.manifest_test",
		Name:        "清单测试插件",
		Version:     "1.2.3",
		Category:    "search",
		Description: "用于验证插件清单元数据",
		Capabilities: []string{
			"resource.search",
			"resource.search.handoff",
		},
		Permissions: []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "清单测试",
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv"},
			TargetTypes:         []string{"share"},
			Priority:            20,
		},
		ConfigSchema: []model.PluginConfigField{
			{
				Key:         "api_url",
				Label:       "接口地址",
				Type:        "string",
				Required:    true,
				Description: "搜索接口地址",
			},
		},
	})
	return &manifestTestPlugin{BaseAsyncPlugin: base}
}

func (p *manifestTestPlugin) SearchWithResult(_ string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{IsFinal: true, Source: p.Name()}, nil
}

func (p *manifestTestPlugin) AsyncSearch(
	_ string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	return nil, nil
}

type fallbackManifestTestPlugin struct {
	*BaseAsyncPlugin
}

func (p *fallbackManifestTestPlugin) SearchWithResult(_ string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{IsFinal: true, Source: p.Name()}, nil
}

func (p *fallbackManifestTestPlugin) AsyncSearch(
	_ string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	return nil, nil
}

func TestResolvePluginManifestReturnsExplicitManifest(t *testing.T) {
	manifest := ResolvePluginManifest(newManifestTestPlugin())

	if manifest.ID != "search.manifest_test" {
		t.Fatalf("expected explicit id, got %q", manifest.ID)
	}
	if manifest.Version != "1.2.3" {
		t.Fatalf("expected explicit version, got %q", manifest.Version)
	}
	if len(manifest.Capabilities) != 2 {
		t.Fatalf("expected capabilities to be preserved, got %#v", manifest.Capabilities)
	}
	if manifest.Resource.SourceLabel != "清单测试" {
		t.Fatalf("expected resource descriptor, got %#v", manifest.Resource)
	}
	if len(manifest.ConfigSchema) != 1 || manifest.ConfigSchema[0].Key != "api_url" {
		t.Fatalf("expected config schema to be preserved, got %#v", manifest.ConfigSchema)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("expected complete manifest status, got %q", manifest.ManifestStatus)
	}
}

func TestResolvePluginManifestBuildsSearchFallback(t *testing.T) {
	fallbackPlugin := &fallbackManifestTestPlugin{
		BaseAsyncPlugin: NewBaseAsyncPluginWithFilter("fallback-plugin", 4, true),
	}
	manifest := ResolvePluginManifest(fallbackPlugin)

	if manifest.ID != "search.fallback-plugin" {
		t.Fatalf("expected fallback id, got %q", manifest.ID)
	}
	if manifest.Version != "0.0.0" {
		t.Fatalf("expected fallback version, got %q", manifest.Version)
	}
	if manifest.Category != "search" {
		t.Fatalf("expected search category, got %q", manifest.Category)
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("expected generated manifest status, got %q", manifest.ManifestStatus)
	}
	if len(manifest.Capabilities) == 0 || manifest.Capabilities[0] != "resource.search" {
		t.Fatalf("expected default search capability, got %#v", manifest.Capabilities)
	}
	if manifest.Resource.SourceGroup != "search" || manifest.Resource.Priority != 4 {
		t.Fatalf("expected fallback resource descriptor, got %#v", manifest.Resource)
	}
	if !manifest.Resource.SkipServiceFilter {
		t.Fatalf("expected skip service filter flag to be copied")
	}
}
