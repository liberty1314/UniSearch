package plugin

import (
	"fmt"
	"strings"

	"unisearch/model"
)

const (
	defaultPluginCoreVersion     = ">=1.0.0 <2.0.0"
	defaultPluginContractVersion = "1.0"
)

// PluginManifestProvider 允许插件暴露本地清单元数据。
type PluginManifestProvider interface {
	Manifest() model.PluginManifest
}

// ResolvePluginManifest 返回插件显式清单；缺失时生成搜索插件默认清单。
func ResolvePluginManifest(plugin AsyncSearchPlugin) model.PluginManifest {
	if plugin == nil {
		return model.PluginManifest{
			Version:         "0.0.0",
			Category:        "search",
			CoreVersion:     defaultPluginCoreVersion,
			ContractVersion: defaultPluginContractVersion,
			Capabilities:    []string{"resource.search"},
			Permissions:     []string{"network"},
			ManifestStatus:  "generated",
		}
	}

	status := "generated"
	manifest := model.PluginManifest{}
	if provider, ok := plugin.(PluginManifestProvider); ok {
		manifest = provider.Manifest()
		status = "complete"
	}

	name := strings.TrimSpace(plugin.Name())
	if strings.TrimSpace(manifest.Name) == "" {
		manifest.Name = name
	}
	if strings.TrimSpace(manifest.ID) == "" {
		manifest.ID = fmt.Sprintf("search.%s", name)
		status = "generated"
	}
	if strings.TrimSpace(manifest.Version) == "" {
		manifest.Version = "0.0.0"
		status = "generated"
	}
	if strings.TrimSpace(manifest.Category) == "" {
		manifest.Category = "search"
		status = "generated"
	}
	if strings.TrimSpace(manifest.CoreVersion) == "" {
		manifest.CoreVersion = defaultPluginCoreVersion
	}
	if strings.TrimSpace(manifest.ContractVersion) == "" {
		manifest.ContractVersion = defaultPluginContractVersion
	}
	if len(manifest.Capabilities) == 0 {
		manifest.Capabilities = []string{"resource.search"}
	}
	if len(manifest.Permissions) == 0 {
		manifest.Permissions = []string{"network"}
	}
	if manifest.ConfigSchema == nil {
		manifest.ConfigSchema = []model.PluginConfigField{}
	}
	if strings.TrimSpace(manifest.Resource.SourceLabel) == "" {
		manifest.Resource.SourceLabel = manifest.Name
	}
	if strings.TrimSpace(manifest.Resource.SourceGroup) == "" {
		manifest.Resource.SourceGroup = manifest.Category
	}
	if manifest.Resource.SupportedMediaTypes == nil {
		manifest.Resource.SupportedMediaTypes = []string{}
	}
	if len(manifest.Resource.TargetTypes) == 0 {
		manifest.Resource.TargetTypes = []string{"share"}
	}
	if manifest.Resource.Priority == 0 {
		manifest.Resource.Priority = plugin.Priority()
	}
	manifest.Resource.SkipServiceFilter = plugin.SkipServiceFilter()
	if manifest.UI.Menus == nil {
		manifest.UI.Menus = []string{}
	}
	if manifest.UI.SettingsSections == nil {
		manifest.UI.SettingsSections = []string{}
	}
	if manifest.UI.TaskTemplates == nil {
		manifest.UI.TaskTemplates = []string{}
	}
	if strings.TrimSpace(manifest.ManifestStatus) == "" {
		manifest.ManifestStatus = status
	}

	return manifest
}
