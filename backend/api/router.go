package api

import (
	"log"

	"github.com/gin-gonic/gin"
	"unisearch/api/controller"
	"unisearch/config"
	"unisearch/service"
	"unisearch/util"
)

// SetupRouter 设置路由
// 验证需求：4.1, 5.1, 6.1, 7.1, 8.1, 10.1, 10.3
func SetupRouter(deps RouterDeps) *gin.Engine {
	SetSearchService(deps.SearchService)
	SetSystemSettingsService(deps.SystemSettingsService)
	SetHotRankingCacheAdminService(deps.HotRankingService)
	SetTGChannelService(deps.TGChannelService)
	SetTGChannelHealthService(deps.TGChannelHealthService)
	SetAdminTagService(deps.AdminTagService)
	SetBannedIPService(deps.BannedIPService)
	SetTokenRevocationService(deps.TokenRevocationService)
	SetSearchAuditService(deps.SearchAuditService)
	SetAdminAuditService(deps.AdminAuditService)

	authController := controller.NewAuthController(deps.AuthService)

	InitSignupRateLimiters(config.AppConfig.SignupIPLimitPerMin, config.AppConfig.SignupIPLimitPerHour)
	// 选择注册限流计数后端：Redis（多实例共享、重启不丢）或内存（单实例）。
	InitSignupRateLimitStore(config.AppConfig.SignupRateLimitUseRedis, deps.RedisCache)
	// 自动封禁阈值存于 system_settings，支持后台热调；启动时读取初始值。
	if deps.SystemSettingsService != nil {
		if settings, err := deps.SystemSettingsService.GetSettings(); err != nil {
			log.Printf("⚠️  读取自动封禁配置失败，暂用默认值: %v", err)
		} else {
			InitSignupAutoban(
				settings.SignupAutobanEnabled,
				settings.SignupAutobanThreshold,
				settings.SignupAutobanWindowMin,
				settings.SignupAutobanDurationMin,
			)
			// 搜索审计开关缓存，避免每次搜索查库；系统设置更新时刷新。
			service.SetSearchAuditEnabled(settings.SearchAuditEnabled)
		}
	}
	// 全局注册熔断（L4 / 修复 W5）：全站每小时注册成功总量超阈值即临时熔断。
	InitSignupCircuitBreaker(config.AppConfig.SignupGlobalLimitPerHour, config.AppConfig.SignupCircuitBreakMin, deps.RedisCache)

	// 登录防爆破：IP 维度限流阈值 + 计数后端（Redis 多实例共享或内存），以及账户级失败锁定。
	InitLoginRateLimiters(config.AppConfig.LoginIPLimitPerMin, config.AppConfig.LoginIPLimitPerHour)
	InitLoginRateLimitStore(config.AppConfig.LoginRateLimitUseRedis, deps.RedisCache)
	// 用户名查重 IP 维度限流阈值：复用 loginRateLimitStore 计数后端，堵住单 IP 遍历用户名的枚举。
	InitCheckUsernameRateLimiters(config.AppConfig.CheckUsernameIPLimitPerMin, config.AppConfig.CheckUsernameIPLimitPerHour)
	loginLockoutRedis := deps.RedisCache
	if !config.AppConfig.LoginRateLimitUseRedis {
		loginLockoutRedis = nil
	}
	InitLoginLockout(config.AppConfig.LoginAccountLockThreshold, config.AppConfig.LoginAccountLockMin, loginLockoutRedis)
	// 注册防刷可观测性（M6）：周期性汇总各维度拦截统计。
	StartSignupMetricsReporter(0)
	// 周期回收内存限流器中已过期的 key，防止 key 无限增长导致内存耗尽。
	StartMemoryRateLimiterCleanup()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	applyTrustedProxies(r)
	r.Use(gin.Recovery())
	r.Use(SecurityHeadersMiddleware())
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
	if deps.SearchService != nil {
		deps.SearchService.SetPluginHealthService(deps.PluginHealthService)
	}

	return r
}

// applyTrustedProxies 配置 Gin 的可信反向代理列表，保证 c.ClientIP() 取到真实客户端 IP。
// 未显式配置 TRUSTED_PROXIES 时默认仅信任回环地址（本项目 Nginx 反代自 127.0.0.1）。
// 信任列表之外的 X-Forwarded-For 将被忽略，避免客户端伪造真实 IP 绕过限流/封禁。
func applyTrustedProxies(r *gin.Engine) {
	proxies := config.AppConfig.TrustedProxies
	if len(proxies) == 0 {
		proxies = []string{"127.0.0.1", "::1"}
	}
	if err := r.SetTrustedProxies(proxies); err != nil {
		log.Printf("警告: 设置可信代理失败: %v (信任列表: %v)", err, proxies)
	}
}

func registerPublicRoutes(api *gin.RouterGroup, deps RouterDeps) {
	api.GET("/system-settings", GetSystemSettingsHandler)
	api.GET("/hot", GetHotRankingHandler(deps.HotRankingService))
	api.GET("/system-settings/announcement-enabled", GetAnnouncementFeatureEnabledHandler(deps.SystemSettingsService))
	api.POST("/system-settings/announcement-enabled", JWTMiddleware(deps.AuthService), AdminMiddleware(), SetAnnouncementFeatureEnabledHandler(deps.SystemSettingsService))
	api.POST("/search", BodySizeLimitMiddleware(searchRequestBodyLimitBytes), SearchJWTMiddleware(deps.AuthService), SearchHandler)
	api.GET("/search", SearchJWTMiddleware(deps.AuthService), SearchHandler)
	api.POST("/search/progressive", BodySizeLimitMiddleware(searchRequestBodyLimitBytes), SearchJWTMiddleware(deps.AuthService), SearchProgressiveHandler(deps.SearchService))
	api.POST("/resources/resolve", BodySizeLimitMiddleware(authRequestBodyLimitBytes), SearchJWTMiddleware(deps.AuthService), ResourceResolveHandler)
	api.POST("/resources/scan-transfer/refresh", BodySizeLimitMiddleware(authRequestBodyLimitBytes), SearchJWTMiddleware(deps.AuthService), RefreshScanTransferHandler)
}

func registerUserRoutes(api *gin.RouterGroup, deps RouterDeps, authController *controller.AuthController) {
	user := api.Group("/user")
	user.Use(JWTMiddleware(deps.AuthService))
	{
		user.GET("/me", authController.GetCurrentUser)
		user.POST("/change-password", ChangePasswordHandler(deps.UserService))
	}
}
