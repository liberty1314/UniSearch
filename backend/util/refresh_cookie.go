package util

import (
	"net/http"
	"time"
	"unisearch/config"

	"github.com/gin-gonic/gin"
)

// RefreshTokenCookieName 刷新令牌 httpOnly cookie 名称。
const RefreshTokenCookieName = "refresh_token"

// RefreshTokenCookiePath 将 cookie 作用域限制在刷新/撤销端点，减少随每个请求发送的面。
// 注意：需与实际路由前缀一致（/api/auth/refresh、/api/auth/revoke）。
const RefreshTokenCookiePath = "/api/auth"

// SetRefreshTokenCookie 以 httpOnly cookie 形式下发刷新令牌。
// 生产环境要求 Secure（仅 HTTPS），SameSite=Strict 降低 CSRF 面；
// maxAge 取刷新令牌有效期（秒）。rawToken 只在服务端生成时和该 Cookie 中存在。
func SetRefreshTokenCookie(c *gin.Context, rawToken string) {
	maxAge := 0
	if config.AppConfig != nil {
		maxAge = int(config.AppConfig.RefreshTokenTTL.Seconds())
	}
	if maxAge <= 0 {
		maxAge = int((720 * time.Hour).Seconds())
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    rawToken,
		Path:     RefreshTokenCookiePath,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   isProductionCookie(),
		SameSite: http.SameSiteStrictMode,
	})
}

// ClearRefreshTokenCookie 通过下发一个立即过期的同名 cookie 清除刷新令牌（登出）。
func ClearRefreshTokenCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "",
		Path:     RefreshTokenCookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isProductionCookie(),
		SameSite: http.SameSiteStrictMode,
	})
}

// ReadRefreshTokenCookie 从请求 cookie 读取刷新令牌，不存在时返回空串。
// 直接读原始 Cookie 值，与 http.SetCookie 的原样写入保持一致。
func ReadRefreshTokenCookie(c *gin.Context) string {
	cookie, err := c.Request.Cookie(RefreshTokenCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func isProductionCookie() bool {
	return config.AppConfig != nil && config.AppConfig.IsProduction()
}
