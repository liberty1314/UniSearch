package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/plugin"
)

func registerAdminRoutes(api *gin.RouterGroup, deps RouterDeps) {
	admin := api.Group("/admin")
	admin.Use(JWTMiddleware())
	admin.Use(AdminMiddleware())
	{
		users := admin.Group("/users")
		{
			users.GET("", ListUsersHandler(deps.UserService))
			users.GET("/stats", GetUserStatsHandler(deps.UserService))
			users.GET("/:id", GetUserHandler(deps.UserService))
			users.POST("", CreateUserHandler(deps.UserService))
			users.PUT("/:id", UpdateUserHandler(deps.UserService))
			users.POST("/:id/reset-password", ResetPasswordHandler(deps.UserService))
			users.DELETE("/:id", DeleteUserHandler(deps.UserService))
			users.POST("/:id/status", SetUserStatusHandler(deps.UserService))
			users.POST("/batch-delete", BatchDeleteUsersHandler(deps.UserService))
			users.POST("/batch-update-role", BatchUpdateRoleHandler(deps.UserService))
		}

		admin.GET("/system-info", GetSystemInfoHandler(deps.SearchService, deps.UserService, deps.PluginHealthService, deps.PluginStateService))
		admin.GET("/search-observability", SearchObservabilityHandler(deps.SearchService))
		admin.GET("/resource-resolve/metrics", ResourceResolveMetricsHandler)
		admin.GET("/plugin-metrics", PluginMetricsListHandler(deps.PluginMetricsCollector))
		admin.GET("/plugin-metrics/errors", PluginMetricsErrorLogsHandler(deps.PluginMetricsCollector))
		admin.GET("/plugin-metrics/realtime", PluginMetricsRealtimeHandler(deps.PluginMetricsCollector))
		admin.GET("/channel-metrics", ChannelMetricsListHandler(deps.TGChannelMetricsCollector))
		admin.GET("/channel-metrics/errors", ChannelMetricsErrorLogsHandler(deps.TGChannelMetricsCollector))
		admin.GET("/channel-metrics/realtime", ChannelMetricsRealtimeHandler(deps.TGChannelMetricsCollector))
		admin.GET("/plugin-center/catalog", PluginCenterCatalogHandler(deps.SearchService, deps.PluginHealthService, deps.PluginStateService))
		admin.GET("/tags", ListAdminTagsHandler)
		admin.POST("/tags", CreateAdminTagHandler)
		admin.PUT("/tags/:id", UpdateAdminTagHandler)
		admin.DELETE("/tags/:id", DeleteAdminTagHandler)
		admin.GET("/banned-ips", ListBannedIPsHandler)
		admin.POST("/banned-ips", CreateBannedIPHandler)
		admin.DELETE("/banned-ips/:id", DeleteBannedIPHandler)
		admin.GET("/plugins/:pluginName/config", GetPluginRuntimeConfigHandler(deps.SearchService, deps.PluginRuntimeConfig))
		admin.PUT("/plugins/:pluginName/config", SavePluginRuntimeConfigHandler(deps.SearchService, deps.PluginRuntimeConfig))
		admin.POST("/plugins/:pluginName/test", TestPluginHandler(deps.SearchService, deps.PluginHealthService))
		admin.POST("/plugins/:pluginName/status", SetPluginStatusHandler(deps.SearchService, deps.PluginStateService))
		admin.POST("/plugins/batch-status", BatchSetPluginStatusHandler(deps.SearchService, deps.PluginStateService))
		registerProtectedPluginWebRoutes(admin, deps)

		admin.GET("/system-settings", GetSystemSettingsHandler)
		admin.PUT("/system-settings", UpdateSystemSettingsHandler)
		admin.GET("/system-settings/cache", GetCacheSettingsHandler)
		admin.PUT("/system-settings/cache", UpdateCacheSettingsHandler)
		admin.POST("/system-settings/cache/hot-ranking/preload", TriggerHotRankingPreloadHandler)
		admin.DELETE("/system-settings/cache/hot-ranking", ClearHotRankingCacheHandler)
		admin.GET("/system-settings/runtime", GetRuntimeSettingsHandler)
		admin.PUT("/system-settings/runtime", UpdateRuntimeSettingsHandler)
		admin.GET("/system-settings/tmdb", GetTMDBAdminSettingsHandler)
		admin.PUT("/system-settings/tmdb", UpdateTMDBAdminSettingsHandler)

		channels := admin.Group("/channels")
		{
			channels.GET("", ListTGChannelsHandler)
			channels.POST("", AddTGChannelHandler)
			channels.PUT("/batch", BatchUpdateTGChannelsHandler)
			channels.POST("/batch-status", BatchSetTGChannelsStatusHandler)
			channels.POST("/batch-delete", BatchDeleteTGChannelsHandler)
			channels.PUT("/:id", UpdateTGChannelHandler)
			channels.DELETE("/:id", DeleteTGChannelHandler)
			channels.POST("/:name/test", TestTGChannelHandler)
		}
	}
}

func registerProtectedPluginWebRoutes(admin *gin.RouterGroup, deps RouterDeps) {
	if config.AppConfig == nil || !config.AppConfig.AsyncPluginEnabled || deps.SearchService == nil || deps.SearchService.GetPluginManager() == nil {
		return
	}

	for _, p := range deps.SearchService.GetPluginManager().GetPlugins() {
		webPlugin, ok := p.(plugin.PluginWithWebHandler)
		if !ok {
			continue
		}
		webPlugin.RegisterWebRoutes(admin.Group("/plugins/" + p.Name() + "/web"))
	}
}
