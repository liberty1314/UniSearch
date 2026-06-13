package service

import "sync"

var (
	globalCacheSettingsServiceMu sync.RWMutex
	globalCacheSettingsService   *SystemSettingsService
)

func SetGlobalCacheSettingsService(settingsService *SystemSettingsService) {
	globalCacheSettingsServiceMu.Lock()
	defer globalCacheSettingsServiceMu.Unlock()
	globalCacheSettingsService = settingsService
}

func GetGlobalCacheSettingsService() *SystemSettingsService {
	globalCacheSettingsServiceMu.RLock()
	defer globalCacheSettingsServiceMu.RUnlock()
	return globalCacheSettingsService
}

func GetRuntimeCacheSettings() CacheSettings {
	settingsService := GetGlobalCacheSettingsService()
	if settingsService == nil {
		return resolveDefaultCacheSettings()
	}

	settings, err := settingsService.GetCacheSettings()
	if err != nil || settings == nil {
		return resolveDefaultCacheSettings()
	}

	return *settings
}
