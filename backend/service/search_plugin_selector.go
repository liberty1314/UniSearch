package service

import (
	"log"
	"strings"

	"unisearch/plugin"
)

type PluginSelector interface {
	EnabledBuiltinPlugins() []plugin.AsyncSearchPlugin
	NormalizeRequestedPlugins(sourceType string, plugins []string) []string
	ResolvePlugins(plugins []string) []plugin.AsyncSearchPlugin
}

type searchPluginSelector struct {
	pluginManager      *plugin.PluginManager
	pluginStateService *PluginStateService
}

func newPluginSelector(pluginManager *plugin.PluginManager, pluginStateService *PluginStateService) PluginSelector {
	return &searchPluginSelector{
		pluginManager:      pluginManager,
		pluginStateService: pluginStateService,
	}
}

func (s *searchPluginSelector) EnabledBuiltinPlugins() []plugin.AsyncSearchPlugin {
	if s.pluginManager == nil {
		return nil
	}

	allPlugins := s.pluginManager.GetPlugins()
	if len(allPlugins) == 0 || s.pluginStateService == nil {
		return allPlugins
	}

	pluginNames := make([]string, 0, len(allPlugins))
	for _, p := range allPlugins {
		pluginNames = append(pluginNames, p.Name())
	}

	statusMap, err := s.pluginStateService.GetStatusMap(pluginNames)
	if err != nil {
		log.Printf("⚠️ [插件搜索] 获取插件启用状态失败，默认全量启用: %v", err)
		return allPlugins
	}

	enabledPlugins := make([]plugin.AsyncSearchPlugin, 0, len(allPlugins))
	for _, p := range allPlugins {
		enabled, exists := statusMap[p.Name()]
		if exists && !enabled {
			continue
		}

		enabledPlugins = append(enabledPlugins, p)
	}

	return enabledPlugins
}

func (s *searchPluginSelector) NormalizeRequestedPlugins(sourceType string, plugins []string) []string {
	if sourceType == "tg" {
		return nil
	}

	sanitized := sanitizePluginNames(plugins)
	if len(sanitized) == 0 {
		return nil
	}

	enabledPluginNames := toPluginNameSet(s.EnabledBuiltinPlugins())
	if len(enabledPluginNames) == 0 || len(sanitized) != len(enabledPluginNames) {
		return sanitized
	}

	for _, pluginName := range sanitized {
		if _, exists := enabledPluginNames[strings.ToLower(pluginName)]; !exists {
			return sanitized
		}
	}

	return nil
}

func (s *searchPluginSelector) ResolvePlugins(plugins []string) []plugin.AsyncSearchPlugin {
	enabledPlugins := s.EnabledBuiltinPlugins()
	if len(enabledPlugins) == 0 || len(plugins) == 0 {
		return enabledPlugins
	}

	requestedPlugins := make(map[string]struct{}, len(plugins))
	for _, pluginName := range plugins {
		requestedPlugins[strings.ToLower(pluginName)] = struct{}{}
	}

	selected := make([]plugin.AsyncSearchPlugin, 0, len(enabledPlugins))
	for _, candidate := range enabledPlugins {
		if _, exists := requestedPlugins[strings.ToLower(candidate.Name())]; exists {
			selected = append(selected, candidate)
		}
	}

	return selected
}

func toPluginNameSet(plugins []plugin.AsyncSearchPlugin) map[string]struct{} {
	names := make(map[string]struct{}, len(plugins))
	for _, p := range plugins {
		names[strings.ToLower(p.Name())] = struct{}{}
	}

	return names
}
