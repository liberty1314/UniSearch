package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/api/controller"
	"unisearch/api/middleware"
	"unisearch/config"
	"unisearch/plugin"
	"unisearch/service"
	"unisearch/util"
)

// SetupRouter 设置路由
// 验证需求：4.1, 5.1, 6.1, 7.1, 8.1, 10.1, 10.3
func SetupRouter(searchService *service.SearchService, apiKeyService *service.APIKeyService, authService *service.AuthService, refreshTokenService *service.RefreshTokenService, userService *service.UserService, systemSettingsService *service.SystemSettingsService) *gin.Engine {
	// 设置搜索服务
	SetSearchService(searchService)
	// 设置API Key服务
	SetAPIKeyService(apiKeyService)
	// 设置系统设置服务
	SetSystemSettingsService(systemSettingsService)

	// 创建控制器实例
	authController := controller.NewAuthController(authService)
	apiKeyController := controller.NewAPIKeyController(apiKeyService)
	userAPIKeyController := controller.NewUserAPIKeyController(apiKeyService)

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

			// 用户登录接口（统一接口，支持数据库用户、API Key、记住我）
			auth.POST("/login", func(c *gin.Context) {
				// 注入服务到上下文
				c.Set("apiKeyService", apiKeyService)
				c.Set("refreshTokenService", refreshTokenService)
				authController.Login(c)
			})

			// Token 验证接口
			auth.GET("/validate", authController.ValidateToken)

			// 原有登录接口（保持向后兼容）
			auth.POST("/login-legacy", LoginHandler(apiKeyService))
			// 新增：支持"记住我"的登录接口
			auth.POST("/login-remember", UserLoginWithRememberHandler(apiKeyService, refreshTokenService))
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

		// ========== 搜索接口（支持混合访问模式）==========
		// 验证需求：10.1, 10.3
		// 可以使用手动输入的 API Key 或 JWT Token
		api.POST("/search", SearchHandler)
		api.GET("/search", SearchHandler) // 添加GET方式支持

		// ========== 用户接口（需要 JWT 认证）==========
		// 验证需求：6.1, 8.1
		user := api.Group("/user")
		user.Use(JWTMiddleware()) // 应用 JWT 中间件
		{
			// API Key 管理（新接口）
			user.POST("/apikey", userAPIKeyController.BindAPIKey)     // 绑定/更新 API Key
			user.GET("/apikey", userAPIKeyController.GetAPIKey)       // 获取绑定的 API Key
			user.DELETE("/apikey", userAPIKeyController.UnbindAPIKey) // 解绑 API Key

			// 原有接口（保持向后兼容，已弃用）
			// 验证需求：2.5, 7.1
			user.POST("/apikey/bind",
				middleware.DeprecatedMiddleware("此接口已弃用，请使用 POST /api/user/apikey"),
				apiKeyController.BindAPIKey)
			user.GET("/apikey-info",
				middleware.DeprecatedMiddleware("此接口已弃用，请使用 GET /api/user/apikey"),
				GetUserAPIKeyInfoHandler(apiKeyService))

			// 保留 /apikey/info 接口（向后兼容）
			user.GET("/apikey/info",
				middleware.DeprecatedMiddleware("此接口已弃用，请使用 GET /api/user/apikey"),
				apiKeyController.GetAPIKeyInfo)

			// 获取当前用户信息
			user.GET("/me", authController.GetCurrentUser)
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

			// API Key 管理
			apikey := admin.Group("/apikey")
			{
				// 生成 API Key
				apikey.POST("/generate", apiKeyController.GenerateAPIKey)
				// 列出所有 API Keys
				apikey.GET("/list", apiKeyController.ListAPIKeys)
				// 删除 API Key
				apikey.DELETE("/:id", apiKeyController.DeleteAPIKey)
				// 更新 API Key 状态
				apikey.PUT("/:id/status", apiKeyController.UpdateAPIKeyStatus)
			}

			// 原有接口（保持向后兼容）
			admin.GET("/keys", ListAPIKeysHandler(apiKeyService))
			admin.POST("/keys", CreateAPIKeyHandler(apiKeyService))
			admin.DELETE("/keys/:key", DeleteAPIKeyHandler(apiKeyService))
			admin.PATCH("/keys/:key", UpdateAPIKeyHandler(apiKeyService))              // 新增：更新API Key
			admin.POST("/keys/batch-extend", BatchExtendAPIKeysHandler(apiKeyService)) // 新增：批量延长
			admin.POST("/keys/batch-create", BatchCreateAPIKeysHandler(apiKeyService)) // 新增：批量创建
			admin.POST("/keys/batch-delete", BatchDeleteAPIKeysHandler(apiKeyService)) // 新增：批量删除
			admin.GET("/system-info", GetSystemInfoHandler(searchService))             // 更新：获取系统信息（包含插件状态）
			admin.POST("/plugins/:pluginName/test", TestPluginHandler(searchService))  // 新增：测试插件
			admin.POST("/plugins", CreatePluginHandler())                              // 新增：创建插件
			admin.PUT("/plugins/:pluginName", UpdatePluginHandler())                   // 新增：更新插件
			admin.DELETE("/plugins/:pluginName", DeletePluginHandler())                // 新增：删除插件
			admin.POST("/test-url", TestURLHandler())                                  // 新增：测试URL连通性

			// 系统设置管理
			admin.GET("/system-settings", GetSystemSettingsHandler)    // 获取系统设置
			admin.PUT("/system-settings", UpdateSystemSettingsHandler) // 更新系统设置
		}

		// 健康检查接口（支持 GET 和 HEAD 方法）
		healthCheckHandler := func(c *gin.Context) {
			// 根据配置决定是否返回插件信息
			pluginCount := 0
			pluginNames := []string{}
			pluginsEnabled := config.AppConfig.AsyncPluginEnabled

			if pluginsEnabled && searchService != nil && searchService.GetPluginManager() != nil {
				plugins := searchService.GetPluginManager().GetPlugins()
				pluginCount = len(plugins)
				for _, p := range plugins {
					pluginNames = append(pluginNames, p.Name())
				}
			}

			// 获取频道信息
			channels := config.AppConfig.DefaultChannels
			channelsCount := len(channels)

			response := gin.H{
				"status":          "ok",
				"auth_enabled":    config.AppConfig.AuthEnabled || config.AppConfig.APIKeyEnabled, // 更新认证状态判断
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
