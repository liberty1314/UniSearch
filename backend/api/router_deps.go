package api

import (
	"unisearch/service"
	"unisearch/util/cache"
)

type RouterDeps struct {
	RedisCache                *cache.RedisCache
	SearchService             *service.SearchService
	APIKeyService             *service.APIKeyService
	AuthService               *service.AuthService
	RefreshTokenService       *service.RefreshTokenService
	UserService               *service.UserService
	SystemSettingsService     *service.SystemSettingsService
	AnnouncementService       *service.AnnouncementService
	TGChannelService          *service.TGChannelService
	PluginHealthService       *service.PluginHealthService
	PluginMetricsCollector    *service.PluginMetricsCollector
	TGChannelMetricsCollector *service.TGChannelMetricsCollector
	PluginStateService        *service.PluginStateService
	PluginRuntimeConfig       *service.PluginRuntimeConfigService
	TGChannelHealthService    *service.TGChannelHealthService
	AdminTagService           *service.AdminTagService
	HotRankingService         *service.HotRankingService
	BannedIPService           *service.BannedIPService
}
