package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/api/controller"
	"unisearch/config"
	"unisearch/plugin"
	"unisearch/util"
)

// SetupRouter 设置路由
// 验证需求：4.1, 5.1, 6.1, 7.1, 8.1, 10.1, 10.3
func SetupRouter(deps RouterDeps) *gin.Engine {
	searchService := deps.SearchService
	authService := deps.AuthService
	refreshTokenService := deps.RefreshTokenService
	userService := deps.UserService
	systemSettingsService := deps.SystemSettingsService
	announcementService := deps.AnnouncementService
	tgChannelService := deps.TGChannelService
	pluginHealthService := deps.PluginHealthService
	pluginStateService := deps.PluginStateService
	tgChannelHealthService := deps.TGChannelHealthService
	adminTagService := deps.AdminTagService
	hotRankingService := deps.HotRankingService

	// 设置搜索服务
	SetSearchService(searchService)
	SetAuthService(authService)
	// 设置系统设置服务
	SetSystemSettingsService(systemSettingsService)
	// 设置 TG 频道服务
	SetTGChannelService(tgChannelService)
	SetTGChannelHealthService(tgChannelHealthService)
	SetAdminTagService(adminTagService)

	// 创建控制器实例
	authController := controller.NewAuthController(authService)

	// 设置为生产模式
	gin.SetMode(gin.ReleaseMode)

	// 创建默认路由
	r := gin.Default()

	// 添加中间件
	r.Use(CORSMiddleware())
	r.Use(LoggerMiddleware())
	r.Use(ValidationMiddleware()) // 添加请求验证中间件
	r.Use(util.GzipMiddleware())  // 添加压缩中间件

	// 设置 405 Method Not Allowed 处理器
	r.HandleMethodNotAllowed = true
	r.NoMethod(MethodNotAllowedHandler())

	// 定义API路由组
	api := r.Group("/api")
	{
		// ========== 公开接口（无需认证）==========
		// 验证需求：4.1, 5.1
		auth := api.Group("/auth")
		{
			// 用户注册接口
			auth.POST("/register", authController.Register)

			// 用户登录接口（统一接口，支持数据库用户与记住我）
			auth.POST("/login", func(c *gin.Context) {
				c.Set("refreshTokenService", refreshTokenService)
				authController.Login(c)
			})

			// Token 验证接口
			auth.GET("/validate", authController.ValidateToken)

			// 新增：刷新访问令牌
			auth.POST("/refresh", RefreshAccessTokenHandler(refreshTokenService))
			// 新增：撤销刷新令牌（登出）
			auth.POST("/revoke", RevokeRefreshTokenHandler(refreshTokenService))
			auth.POST("/verify", VerifyHandler)
			auth.POST("/logout", LogoutHandler)
		}

		// ========== 系统设置接口（公开接口）==========
		// 获取系统设置（用于登录页面判断是否显示用户登录选项）
		api.GET("/system-settings", GetSystemSettingsHandler)
		api.GET("/hot", GetHotRankingHandler(hotRankingService))

		// 获取公告功能启用状态（公开接口，用于前端判断是否显示公告）
		// 需求: 13.1
		api.GET("/system-settings/announcement-enabled", GetAnnouncementFeatureEnabledHandler(systemSettingsService))

		// 设置公告功能启用状态（需要管理员权限）
		// 需求: 13.4
		api.POST("/system-settings/announcement-enabled", JWTMiddleware(), AdminMiddleware(), SetAnnouncementFeatureEnabledHandler(systemSettingsService))

		// ========== 搜索接口（仅支持 JWT 登录）==========
		api.POST("/search", SearchJWTMiddleware(), SearchHandler)
		api.GET("/search", SearchJWTMiddleware(), SearchHandler)

		// ========== 用户接口（需要 JWT 认证）==========
		// 验证需求：6.1, 8.1
		user := api.Group("/user")
		user.Use(JWTMiddleware()) // 应用 JWT 中间件
		{
			// 获取当前用户信息
			user.GET("/me", authController.GetCurrentUser)
			user.POST("/change-password", ChangePasswordHandler(userService))
		}

		// ========== 公告接口（需要 JWT 认证）==========
		// 验证需求：10.5
		announcements := api.Group("/announcements")
		announcements.Use(JWTMiddleware()) // 应用 JWT 中间件
		{
			// 获取当前有效公告（用户端）
			// 需求: 10.5, 13.2
			announcements.GET("/active", GetActiveAnnouncementsHandler(announcementService, systemSettingsService))
		}

		// 管理员登录接口（不需要认证）
		api.POST("/admin/login", AdminLoginHandler)
		// 新增：支持"记住我"的管理员登录接口
		api.POST("/admin/login-remember", AdminLoginWithRememberHandler(refreshTokenService))

		// ========== 管理员接口（需要 JWT 认证 + 管理员权限）==========
		// 验证需求：7.1
		admin := api.Group("/admin")
		admin.Use(JWTMiddleware())   // 应用 JWT 中间件
		admin.Use(AdminMiddleware()) // 应用管理员中间件
		{
			// 用户管理路由
			users := admin.Group("/users")
			{
				users.GET("", ListUsersHandler(userService))                          // 获取用户列表
				users.GET("/:id", GetUserHandler(userService))                        // 获取单个用户
				users.POST("", CreateUserHandler(userService))                        // 创建用户
				users.PUT("/:id", UpdateUserHandler(userService))                     // 更新用户
				users.POST("/:id/reset-password", ResetPasswordHandler(userService))  // 重置密码
				users.DELETE("/:id", DeleteUserHandler(userService))                  // 删除用户
				users.POST("/:id/status", SetUserStatusHandler(userService))          // 设置用户状态
				users.POST("/batch-delete", BatchDeleteUsersHandler(userService))     // 批量删除
				users.POST("/batch-update-role", BatchUpdateRoleHandler(userService)) // 批量修改角色
			}

			admin.GET("/system-info", GetSystemInfoHandler(searchService, userService, pluginHealthService, pluginStateService))     // 更新：获取系统信息（包含插件状态 + 用户活跃度）
			admin.GET("/plugin-center/catalog", PluginCenterCatalogHandler(searchService, pluginHealthService, pluginStateService))  // 插件中心目录
			admin.POST("/plugin-center/install", PluginCenterInstallHandler(searchService, pluginHealthService, pluginStateService)) // 插件中心导入远程 URL 插件
			admin.GET("/tags", ListAdminTagsHandler)                                                                                 // 标签词库列表
			admin.POST("/tags", CreateAdminTagHandler)                                                                               // 新增标签词库条目
			admin.PUT("/tags/:id", UpdateAdminTagHandler)                                                                            // 更新标签词库条目
			admin.DELETE("/tags/:id", DeleteAdminTagHandler)                                                                         // 删除标签词库条目
			admin.POST("/plugins/:pluginName/test", TestPluginHandler(searchService, pluginHealthService))                           // 新增：测试插件
			admin.POST("/plugins", CreatePluginHandler(pluginHealthService, pluginStateService))                                     // 新增：创建插件
			admin.PUT("/plugins/:pluginName", UpdatePluginHandler(pluginHealthService, pluginStateService))                          // 新增：更新插件
			admin.DELETE("/plugins/:pluginName", DeletePluginHandler(pluginHealthService, pluginStateService))                       // 新增：删除插件
			admin.POST("/plugins/:pluginName/status", SetPluginStatusHandler(searchService, pluginStateService))                     // 新增：插件启停
			admin.POST("/plugins/batch-status", BatchSetPluginStatusHandler(searchService, pluginStateService))                      // 新增：批量插件启停
			admin.POST("/plugins/batch-delete", BatchDeletePluginsHandler(searchService, pluginHealthService, pluginStateService))   // 新增：批量删除插件
			admin.POST("/test-url", TestURLHandler())                                                                                // 新增：测试URL连通性

			// 系统设置管理
			admin.GET("/system-settings", GetSystemSettingsHandler)         // 获取系统设置
			admin.PUT("/system-settings", UpdateSystemSettingsHandler)      // 更新系统设置
			admin.GET("/system-settings/tmdb", GetTMDBAdminSettingsHandler) // 获取 TMDB 管理配置
			admin.PUT("/system-settings/tmdb", UpdateTMDBAdminSettingsHandler)

			// TG 频道管理
			channels := admin.Group("/channels")
			{
				channels.GET("", ListTGChannelsHandler)              // 获取频道列表
				channels.POST("", AddTGChannelHandler)               // 添加频道
				channels.PUT("/batch", BatchUpdateTGChannelsHandler) // 批量更新频道
				channels.POST("/batch-status", BatchSetTGChannelsStatusHandler)
				channels.POST("/batch-delete", BatchDeleteTGChannelsHandler)
				channels.PUT("/:id", UpdateTGChannelHandler)       // 更新频道
				channels.DELETE("/:id", DeleteTGChannelHandler)    // 删除频道
				channels.POST("/:name/test", TestTGChannelHandler) // 测试频道
			}
		}

		// ========== 公告管理接口（需要 JWT 认证 + 管理员权限）==========
		// 验证需求：10.1, 10.2, 10.3, 10.4, 10.7
		adminAnnouncements := api.Group("/announcements")
		adminAnnouncements.Use(JWTMiddleware())   // 应用 JWT 中间件
		adminAnnouncements.Use(AdminMiddleware()) // 应用管理员中间件
		{
			// 创建公告
			// 需求: 10.1
			adminAnnouncements.POST("", CreateAnnouncementHandler(announcementService))

			// 更新公告
			// 需求: 10.2
			adminAnnouncements.PUT("/:id", UpdateAnnouncementHandler(announcementService))

			// 删除公告
			// 需求: 10.3
			adminAnnouncements.DELETE("/:id", DeleteAnnouncementHandler(announcementService))

			// 获取公告列表
			// 需求: 10.4
			adminAnnouncements.GET("", ListAnnouncementsHandler(announcementService))

			// 获取单个公告
			// 需求: 10.4
			adminAnnouncements.GET("/:id", GetAnnouncementHandler(announcementService))

			// 设置公告状态
			// 需求: 10.7
			adminAnnouncements.POST("/:id/status", SetAnnouncementStatusHandler(announcementService))
		}

		// 健康检查接口（支持 GET 和 HEAD 方法）
		healthCheckHandler := func(c *gin.Context) {
			// 根据配置决定是否返回插件信息
			pluginCount := 0
			pluginNames := []string{}
			pluginsEnabled := config.AppConfig.AsyncPluginEnabled

			if pluginsEnabled && searchService != nil && searchService.GetPluginManager() != nil {
				plugins := searchService.GetPluginManager().GetPlugins()
				allNames := make([]string, 0, len(plugins))
				for _, p := range plugins {
					allNames = append(allNames, p.Name())
				}

				enabledMap := make(map[string]bool)
				if pluginStateService != nil {
					if statusMap, err := pluginStateService.GetStatusMap(allNames); err == nil {
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

			// 获取频道信息（优先从 TGChannelService 获取）
			var channels []string
			var channelsCount int
			if tgChannelService != nil {
				dbChannels, err := tgChannelService.GetEnabledChannels()
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

			// 只有当插件启用时才返回插件相关信息
			if pluginsEnabled {
				response["plugin_count"] = pluginCount
				response["plugins"] = pluginNames
			}

			c.JSON(200, response)
		}
		api.GET("/health", healthCheckHandler)
		api.HEAD("/health", healthCheckHandler)
	}

	// 注册插件的Web路由（如果插件实现了PluginWithWebHandler接口）
	// 只有当插件功能启用且插件在启用列表中时才注册路由
	if config.AppConfig.AsyncPluginEnabled && searchService != nil && searchService.GetPluginManager() != nil {
		enabledPlugins := searchService.GetPluginManager().GetPlugins()
		for _, p := range enabledPlugins {
			if webPlugin, ok := p.(plugin.PluginWithWebHandler); ok {
				webPlugin.RegisterWebRoutes(r.Group(""))
			}
		}
	}

	return r
}
