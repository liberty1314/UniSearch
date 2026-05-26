package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/api/controller"
)

func registerAuthRoutes(api *gin.RouterGroup, deps RouterDeps, authController *controller.AuthController) {
	auth := api.Group("/auth")
	{
		auth.POST("/register", authController.Register)
		auth.POST("/login", func(c *gin.Context) {
			c.Set("refreshTokenService", deps.RefreshTokenService)
			authController.Login(c)
		})
		auth.GET("/validate", authController.ValidateToken)
		auth.POST("/refresh", RefreshAccessTokenHandler(deps.RefreshTokenService))
		auth.POST("/revoke", RevokeRefreshTokenHandler(deps.RefreshTokenService))
		auth.POST("/verify", VerifyHandler)
		auth.POST("/logout", LogoutHandler)
	}

	api.POST("/admin/login", AdminLoginHandler)
	api.POST("/admin/login-remember", AdminLoginWithRememberHandler(deps.RefreshTokenService))
}
