package api

import "github.com/gin-gonic/gin"

func registerAnnouncementRoutes(api *gin.RouterGroup, deps RouterDeps) {
	announcements := api.Group("/announcements")
	announcements.Use(JWTMiddleware())
	{
		announcements.GET("/active", GetActiveAnnouncementsHandler(deps.AnnouncementService, deps.SystemSettingsService))
	}

	adminAnnouncements := api.Group("/announcements")
	adminAnnouncements.Use(JWTMiddleware())
	adminAnnouncements.Use(AdminMiddleware())
	{
		adminAnnouncements.POST("", CreateAnnouncementHandler(deps.AnnouncementService))
		adminAnnouncements.PUT("/:id", UpdateAnnouncementHandler(deps.AnnouncementService))
		adminAnnouncements.DELETE("/:id", DeleteAnnouncementHandler(deps.AnnouncementService))
		adminAnnouncements.GET("", ListAnnouncementsHandler(deps.AnnouncementService))
		adminAnnouncements.GET("/:id", GetAnnouncementHandler(deps.AnnouncementService))
		adminAnnouncements.POST("/:id/status", SetAnnouncementStatusHandler(deps.AnnouncementService))
	}
}
