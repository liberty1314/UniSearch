package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"sort"
	"strconv"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/net/netutil"

	"unisearch/api"
	"unisearch/config"
	"unisearch/database"
	"unisearch/plugin"
	"unisearch/service"
	"unisearch/util"
	"unisearch/util/cache"

	// 以下是插件的空导入，用于触发各插件的init函数，实现自动注册
	// 添加新插件时，只需在此处添加对应的导入语句即可
	_ "unisearch/plugin/aikanzy"
	_ "unisearch/plugin/alupan"
	_ "unisearch/plugin/ash"
	_ "unisearch/plugin/cldi"
	_ "unisearch/plugin/clmao"
	_ "unisearch/plugin/daishudj"
	_ "unisearch/plugin/djgou"
	_ "unisearch/plugin/dyyj"
	_ "unisearch/plugin/erxiao"
	_ "unisearch/plugin/feikuai"
	_ "unisearch/plugin/fox4k"
	_ "unisearch/plugin/hunhepan"
	_ "unisearch/plugin/javdb"
	_ "unisearch/plugin/jsnoteclub"
	_ "unisearch/plugin/jutoushe"
	_ "unisearch/plugin/kkmao"
	_ "unisearch/plugin/kkv"
	_ "unisearch/plugin/labi"
	_ "unisearch/plugin/libvio"
	_ "unisearch/plugin/lou1"
	_ "unisearch/plugin/meitizy"
	_ "unisearch/plugin/mikuclub"
	_ "unisearch/plugin/mizixing"
	_ "unisearch/plugin/muou"
	_ "unisearch/plugin/nyaa"
	_ "unisearch/plugin/ouge"
	_ "unisearch/plugin/pansearch"
	_ "unisearch/plugin/panta"
	_ "unisearch/plugin/qingying"
	_ "unisearch/plugin/quark4k"
	_ "unisearch/plugin/quarksoo"
	_ "unisearch/plugin/shandian"
	_ "unisearch/plugin/susu"
	_ "unisearch/plugin/thepiratebay"
	_ "unisearch/plugin/u3c3"
	_ "unisearch/plugin/wanou"
	_ "unisearch/plugin/weibo"
	_ "unisearch/plugin/xinjuc"
	_ "unisearch/plugin/xuexizhinan"
	_ "unisearch/plugin/yiove"
	_ "unisearch/plugin/ypfxw"
	_ "unisearch/plugin/yuhuage"
	_ "unisearch/plugin/zxzj"

	"unisearch/model"
)

// 全局 Redis 缓存实例
var globalRedisCache *cache.RedisCache

func main() {
	// 初始化应用
	initApp()

	// 启动服务器
	startServer()
}

// initApp 初始化应用程序
func initApp() {
	// 加载 .env 文件
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件，将使用系统环境变量")
	} else {
		log.Println("成功加载 .env 文件")
	}

	// 初始化配置
	config.Init()

	// ========== 数据库初始化 ==========
	// 验证需求：2.1-2.6, 11.1-11.7

	// 1. 连接数据库
	log.Println("正在连接数据库...")
	if err := database.InitDB(); err != nil {
		log.Fatalf("❌ 数据库连接失败: %v", err)
	}

	// 2. 执行数据库迁移
	log.Println("正在执行数据库迁移...")
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("❌ 数据库迁移失败: %v", err)
	}

	// 3. 创建默认管理员
	log.Println("正在检查默认管理员账户...")
	if err := database.SeedDefaultAdmin(); err != nil {
		log.Fatalf("❌ 创建默认管理员失败: %v", err)
	}

	log.Println("✓ 数据库初始化完成")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// ========== 密钥管理服务初始化 ==========
	log.Println("正在初始化密钥管理服务...")
	var secretManager service.SecretManager

	if config.AppConfig.SecretBackend == "database" {
		// 数据库模式
		secretManager = service.NewDatabaseSecretManager(
			database.GetDB(),
			config.AppConfig.SecretMasterKey,
		)
		log.Println("✓ 密钥管理服务已启动（数据库存储模式）")

		// 初始化默认密钥（如果不存在）
		if err := initializeDefaultSecrets(secretManager); err != nil {
			log.Printf("⚠️  初始化默认密钥失败: %v", err)
		}
	} else {
		// 环境变量模式（向后兼容）
		secretManager = service.NewEnvironmentSecretManager()
		log.Println("✓ 密钥管理服务已启动（环境变量模式）")
	}

	// 设置全局密钥管理服务
	service.SetGlobalSecretManager(secretManager)
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 初始化HTTP客户端
	util.InitHTTPClient()

	// ========== Redis 缓存初始化 ==========
	log.Println("正在初始化 Redis 缓存...")

	// 从配置创建 Redis 缓存实例
	if config.AppConfig.Redis != nil {
		// 将端口字符串转换为整数
		port, err := strconv.Atoi(config.AppConfig.Redis.Port)
		if err != nil {
			log.Printf("⚠️  Redis 端口转换失败: %v，使用默认端口 6379", err)
			port = 6379
		}

		redisConfig := cache.Config{
			Host:     config.AppConfig.Redis.Host,
			Port:     port,
			Password: config.AppConfig.Redis.Password,
			DB:       config.AppConfig.Redis.DB,
			TTL:      config.AppConfig.Redis.TTL,
		}

		globalRedisCache, err = cache.NewRedisCache(redisConfig)
		if err != nil {
			log.Printf("⚠️  Redis 缓存初始化失败: %v", err)
			log.Println("提示: 系统将在没有缓存的情况下运行")
			globalRedisCache = nil
		} else {
			log.Println("✓ Redis 缓存初始化完成")
		}
	} else {
		log.Println("⚠️  Redis 配置未找到，缓存功能将不可用")
	}

	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 确保异步插件系统初始化
	plugin.InitAsyncPluginSystem()
}

// startServer 启动Web服务器
func startServer() {
	// 初始化插件管理器
	pluginManager := plugin.NewPluginManager()

	// 根据 ENABLED_PLUGINS 注册插件（显式启用机制）
	pluginManager.RegisterGlobalPluginsWithFilter(config.AppConfig.EnabledPlugins)

	// 更新默认并发数（使用实际插件数）
	config.UpdateDefaultConcurrency(len(pluginManager.GetPlugins()))

	// 初始化 Refresh Token 服务（记住密码功能）
	var refreshTokenService *service.RefreshTokenService
	var err error
	if config.AppConfig.RefreshTokenEnabled {
		// 根据配置选择存储类型
		storageType := service.StorageType(config.AppConfig.RefreshTokenStorage)

		if storageType == service.StorageTypeDatabase {
			// 数据库模式
			refreshTokenService, err = service.NewRefreshTokenService(
				storageType,
				database.GetDB(),
				"",
				config.AppConfig.RefreshTokenEncryptKey,
			)
			if err != nil {
				log.Printf("警告: Refresh Token 服务初始化失败: %v", err)
				log.Println("记住密码功能将不可用")
			} else {
				fmt.Println("Refresh Token 服务已启动（数据库存储模式）")
			}
		} else {
			// 文件模式
			refreshTokenService, err = service.NewRefreshTokenService(
				storageType,
				nil,
				config.AppConfig.RefreshTokenStorePath,
				config.AppConfig.RefreshTokenEncryptKey,
			)
			if err != nil {
				log.Printf("警告: Refresh Token 服务初始化失败: %v", err)
				log.Println("记住密码功能将不可用")
			} else {
				fmt.Println("Refresh Token 服务已启动（文件存储模式）")
			}
		}
	}

	// 初始化 Auth 服务（用户认证服务）
	authService := service.NewAuthService()
	fmt.Println("Auth 服务已启动（用户认证功能已启用）")

	// 初始化 User 服务（用户管理服务）
	userService := service.NewUserService(database.GetDB())
	fmt.Println("User 服务已启动（用户管理功能已启用）")

	// 初始化 SystemSettings 服务（系统设置服务）
	systemSettingsService := service.NewSystemSettingsService(database.GetDB())
	fmt.Println("SystemSettings 服务已启动（系统设置功能已启用）")

	// 初始化 Announcement 服务（公告服务）
	announcementService := service.NewAnnouncementService(database.GetDB())
	fmt.Println("Announcement 服务已启动（公告功能已启用）")

	// 初始化 TGChannel 服务（Telegram 频道管理服务）
	tgChannelService := service.NewTGChannelService(database.GetDB())
	adminTagService := service.NewAdminTagService(database.GetDB())
	// 迁移环境变量中的频道到数据库
	if err := tgChannelService.MigrateFromEnv(); err != nil {
		log.Printf("⚠️  TG 频道迁移失败: %v", err)
	}
	// 从数据库同步频道到运行时配置
	tgChannelService.SyncToConfig()
	fmt.Println("TGChannel 服务已启动（Telegram 频道管理功能已启用）")

	// 初始化插件健康状态服务（插件测试结果持久化）
	pluginHealthService := service.NewPluginHealthService(database.GetDB())
	fmt.Println("PluginHealth 服务已启动（插件健康状态持久化已启用）")

	// 初始化插件启用状态服务（插件启停持久化）
	pluginStateService := service.NewPluginStateService(database.GetDB())
	fmt.Println("PluginState 服务已启动（插件启停状态持久化已启用）")

	// 初始化 TG 频道健康状态服务（频道测试结果持久化）
	tgChannelHealthService := service.NewTGChannelHealthService(database.GetDB())
	fmt.Println("TGChannelHealth 服务已启动（TG 频道健康状态持久化已启用）")

	// 初始化搜索服务（注入 Redis 缓存 + 插件启停状态服务）
	searchService := service.NewSearchService(pluginManager, globalRedisCache, pluginStateService)
	hotRankingService := service.NewHotRankingServiceWithRedis(globalRedisCache)

	// 设置路由
	router := api.SetupRouter(api.RouterDeps{
		SearchService:          searchService,
		AuthService:            authService,
		RefreshTokenService:    refreshTokenService,
		UserService:            userService,
		SystemSettingsService:  systemSettingsService,
		AnnouncementService:    announcementService,
		TGChannelService:       tgChannelService,
		PluginHealthService:    pluginHealthService,
		PluginStateService:     pluginStateService,
		TGChannelHealthService: tgChannelHealthService,
		AdminTagService:        adminTagService,
		HotRankingService:      hotRankingService,
	})

	// 获取端口配置
	port := config.AppConfig.Port

	// 输出服务信息
	printServiceInfo(port, pluginManager)

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  config.AppConfig.HTTPReadTimeout,
		WriteTimeout: config.AppConfig.HTTPWriteTimeout,
		IdleTimeout:  config.AppConfig.HTTPIdleTimeout,
	}

	// 创建通道来接收操作系统信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	serverLifecycleCtx, stopServerLifecycle := context.WithCancel(context.Background())
	defer stopServerLifecycle()

	startHotRankingPreloader(serverLifecycleCtx, hotRankingService)

	// 在单独的goroutine中启动服务器
	go func() {
		// 如果设置了最大连接数，使用限制监听器
		if config.AppConfig.HTTPMaxConns > 0 {
			// 创建监听器
			listener, err := net.Listen("tcp", srv.Addr)
			if err != nil {
				log.Fatalf("创建监听器失败: %v", err)
			}

			// 创建限制连接数的监听器
			limitListener := netutil.LimitListener(listener, config.AppConfig.HTTPMaxConns)

			// 使用限制监听器启动服务器
			if err := srv.Serve(limitListener); err != nil && err != http.ErrServerClosed {
				log.Fatalf("启动服务器失败: %v", err)
			}
		} else {
			// 使用默认方式启动服务器（不限制连接数）
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatalf("启动服务器失败: %v", err)
			}
		}
	}()

	// 等待中断信号
	<-quit
	fmt.Println("正在关闭服务器...")
	stopServerLifecycle()

	// 设置关闭超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 优雅关闭服务器
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("服务器关闭异常: %v", err)
	}

	// 关闭 Redis 连接
	if globalRedisCache != nil {
		fmt.Println("正在关闭 Redis 连接...")
		if err := globalRedisCache.Close(); err != nil {
			log.Printf("⚠️  关闭 Redis 连接失败: %v", err)
		} else {
			fmt.Println("✅ Redis 连接已关闭")
		}
	}

	// 关闭数据库连接
	if err := database.CloseDB(); err != nil {
		log.Printf("⚠️  关闭数据库连接失败: %v", err)
	}

	fmt.Println("🎉 服务器已安全关闭")
}

func startHotRankingPreloader(ctx context.Context, hotRankingService *service.HotRankingService) {
	if hotRankingService == nil {
		log.Println("热门榜单预热器未启动：热门榜单服务不可用")
		return
	}
	if !config.AppConfig.HotRankingPreloadEnabled {
		log.Println("热门榜单预热器已禁用")
		return
	}
	if globalRedisCache == nil {
		log.Println("热门榜单预热器未启动：Redis 不可用，无法进行榜单预热缓存")
		return
	}

	preloader := service.NewHotRankingPreloader(hotRankingService, service.HotRankingPreloaderConfig{
		Enabled:     config.AppConfig.HotRankingPreloadEnabled,
		DailyTime:   config.AppConfig.HotRankingPreloadTime,
		Timeout:     config.AppConfig.HotRankingPreloadTimeout,
		Concurrency: config.AppConfig.HotRankingPreloadConcurrency,
	})

	go func() {
		result := preloader.WarmAll(ctx)
		log.Printf("热门榜单启动预热完成，总任务=%d，成功=%d，失败=%d", result.Total, result.Success, result.Failed)
		for _, item := range result.Errors {
			log.Printf("热门榜单启动预热失败: period=%s category=%s err=%v", item.Period, item.Category, item.Err)
		}
	}()

	preloader.Start(ctx)
	log.Printf("热门榜单预热器已启动：每日刷新时间=%s，并发=%d，超时=%v",
		config.AppConfig.HotRankingPreloadTime,
		config.AppConfig.HotRankingPreloadConcurrency,
		config.AppConfig.HotRankingPreloadTimeout,
	)
}

// printServiceInfo 打印服务信息
func printServiceInfo(port string, pluginManager *plugin.PluginManager) {
	// 启动服务器
	fmt.Printf("服务器启动在 http://localhost:%s\n", port)

	// 输出代理信息
	if config.AppConfig.UseProxy {
		fmt.Printf("使用SOCKS5代理: %s\n", config.AppConfig.ProxyURL)
	} else {
		fmt.Println("未使用代理")
	}

	// 输出并发信息
	if os.Getenv("CONCURRENCY") != "" {
		fmt.Printf("默认并发数: %d (由环境变量CONCURRENCY指定)\n", config.AppConfig.DefaultConcurrency)
	} else {
		channelCount := len(config.AppConfig.DefaultChannels)
		pluginCount := 0
		if pluginManager != nil {
			pluginCount = len(pluginManager.GetPlugins())
		}
		fmt.Printf("默认并发数: %d (= 频道数%d + 插件数%d + 10)\n",
			config.AppConfig.DefaultConcurrency, channelCount, pluginCount)
	}

	// 输出缓存信息
	if config.AppConfig.CacheEnabled {
		fmt.Printf("缓存已启用: 路径=%s, 最大大小=%dMB, TTL=%d分钟\n",
			config.AppConfig.CachePath,
			config.AppConfig.CacheMaxSizeMB,
			config.AppConfig.CacheTTLMinutes)
	} else {
		fmt.Println("缓存已禁用")
	}

	// 输出压缩信息
	if config.AppConfig.EnableCompression {
		fmt.Printf("响应压缩已启用: 最小压缩大小=%d字节\n",
			config.AppConfig.MinSizeToCompress)
	} else {
		fmt.Println("响应压缩已禁用")
	}

	// 输出GC配置信息
	fmt.Printf("GC配置: 触发阈值=%d%%, 内存优化=%v\n",
		config.AppConfig.GCPercent,
		config.AppConfig.OptimizeMemory)

	// 输出HTTP服务器配置信息
	readTimeoutMsg := ""
	if os.Getenv("HTTP_READ_TIMEOUT") != "" {
		readTimeoutMsg = "(由环境变量指定)"
	} else {
		readTimeoutMsg = "(自动计算)"
	}

	writeTimeoutMsg := ""
	if os.Getenv("HTTP_WRITE_TIMEOUT") != "" {
		writeTimeoutMsg = "(由环境变量指定)"
	} else {
		writeTimeoutMsg = "(自动计算)"
	}

	maxConnsMsg := ""
	if os.Getenv("HTTP_MAX_CONNS") != "" {
		maxConnsMsg = "(由环境变量指定)"
	} else {
		cpuCount := runtime.NumCPU()
		maxConnsMsg = fmt.Sprintf("(自动计算: CPU核心数%d × 200)", cpuCount)
	}

	fmt.Printf("HTTP服务器配置: 读取超时=%v %s, 写入超时=%v %s, 空闲超时=%v, 最大连接数=%d %s\n",
		config.AppConfig.HTTPReadTimeout, readTimeoutMsg,
		config.AppConfig.HTTPWriteTimeout, writeTimeoutMsg,
		config.AppConfig.HTTPIdleTimeout,
		config.AppConfig.HTTPMaxConns, maxConnsMsg)

	// 输出异步插件配置信息
	if config.AppConfig.AsyncPluginEnabled {
		// 检查工作者数量是否由环境变量指定
		workersMsg := ""
		if os.Getenv("ASYNC_MAX_BACKGROUND_WORKERS") != "" {
			workersMsg = "(由环境变量指定)"
		} else {
			cpuCount := runtime.NumCPU()
			workersMsg = fmt.Sprintf("(自动计算: CPU核心数%d × 5)", cpuCount)
		}

		// 检查任务数量是否由环境变量指定
		tasksMsg := ""
		if os.Getenv("ASYNC_MAX_BACKGROUND_TASKS") != "" {
			tasksMsg = "(由环境变量指定)"
		} else {
			tasksMsg = "(自动计算: 工作者数量 × 5)"
		}

		fmt.Printf("异步插件已启用: 响应超时=%d秒, 最大工作者=%d %s, 最大任务=%d %s, 缓存TTL=%d小时\n",
			config.AppConfig.AsyncResponseTimeout,
			config.AppConfig.AsyncMaxBackgroundWorkers, workersMsg,
			config.AppConfig.AsyncMaxBackgroundTasks, tasksMsg,
			config.AppConfig.AsyncCacheTTLHours)
	} else {
		fmt.Println("异步插件已禁用")
	}

	// 输出插件信息（按优先级排序）
	fmt.Println("已加载插件:")
	plugins := pluginManager.GetPlugins()

	// 按优先级排序（优先级数字越小越靠前）
	sort.Slice(plugins, func(i, j int) bool {
		// 优先级相同时按名称排序
		if plugins[i].Priority() == plugins[j].Priority() {
			return plugins[i].Name() < plugins[j].Name()
		}
		return plugins[i].Priority() < plugins[j].Priority()
	})

	for _, p := range plugins {
		fmt.Printf("  - %s (优先级: %d)\n", p.Name(), p.Priority())
	}
}

// initializeDefaultSecrets 初始化默认密钥（仅在数据库模式下）
func initializeDefaultSecrets(secretManager service.SecretManager) error {
	// 尝试获取 JWT 密钥，如果不存在则从环境变量初始化
	_, err := secretManager.GetSecret("jwt_secret")
	if err != nil {
		// 密钥不存在，从环境变量读取并存储到数据库
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

	// 尝试获取刷新令牌密钥
	_, err = secretManager.GetSecret("refresh_token_key")
	if err != nil {
		// 密钥不存在，从环境变量读取并存储到数据库
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
