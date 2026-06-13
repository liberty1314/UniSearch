package bootstrap

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

	"golang.org/x/net/netutil"

	"unisearch/config"
	"unisearch/database"
	"unisearch/plugin"
	"unisearch/service"
)

func NewHTTPServer(handler http.Handler) *http.Server {
	return &http.Server{
		Addr:         ":" + config.AppConfig.Port,
		Handler:      handler,
		ReadTimeout:  config.AppConfig.HTTPReadTimeout,
		WriteTimeout: config.AppConfig.HTTPWriteTimeout,
		IdleTimeout:  config.AppConfig.HTTPIdleTimeout,
	}
}

func Run(srv *http.Server, app *App) error {
	printServiceInfo(config.AppConfig.Port, app.PluginManager)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(quit)

	serverLifecycleCtx, stopServerLifecycle := context.WithCancel(context.Background())
	defer stopServerLifecycle()

	startHotRankingPreloader(serverLifecycleCtx, app)

	serverErr := make(chan error, 1)
	go func() {
		serverErr <- serveHTTP(srv)
	}()

	select {
	case err := <-serverErr:
		return err
	case <-quit:
	}

	fmt.Println("正在关闭服务器...")
	stopServerLifecycle()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("服务器关闭异常: %w", err)
	}

	if app.Search != nil {
		fmt.Println("正在等待搜索缓存写队列完成...")
		cacheCtx, cacheCancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := app.Search.Close(cacheCtx); err != nil {
			log.Printf("⚠️  搜索缓存写队列关闭超时: %v", err)
		} else {
			fmt.Println("✅ 搜索缓存写队列已完成")
		}
		cacheCancel()
	}

	if app.RedisCache != nil {
		fmt.Println("正在关闭 Redis 连接...")
		if err := app.RedisCache.Close(); err != nil {
			log.Printf("⚠️  关闭 Redis 连接失败: %v", err)
		} else {
			fmt.Println("✅ Redis 连接已关闭")
		}
	}

	if err := database.CloseDB(); err != nil {
		log.Printf("⚠️  关闭数据库连接失败: %v", err)
	}

	fmt.Println("🎉 服务器已安全关闭")
	return nil
}

func serveHTTP(srv *http.Server) error {
	if config.AppConfig.HTTPMaxConns > 0 {
		listener, err := net.Listen("tcp", srv.Addr)
		if err != nil {
			return fmt.Errorf("创建监听器失败: %w", err)
		}

		limitListener := netutil.LimitListener(listener, config.AppConfig.HTTPMaxConns)
		if err := srv.Serve(limitListener); err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("启动服务器失败: %w", err)
		}
		return nil
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("启动服务器失败: %w", err)
	}
	return nil
}

func startHotRankingPreloader(ctx context.Context, app *App) {
	if app.HotRanking == nil {
		log.Println("热门榜单预热器未启动：热门榜单服务不可用")
		return
	}
	cacheSettings := service.GetRuntimeCacheSettings()
	if !cacheSettings.HotRankingCacheEnabled || !cacheSettings.HotRankingPreloadEnabled {
		log.Println("热门榜单预热器已禁用")
		return
	}
	if app.RedisCache == nil {
		log.Println("热门榜单预热器未启动：Redis 不可用，无法进行榜单预热缓存")
		return
	}

	buildPreloaderConfig := func() service.HotRankingPreloaderConfig {
		runtimeSettings := service.GetRuntimeCacheSettings()
		return service.HotRankingPreloaderConfig{
			Enabled:       runtimeSettings.HotRankingCacheEnabled && runtimeSettings.HotRankingPreloadEnabled,
			DailyTime:     runtimeSettings.HotRankingPreloadTime,
			Limit:         runtimeSettings.HotRankingPreloadLimit,
			Timeout:       time.Duration(runtimeSettings.HotRankingPreloadTimeoutSeconds) * time.Second,
			Concurrency:   runtimeSettings.HotRankingPreloadConcurrency,
			ResultHandler: app.HotRanking.RecordPreloadResult,
		}
	}

	preloader := service.NewHotRankingPreloader(app.HotRanking, service.HotRankingPreloaderConfig{
		Enabled:        cacheSettings.HotRankingPreloadEnabled,
		DailyTime:      cacheSettings.HotRankingPreloadTime,
		Limit:          cacheSettings.HotRankingPreloadLimit,
		Timeout:        time.Duration(cacheSettings.HotRankingPreloadTimeoutSeconds) * time.Second,
		Concurrency:    cacheSettings.HotRankingPreloadConcurrency,
		ResultHandler:  app.HotRanking.RecordPreloadResult,
		ConfigResolver: buildPreloaderConfig,
	})

	go func() {
		result := preloader.WarmAll(ctx)
		app.HotRanking.RecordPreloadResult(result)
		log.Printf("热门榜单启动预热完成，总任务=%d，成功=%d，失败=%d", result.Total, result.Success, result.Failed)
		for _, item := range result.Errors {
			log.Printf("热门榜单启动预热失败: mode=%s period=%s category=%s sort_by=%s err=%v", item.Mode, item.Period, item.Category, item.SortBy, item.Err)
		}
	}()

	preloader.Start(ctx)
	log.Printf("热门榜单预热器已启动：每日刷新时间=%s，并发=%d，超时=%v",
		cacheSettings.HotRankingPreloadTime,
		cacheSettings.HotRankingPreloadConcurrency,
		time.Duration(cacheSettings.HotRankingPreloadTimeoutSeconds)*time.Second,
	)
}

func printServiceInfo(port string, pluginManager *plugin.PluginManager) {
	fmt.Printf("服务器启动在 http://localhost:%s\n", port)

	if config.AppConfig.UseProxy {
		fmt.Printf("使用SOCKS5代理: %s\n", config.AppConfig.ProxyURL)
	} else {
		fmt.Println("未使用代理")
	}

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

	if config.AppConfig.CacheEnabled {
		fmt.Printf("缓存已启用: 路径=%s, 最大大小=%dMB, TTL=%d分钟\n",
			config.AppConfig.CachePath,
			config.AppConfig.CacheMaxSizeMB,
			config.AppConfig.CacheTTLMinutes)
	} else {
		fmt.Println("缓存已禁用")
	}

	if config.AppConfig.EnableCompression {
		fmt.Printf("响应压缩已启用: 最小压缩大小=%d字节\n", config.AppConfig.MinSizeToCompress)
	} else {
		fmt.Println("响应压缩已禁用")
	}

	fmt.Printf("GC配置: 触发阈值=%d%%, 内存优化=%v\n", config.AppConfig.GCPercent, config.AppConfig.OptimizeMemory)

	readTimeoutMsg := "(自动计算)"
	if os.Getenv("HTTP_READ_TIMEOUT") != "" {
		readTimeoutMsg = "(由环境变量指定)"
	}
	writeTimeoutMsg := "(自动计算)"
	if os.Getenv("HTTP_WRITE_TIMEOUT") != "" {
		writeTimeoutMsg = "(由环境变量指定)"
	}
	maxConnsMsg := fmt.Sprintf("(自动计算: CPU核心数%d × 200)", runtime.NumCPU())
	if os.Getenv("HTTP_MAX_CONNS") != "" {
		maxConnsMsg = "(由环境变量指定)"
	}

	fmt.Printf("HTTP服务器配置: 读取超时=%v %s, 写入超时=%v %s, 空闲超时=%v, 最大连接数=%d %s\n",
		config.AppConfig.HTTPReadTimeout, readTimeoutMsg,
		config.AppConfig.HTTPWriteTimeout, writeTimeoutMsg,
		config.AppConfig.HTTPIdleTimeout,
		config.AppConfig.HTTPMaxConns, maxConnsMsg)

	if config.AppConfig.AsyncPluginEnabled {
		workersMsg := fmt.Sprintf("(自动计算: CPU核心数%d × 5)", runtime.NumCPU())
		if os.Getenv("ASYNC_MAX_BACKGROUND_WORKERS") != "" {
			workersMsg = "(由环境变量指定)"
		}
		tasksMsg := "(自动计算: 工作者数量 × 5)"
		if os.Getenv("ASYNC_MAX_BACKGROUND_TASKS") != "" {
			tasksMsg = "(由环境变量指定)"
		}
		fmt.Printf("异步插件已启用: 响应超时=%d秒, 最大工作者=%d %s, 最大任务=%d %s, 缓存TTL=%d小时\n",
			config.AppConfig.AsyncResponseTimeout,
			config.AppConfig.AsyncMaxBackgroundWorkers, workersMsg,
			config.AppConfig.AsyncMaxBackgroundTasks, tasksMsg,
			config.AppConfig.AsyncCacheTTLHours)
	} else {
		fmt.Println("异步插件已禁用")
	}

	fmt.Println("已加载插件:")
	plugins := pluginManager.GetPlugins()
	sort.Slice(plugins, func(i, j int) bool {
		if plugins[i].Priority() == plugins[j].Priority() {
			return plugins[i].Name() < plugins[j].Name()
		}
		return plugins[i].Priority() < plugins[j].Priority()
	})
	for _, p := range plugins {
		fmt.Printf("  - %s (优先级: %d)\n", p.Name(), p.Priority())
	}
}
