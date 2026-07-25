package api

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/util"
)

// tokenVersionCacheTTL 为用户当前 TokenVersion 的本地缓存有效期。
// 取较短值以保证改密/封禁后的失效及时性，同时避免每次请求都打库。
const tokenVersionCacheTTL = 30 * time.Second

type tokenVersionCacheEntry struct {
	version   int
	expiresAt time.Time
}

var (
	tokenVersionCacheMu sync.Mutex
	tokenVersionCache   = make(map[uint]tokenVersionCacheEntry)
)

// currentTokenVersion 返回用户当前 TokenVersion，带短 TTL 缓存以降低数据库压力。
// 查询失败时回退到缓存旧值（若有），否则返回 (0,false) 交由调用方决定放行策略。
func currentTokenVersion(userID uint) (int, bool) {
	if userID == 0 || authService == nil {
		return 0, false
	}

	now := time.Now()
	tokenVersionCacheMu.Lock()
	if entry, ok := tokenVersionCache[userID]; ok && now.Before(entry.expiresAt) {
		tokenVersionCacheMu.Unlock()
		return entry.version, true
	}
	tokenVersionCacheMu.Unlock()

	version, err := authService.GetTokenVersion(userID)
	if err != nil {
		// 查库失败：回退到缓存旧值（即使已过期），避免误伤在线用户。
		tokenVersionCacheMu.Lock()
		defer tokenVersionCacheMu.Unlock()
		if entry, ok := tokenVersionCache[userID]; ok {
			return entry.version, true
		}
		return 0, false
	}

	tokenVersionCacheMu.Lock()
	tokenVersionCache[userID] = tokenVersionCacheEntry{
		version:   version,
		expiresAt: now.Add(tokenVersionCacheTTL),
	}
	tokenVersionCacheMu.Unlock()
	return version, true
}

// invalidateTokenVersionCache 清除指定用户的版本缓存，用于改密/封禁后立即生效。
func invalidateTokenVersionCache(userID uint) {
	tokenVersionCacheMu.Lock()
	delete(tokenVersionCache, userID)
	tokenVersionCacheMu.Unlock()
}

// resetTokenVersionCache 清空整个版本缓存。用于测试隔离，避免跨用例的用户 ID 复用导致缓存串扰。
func resetTokenVersionCache() {
	tokenVersionCacheMu.Lock()
	tokenVersionCache = make(map[uint]tokenVersionCacheEntry)
	tokenVersionCacheMu.Unlock()
}

// enforceTokenState 在 JWT 验签通过后追加两项运行时校验：
//  1. JTI 是否在吊销名单（登出精确失效）；
//  2. claims.TokenVersion 是否与用户当前版本一致（改密/封禁批量失效）。
// 校验不通过时写 401 并 abort，返回 false；通过返回 true。
func enforceTokenState(c *gin.Context, claims *util.JWTClaims) bool {
	ctx := c.Request.Context()

	if tokenRevocationService != nil && claims.ID != "" {
		if tokenRevocationService.IsRevoked(ctx, claims.ID) {
			c.JSON(401, gin.H{
				"error": "登录状态已失效，请重新登录",
				"code":  "TOKEN_REVOKED",
			})
			c.Abort()
			return false
		}
	}

	if current, ok := currentTokenVersion(claims.UserID); ok && claims.TokenVersion != current {
		c.JSON(401, gin.H{
			"error": "登录状态已失效，请重新登录",
			"code":  "TOKEN_VERSION_MISMATCH",
		})
		c.Abort()
		return false
	}

	return true
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
