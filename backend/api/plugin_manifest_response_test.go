package api

import (
	"testing"

	"unisearch/config"
)

func TestBuildCustomPluginManifestAddsLocalCatalogDefaults(t *testing.T) {
	customPlugin := config.CustomPlugin{
		Name:        "custom-pan",
		URL:         "https://example.com/search?q=keyword",
		Priority:    3,
		Description: "自定义搜索插件",
		Enabled:     true,
	}

	manifest := buildCustomPluginManifest(customPlugin)

	if manifest.ID != "search.custom-pan" {
		t.Fatalf("expected generated id, got %q", manifest.ID)
	}
	if manifest.Version != "0.0.0" {
		t.Fatalf("expected fallback version, got %q", manifest.Version)
	}
	if manifest.Category != "search" {
		t.Fatalf("expected search category, got %q", manifest.Category)
	}
	if manifest.Resource.SourceLabel != "custom-pan" {
		t.Fatalf("expected custom source label, got %q", manifest.Resource.SourceLabel)
	}
	if len(manifest.ConfigSchema) != 1 || manifest.ConfigSchema[0].Key != "url" {
		t.Fatalf("expected url config schema, got %#v", manifest.ConfigSchema)
	}
	if manifest.ManifestStatus != "generated" {
		t.Fatalf("expected generated manifest status, got %q", manifest.ManifestStatus)
	}
}

func TestBuildPluginInfoResponseIncludesManifestContract(t *testing.T) {
	customPlugin := config.CustomPlugin{
		Name:         "custom-video",
		URL:          "https://example.com/search",
		Priority:     2,
		Description:  "视频资源插件",
		Enabled:      true,
		Version:      "1.1.0",
		Category:     "search",
		Capabilities: []string{"resource.search", "resource.search.handoff"},
	}
	manifest := buildCustomPluginManifest(customPlugin)
	response := buildPluginInfoResponse(
		customPlugin.Name,
		customPlugin.Priority,
		"custom",
		"custom",
		true,
		customPlugin.Description,
		customPlugin.URL,
		manifest,
	)

	if response.ID != "search.custom-video" {
		t.Fatalf("expected manifest id in response, got %q", response.ID)
	}
	if response.Version != "1.1.0" {
		t.Fatalf("expected manifest version in response, got %q", response.Version)
	}
	if len(response.Capabilities) != 2 {
		t.Fatalf("expected capabilities in response, got %#v", response.Capabilities)
	}
	if response.Resource.SourceGroup != "search" {
		t.Fatalf("expected resource descriptor in response, got %#v", response.Resource)
	}
}
