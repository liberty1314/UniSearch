package model

import (
	"time"
)

// SystemSettings 系统设置模型
type SystemSettings struct {
	ID                               uint      `gorm:"primaryKey" json:"id"`                                                // 设置ID（主键，自增）
	EnableUserAuth                   bool      `gorm:"not null;default:true" json:"enable_user_auth"`                       // 是否启用用户登录注册功能（默认启用）
	EnableUserLogin                  bool      `gorm:"not null;default:true" json:"enable_user_login"`                      // 是否启用用户登录功能（默认启用）
	EnableUserSignup                 bool      `gorm:"not null;default:true" json:"enable_user_signup"`                     // 是否启用用户注册功能（默认启用）
	SignupAutobanEnabled             bool      `gorm:"not null;default:true" json:"signup_autoban_enabled"`                 // 是否启用注册 IP 自动封禁（默认启用）
	SignupAutobanThreshold           int       `gorm:"not null;default:30" json:"signup_autoban_threshold"`                 // 触发窗口内注册请求数超过该值即自动封禁
	SignupAutobanWindowMin           int       `gorm:"not null;default:10" json:"signup_autoban_window_min"`                // 自动封禁触发统计窗口（分钟）
	SignupAutobanDurationMin         int       `gorm:"not null;default:1440" json:"signup_autoban_duration_min"`            // 自动封禁时长（分钟，0=永久）
	EnableSignupCaptcha              bool      `gorm:"not null;default:false" json:"enable_signup_captcha"`                 // 是否启用注册人机验证（默认关闭）
	SignupCaptchaProvider            string    `gorm:"size:32;not null;default:'turnstile'" json:"signup_captcha_provider"` // 注册人机验证提供方（默认 turnstile）
	AnnouncementEnabled              bool      `gorm:"not null;default:false" json:"announcement_enabled"`                  // 是否启用公告功能（默认禁用）
	EnableResourceDetailPage         bool      `gorm:"not null;default:false" json:"enable_resource_detail_page"`           // 是否启用资源详情页展示（默认关闭）
	EnableResourceSourceBadges       bool      `gorm:"not null;default:false" json:"enable_resource_source_badges"`         // 是否展示搜索结果来源标签（默认关闭）
	EnableSearchSourceDiversity      bool      `gorm:"not null;default:false" json:"enable_search_source_diversity"`        // 是否启用搜索结果首屏来源配额（默认关闭）
	SearchFirstPageMaxPerSource      int       `gorm:"not null;default:16" json:"search_first_page_max_per_source"`         // 首屏每个来源最多展示条数
	PublicSiteURL                    string    `gorm:"size:255;not null;default:''" json:"public_site_url"`                 // 公开站点 URL（为空时由前端环境变量兜底）
	DefaultCopyFormatTemplate        string    `gorm:"size:1024;not null;default:''" json:"default_copy_format_template"`   // API Key 复制默认模板
	CacheEnabled                     bool      `gorm:"not null;default:true" json:"cache_enabled"`                          // 是否启用搜索缓存总开关
	SearchCacheTTLSeconds            int       `gorm:"not null;default:3600" json:"search_cache_ttl_seconds"`               // 搜索缓存 TTL（秒）
	CacheWriteQueueSize              int       `gorm:"not null;default:256" json:"cache_write_queue_size"`                  // 搜索缓存异步写队列长度
	CacheWriteWorkers                int       `gorm:"not null;default:4" json:"cache_write_workers"`                       // 搜索缓存异步写 worker 数
	HotRankingCacheEnabled           bool      `gorm:"not null;default:true" json:"hot_ranking_cache_enabled"`              // 是否启用热门榜单缓存
	HotRankingPreloadEnabled         bool      `gorm:"not null;default:true" json:"hot_ranking_preload_enabled"`            // 是否启用热门榜单预热
	HotRankingPreloadTime            string    `gorm:"size:5;not null;default:'00:00'" json:"hot_ranking_preload_time"`     // 热门榜单每日预热时间
	HotRankingPreloadLimit           int       `gorm:"not null;default:50" json:"hot_ranking_preload_limit"`                // 热门榜单预热条数
	HotRankingCacheTTLSeconds        int       `gorm:"not null;default:86400" json:"hot_ranking_cache_ttl_seconds"`         // 热门榜单缓存 TTL（秒）
	HotRankingPreloadConcurrency     int       `gorm:"not null;default:2" json:"hot_ranking_preload_concurrency"`           // 热门榜单预热并发
	HotRankingPreloadTimeoutSeconds  int       `gorm:"not null;default:30" json:"hot_ranking_preload_timeout_seconds"`      // 热门榜单预热超时（秒）
	RuntimeDefaultConcurrency        int       `gorm:"not null;default:50" json:"runtime_default_concurrency"`              // 搜索默认并发数
	RuntimeHTTPMaxConns              int       `gorm:"not null;default:1000" json:"runtime_http_max_conns"`                 // HTTP 最大连接数
	RuntimeAsyncPluginEnabled        bool      `gorm:"not null;default:true" json:"runtime_async_plugin_enabled"`           // 是否启用异步插件
	RuntimeAsyncResponseTimeout      int       `gorm:"not null;default:4" json:"runtime_async_response_timeout"`            // 异步插件响应超时（秒）
	RuntimeAsyncMaxBackgroundWorkers int       `gorm:"not null;default:20" json:"runtime_async_max_background_workers"`     // 异步插件最大后台工作者
	RuntimeAsyncMaxBackgroundTasks   int       `gorm:"not null;default:100" json:"runtime_async_max_background_tasks"`      // 异步插件最大后台任务
	RuntimeProxyEnabled              bool      `gorm:"not null;default:false" json:"runtime_proxy_enabled"`                 // 是否启用运行时代理
	RuntimeProxyURL                  string    `gorm:"size:512;not null;default:''" json:"runtime_proxy_url"`               // 运行时代理地址
	RuntimeProgressiveSearchEnabled  bool      `gorm:"not null;default:true" json:"runtime_progressive_search_enabled"`     // 是否启用渐进式搜索
	SearchAuditEnabled               bool      `gorm:"not null;default:true" json:"search_audit_enabled"`                   // 是否启用搜索审计日志（默认启用）
	SearchAuditRetentionDays         int       `gorm:"not null;default:30" json:"search_audit_retention_days"`              // 搜索审计日志留存天数
	AdminAuditRetentionDays          int       `gorm:"not null;default:90" json:"admin_audit_retention_days"`               // 操作审计日志留存天数
	CreatedAt                        time.Time `json:"created_at"`                                                          // 创建时间
	UpdatedAt                        time.Time `json:"updated_at"`                                                          // 更新时间
}

// TableName 指定表名
func (SystemSettings) TableName() string {
	return "system_settings"
}
