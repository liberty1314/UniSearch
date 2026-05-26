package api

import "github.com/gin-gonic/gin"

func registerAdminRoutes(api *gin.RouterGroup, deps RouterDeps) {
	admin := api.Group("/admin")
	admin.Use(JWTMiddleware())
	admin.Use(AdminMiddleware())
	{
		users := admin.Group("/users")
		{
			users.GET("", ListUsersHandler(deps.UserService))
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
		admin.GET("/plugin-center/catalog", PluginCenterCatalogHandler(deps.SearchService, deps.PluginHealthService, deps.PluginStateService))
		admin.POST("/plugin-center/install", PluginCenterInstallHandler(deps.SearchService, deps.PluginHealthService, deps.PluginStateService))
		admin.GET("/tags", ListAdminTagsHandler)
		admin.POST("/tags", CreateAdminTagHandler)
		admin.PUT("/tags/:id", UpdateAdminTagHandler)
		admin.DELETE("/tags/:id", DeleteAdminTagHandler)
		admin.POST("/plugins/:pluginName/test", TestPluginHandler(deps.SearchService, deps.PluginHealthService))
		admin.POST("/plugins", CreatePluginHandler(deps.PluginHealthService, deps.PluginStateService))
		admin.PUT("/plugins/:pluginName", UpdatePluginHandler(deps.PluginHealthService, deps.PluginStateService))
		admin.DELETE("/plugins/:pluginName", DeletePluginHandler(deps.PluginHealthService, deps.PluginStateService))
		admin.POST("/plugins/:pluginName/status", SetPluginStatusHandler(deps.SearchService, deps.PluginStateService))
		admin.POST("/plugins/batch-status", BatchSetPluginStatusHandler(deps.SearchService, deps.PluginStateService))
		admin.POST("/plugins/batch-delete", BatchDeletePluginsHandler(deps.SearchService, deps.PluginHealthService, deps.PluginStateService))
		admin.POST("/test-url", TestURLHandler())

		admin.GET("/system-settings", GetSystemSettingsHandler)
		admin.PUT("/system-settings", UpdateSystemSettingsHandler)
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
