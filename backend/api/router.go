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
	SetSearchService(deps.SearchService)
	SetAuthService(deps.AuthService)
	SetSystemSettingsService(deps.SystemSettingsService)
	SetTGChannelService(deps.TGChannelService)
	SetTGChannelHealthService(deps.TGChannelHealthService)
	SetAdminTagService(deps.AdminTagService)

	authController := controller.NewAuthController(deps.AuthService)

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(CORSMiddleware())
	r.Use(LoggerMiddleware())
	r.Use(ValidationMiddleware())
	r.Use(util.GzipMiddleware())
	r.HandleMethodNotAllowed = true
	r.NoMethod(MethodNotAllowedHandler())

	apiGroup := r.Group("/api")
	registerAuthRoutes(apiGroup, deps, authController)
	registerPublicRoutes(apiGroup, deps)
	registerUserRoutes(apiGroup, deps, authController)
	registerAnnouncementRoutes(apiGroup, deps)
	registerAdminRoutes(apiGroup, deps)
	registerHealthRoutes(apiGroup, deps)
	registerPluginWebRoutes(r, deps)

	return r
}

func registerPublicRoutes(api *gin.RouterGroup, deps RouterDeps) {
	api.GET("/system-settings", GetSystemSettingsHandler)
	api.GET("/hot", GetHotRankingHandler(deps.HotRankingService))
	api.GET("/system-settings/announcement-enabled", GetAnnouncementFeatureEnabledHandler(deps.SystemSettingsService))
	api.POST("/system-settings/announcement-enabled", JWTMiddleware(), AdminMiddleware(), SetAnnouncementFeatureEnabledHandler(deps.SystemSettingsService))
	api.POST("/search", SearchJWTMiddleware(), SearchHandler)
	api.GET("/search", SearchJWTMiddleware(), SearchHandler)
}

func registerUserRoutes(api *gin.RouterGroup, deps RouterDeps, authController *controller.AuthController) {
	user := api.Group("/user")
	user.Use(JWTMiddleware())
	{
		user.GET("/me", authController.GetCurrentUser)
		user.POST("/change-password", ChangePasswordHandler(deps.UserService))
	}
}

func registerPluginWebRoutes(r *gin.Engine, deps RouterDeps) {
	if !config.AppConfig.AsyncPluginEnabled || deps.SearchService == nil || deps.SearchService.GetPluginManager() == nil {
		return
	}

	enabledPlugins := deps.SearchService.GetPluginManager().GetPlugins()
	for _, p := range enabledPlugins {
		if webPlugin, ok := p.(plugin.PluginWithWebHandler); ok {
			webPlugin.RegisterWebRoutes(r.Group(""))
		}
	}
}
