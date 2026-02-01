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
	_ "unisearch/plugin/cyg"
	_ "unisearch/plugin/duoduo"
	_ "unisearch/plugin/fox4k"
	_ "unisearch/plugin/hdr4k"
	_ "unisearch/plugin/huban"
	_ "unisearch/plugin/hunhepan"
	_ "unisearch/plugin/jikepan"
	_ "unisearch/plugin/labi"
	_ "unisearch/plugin/muou"
	_ "unisearch/plugin/ouge"
	_ "unisearch/plugin/pan666"
	_ "unisearch/plugin/pansearch"
	_ "unisearch/plugin/panta"
	_ "unisearch/plugin/panyq"
	_ "unisearch/plugin/qupansou"
	_ "unisearch/plugin/shandian"
	_ "unisearch/plugin/susu"
	_ "unisearch/plugin/thepiratebay"
	_ "unisearch/plugin/wanou"
	_ "unisearch/plugin/xuexizhinan"
	_ "unisearch/plugin/zhizhen"
)

// 全局缓存写入管理器
var globalCacheWriteManager *cache.DelayedBatchWriteManager

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
	
	// 4. 执行 JSON 数据迁移（如果需要）
	log.Println("正在检查 JSON 数据迁移...")
	if err := database.MigrateFromDefaultJSONFile(); err != nil {
		// 数据迁移失败不应该导致系统无法启动，只记录警告
		log.Printf("⚠️  JSON 数据迁移失败: %v", err)
	}
	
	log.Println("✓ 数据库初始化完成")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 初始化HTTP客户端
	util.InitHTTPClient()

	// 🔥 初始化缓存写入管理器
	var err error
	globalCacheWriteManager, err = cache.NewDelayedBatchWriteManager()
	if err != nil {
		log.Fatalf("缓存写入管理器创建失败: %v", err)
	}
	if err := globalCacheWriteManager.Initialize(); err != nil {
		log.Fatalf("缓存写入管理器初始化失败: %v", err)
	}
	// 将缓存写入管理器注入到service包
	service.SetGlobalCacheWriteManager(globalCacheWriteManager)

	// 延迟设置主缓存更新函数，确保service初始化完成
	go func() {
		// 等待一小段时间确保service包完全初始化
		time.Sleep(100 * time.Millisecond)
		if mainCache := service.GetEnhancedTwoLevelCache(); mainCache != nil {
			globalCacheWriteManager.SetMainCacheUpdater(func(key string, data []byte, ttl time.Duration) error {
				return mainCache.SetBothLevels(key, data, ttl)
			})
		}
	}()

	// 确保异步插件系统初始化
	plugin.InitAsyncPluginSystem()
}

// startServer 启动Web服务器
func startServer() {
	// 初始化插件管理器
	pluginManager := plugin.NewPluginManager()

	// 注册所有全局插件（通过init函数自动注册到全局注册表）
	pluginManager.RegisterAllGlobalPlugins()

	// 更新默认并发数（使用实际插件数）
	config.UpdateDefaultConcurrency(len(pluginManager.GetPlugins()))

	// 初始化搜索服务
	searchService := service.NewSearchService(pluginManager)

	// 初始化 API Key 服务（管理后台需要，必须始终初始化）
	var apiKeyService *service.APIKeyService
	apiKeyService = service.NewAPIKeyService()
	if config.AppConfig.APIKeyEnabled {
		fmt.Println("API Key 服务已启动（认证已启用）")
	} else {
		fmt.Println("API Key 服务已启动（仅用于管理，认证未启用）")
	}

	// 初始化 Refresh Token 服务（记住密码功能）
	var refreshTokenService *service.RefreshTokenService
	var err error
	if config.AppConfig.RefreshTokenEnabled {
		refreshTokenService, err = service.NewRefreshTokenService(
			config.AppConfig.RefreshTokenStorePath,
			config.AppConfig.RefreshTokenEncryptKey,
		)
		if err != nil {
			log.Printf("警告: Refresh Token 服务初始化失败: %v", err)
			log.Println("记住密码功能将不可用")
		} else {
			fmt.Println("Refresh Token 服务已启动（记住密码功能已启用）")
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

	// 设置路由
	router := api.SetupRouter(searchService, apiKeyService, authService, refreshTokenService, userService, systemSettingsService)

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

	// 🔥 优先保存缓存数据到磁盘（数据安全第一）
	fmt.Println("💾 正在保存所有缓存数据...")

	// 增加关闭超时时间，确保数据有足够时间保存
	shutdownTimeout := 10 * time.Second

	if globalCacheWriteManager != nil {
		if err := globalCacheWriteManager.Shutdown(shutdownTimeout); err != nil {
			log.Printf("❌ 缓存数据保存失败: %v", err)
		}
	}

	// 额外确保内存缓存也被保存（双重保障）
	if mainCache := service.GetEnhancedTwoLevelCache(); mainCache != nil {
		fmt.Println("💾 正在强制同步内存缓存到磁盘...")
		if err := mainCache.FlushMemoryToDisk(); err != nil {
			log.Printf("❌ 内存缓存同步失败: %v", err)
		} else {
			fmt.Println("✅ 内存缓存同步完成")
		}
	}

	// 设置关闭超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// 优雅关闭服务器
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("服务器关闭异常: %v", err)
	}

	// 关闭数据库连接
	if err := database.CloseDB(); err != nil {
		log.Printf("⚠️  关闭数据库连接失败: %v", err)
	}

	fmt.Println("🎉 服务器已安全关闭")
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
