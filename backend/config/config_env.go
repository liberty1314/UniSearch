package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// 本文件集中通用运行参数、缓存（已废弃）、压缩、GC、插件、异步与 HTTP 服务器
// 相关的环境变量读取函数，以及频道/并发的运行时更新器。

func parseTrimmedUniqueEnvList(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		items = append(items, trimmed)
	}

	return items
}

func getAllowedOrigins() []string {
	if origins := parseTrimmedUniqueEnvList(os.Getenv("ALLOWED_ORIGINS")); len(origins) > 0 {
		return origins
	}

	if getAppEnv() == "production" {
		return nil
	}

	return []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:8080",
		"http://localhost:8888",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
		"http://127.0.0.1:8080",
		"http://127.0.0.1:8888",
	}
}

// getTrustedProxies 返回可信反向代理网段（CIDR 或 IP）列表。
// 用于 Gin SetTrustedProxies，确保 c.ClientIP() 解析出真实客户端 IP 而非反代 IP。
// 未配置时返回 nil：调用方据此决定信任策略（生产建议显式配置内网反代网段）。
func getTrustedProxies() []string {
	return parseTrimmedUniqueEnvList(os.Getenv("TRUSTED_PROXIES"))
}

// getSignupIPLimitPerMin 返回单 IP 每分钟注册请求上限（默认 5）。
func getSignupIPLimitPerMin() int {
	return getPositiveIntEnv("SIGNUP_IP_LIMIT_PER_MIN", 5)
}

// getSignupIPLimitPerHour 返回单 IP 每小时注册请求上限（默认 20）。
func getSignupIPLimitPerHour() int {
	return getPositiveIntEnv("SIGNUP_IP_LIMIT_PER_HOUR", 20)
}

// getSignupRateLimitUseRedis 返回是否将注册限流/自动封禁计数落到 Redis（默认启用）。
// Redis 不可用时运行期自动降级到内存实现。
func getSignupRateLimitUseRedis() bool {
	val := strings.TrimSpace(os.Getenv("SIGNUP_RATE_LIMIT_USE_REDIS"))
	if val == "" {
		return true
	}
	return val != "false" && val != "0"
}

// getSignupGlobalLimitPerHour 返回全站每小时注册成功总量上限（默认 0=关闭熔断）。
func getSignupGlobalLimitPerHour() int {
	val := strings.TrimSpace(os.Getenv("SIGNUP_GLOBAL_LIMIT_PER_HOUR"))
	if val == "" {
		return 0
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

// getSignupCircuitBreakMin 返回触发全局熔断后拒绝新注册的持续时长（分钟，默认 10）。
func getSignupCircuitBreakMin() int {
	return getPositiveIntEnv("SIGNUP_CIRCUIT_BREAK_MIN", 10)
}

// getLoginIPLimitPerMin 返回单 IP 每分钟登录请求上限（默认 10）。
func getLoginIPLimitPerMin() int {
	return getPositiveIntEnv("LOGIN_IP_LIMIT_PER_MIN", 10)
}

// getLoginIPLimitPerHour 返回单 IP 每小时登录请求上限（默认 60）。
func getLoginIPLimitPerHour() int {
	return getPositiveIntEnv("LOGIN_IP_LIMIT_PER_HOUR", 60)
}

// getLoginRateLimitUseRedis 返回是否将登录限流/账户锁定计数落到 Redis（默认启用）。
// Redis 不可用时运行期自动降级到内存实现。
func getLoginRateLimitUseRedis() bool {
	val := strings.TrimSpace(os.Getenv("LOGIN_RATE_LIMIT_USE_REDIS"))
	if val == "" {
		return true
	}
	return val != "false" && val != "0"
}

// getLoginAccountLockThreshold 返回账户连续登录失败达到多少次即锁定（默认 5，0=关闭锁定）。
func getLoginAccountLockThreshold() int {
	val := strings.TrimSpace(os.Getenv("LOGIN_ACCOUNT_LOCK_THRESHOLD"))
	if val == "" {
		return 5
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 0 {
		return 5
	}
	return n
}

// getLoginAccountLockMin 返回账户锁定持续时长（分钟，默认 15）。
func getLoginAccountLockMin() int {
	return getPositiveIntEnv("LOGIN_ACCOUNT_LOCK_MIN", 15)
}

// getPositiveIntEnv 读取正整数环境变量，非法或非正时返回默认值。
func getPositiveIntEnv(key string, def int) int {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return def
	}
	n, err := strconv.Atoi(val)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

// 从环境变量获取默认频道列表，如果未设置则使用默认值
func getDefaultChannels() []string {
	channels := parseTrimmedUniqueEnvList(os.Getenv("CHANNELS"))
	if len(channels) == 0 {
		return []string{"tgsearchers4"}
	}
	return channels
}

// UpdateChannels 运行时更新频道列表（由 TGChannelService 调用）
func UpdateChannels(channels []string) {
	if AppConfig == nil {
		return
	}
	AppConfig.DefaultChannels = channels
	// 同步更新并发数
	UpdateDefaultConcurrency(len(AppConfig.EnabledPlugins))
}

// 从环境变量获取默认并发数，如果未设置则使用基于环境变量的简单计算
func getDefaultConcurrency() int {
	concurrencyEnv := os.Getenv("CONCURRENCY")
	if concurrencyEnv != "" {
		concurrency, err := strconv.Atoi(concurrencyEnv)
		if err == nil && concurrency > 0 {
			return concurrency
		}
	}

	// 环境变量未设置或无效时，根据初始化配置推导默认并发。
	channelCount := len(getDefaultChannels())
	pluginCount := len(getEnabledPlugins())

	// 计算并发数 = 频道数 + 插件数 + 10
	concurrency := channelCount + pluginCount + 10
	if concurrency < 1 {
		concurrency = 1 // 确保至少为1
	}

	return concurrency
}

// 更新默认并发数（根据实际插件数或0调用）
// pluginCount: 如果插件被禁用则为0，否则为实际插件数
func UpdateDefaultConcurrency(pluginCount int) {
	if AppConfig == nil {
		return
	}

	// 只有当未通过环境变量指定并发数时才进行调整
	concurrencyEnv := os.Getenv("CONCURRENCY")
	if concurrencyEnv != "" {
		return
	}

	// 计算频道数
	channelCount := len(AppConfig.DefaultChannels)

	// 计算并发数 = 频道数 + 插件数（插件禁用时为0）+ 10
	concurrency := channelCount + pluginCount + 10
	if concurrency < 1 {
		concurrency = 1 // 确保至少为1
	}

	// 更新配置
	AppConfig.DefaultConcurrency = concurrency
}

// 从环境变量获取服务端口，如果未设置则使用默认值
func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "8888"
	}
	return port
}

func getProxyURL() string {
	return os.Getenv("PROXY")
}

func getHTTPProxyURL() string {
	if proxyURL := os.Getenv("HTTP_PROXY"); proxyURL != "" {
		return proxyURL
	}
	return os.Getenv("http_proxy")
}

func getHTTPSProxyURL() string {
	if proxyURL := os.Getenv("HTTPS_PROXY"); proxyURL != "" {
		return proxyURL
	}
	return os.Getenv("https_proxy")
}

// 搜索缓存总开关。当前真实缓存后端已迁移到 Redis，
// 但仍保留环境变量作为全局兜底开关。
func getCacheEnabled() bool {
	enabled := os.Getenv("CACHE_ENABLED")
	if enabled == "" {
		return true
	}
	return enabled != "false" && enabled != "0"
}

// 从环境变量获取本地目录兜底路径。
// 当前主要用于需要文件存储的兼容插件。
func getCachePath() string {
	path := os.Getenv("CACHE_PATH")
	if path == "" {
		// 默认在当前目录下创建cache文件夹
		defaultPath, err := filepath.Abs("./cache")
		if err != nil {
			return "./cache"
		}
		return defaultPath
	}
	return path
}

// 从环境变量获取是否启用压缩，如果未设置则默认禁用
func getEnableCompression() bool {
	enabled := os.Getenv("ENABLE_COMPRESSION")
	if enabled == "" {
		return false // 默认禁用，因为通常由Nginx等处理
	}
	return enabled == "true" || enabled == "1"
}

// 从环境变量获取最小压缩大小，如果未设置则使用默认值
func getMinSizeToCompress() int {
	sizeEnv := os.Getenv("MIN_SIZE_TO_COMPRESS")
	if sizeEnv == "" {
		return 1024 // 默认1KB
	}
	size, err := strconv.Atoi(sizeEnv)
	if err != nil || size <= 0 {
		return 1024
	}
	return size
}

// 从环境变量获取GC百分比，如果未设置则使用默认值
func getGCPercent() int {
	percentEnv := os.Getenv("GC_PERCENT")
	if percentEnv == "" {
		return 50 // 默认50% - 优化内存管理，更频繁的GC避免内存暴涨
	}
	percent, err := strconv.Atoi(percentEnv)
	if err != nil || percent <= 0 {
		return 50 // 错误时也使用优化后的默认值
	}
	return percent
}

// 从环境变量获取是否优化内存，如果未设置则默认启用
func getOptimizeMemory() bool {
	enabled := os.Getenv("OPTIMIZE_MEMORY")
	if enabled == "" {
		return true // 默认启用
	}
	return enabled != "false" && enabled != "0"
}

// 从环境变量获取插件超时时间（秒），如果未设置则使用默认值
func getPluginTimeout() int {
	timeoutEnv := os.Getenv("PLUGIN_TIMEOUT")
	if timeoutEnv == "" {
		return 30 // 默认30秒
	}
	timeout, err := strconv.Atoi(timeoutEnv)
	if err != nil || timeout <= 0 {
		return 30
	}
	return timeout
}

// 从环境变量获取是否启用异步插件，如果未设置则默认启用
func getAsyncPluginEnabled() bool {
	enabled := os.Getenv("ASYNC_PLUGIN_ENABLED")
	if enabled == "" {
		return true // 默认启用
	}
	return enabled != "false" && enabled != "0"
}

// 从环境变量获取启用的插件列表。
// 返回默认清单表示未设置环境变量时使用启动默认策略。
// 返回[]string{}表示设置为空（显式禁用全部插件）。
// 返回具体列表表示按名称覆盖默认注册集合。
func getEnabledPlugins() []string {
	plugins, exists := os.LookupEnv("ENABLED_PLUGINS")
	if !exists {
		return DefaultEnabledPlugins()
	}

	if plugins == "" {
		return []string{}
	}

	result := parseTrimmedUniqueEnvList(plugins)
	if len(result) == 0 {
		return []string{}
	}
	return result
}

// 从环境变量获取异步响应超时时间（秒），如果未设置则使用默认值
func getAsyncResponseTimeout() int {
	timeoutEnv := os.Getenv("ASYNC_RESPONSE_TIMEOUT")
	if timeoutEnv == "" {
		return 4 // 默认4秒
	}
	timeout, err := strconv.Atoi(timeoutEnv)
	if err != nil || timeout <= 0 {
		return 4
	}
	return timeout
}

// 从环境变量获取最大后台工作者数量，如果未设置则自动计算
func getAsyncMaxBackgroundWorkers() int {
	sizeEnv := os.Getenv("ASYNC_MAX_BACKGROUND_WORKERS")
	if sizeEnv != "" {
		size, err := strconv.Atoi(sizeEnv)
		if err == nil && size > 0 {
			return size
		}
	}

	// 自动计算：根据CPU核心数计算
	// 每个CPU核心分配5个工作者，最小20个
	cpuCount := runtime.NumCPU()
	workers := cpuCount * 5

	// 确保至少有20个工作者
	if workers < 20 {
		workers = 20
	}

	return workers
}

// 从环境变量获取最大后台任务数量，如果未设置则自动计算
func getAsyncMaxBackgroundTasks() int {
	sizeEnv := os.Getenv("ASYNC_MAX_BACKGROUND_TASKS")
	if sizeEnv != "" {
		size, err := strconv.Atoi(sizeEnv)
		if err == nil && size > 0 {
			return size
		}
	}

	// 自动计算：工作者数量的5倍，最小100个
	workers := getAsyncMaxBackgroundWorkers()
	tasks := workers * 5

	// 确保至少有100个任务
	if tasks < 100 {
		tasks = 100
	}

	return tasks
}

// 从环境变量获取异步缓存有效期（小时），如果未设置则使用默认值
func getAsyncCacheTTLHours() int {
	ttlEnv := os.Getenv("ASYNC_CACHE_TTL_HOURS")
	if ttlEnv == "" {
		return 1 // 默认1小时
	}
	ttl, err := strconv.Atoi(ttlEnv)
	if err != nil || ttl <= 0 {
		return 1
	}
	return ttl
}

// 从环境变量获取HTTP读取超时，如果未设置则自动计算
func getHTTPReadTimeout() time.Duration {
	timeoutEnv := os.Getenv("HTTP_READ_TIMEOUT")
	if timeoutEnv != "" {
		timeout, err := strconv.Atoi(timeoutEnv)
		if err == nil && timeout > 0 {
			return time.Duration(timeout) * time.Second
		}
	}

	// 自动计算：默认30秒，异步模式下根据异步响应超时调整
	timeout := 30 * time.Second

	// 如果启用了异步插件，确保读取超时足够长
	if getAsyncPluginEnabled() {
		// 读取超时应该至少是异步响应超时的3倍，确保有足够时间完成异步操作
		asyncTimeoutSecs := getAsyncResponseTimeout()
		asyncTimeoutExtended := time.Duration(asyncTimeoutSecs*3) * time.Second
		if asyncTimeoutExtended > timeout {
			timeout = asyncTimeoutExtended
		}
	}

	return timeout
}

// 从环境变量获取HTTP写入超时，如果未设置则自动计算
func getHTTPWriteTimeout() time.Duration {
	timeoutEnv := os.Getenv("HTTP_WRITE_TIMEOUT")
	if timeoutEnv != "" {
		timeout, err := strconv.Atoi(timeoutEnv)
		if err == nil && timeout > 0 {
			return time.Duration(timeout) * time.Second
		}
	}

	// 自动计算：默认60秒，但根据插件超时和异步处理时间调整
	timeout := 60 * time.Second

	// 如果启用了异步插件，确保写入超时足够长
	pluginTimeoutSecs := getPluginTimeout()

	// 计算1.5倍的插件超时时间（使用整数运算：乘以3再除以2）
	pluginTimeoutExtended := time.Duration(pluginTimeoutSecs*3/2) * time.Second

	if pluginTimeoutExtended > timeout {
		timeout = pluginTimeoutExtended
	}

	return timeout
}

// 从环境变量获取HTTP空闲超时，如果未设置则自动计算
func getHTTPIdleTimeout() time.Duration {
	timeoutEnv := os.Getenv("HTTP_IDLE_TIMEOUT")
	if timeoutEnv != "" {
		timeout, err := strconv.Atoi(timeoutEnv)
		if err == nil && timeout > 0 {
			return time.Duration(timeout) * time.Second
		}
	}

	// 自动计算：默认120秒，考虑到保持连接的效益
	return 120 * time.Second
}

// 从环境变量获取HTTP最大连接数，如果未设置则自动计算
func getHTTPMaxConns() int {
	maxConnsEnv := os.Getenv("HTTP_MAX_CONNS")
	if maxConnsEnv != "" {
		maxConns, err := strconv.Atoi(maxConnsEnv)
		if err == nil && maxConns > 0 {
			return maxConns
		}
	}

	// 自动计算：根据CPU核心数计算
	// 每个CPU核心分配200个连接，最小1000个
	cpuCount := runtime.NumCPU()
	maxConns := cpuCount * 200

	// 确保至少有1000个连接
	if maxConns < 1000 {
		maxConns = 1000
	}

	return maxConns
}

func getSearchEventLogEnabled() bool {
	enabled := os.Getenv("SEARCH_EVENT_LOG_ENABLED")
	if enabled == "" {
		return false
	}
	value, err := strconv.ParseBool(enabled)
	if err != nil {
		return false
	}
	return value
}

func getPluginStateCacheTTL() time.Duration {
	ttlEnv := os.Getenv("PLUGIN_STATE_CACHE_TTL_SECONDS")
	if ttlEnv == "" {
		return 30 * time.Second
	}

	ttl, err := strconv.Atoi(ttlEnv)
	if err != nil || ttl <= 0 {
		return 30 * time.Second
	}
	return time.Duration(ttl) * time.Second
}

func getCacheWriteQueueSize() int {
	sizeEnv := os.Getenv("CACHE_WRITE_QUEUE_SIZE")
	if sizeEnv == "" {
		return 256
	}

	size, err := strconv.Atoi(sizeEnv)
	if err != nil || size <= 0 {
		return 256
	}
	return size
}

func getCacheWriteWorkers() int {
	workersEnv := os.Getenv("CACHE_WRITE_WORKERS")
	if workersEnv == "" {
		return 4
	}

	workers, err := strconv.Atoi(workersEnv)
	if err != nil || workers <= 0 {
		return 4
	}
	return workers
}

// 从环境变量获取异步插件日志开关，如果未设置则使用默认值
func getAsyncLogEnabled() bool {
	logEnv := os.Getenv("ASYNC_LOG_ENABLED")
	if logEnv == "" {
		return true // 默认启用日志
	}
	enabled, err := strconv.ParseBool(logEnv)
	if err != nil {
		return true // 解析失败时默认启用
	}
	return enabled
}
