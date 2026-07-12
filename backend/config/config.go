package config

import (
	"errors"
	"fmt"
	"runtime/debug"
	"strings"
	"time"
)

// 本文件保留配置核心：类型定义、全局实例、默认插件清单与初始化装配（Init）。
// 各环境变量读取函数按领域拆分到 config_env.go / config_auth.go /
// config_tmdb.go / config_redis.go 中（均属同一 package config）。

// RedisConfig Redis 缓存配置结构
type RedisConfig struct {
	Host     string        // Redis 主机地址
	Port     string        // Redis 端口
	Password string        // Redis 密码（可选）
	DB       int           // Redis 数据库编号
	TTL      time.Duration // Redis 缓存过期时间
}

// Validate 验证 Redis 配置的有效性
func (rc *RedisConfig) Validate() error {
	if rc.Host == "" {
		return fmt.Errorf("Redis 主机地址不能为空")
	}
	if rc.Port == "" {
		return fmt.Errorf("Redis 端口不能为空")
	}
	if rc.DB < 0 || rc.DB > 15 {
		return fmt.Errorf("Redis 数据库编号必须在 0-15 之间，当前值: %d", rc.DB)
	}
	if rc.TTL <= 0 {
		return fmt.Errorf("Redis 缓存过期时间必须大于 0，当前值: %v", rc.TTL)
	}
	return nil
}

// GetAddress 获取 Redis 完整地址（host:port）
func (rc *RedisConfig) GetAddress() string {
	return rc.Host + ":" + rc.Port
}

// Config 应用配置结构
type Config struct {
	AppEnv string
	// CORS 允许来源。生产环境必须显式配置，开发环境使用 localhost 默认值。
	AllowedOrigins []string

	DefaultChannels    []string
	DefaultConcurrency int
	Port               string
	ProxyURL           string
	UseProxy           bool
	HTTPProxyURL       string
	HTTPSProxyURL      string
	// 搜索缓存总开关与本地目录兜底配置
	CacheEnabled bool
	CachePath    string
	// 压缩相关配置
	EnableCompression bool
	MinSizeToCompress int // 最小压缩大小（字节）
	// GC相关配置
	GCPercent      int  // GC触发阈值百分比
	OptimizeMemory bool // 是否启用内存优化
	// 插件相关配置
	PluginTimeoutSeconds int           // 插件超时时间（秒）
	PluginTimeout        time.Duration // 插件超时时间（Duration）
	// 异步插件相关配置
	AsyncPluginEnabled        bool          // 是否启用异步插件
	EnabledPlugins            []string      // 启用的具体插件列表（缺省使用默认清单，显式空表示不启用插件）
	AsyncResponseTimeout      int           // 响应超时时间（秒）
	AsyncResponseTimeoutDur   time.Duration // 响应超时时间（Duration）
	AsyncMaxBackgroundWorkers int           // 最大后台工作者数量
	AsyncMaxBackgroundTasks   int           // 最大后台任务数量
	AsyncCacheTTLHours        int           // 异步缓存有效期（小时）
	AsyncLogEnabled           bool          // 是否启用异步插件详细日志
	// HTTP服务器配置
	HTTPReadTimeout  time.Duration // 读取超时
	HTTPWriteTimeout time.Duration // 写入超时
	HTTPIdleTimeout  time.Duration // 空闲超时
	HTTPMaxConns     int           // 最大连接数
	// 搜索链路优化配置
	SearchEventLogEnabled    bool          // 是否启用常态搜索事件日志
	PluginStateCacheTTL      time.Duration // 插件状态缓存 TTL
	CacheWriteQueueSize      int           // 搜索缓存异步写队列长度
	CacheWriteWorkers        int           // 搜索缓存异步写 worker 数
	ProgressiveSearchEnabled bool          // 是否启用渐进式搜索
	// TMDB 热门榜单配置
	TMDBReadAccessToken          string
	TMDBAPIKey                   string
	TMDBBaseURL                  string
	TMDBDefaultLanguage          string
	TMDBDefaultRegion            string
	TMDBImageBaseURL             string
	TMDBRequestTimeout           time.Duration
	HotRankingPreloadEnabled     bool
	HotRankingPreloadTime        string
	HotRankingPreloadTimeout     time.Duration
	HotRankingPreloadConcurrency int
	HotRankingCacheTTLDay        time.Duration
	HotRankingCacheTTLWeek       time.Duration
	HotRankingCacheTTLMonth      time.Duration
	HotRankingCacheTTLYear       time.Duration
	// 认证相关配置
	AuthEnabled            bool              // 是否启用认证
	AuthUsers              map[string]string // 用户名:密码映射
	AuthTokenExpiry        time.Duration     // Token有效期
	AuthJWTSecret          string            // JWT签名密钥（向后兼容，优先使用密钥管理服务）
	ResourcePublicIDSecret string            // 公开资源 ID 派生密钥
	AuthUsernameMinLength  int               // 用户名最小长度
	AuthUsernameMaxLength  int               // 用户名最大长度
	AuthPasswordMinLength  int               // 密码最小长度
	AuthPasswordMaxLength  int               // 密码最大长度
	InitialAdminUsername   string            // 首次初始化管理员用户名
	InitialAdminPassword   string            // 首次初始化管理员密码

	// 密钥管理配置
	SecretBackend   string // 密钥后端类型（database 或 environment）
	SecretMasterKey string // 主密钥（用于加密数据库中的密钥）
	// API Key 相关配置
	APIKeyEnabled    bool          // 是否启用 API Key 认证
	APIKeyDefaultTTL time.Duration // API Key 默认有效期
	APIKeyStorePath  string        // API Key 存储路径

	// Refresh Token 相关配置
	RefreshTokenEnabled    bool          // 是否启用刷新令牌（记住密码）
	RefreshTokenStorage    string        // 刷新令牌存储类型（file 或 database）
	RefreshTokenTTL        time.Duration // 刷新令牌有效期
	RefreshTokenStorePath  string        // 刷新令牌存储路径（文件模式）
	RefreshTokenEncryptKey string        // 刷新令牌加密密钥
	// MySQL 数据库配置
	DBHost     string // 数据库主机地址
	DBPort     string // 数据库端口
	DBUser     string // 数据库用户名
	DBPassword string // 数据库密码
	DBName     string // 数据库名称

	// Redis 缓存配置（保留向后兼容）
	RedisHost     string        // Redis 主机地址
	RedisPort     string        // Redis 端口
	RedisPassword string        // Redis 密码（可选）
	RedisDB       int           // Redis 数据库编号
	RedisTTL      time.Duration // Redis 缓存过期时间

	// Redis 配置对象（推荐使用）
	Redis *RedisConfig // Redis 配置
}

// 全局配置实例
var AppConfig *Config

var defaultEnabledPlugins = []string{
	"labi", "shandian", "muou", "hunhepan", "pansearch", "susu",
	"thepiratebay", "u3c3", "jutoushe", "nyaa", "aikanzy", "quark4k",
	"quarksoo", "huban", "panwiki", "sidhub",
}

// DefaultEnabledPlugins 返回当前部署默认启用的内置插件清单。
func DefaultEnabledPlugins() []string {
	return append([]string(nil), defaultEnabledPlugins...)
}

func Init() {
	if err := InitWithError(); err != nil {
		panic(err)
	}
}

// InitWithError 初始化配置并返回生产基线校验错误。
func InitWithError() error {
	proxyURL := getProxyURL()
	pluginTimeoutSeconds := getPluginTimeout()
	asyncResponseTimeoutSeconds := getAsyncResponseTimeout()

	// 创建 Redis 配置对象
	redisConfig := &RedisConfig{
		Host:     getRedisHost(),
		Port:     getRedisPort(),
		Password: getRedisPassword(),
		DB:       getRedisDB(),
		TTL:      getRedisTTL(),
	}

	// 验证 Redis 配置
	if err := redisConfig.Validate(); err != nil {
		println("警告: Redis 配置验证失败:", err.Error())
		println("提示: 请检查 REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_TTL 环境变量")
	}

	AppConfig = &Config{
		AppEnv:         getAppEnv(),
		AllowedOrigins: getAllowedOrigins(),

		DefaultChannels:    getDefaultChannels(),
		DefaultConcurrency: getDefaultConcurrency(),
		Port:               getPort(),
		ProxyURL:           proxyURL,
		UseProxy:           proxyURL != "",
		HTTPProxyURL:       getHTTPProxyURL(),
		HTTPSProxyURL:      getHTTPSProxyURL(),
		// 搜索缓存总开关与本地目录兜底配置
		CacheEnabled: getCacheEnabled(),
		CachePath:    getCachePath(),
		// 压缩相关配置
		EnableCompression: getEnableCompression(),
		MinSizeToCompress: getMinSizeToCompress(),
		// GC相关配置
		GCPercent:      getGCPercent(),
		OptimizeMemory: getOptimizeMemory(),
		// 插件相关配置
		PluginTimeoutSeconds: pluginTimeoutSeconds,
		PluginTimeout:        time.Duration(pluginTimeoutSeconds) * time.Second,
		// 异步插件相关配置
		AsyncPluginEnabled:        getAsyncPluginEnabled(),
		EnabledPlugins:            getEnabledPlugins(),
		AsyncResponseTimeout:      asyncResponseTimeoutSeconds,
		AsyncResponseTimeoutDur:   time.Duration(asyncResponseTimeoutSeconds) * time.Second,
		AsyncMaxBackgroundWorkers: getAsyncMaxBackgroundWorkers(),
		AsyncMaxBackgroundTasks:   getAsyncMaxBackgroundTasks(),
		AsyncCacheTTLHours:        getAsyncCacheTTLHours(),
		AsyncLogEnabled:           getAsyncLogEnabled(),
		// HTTP服务器配置
		HTTPReadTimeout:  getHTTPReadTimeout(),
		HTTPWriteTimeout: getHTTPWriteTimeout(),
		HTTPIdleTimeout:  getHTTPIdleTimeout(),
		HTTPMaxConns:     getHTTPMaxConns(),
		// 搜索链路优化配置
		SearchEventLogEnabled:    getSearchEventLogEnabled(),
		PluginStateCacheTTL:      getPluginStateCacheTTL(),
		CacheWriteQueueSize:      getCacheWriteQueueSize(),
		CacheWriteWorkers:        getCacheWriteWorkers(),
		ProgressiveSearchEnabled: true,
		// TMDB 热门榜单配置
		TMDBReadAccessToken:          getTMDBReadAccessToken(),
		TMDBAPIKey:                   getTMDBAPIKey(),
		TMDBBaseURL:                  getTMDBBaseURL(),
		TMDBDefaultLanguage:          getTMDBDefaultLanguage(),
		TMDBDefaultRegion:            getTMDBDefaultRegion(),
		TMDBImageBaseURL:             getTMDBImageBaseURL(),
		TMDBRequestTimeout:           getTMDBRequestTimeout(),
		HotRankingPreloadEnabled:     getHotRankingPreloadEnabled(),
		HotRankingPreloadTime:        getHotRankingPreloadTime(),
		HotRankingPreloadTimeout:     getHotRankingPreloadTimeout(),
		HotRankingPreloadConcurrency: getHotRankingPreloadConcurrency(),
		HotRankingCacheTTLDay:        getHotRankingCacheTTL("HOT_RANKING_CACHE_TTL_DAY", 30*time.Minute),
		HotRankingCacheTTLWeek:       getHotRankingCacheTTL("HOT_RANKING_CACHE_TTL_WEEK", 2*time.Hour),
		HotRankingCacheTTLMonth:      getHotRankingCacheTTL("HOT_RANKING_CACHE_TTL_MONTH", 6*time.Hour),
		HotRankingCacheTTLYear:       getHotRankingCacheTTL("HOT_RANKING_CACHE_TTL_YEAR", 12*time.Hour),
		// 认证相关配置
		AuthEnabled:            getAuthEnabled(),
		AuthUsers:              getAuthUsers(),
		AuthTokenExpiry:        getAuthTokenExpiry(),
		AuthJWTSecret:          getAuthJWTSecret(),
		ResourcePublicIDSecret: getResourcePublicIDSecret(),
		AuthUsernameMinLength:  getAuthUsernameMinLength(),
		AuthUsernameMaxLength:  getAuthUsernameMaxLength(),
		AuthPasswordMinLength:  getAuthPasswordMinLength(),
		AuthPasswordMaxLength:  getAuthPasswordMaxLength(),
		InitialAdminUsername:   getInitialAdminUsername(),
		InitialAdminPassword:   getInitialAdminPassword(),

		// 密钥管理配置
		SecretBackend:   getSecretBackend(),
		SecretMasterKey: getSecretMasterKey(),
		// API Key 相关配置
		APIKeyEnabled:    getAPIKeyEnabled(),
		APIKeyDefaultTTL: getAPIKeyDefaultTTL(),
		APIKeyStorePath:  getAPIKeyStorePath(),

		// Refresh Token 相关配置
		RefreshTokenEnabled:    getRefreshTokenEnabled(),
		RefreshTokenStorage:    getRefreshTokenStorage(),
		RefreshTokenTTL:        getRefreshTokenTTL(),
		RefreshTokenStorePath:  getRefreshTokenStorePath(),
		RefreshTokenEncryptKey: getRefreshTokenEncryptKey(),
		// MySQL 数据库配置
		DBHost:     getDBHost(),
		DBPort:     getDBPort(),
		DBUser:     getDBUser(),
		DBPassword: getDBPassword(),
		DBName:     getDBName(),

		// Redis 缓存配置（向后兼容）
		RedisHost:     redisConfig.Host,
		RedisPort:     redisConfig.Port,
		RedisPassword: redisConfig.Password,
		RedisDB:       redisConfig.DB,
		RedisTTL:      redisConfig.TTL,

		// Redis 配置对象（推荐使用）
		Redis: redisConfig,
	}

	if err := validateProductionSecrets(AppConfig); err != nil {
		return err
	}
	if err := validateProductionCORS(AppConfig); err != nil {
		return err
	}

	// 应用GC配置
	applyGCSettings()
	return nil
}

// IsProduction 返回当前配置是否为生产环境。
func (c *Config) IsProduction() bool {
	if c == nil {
		return false
	}
	return c.AppEnv == "production"
}

func validateProductionCORS(cfg *Config) error {
	if cfg == nil || !cfg.IsProduction() {
		return nil
	}
	if len(cfg.AllowedOrigins) == 0 {
		return errors.New("ALLOWED_ORIGINS 未配置，生产环境拒绝启动")
	}
	for _, origin := range cfg.AllowedOrigins {
		if strings.TrimSpace(origin) == "*" {
			return errors.New("ALLOWED_ORIGINS 不能在生产环境使用通配符")
		}
	}
	return nil
}

func validateProductionSecrets(cfg *Config) error {
	if cfg == nil || !cfg.IsProduction() {
		return nil
	}

	requiredSecrets := map[string]string{
		"AUTH_JWT_SECRET":           cfg.AuthJWTSecret,
		"RESOURCE_PUBLIC_ID_SECRET": cfg.ResourcePublicIDSecret,
		"REFRESH_TOKEN_ENCRYPT_KEY": cfg.RefreshTokenEncryptKey,
		"SECRET_MASTER_KEY":         cfg.SecretMasterKey,
	}
	for name, value := range requiredSecrets {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return fmt.Errorf("%s 未配置，生产环境拒绝启动", name)
		}
		if isPlaceholderSecret(trimmed) {
			return fmt.Errorf("%s 仍为占位符，生产环境拒绝启动", name)
		}
		if len(trimmed) < 32 {
			return fmt.Errorf("%s 长度不足 32 字符，生产环境拒绝启动", name)
		}
	}
	if hasDuplicateSecretValues(requiredSecrets) {
		return errors.New("生产环境关键密钥不能使用相同值")
	}
	return nil
}

func isPlaceholderSecret(value string) bool {
	upper := strings.ToUpper(strings.TrimSpace(value))
	return strings.Contains(upper, "PLEASE_") ||
		strings.Contains(upper, "CHANGE_ME") ||
		strings.Contains(upper, "GENERATE_A") ||
		strings.Contains(upper, "PLACEHOLDER")
}

func hasDuplicateSecretValues(secrets map[string]string) bool {
	seen := make(map[string]string, len(secrets))
	for name, value := range secrets {
		normalized := strings.TrimSpace(value)
		if normalized == "" {
			continue
		}
		if previousName, exists := seen[normalized]; exists && previousName != name {
			return true
		}
		seen[normalized] = name
	}
	return false
}

// 应用GC设置
func applyGCSettings() {
	// 设置GC百分比
	debug.SetGCPercent(AppConfig.GCPercent)

	// 如果启用内存优化
	if AppConfig.OptimizeMemory {
		// 释放操作系统内存
		debug.FreeOSMemory()
	}
}
