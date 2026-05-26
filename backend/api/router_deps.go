package api

import "unisearch/service"

type RouterDeps struct {
	SearchService          *service.SearchService
	APIKeyService          *service.APIKeyService
	AuthService            *service.AuthService
	RefreshTokenService    *service.RefreshTokenService
	UserService            *service.UserService
	SystemSettingsService  *service.SystemSettingsService
	AnnouncementService    *service.AnnouncementService
	TGChannelService       *service.TGChannelService
	PluginHealthService    *service.PluginHealthService
	PluginStateService     *service.PluginStateService
	TGChannelHealthService *service.TGChannelHealthService
	AdminTagService        *service.AdminTagService
	HotRankingService      *service.HotRankingService
}
