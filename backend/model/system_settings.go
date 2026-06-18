package model

import (
	"time"
)

// SystemSettings 系统设置模型
type SystemSettings struct {
	ID                               uint      `gorm:"primaryKey" json:"id"`                                              // 设置ID（主键，自增）
	EnableUserAuth                   bool      `gorm:"not null;default:true" json:"enable_user_auth"`                     // 是否启用用户登录注册功能（默认启用）
	EnableUserLogin                  bool      `gorm:"not null;default:true" json:"enable_user_login"`                    // 是否启用用户登录功能（默认启用）
	EnableUserSignup                 bool      `gorm:"not null;default:true" json:"enable_user_signup"`                   // 是否启用用户注册功能（默认启用）
	AnnouncementEnabled              bool      `gorm:"not null;default:false" json:"announcement_enabled"`                // 是否启用公告功能（默认禁用）
	EnableResourceDetailPage         bool      `gorm:"not null;default:false" json:"enable_resource_detail_page"`         // 是否启用资源详情页展示（默认关闭）
	PublicSiteURL                    string    `gorm:"size:255;not null;default:''" json:"public_site_url"`               // 公开站点 URL（为空时由前端环境变量兜底）
	DefaultCopyFormatTemplate        string    `gorm:"size:1024;not null;default:''" json:"default_copy_format_template"` // API Key 复制默认模板
	CacheEnabled                     bool      `gorm:"not null;default:true" json:"cache_enabled"`                        // 是否启用搜索缓存总开关
	SearchCacheTTLSeconds            int       `gorm:"not null;default:3600" json:"search_cache_ttl_seconds"`             // 搜索缓存 TTL（秒）
	CacheWriteQueueSize              int       `gorm:"not null;default:256" json:"cache_write_queue_size"`                // 搜索缓存异步写队列长度
	CacheWriteWorkers                int       `gorm:"not null;default:4" json:"cache_write_workers"`                     // 搜索缓存异步写 worker 数
	HotRankingCacheEnabled           bool      `gorm:"not null;default:true" json:"hot_ranking_cache_enabled"`            // 是否启用热门榜单缓存
	HotRankingPreloadEnabled         bool      `gorm:"not null;default:true" json:"hot_ranking_preload_enabled"`          // 是否启用热门榜单预热
	HotRankingPreloadTime            string    `gorm:"size:5;not null;default:'00:00'" json:"hot_ranking_preload_time"`   // 热门榜单每日预热时间
	HotRankingPreloadLimit           int       `gorm:"not null;default:50" json:"hot_ranking_preload_limit"`              // 热门榜单预热条数
	HotRankingCacheTTLSeconds        int       `gorm:"not null;default:86400" json:"hot_ranking_cache_ttl_seconds"`       // 热门榜单缓存 TTL（秒）
	HotRankingPreloadConcurrency     int       `gorm:"not null;default:2" json:"hot_ranking_preload_concurrency"`         // 热门榜单预热并发
	HotRankingPreloadTimeoutSeconds  int       `gorm:"not null;default:30" json:"hot_ranking_preload_timeout_seconds"`    // 热门榜单预热超时（秒）
	RuntimeDefaultConcurrency        int       `gorm:"not null;default:50" json:"runtime_default_concurrency"`            // 搜索默认并发数
	RuntimeHTTPMaxConns              int       `gorm:"not null;default:1000" json:"runtime_http_max_conns"`               // HTTP 最大连接数
	RuntimeAsyncPluginEnabled        bool      `gorm:"not null;default:true" json:"runtime_async_plugin_enabled"`         // 是否启用异步插件
	RuntimeAsyncResponseTimeout      int       `gorm:"not null;default:4" json:"runtime_async_response_timeout"`          // 异步插件响应超时（秒）
	RuntimeAsyncMaxBackgroundWorkers int       `gorm:"not null;default:20" json:"runtime_async_max_background_workers"`   // 异步插件最大后台工作者
	RuntimeAsyncMaxBackgroundTasks   int       `gorm:"not null;default:100" json:"runtime_async_max_background_tasks"`    // 异步插件最大后台任务
	RuntimeProxyEnabled              bool      `gorm:"not null;default:false" json:"runtime_proxy_enabled"`               // 是否启用运行时代理
	RuntimeProxyURL                  string    `gorm:"size:512;not null;default:''" json:"runtime_proxy_url"`             // 运行时代理地址
	CreatedAt                        time.Time `json:"created_at"`                                                        // 创建时间
	UpdatedAt                        time.Time `json:"updated_at"`                                                        // 更新时间
}

// TableName 指定表名
func (SystemSettings) TableName() string {
	return "system_settings"
}
