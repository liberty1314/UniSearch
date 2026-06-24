package service

import (
	"errors"
	"sort"
	"strings"

	"unisearch/model"
	"unisearch/plugin"
)

// PluginCatalogService 构建源码注册的内置插件目录。
type PluginCatalogService struct {
	pluginManager       *plugin.PluginManager
	pluginHealthService *PluginHealthService
	pluginStateService  *PluginStateService
}

func NewPluginCatalogService(pluginManager *plugin.PluginManager, pluginHealthService *PluginHealthService, pluginStateService *PluginStateService) *PluginCatalogService {
	return &PluginCatalogService{
		pluginManager:       pluginManager,
		pluginHealthService: pluginHealthService,
		pluginStateService:  pluginStateService,
	}
}

// ListCatalog 返回内置插件目录，source 参数保留兼容但不再影响结果。
func (s *PluginCatalogService) ListCatalog(source string, _ bool) (model.PluginCatalogResponse, error) {
	if s == nil {
		return model.PluginCatalogResponse{}, errors.New("插件中心服务未初始化")
	}

	localItems := s.buildLocalCatalogItems()
	return model.PluginCatalogResponse{
		Version: "local",
		Source:  "local",
		Items:   sortCatalogItems(localItems),
	}, nil
}

func (s *PluginCatalogService) buildLocalCatalogItems() []model.PluginCatalogItem {
	plugins := []plugin.AsyncSearchPlugin{}
	if s.pluginManager != nil {
		plugins = s.pluginManager.GetPlugins()
	}

	names := make([]string, 0, len(plugins))
	for _, p := range plugins {
		names = append(names, p.Name())
	}

	enabledMap := make(map[string]bool)
	if s.pluginStateService != nil {
		if statusMap, err := s.pluginStateService.GetStatusMap(names); err == nil {
			enabledMap = statusMap
		}
	}
	healthMap := make(map[string]model.PluginHealthSnapshot)
	if s.pluginHealthService != nil {
		if snapshots, err := s.pluginHealthService.GetSnapshotMap(names); err == nil {
			healthMap = snapshots
		}
	}

	items := make([]model.PluginCatalogItem, 0, len(plugins))
	for _, p := range plugins {
		enabled := true
		if value, exists := enabledMap[p.Name()]; exists {
			enabled = value
		}
		manifest := plugin.ResolvePluginManifest(p)
		description := manifest.Description
		item := buildInstalledCatalogItem(p.Name(), "builtin", p.Priority(), "", description, manifest, enabled, healthMap[p.Name()])
		items = append(items, item)
	}

	return items
}

func buildInstalledCatalogItem(name string, pluginType string, priority int, url string, description string, manifest model.PluginManifest, enabled bool, health model.PluginHealthSnapshot) model.PluginCatalogItem {
	if strings.TrimSpace(description) == "" {
		description = manifest.Description
	}
	status := "inactive"
	if enabled {
		status = "active"
	}
	var healthPtr *model.PluginHealthSnapshot
	if !health.LastCheckedAt.IsZero() || health.LastError != "" || health.CheckSource != "" {
		healthCopy := health
		healthPtr = &healthCopy
		if enabled && !health.IsHealthy {
			status = "error"
		}
	}
	item := model.PluginCatalogItem{
		ID:          manifest.ID,
		Name:        name,
		Version:     manifest.Version,
		Category:    manifest.Category,
		Description: description,
		Manifest:    manifest,
		ConfigSchema: manifest.ConfigSchema,
		SourceType:  "local",
		PluginType:  pluginType,
		URL:         url,
		IsLocal:     true,
		Installed:   true,
		IsEnabled:   enabled,
		Status:      status,
		Health:      healthPtr,
	}
	item.AvailableActions = buildCatalogActions(item)
	if priority > 0 {
		item.Manifest.Resource.Priority = priority
	}
	return item
}

func buildCatalogActions(item model.PluginCatalogItem) []string {
	if !item.Installed {
		return []string{}
	}

	actions := []string{"configure", "test"}
	if item.IsEnabled {
		actions = append(actions, "disable")
	} else {
		actions = append(actions, "enable")
	}
	return actions
}

func sortCatalogItems(items []model.PluginCatalogItem) []model.PluginCatalogItem {
	result := append([]model.PluginCatalogItem(nil), items...)
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].Installed != result[j].Installed {
			return result[i].Installed
		}
		if result[i].Category != result[j].Category {
			return result[i].Category < result[j].Category
		}
		return result[i].Name < result[j].Name
	})
	return result
}

// InstallCatalogItem 已下线；插件中心只支持源码注册的内置插件。
func (s *PluginCatalogService) InstallCatalogItem(req model.PluginCatalogInstallRequest) (model.PluginCatalogItem, error) {
	return model.PluginCatalogItem{}, errors.New("插件导入功能已下线，仅支持代码配置的内置插件")
}
