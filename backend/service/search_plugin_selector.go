package service

import (
	"log"
	"strings"
	"sync"
	"time"

	"unisearch/config"
	"unisearch/plugin"
)

type searchPluginSelector struct {
	pluginManager      *plugin.PluginManager
	pluginStateService *PluginStateService
	statusLoader       func([]string) (map[string]bool, error)
	cacheMu            sync.RWMutex
	cachedPlugins      []plugin.AsyncSearchPlugin
	cacheExpiresAt     time.Time
	cacheReady         bool
}

func newPluginSelector(pluginManager *plugin.PluginManager, pluginStateService *PluginStateService) *searchPluginSelector {
	return &searchPluginSelector{
		pluginManager:      pluginManager,
		pluginStateService: pluginStateService,
		statusLoader: func(pluginNames []string) (map[string]bool, error) {
			if pluginStateService == nil {
				return map[string]bool{}, nil
			}
			return pluginStateService.GetStatusMap(pluginNames)
		},
	}
}

func (s *searchPluginSelector) EnabledBuiltinPlugins() []plugin.AsyncSearchPlugin {
	if s.pluginManager == nil {
		return nil
	}

	allPlugins := s.pluginManager.GetPlugins()
	if len(allPlugins) == 0 || s.pluginStateService == nil {
		return append([]plugin.AsyncSearchPlugin(nil), allPlugins...)
	}

	if cachedPlugins := s.getCachedPlugins(); cachedPlugins != nil {
		return cachedPlugins
	}

	pluginNames := make([]string, 0, len(allPlugins))
	for _, p := range allPlugins {
		pluginNames = append(pluginNames, p.Name())
	}

	statusMap, err := s.statusLoader(pluginNames)
	if err != nil {
		log.Printf("⚠️ [插件搜索] 获取插件启用状态失败，默认全量启用: %v", err)
		return append([]plugin.AsyncSearchPlugin(nil), allPlugins...)
	}

	enabledPlugins := make([]plugin.AsyncSearchPlugin, 0, len(allPlugins))
	for _, p := range allPlugins {
		enabled, exists := statusMap[p.Name()]
		if exists && !enabled {
			continue
		}

		enabledPlugins = append(enabledPlugins, p)
	}

	s.setCachedPlugins(enabledPlugins)
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

func (s *searchPluginSelector) InvalidateCache() {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	s.cachedPlugins = nil
	s.cacheExpiresAt = time.Time{}
	s.cacheReady = false
}

func (s *searchPluginSelector) getCachedPlugins() []plugin.AsyncSearchPlugin {
	cacheTTL := 30 * time.Second
	if config.AppConfig != nil && config.AppConfig.PluginStateCacheTTL > 0 {
		cacheTTL = config.AppConfig.PluginStateCacheTTL
	}

	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()

	if !s.cacheReady || cacheTTL <= 0 || time.Now().After(s.cacheExpiresAt) {
		return nil
	}

	return append([]plugin.AsyncSearchPlugin(nil), s.cachedPlugins...)
}

func (s *searchPluginSelector) setCachedPlugins(plugins []plugin.AsyncSearchPlugin) {
	cacheTTL := 30 * time.Second
	if config.AppConfig != nil && config.AppConfig.PluginStateCacheTTL > 0 {
		cacheTTL = config.AppConfig.PluginStateCacheTTL
	}

	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	s.cachedPlugins = append([]plugin.AsyncSearchPlugin(nil), plugins...)
	s.cacheExpiresAt = time.Now().Add(cacheTTL)
	s.cacheReady = true
}
