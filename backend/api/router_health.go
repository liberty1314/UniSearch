package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/config"
)

func registerHealthRoutes(api *gin.RouterGroup, deps RouterDeps) {
	healthCheckHandler := func(c *gin.Context) {
		pluginCount := 0
		pluginNames := []string{}
		pluginsEnabled := config.AppConfig.AsyncPluginEnabled

		if pluginsEnabled && deps.SearchService != nil && deps.SearchService.GetPluginManager() != nil {
			plugins := deps.SearchService.GetPluginManager().GetPlugins()
			allNames := make([]string, 0, len(plugins))
			for _, p := range plugins {
				allNames = append(allNames, p.Name())
			}

			enabledMap := make(map[string]bool)
			if deps.PluginStateService != nil {
				if statusMap, err := deps.PluginStateService.GetStatusMap(allNames); err == nil {
					enabledMap = statusMap
				}
			}

			for _, p := range plugins {
				enabled, exists := enabledMap[p.Name()]
				if exists && !enabled {
					continue
				}
				pluginNames = append(pluginNames, p.Name())
			}
			pluginCount = len(pluginNames)
		}

		var channels []string
		var channelsCount int
		if deps.TGChannelService != nil {
			dbChannels, err := deps.TGChannelService.GetEnabledChannels()
			if err == nil && len(dbChannels) > 0 {
				channels = dbChannels
				channelsCount = len(dbChannels)
			} else {
				channels = config.AppConfig.DefaultChannels
				channelsCount = len(channels)
			}
		} else {
			channels = config.AppConfig.DefaultChannels
			channelsCount = len(channels)
		}

		response := gin.H{
			"status":          "ok",
			"auth_enabled":    config.AppConfig.AuthEnabled,
			"plugins_enabled": pluginsEnabled,
			"channels":        channels,
			"channels_count":  channelsCount,
		}
		if pluginsEnabled {
			response["plugin_count"] = pluginCount
			response["plugins"] = pluginNames
		}

		c.JSON(200, response)
	}

	api.GET("/health", healthCheckHandler)
	api.HEAD("/health", healthCheckHandler)
}
