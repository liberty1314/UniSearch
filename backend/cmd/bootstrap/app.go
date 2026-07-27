package bootstrap

import (
	"fmt"
	"log"
	"strconv"

	"github.com/joho/godotenv"

	"unisearch/api"
	"unisearch/config"
	"unisearch/database"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
	"unisearch/util"
	"unisearch/util/cache"
)

type App struct {
	RouterDeps     api.RouterDeps
	PluginManager  *plugin.PluginManager
	RedisCache     *cache.RedisCache
	Search         *service.SearchService
	HotRanking     *service.HotRankingService
	PluginMetrics  *service.PluginMetricsCollector
	ChannelMetrics *service.TGChannelMetricsCollector
	PluginCleaner  *service.PluginMetricsCleaner
	PluginChecker  *service.PluginHealthChecker
	SearchAudit    *service.SearchAuditService
	AdminAudit     *service.AdminAuditService
}

func Initialize() (*App, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件，将使用系统环境变量")
	} else {
		log.Println("成功加载 .env 文件")
	}

	if err := config.InitWithError(); err != nil {
		return nil, fmt.Errorf("配置初始化失败: %w", err)
	}
	plugin.SyncConfiguredProxyFromAppConfig()

	log.Println("正在连接数据库...")
	if err := database.InitDB(); err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}

	log.Println("正在执行数据库结构迁移...")
	if err := database.AutoMigrate(); err != nil {
		return nil, fmt.Errorf("数据库结构迁移失败: %w", err)
	}
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	secretManager := initializeSecretManager()
	service.SetGlobalSecretManager(secretManager)
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	util.InitHTTPClient()

	redisCache := initializeRedisCache()
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	plugin.InitAsyncPluginSystem()

	pluginManager := plugin.NewPluginManager()
	pluginManager.RegisterGlobalPluginsWithFilter(config.AppConfig.EnabledPlugins)
	config.UpdateDefaultConcurrency(len(pluginManager.GetPlugins()))

	refreshTokenService := initializeRefreshTokenService()
	authService := service.NewAuthService()
	fmt.Println("Auth 服务已启动（用户认证功能已启用）")

	tokenRevocationService := service.NewTokenRevocationService(redisCache)
	fmt.Println("TokenRevocation 服务已启动（登出/改密 Token 精确失效已启用）")

	userService := service.NewUserService(database.GetDB())
	fmt.Println("User 服务已启动（用户管理功能已启用）")

	systemSettingsService := service.NewSystemSettingsService(database.GetDB())
	if runtimeSettings, err := systemSettingsService.GetRuntimeSettings(); err != nil {
		log.Printf("⚠️  读取运行配置失败，将继续使用启动配置: %v", err)
	} else {
		systemSettingsService.ApplyRuntimeSettings(runtimeSettings)
		plugin.SyncConfiguredProxyFromAppConfig()
		util.ReloadHTTPClient()
	}
	service.SetGlobalCacheSettingsService(systemSettingsService)
	authService.SetSystemSettingsService(systemSettingsService)
	fmt.Println("SystemSettings 服务已启动（系统设置功能已启用）")

	announcementService := service.NewAnnouncementService(database.GetDB())
	fmt.Println("Announcement 服务已启动（公告功能已启用）")

	tgChannelService := service.NewTGChannelService(database.GetDB())
	adminTagService := service.NewAdminTagService(database.GetDB())
	bannedIPService := service.NewBannedIPService(database.GetDB())
	if err := bannedIPService.WarmUp(); err != nil {
		log.Printf("⚠️  预热 IP 封禁名单失败: %v", err)
	}
	fmt.Println("BannedIP 服务已启动（IP 封禁功能已启用）")

	searchAuditService := service.NewSearchAuditService(database.GetDB())
	adminAuditService := service.NewAdminAuditService(database.GetDB())
	fmt.Println("审计服务已启动（搜索审计 + 操作审计已启用）")
	if err := tgChannelService.MigrateFromEnv(); err != nil {
		log.Printf("⚠️  TG 频道迁移失败: %v", err)
	}
	tgChannelService.SyncToConfig()
	fmt.Println("TGChannel 服务已启动（Telegram 频道管理功能已启用）")

	pluginHealthService := service.NewPluginHealthService(database.GetDB())
	fmt.Println("PluginHealth 服务已启动（插件健康状态持久化已启用）")

	pluginCircuitBreaker := service.NewPluginCircuitBreakerService(pluginHealthService)
	fmt.Println("PluginCircuitBreaker 服务已启动（插件熔断降级已启用）")

	pluginMetricsCollector := service.NewPluginMetricsCollector(database.GetDB())
	fmt.Println("PluginMetrics 服务已启动（插件性能指标采集已启用）")

	tgChannelMetricsCollector := service.NewTGChannelMetricsCollector(database.GetDB())
	fmt.Println("TGChannelMetrics 服务已启动（TG 频道性能指标采集已启用）")

	pluginMetricsCleaner := service.NewPluginMetricsCleaner(database.GetDB())
	fmt.Println("PluginMetricsCleaner 服务已启动（插件指标清理已启用）")

	pluginStateService := service.NewPluginStateService(database.GetDB())
	fmt.Println("PluginState 服务已启动（插件启停状态持久化已启用）")

	pluginRuntimeConfigService := service.NewPluginRuntimeConfigService(database.GetDB())
	fmt.Println("PluginRuntimeConfig 服务已启动（插件运行配置持久化已启用）")

	tgChannelHealthService := service.NewTGChannelHealthService(database.GetDB())
	fmt.Println("TGChannelHealth 服务已启动（TG 频道健康状态持久化已启用）")

	searchService := service.NewSearchService(pluginManager, redisCache, pluginStateService, pluginRuntimeConfigService)
	searchService.SetPluginHealthService(pluginHealthService)
	searchService.SetPluginMetricsCollector(pluginMetricsCollector)
	searchService.SetTGChannelMetricsCollector(tgChannelMetricsCollector)
	searchService.SetTGChannelHealthService(tgChannelHealthService)
	searchService.SetPluginCircuitBreaker(pluginCircuitBreaker)
	pluginHealthChecker := service.NewPluginHealthChecker(searchService, pluginCircuitBreaker)
	searchService.SetPluginHealthChecker(pluginHealthChecker)
	hotRankingService := service.NewHotRankingServiceWithRedis(redisCache)

	return &App{
		RouterDeps: api.RouterDeps{
			SearchService:             searchService,
			AuthService:               authService,
			TokenRevocationService:    tokenRevocationService,
			RefreshTokenService:       refreshTokenService,
			UserService:               userService,
			SystemSettingsService:     systemSettingsService,
			AnnouncementService:       announcementService,
			TGChannelService:          tgChannelService,
			PluginHealthService:       pluginHealthService,
			PluginMetricsCollector:    pluginMetricsCollector,
			TGChannelMetricsCollector: tgChannelMetricsCollector,
			PluginStateService:        pluginStateService,
			PluginRuntimeConfig:       pluginRuntimeConfigService,
			TGChannelHealthService:    tgChannelHealthService,
			AdminTagService:           adminTagService,
			BannedIPService:           bannedIPService,
			SearchAuditService:        searchAuditService,
			AdminAuditService:         adminAuditService,
			HotRankingService:         hotRankingService,
			RedisCache:                redisCache,
		},
		PluginManager:  pluginManager,
		RedisCache:     redisCache,
		Search:         searchService,
		HotRanking:     hotRankingService,
		PluginMetrics:  pluginMetricsCollector,
		ChannelMetrics: tgChannelMetricsCollector,
		PluginCleaner:  pluginMetricsCleaner,
		PluginChecker:  pluginHealthChecker,
		SearchAudit:    searchAuditService,
		AdminAudit:     adminAuditService,
	}, nil
}

func initializeSecretManager() service.SecretManager {
	log.Println("正在初始化密钥管理服务...")
	if config.AppConfig.SecretBackend == "database" {
		secretManager := service.NewDatabaseSecretManager(database.GetDB(), config.AppConfig.SecretMasterKey)
		log.Println("✓ 密钥管理服务已启动（数据库存储模式）")
		if err := initializeDefaultSecrets(secretManager); err != nil {
			log.Printf("⚠️  初始化默认密钥失败: %v", err)
		}
		return secretManager
	}

	secretManager := service.NewEnvironmentSecretManager()
	log.Println("✓ 密钥管理服务已启动（环境变量模式）")
	return secretManager
}

func initializeRedisCache() *cache.RedisCache {
	log.Println("正在初始化 Redis 缓存...")
	if config.AppConfig.Redis == nil {
		log.Println("⚠️  Redis 配置未找到，缓存功能将不可用")
		return nil
	}

	port, err := strconv.Atoi(config.AppConfig.Redis.Port)
	if err != nil {
		log.Printf("⚠️  Redis 端口转换失败: %v，使用默认端口 6379", err)
		port = 6379
	}

	redisCache, err := cache.NewRedisCache(cache.Config{
		Host:     config.AppConfig.Redis.Host,
		Port:     port,
		Password: config.AppConfig.Redis.Password,
		DB:       config.AppConfig.Redis.DB,
		TTL:      config.AppConfig.Redis.TTL,
	})
	if err != nil {
		log.Printf("⚠️  Redis 缓存初始化失败: %v", err)
		log.Println("提示: 系统将在没有缓存的情况下运行")
		return nil
	}

	log.Println("✓ Redis 缓存初始化完成")
	return redisCache
}

func initializeRefreshTokenService() *service.RefreshTokenService {
	if !config.AppConfig.RefreshTokenEnabled {
		return nil
	}

	storageType := service.StorageType(config.AppConfig.RefreshTokenStorage)
	if storageType == service.StorageTypeDatabase {
		refreshTokenService, err := service.NewRefreshTokenService(
			storageType,
			database.GetDB(),
			"",
			config.AppConfig.RefreshTokenEncryptKey,
		)
		if err != nil {
			log.Printf("警告: Refresh Token 服务初始化失败: %v", err)
			log.Println("记住密码功能将不可用")
			return nil
		}
		fmt.Println("Refresh Token 服务已启动（数据库存储模式）")
		return refreshTokenService
	}

	refreshTokenService, err := service.NewRefreshTokenService(
		storageType,
		nil,
		config.AppConfig.RefreshTokenStorePath,
		config.AppConfig.RefreshTokenEncryptKey,
	)
	if err != nil {
		log.Printf("警告: Refresh Token 服务初始化失败: %v", err)
		log.Println("记住密码功能将不可用")
		return nil
	}
	fmt.Println("Refresh Token 服务已启动（文件存储模式）")
	return refreshTokenService
}

func initializeDefaultSecrets(secretManager service.SecretManager) error {
	_, err := secretManager.GetSecret("jwt_secret")
	if err != nil {
		jwtSecret := config.AppConfig.AuthJWTSecret
		if jwtSecret != "" {
			err = secretManager.SetSecret(
				"jwt_secret",
				jwtSecret,
				model.SecretTypeJWT,
				"JWT 签名密钥（从环境变量迁移）",
			)
			if err != nil {
				log.Printf("⚠️  初始化 JWT 密钥失败: %v", err)
			} else {
				log.Println("✓ JWT 密钥已从环境变量迁移到数据库")
			}
		}
	}

	_, err = secretManager.GetSecret("refresh_token_key")
	if err != nil {
		refreshTokenKey := config.AppConfig.RefreshTokenEncryptKey
		if refreshTokenKey != "" {
			err = secretManager.SetSecret(
				"refresh_token_key",
				refreshTokenKey,
				model.SecretTypeRefreshToken,
				"刷新令牌加密密钥（从环境变量迁移）",
			)
			if err != nil {
				log.Printf("⚠️  初始化刷新令牌密钥失败: %v", err)
			} else {
				log.Println("✓ 刷新令牌密钥已从环境变量迁移到数据库")
			}
		}
	}

	return nil
}
