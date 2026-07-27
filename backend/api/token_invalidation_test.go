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

// TestAdminRoleChangeInvalidatesExistingAdminToken 验证管理员降级后，旧 JWT 不再具备管理员权限。
func TestAdminRoleChangeInvalidatesExistingAdminToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := newAccountFlowTestDB(t)
	admin := createAccountFlowUser(t, db, "role-admin", "password123")
	if err := db.Model(&admin).Update("role", "admin").Error; err != nil {
		t.Fatalf("设置管理员角色失败: %v", err)
	}
	admin.Role = "admin"
	config.AppConfig = &config.Config{AuthJWTSecret: "test-secret", AuthTokenExpiry: time.Hour}

	authService := service.NewAuthService(db, service.NewSystemSettingsService(db))

	router := gin.New()
	router.GET("/admin/probe", JWTMiddleware(authService), AdminMiddleware(), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	token := issueJWT(t, admin)
	if _, err := service.NewUserService(db, service.NewAccountSessionService()).UpdateUser(admin.ID, admin.Username, "user", 999); err != nil {
		t.Fatalf("降级管理员失败: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/admin/probe", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized && resp.Code != http.StatusForbidden {
		t.Fatalf("期望旧管理员令牌被拒绝，实际为 %d: %s", resp.Code, resp.Body.String())
	}
}

func TestAuthStateDatabaseFailureReturnsServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "state-unavailable", "password123")
	config.AppConfig.AuthJWTSecret = "test-secret"
	config.AppConfig.AuthTokenExpiry = time.Hour
	authService := service.NewAuthService(db, service.NewSystemSettingsService(db))

	router := gin.New()
	router.GET("/protected", JWTMiddleware(authService), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	token := issueJWT(t, user)

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("读取底层数据库失败: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("关闭数据库失败: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusServiceUnavailable {
		t.Fatalf("期望账户状态不可用返回 503，实际为 %d: %s", resp.Code, resp.Body.String())
	}
	if !bytes.Contains(resp.Body.Bytes(), []byte("AUTH_STATE_UNAVAILABLE")) {
		t.Fatalf("期望稳定错误码 AUTH_STATE_UNAVAILABLE，实际为 %s", resp.Body.String())
	}
}
