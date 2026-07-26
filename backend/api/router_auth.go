package api

import (
	"github.com/gin-gonic/gin"
	"unisearch/api/controller"
)

func registerAuthRoutes(api *gin.RouterGroup, deps RouterDeps, authController *controller.AuthController) {
	auth := api.Group("/auth")
	auth.Use(BodySizeLimitMiddleware(authRequestBodyLimitBytes))
	auth.Use(SignupBanGuardMiddleware())
	{
		auth.POST("/register", registerRateLimitMiddleware(), SignupCircuitBreakerMiddleware(), authController.Register)
		auth.GET("/check-username", checkUsernameRateLimitMiddleware(), authController.CheckUsername)
		auth.POST("/login", loginRateLimitMiddleware(), func(c *gin.Context) {
			c.Set("refreshTokenService", deps.RefreshTokenService)
			authController.Login(c)
		})
		auth.GET("/validate", authController.ValidateToken)
		auth.POST("/refresh", EnforceSameOriginMiddleware(), refreshRateLimitMiddleware(), RefreshAccessTokenHandler(deps.RefreshTokenService))
		auth.POST("/revoke", EnforceSameOriginMiddleware(), RevokeRefreshTokenHandler(deps.RefreshTokenService))
		auth.POST("/verify", VerifyHandler)
		auth.POST("/logout", EnforceSameOriginMiddleware(), LogoutHandler)
	}

	api.POST("/admin/login", BodySizeLimitMiddleware(authRequestBodyLimitBytes), AdminLoginHandler)
	api.POST("/admin/login-remember", BodySizeLimitMiddleware(authRequestBodyLimitBytes), AdminLoginWithRememberHandler(deps.RefreshTokenService))
}
