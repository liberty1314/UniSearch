package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"unisearch/config"
	"unisearch/service"
)

// doAuthedSearch 用给定 token 发起一次搜索请求，返回响应记录器。
// 搜索接口走 SearchJWTMiddleware，可用于验证 token 运行时有效性。
func doAuthedSearch(router *gin.Engine, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/search", bytes.NewBufferString(`{"kw":"仙逆","src":"plugin","plugins":["mock"]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

// TestChangePasswordInvalidatesExistingTokens 验证改密后旧 access token（低版本）立即失效。
func TestChangePasswordInvalidatesExistingTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetTokenVersionCache()
	defer resetTokenVersionCache()
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	oldToken := issueJWT(t, user)

	// 改密前旧 token 可正常搜索。
	if w := doAuthedSearch(router, oldToken); w.Code != http.StatusOK {
		t.Fatalf("改密前旧 token 应可用，实际 %d: %s", w.Code, w.Body.String())
	}

	// 改密（TokenVersion 递增）。
	payload, _ := json.Marshal(map[string]string{
		"current_password": "password123",
		"new_password":     "Str0ng-New-Pw!",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/user/change-password", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+oldToken)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("改密期望 200，实际 %d: %s", recorder.Code, recorder.Body.String())
	}

	// 改密后旧 token（TokenVersion 落后）应失效。
	if w := doAuthedSearch(router, oldToken); w.Code != http.StatusUnauthorized {
		t.Fatalf("改密后旧 token 应失效返回 401，实际 %d: %s", w.Code, w.Body.String())
	}
}

// TestLogoutRevokesAccessTokenJTI 验证登出后该 access token 的 JTI 被吊销，立即失效。
func TestLogoutRevokesAccessTokenJTI(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetTokenVersionCache()
	defer resetTokenVersionCache()
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "bob", "password123")
	router := newAccountFlowRouter(t, db)

	// 注入内存吊销服务。
	SetTokenRevocationService(service.NewTokenRevocationService(nil))
	defer SetTokenRevocationService(nil)

	token := issueJWT(t, user)

	if w := doAuthedSearch(router, token); w.Code != http.StatusOK {
		t.Fatalf("登出前 token 应可用，实际 %d: %s", w.Code, w.Body.String())
	}

	// 调用 logout（携带该 access token）。
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+token)
	logoutRec := httptest.NewRecorder()
	router.ServeHTTP(logoutRec, logoutReq)
	if logoutRec.Code != http.StatusOK {
		t.Fatalf("登出期望 200，实际 %d: %s", logoutRec.Code, logoutRec.Body.String())
	}

	// 登出后同一 token 应被吊销名单拦截。
	if w := doAuthedSearch(router, token); w.Code != http.StatusUnauthorized {
		t.Fatalf("登出后 token 应失效返回 401，实际 %d: %s", w.Code, w.Body.String())
	}
}

// TestTokenVersionCacheReflectsBumpAfterTTL 验证版本缓存在 TTL 内命中、清理后回源。
func TestTokenVersionCacheReflectsBumpAfterTTL(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "carol", "password123")
	// 初始化 authService 供 currentTokenVersion 使用。
	SetAuthService(service.NewAuthService())
	defer SetAuthService(nil)
	config.AppConfig.AuthTokenExpiry = time.Hour
	resetTokenVersionCache()
	defer resetTokenVersionCache()

	version, ok := currentTokenVersion(user.ID)
	if !ok || version != 0 {
		t.Fatalf("初始版本应为 0，实际 version=%d ok=%v", version, ok)
	}

	// 直接改库递增版本，但缓存仍在 TTL 内 → 仍返回旧值。
	if err := db.Model(user).Update("token_version", 5).Error; err != nil {
		t.Fatalf("update token_version: %v", err)
	}
	if version, _ := currentTokenVersion(user.ID); version != 0 {
		t.Fatalf("TTL 内应命中缓存旧值 0，实际 %d", version)
	}

	// 清理缓存后回源，取到新值。
	invalidateTokenVersionCache(user.ID)
	if version, _ := currentTokenVersion(user.ID); version != 5 {
		t.Fatalf("清理缓存后应回源取到 5，实际 %d", version)
	}
}
