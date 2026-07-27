package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/service"
	"unisearch/util"
)

// enforceTokenState 在 JWT 验签通过后追加两项运行时校验：
//  1. JTI 是否在吊销名单（登出精确失效）；
//  2. claims.TokenVersion 是否与用户当前版本一致（改密/封禁批量失效）。
//
// 校验不通过时写稳定错误并中止请求；通过时返回数据库当前账户状态。
func enforceTokenState(c *gin.Context, authService *service.AuthService, claims *util.JWTClaims) (*service.UserAuthState, bool) {
	ctx := c.Request.Context()

	if tokenRevocationService != nil && claims.ID != "" {
		if tokenRevocationService.IsRevoked(ctx, claims.ID) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "登录状态已失效，请重新登录",
				"code":  "TOKEN_REVOKED",
			})
			c.Abort()
			return nil, false
		}
	}

	state, err := authService.LoadUserAuthState(ctx, claims.UserID)
	if errors.Is(err, service.ErrAuthStateUnavailable) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "账户状态暂时不可用",
			"code":  "AUTH_STATE_UNAVAILABLE",
		})
		c.Abort()
		return nil, false
	}
	if err != nil || state == nil || !state.IsEnabled || state.TokenVersion != claims.TokenVersion {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "登录状态已失效，请重新登录",
			"code":  "ACCOUNT_SESSION_INVALID",
		})
		c.Abort()
		return nil, false
	}

	return state, true
}

// revokeRequestAccessToken 将当前请求携带的 access token 的 JTI 加入吊销名单，
// 用于登出时使该 access token 立即失效（TTL 取其剩余有效期）。
// 无 Token、解析失败或吊销服务未初始化时静默跳过。
func revokeRequestAccessToken(c *gin.Context) {
	if tokenRevocationService == nil {
		return
	}
	token := extractBearerToken(c)
	if token == "" {
		return
	}
	claims, err := util.ValidateJWTToken(token, config.AppConfig.AuthJWTSecret)
	if err != nil || claims.ID == "" {
		return
	}
	ttl := time.Duration(0)
	if claims.ExpiresAt != nil {
		ttl = time.Until(claims.ExpiresAt.Time)
	}
	if ttl <= 0 {
		return
	}
	_ = tokenRevocationService.Revoke(c.Request.Context(), claims.ID, ttl)
}
