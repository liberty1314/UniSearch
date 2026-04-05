package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/database"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
	"unisearch/util"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type mockAccountSearchPlugin struct {
	name string
}

func (m *mockAccountSearchPlugin) Name() string { return m.name }
func (m *mockAccountSearchPlugin) Priority() int { return 1 }
func (m *mockAccountSearchPlugin) AsyncSearch(
	keyword string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	return m.Search(keyword, nil)
}
func (m *mockAccountSearchPlugin) SetMainCacheKey(_ string)      {}
func (m *mockAccountSearchPlugin) SetCurrentKeyword(_ string)    {}
func (m *mockAccountSearchPlugin) SkipServiceFilter() bool       { return false }
func (m *mockAccountSearchPlugin) Search(keyword string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return []model.SearchResult{
		{
			UniqueID: "mock-" + keyword,
			Title:    "mock " + keyword,
			Links: []model.Link{
				{Type: "mock", URL: "https://example.com/" + keyword},
			},
		},
	}, nil
}

func newAccountFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.SystemSettings{}, &model.RefreshToken{}); err != nil {
		t.Fatalf("auto migrate test db: %v", err)
	}

	database.SetDB(db)
	return db
}

func newAccountFlowRouter(t *testing.T, db *gorm.DB) *gin.Engine {
	t.Helper()

	config.AppConfig = &config.Config{
		AuthEnabled:          true,
		AuthJWTSecret:        "test-secret",
		AuthTokenExpiry:      time.Hour,
		RefreshTokenEnabled:  false,
		DefaultChannels:      []string{},
		DefaultConcurrency:   1,
		EnabledPlugins:       []string{"mock"},
		PluginTimeout:        time.Second,
		PluginTimeoutSeconds: 1,
	}

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAccountSearchPlugin{name: "mock"})

	searchService := service.NewSearchService(pm, nil, nil)
	authService := service.NewAuthService()
	userService := service.NewUserService(db)
	systemSettingsService := service.NewSystemSettingsService(db)

	return SetupRouter(
		searchService,
		nil,
		authService,
		nil,
		userService,
		systemSettingsService,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
}

func createAccountFlowUser(t *testing.T, db *gorm.DB, username, password string) model.User {
	t.Helper()

	passwordHash, err := util.HashPassword(password)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	user := model.User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         "user",
		IsEnabled:    true,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func issueJWT(t *testing.T, user model.User) string {
	t.Helper()

	token, err := util.GenerateJWTToken(user.ID, user.Username, user.Role, config.AppConfig.AuthJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("generate jwt: %v", err)
	}
	return token
}

func TestSearchRequiresAuthenticatedAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	router := newAccountFlowRouter(t, db)

	req := httptest.NewRequest(http.MethodPost, "/api/search", bytes.NewBufferString(`{"kw":"仙逆","src":"plugin","plugins":["mock"]}`))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if !bytes.Contains(recorder.Body.Bytes(), []byte("请先登录后再进行搜索")) {
		t.Fatalf("expected login-required message, got %s", recorder.Body.String())
	}
}

func TestSearchAllowsAuthenticatedAccountWithoutAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	req := httptest.NewRequest(http.MethodPost, "/api/search", bytes.NewBufferString(`{"kw":"仙逆","src":"plugin","plugins":["mock"]}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestLoginRejectsAPIKeyStylePasswordAsNormalCredential(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	body := bytes.NewBufferString(`{"username":"alice","password":"<API_KEY>"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestChangePasswordAllowsCurrentUserToUpdatePassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	payload, err := json.Marshal(map[string]string{
		"current_password": "password123",
		"new_password":     "new-password-456",
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/user/change-password", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	authService := service.NewAuthService()
	if _, _, _, err := authService.Login("alice", "new-password-456"); err != nil {
		t.Fatalf("expected new password login to succeed, got %v", err)
	}

	if _, _, _, err := authService.Login("alice", "password123"); err == nil {
		t.Fatal("expected old password login to fail after password change")
	}
}
