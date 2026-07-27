package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
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

func (m *mockAccountSearchPlugin) Name() string  { return m.name }
func (m *mockAccountSearchPlugin) Priority() int { return 1 }
func (m *mockAccountSearchPlugin) AsyncSearch(
	keyword string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	result, err := m.SearchWithResult(keyword, nil)
	if err != nil {
		return nil, err
	}
	return result.GetResults(), nil
}
func (m *mockAccountSearchPlugin) SetMainCacheKey(_ string)   {}
func (m *mockAccountSearchPlugin) SetCurrentKeyword(_ string) {}
func (m *mockAccountSearchPlugin) SkipServiceFilter() bool    { return false }
func (m *mockAccountSearchPlugin) SearchWithResult(keyword string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{
		Results: []model.SearchResult{{
			UniqueID: "mock-" + keyword,
			Title:    "mock " + keyword,
			Links: []model.Link{
				{Type: "mock", URL: "https://example.com/" + keyword},
			},
		}},
		IsFinal: true,
		Source:  m.name,
	}, nil
}

func newAccountFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.SystemSettings{}, &model.RefreshTokenSession{}, &model.UserLoginDailyStat{}); err != nil {
		t.Fatalf("auto migrate test db: %v", err)
	}

	database.SetDB(db)
	return db
}

func newAccountFlowRouter(t *testing.T, db *gorm.DB) *gin.Engine {
	t.Helper()

	return newAccountFlowRouterWithRefreshService(t, db, nil)
}

func newAccountFlowRouterWithRefreshService(t *testing.T, db *gorm.DB, refreshTokenService *service.RefreshTokenService) *gin.Engine {
	t.Helper()

	config.AppConfig = &config.Config{
		AuthEnabled:           true,
		AuthJWTSecret:         "test-secret",
		AuthTokenExpiry:       time.Hour,
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
		RefreshTokenEnabled:   false,
		DefaultChannels:       []string{},
		DefaultConcurrency:    1,
		EnabledPlugins:        []string{"mock"},
		PluginTimeout:         time.Second,
		PluginTimeoutSeconds:  1,
	}

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAccountSearchPlugin{name: "mock"})

	searchService := service.NewSearchService(pm, nil, nil)
	systemSettingsService := service.NewSystemSettingsService(db)
	authService := service.NewAuthService(db, systemSettingsService)
	userService := service.NewUserService(db, service.NewAccountSessionService())

	return SetupRouter(RouterDeps{
		SearchService:         searchService,
		AuthService:           authService,
		RefreshTokenService:   refreshTokenService,
		UserService:           userService,
		SystemSettingsService: systemSettingsService,
	})
}

func newAccountFlowRefreshTokenService(t *testing.T, db *gorm.DB) *service.RefreshTokenService {
	t.Helper()

	refreshTokenService, err := service.NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("create refresh token service: %v", err)
	}

	return refreshTokenService
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

// findResponseCookie 从响应的 Set-Cookie 中查找指定名称的 cookie，未找到返回 nil。
func findResponseCookie(recorder *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name == name {
			return cookie
		}
	}
	return nil
}

func issueJWT(t *testing.T, user model.User) string {
	t.Helper()

	token, err := util.GenerateJWTToken(user.ID, user.Username, user.Role, user.TokenVersion, config.AppConfig.AuthJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("generate jwt: %v", err)
	}
	return token
}

type authEnvelope struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type loginPayload struct {
	AccessToken string `json:"access_token"`
	ExpiresAt   int64  `json:"expires_at"`
	Username    string `json:"username"`
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

func TestSearchRecordsDailyLoginStatForAuthenticatedAccount(t *testing.T) {
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

	today := time.Now().Format("2006-01-02")
	var stat model.UserLoginDailyStat
	if err := db.Where("user_id = ? AND login_date = ?", user.ID, today).First(&stat).Error; err != nil {
		t.Fatalf("expected daily login stat for search request: %v", err)
	}
	if stat.LoginCount != 1 {
		t.Fatalf("expected login_count to be 1 after one search-triggered stat, got %d", stat.LoginCount)
	}

	var refreshedUser model.User
	if err := db.First(&refreshedUser, user.ID).Error; err != nil {
		t.Fatalf("reload user: %v", err)
	}
	if refreshedUser.LastLoginAt == nil {
		t.Fatal("expected search request to refresh last_login_at")
	}
}

func TestAuthenticatedUserRequestRecordsDailyActivityStat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	req := httptest.NewRequest(http.MethodGet, "/api/user/me", nil)
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	today := time.Now().Format("2006-01-02")
	var stat model.UserLoginDailyStat
	if err := db.Where("user_id = ? AND login_date = ?", user.ID, today).First(&stat).Error; err != nil {
		t.Fatalf("expected daily activity stat for authenticated request: %v", err)
	}
	if stat.LoginCount != 1 {
		t.Fatalf("expected login_count to stay at 1 for the first authenticated activity, got %d", stat.LoginCount)
	}

	var refreshedUser model.User
	if err := db.First(&refreshedUser, user.ID).Error; err != nil {
		t.Fatalf("reload user: %v", err)
	}
	if refreshedUser.LastLoginAt == nil {
		t.Fatal("expected authenticated request to refresh last_login_at")
	}
}

func TestGetCurrentUserReturnsCurrentMonthLoginSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	now := time.Now()
	monthDay := time.Date(now.Year(), now.Month(), 2, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	previousMonthDay := time.Date(now.Year(), now.Month()-1, 2, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	if err := db.Create(&model.UserLoginDailyStat{UserID: user.ID, LoginDate: monthDay, LoginCount: 1}).Error; err != nil {
		t.Fatalf("create current month login stat: %v", err)
	}
	if err := db.Create(&model.UserLoginDailyStat{UserID: user.ID, LoginDate: previousMonthDay, LoginCount: 1}).Error; err != nil {
		t.Fatalf("create previous month login stat: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/user/me", nil)
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Code int `json:"code"`
		Data struct {
			MonthlyLoginDays     []string `json:"monthly_login_days"`
			MonthlyLoginDayCount int      `json:"monthly_login_day_count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	today := now.Format("2006-01-02")
	expectedDays := map[string]bool{
		monthDay: true,
		today:    true,
	}
	if response.Data.MonthlyLoginDayCount != len(expectedDays) {
		t.Fatalf("expected %d current month login days, got %d (%v)", len(expectedDays), response.Data.MonthlyLoginDayCount, response.Data.MonthlyLoginDays)
	}
	for _, day := range response.Data.MonthlyLoginDays {
		if !expectedDays[day] {
			t.Fatalf("unexpected login day %s in response: %v", day, response.Data.MonthlyLoginDays)
		}
	}
}

func TestAuthenticatedUserRequestDoesNotIncrementExistingDailyStat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	authService := service.NewAuthService(db, service.NewSystemSettingsService(db))
	if _, _, _, err := authService.Login("alice", "password123"); err != nil {
		t.Fatalf("expected login to succeed, got %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/user/me", nil)
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	today := time.Now().Format("2006-01-02")
	var stat model.UserLoginDailyStat
	if err := db.Where("user_id = ? AND login_date = ?", user.ID, today).First(&stat).Error; err != nil {
		t.Fatalf("expected existing daily stat to remain queryable: %v", err)
	}
	if stat.LoginCount != 1 {
		t.Fatalf("expected authenticated activity to preserve existing daily login_count, got %d", stat.LoginCount)
	}
}

func TestLoginRejectsAPIKeyStylePasswordAsNormalCredential(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	apiKeyStylePassword := "sk-" + strings.Repeat("1", 40)
	payload, err := json.Marshal(map[string]string{
		"username": "alice",
		"password": apiKeyStylePassword,
	})
	if err != nil {
		t.Fatalf("编码登录请求失败: %v", err)
	}
	body := bytes.NewReader(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestRegisterReturnsUnifiedLoginPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	router := newAccountFlowRouter(t, db)

	body := bytes.NewBufferString(`{"username":"neo","password":"Secret123!"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response authEnvelope
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal register response: %v", err)
	}
	if response.Code != http.StatusOK {
		t.Fatalf("expected response code 200, got %d", response.Code)
	}

	var payload loginPayload
	if err := json.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("unmarshal register payload: %v", err)
	}

	if payload.AccessToken == "" {
		t.Fatal("expected register response to include access_token")
	}
	if payload.ExpiresAt <= 0 {
		t.Fatalf("expected positive expires_at, got %d", payload.ExpiresAt)
	}
	if payload.Username != "neo" {
		t.Fatalf("expected username neo, got %s", payload.Username)
	}
}

func TestCheckUsernameReturnsAvailabilityAndValidationState(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	originalMinLength := config.AppConfig.AuthUsernameMinLength
	config.AppConfig.AuthUsernameMinLength = 5
	defer func() {
		config.AppConfig.AuthUsernameMinLength = originalMinLength
	}()

	testCases := []struct {
		name           string
		username       string
		expectedStatus int
		expectedCode   int
		expectedData   bool
		expectedMsg    string
	}{
		{
			name:           "已存在用户名",
			username:       "alice",
			expectedStatus: http.StatusOK,
			expectedCode:   http.StatusOK,
			expectedData:   false,
			expectedMsg:    "success",
		},
		{
			name:           "可用用户名",
			username:       "matrix",
			expectedStatus: http.StatusOK,
			expectedCode:   http.StatusOK,
			expectedData:   true,
			expectedMsg:    "success",
		},
		{
			name:           "空用户名",
			username:       "   ",
			expectedStatus: http.StatusBadRequest,
			expectedCode:   http.StatusBadRequest,
			expectedData:   false,
			expectedMsg:    "用户名不能为空",
		},
		{
			name:           "长度不合法",
			username:       "neo",
			expectedStatus: http.StatusBadRequest,
			expectedCode:   http.StatusBadRequest,
			expectedData:   false,
			expectedMsg:    "用户名长度必须在5-32字符之间",
		},
	}

	for index, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/auth/check-username?username="+url.QueryEscape(tc.username), nil)
			req.RemoteAddr = fmt.Sprintf("198.51.100.%d:12345", index+10)
			recorder := httptest.NewRecorder()

			router.ServeHTTP(recorder, req)

			if recorder.Code != tc.expectedStatus {
				t.Fatalf("expected %d, got %d: %s", tc.expectedStatus, recorder.Code, recorder.Body.String())
			}

			var response struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
				Data    bool   `json:"data"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("unmarshal response: %v", err)
			}

			if response.Code != tc.expectedCode {
				t.Fatalf("expected response code %d, got %d", tc.expectedCode, response.Code)
			}
			if response.Data != tc.expectedData {
				t.Fatalf("expected data %v, got %v", tc.expectedData, response.Data)
			}
			if response.Message != tc.expectedMsg {
				t.Fatalf("expected message %q, got %q", tc.expectedMsg, response.Message)
			}
		})
	}
}

func TestLoginRecordsDailyLoginStat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	createAccountFlowUser(t, db, "alice", "password123")

	authService := service.NewAuthService(db, service.NewSystemSettingsService(db))
	if _, _, _, err := authService.Login("alice", "password123"); err != nil {
		t.Fatalf("expected first login to succeed, got %v", err)
	}
	if _, _, _, err := authService.Login("alice", "password123"); err != nil {
		t.Fatalf("expected second login to succeed, got %v", err)
	}

	today := time.Now().Format("2006-01-02")
	var stat model.UserLoginDailyStat
	if err := db.Where("login_date = ?", today).First(&stat).Error; err != nil {
		t.Fatalf("expected daily login stat for today: %v", err)
	}
	if stat.LoginCount != 2 {
		t.Fatalf("expected login_count to be 2, got %d", stat.LoginCount)
	}
}

func TestUserLoginReturnsRateLimitExceededAfterThreshold(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	originalLimiter := userLoginRateLimiter
	userLoginRateLimiter = NewRateLimiter(1, time.Minute)
	defer func() {
		userLoginRateLimiter = originalLimiter
	}()

	makeRequest := func() *httptest.ResponseRecorder {
		body := bytes.NewBufferString(`{"username":"alice","password":"wrong-password"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		return recorder
	}

	first := makeRequest()
	if first.Code != http.StatusUnauthorized {
		t.Fatalf("expected first request to be 401, got %d: %s", first.Code, first.Body.String())
	}

	second := makeRequest()
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request to be 429, got %d: %s", second.Code, second.Body.String())
	}
}

func TestRegisterReturnsRateLimitExceededAfterThreshold(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	router := newAccountFlowRouter(t, db)

	originalLimiter := signupRateLimiter
	signupRateLimiter = NewRateLimiter(1, time.Minute)
	defer func() {
		signupRateLimiter = originalLimiter
	}()

	makeRequest := func() *httptest.ResponseRecorder {
		body := bytes.NewBufferString(`{"username":"neo","password":"Secret123!"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", body)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		return recorder
	}

	first := makeRequest()
	if first.Code != http.StatusOK {
		t.Fatalf("expected first request to be 200, got %d: %s", first.Code, first.Body.String())
	}

	second := makeRequest()
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request to be 429, got %d: %s", second.Code, second.Body.String())
	}
}

func TestCheckUsernameReturnsRateLimitExceededAfterThreshold(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	router := newAccountFlowRouter(t, db)

	originalLimiter := usernameCheckRateLimiter
	usernameCheckRateLimiter = NewRateLimiter(1, time.Minute)
	defer func() {
		usernameCheckRateLimiter = originalLimiter
	}()

	makeRequest := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/check-username?username=neo01", nil)
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		return recorder
	}

	first := makeRequest()
	if first.Code != http.StatusOK {
		t.Fatalf("expected first request to be 200, got %d: %s", first.Code, first.Body.String())
	}

	second := makeRequest()
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request to be 429, got %d: %s", second.Code, second.Body.String())
	}
}

func TestRememberLoginCookieContainsRawTokenWithoutResponseLeak(t *testing.T) {
	testCases := []struct {
		name       string
		path       string
		username   string
		role       string
		production bool
	}{
		{name: "普通用户记住登录", path: "/api/auth/login", username: "remember-user", role: "user"},
		{name: "管理员记住登录", path: "/api/admin/login-remember", username: "remember-admin", role: "admin", production: true},
	}

	for index, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			db := newAccountFlowTestDB(t)
			user := createAccountFlowUser(t, db, tc.username, "Password123!")
			if tc.role == "admin" {
				if err := db.Model(&user).Update("role", "admin").Error; err != nil {
					t.Fatalf("设置管理员角色失败: %v", err)
				}
			}
			refreshTokenService := newAccountFlowRefreshTokenService(t, db)
			router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)
			config.AppConfig.RefreshTokenEnabled = true
			config.AppConfig.RefreshTokenTTL = time.Hour
			if tc.production {
				config.AppConfig.AppEnv = "production"
			}

			body := bytes.NewBufferString(fmt.Sprintf(`{"username":%q,"password":"Password123!","remember_me":true,"device_fingerprint":"device-remember"}`, tc.username))
			req := httptest.NewRequest(http.MethodPost, tc.path, body)
			req.Header.Set("Content-Type", "application/json")
			req.RemoteAddr = fmt.Sprintf("198.51.100.%d:12345", index+90)
			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)

			if resp.Code != http.StatusOK {
				t.Fatalf("记住登录失败: %d %s", resp.Code, resp.Body.String())
			}
			if bytes.Contains(resp.Body.Bytes(), []byte(`"refresh_token"`)) {
				t.Fatalf("响应正文不得包含刷新令牌字段: %s", resp.Body.String())
			}
			cookie := findResponseCookie(resp, util.RefreshTokenCookieName)
			if cookie == nil || len(cookie.Value) < 40 {
				t.Fatalf("未收到高熵刷新 Cookie: %#v", cookie)
			}
			if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode {
				t.Fatalf("刷新 Cookie 属性不符合预期: %#v", cookie)
			}
			if cookie.Secure != tc.production {
				t.Fatalf("刷新 Cookie Secure=%v，期望 %v", cookie.Secure, tc.production)
			}

			var session model.RefreshTokenSession
			if err := db.Where("token_digest = ?", service.DigestRefreshToken(cookie.Value)).First(&session).Error; err != nil {
				t.Fatalf("Cookie 原始令牌未对应数据库摘要: %v", err)
			}
			if session.UserID != user.ID {
				t.Fatalf("刷新会话用户不匹配: %d", session.UserID)
			}
		})
	}
}

func TestRefreshRotationFailureDoesNotReturnCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "rotation-failure", "Password123!")
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)
	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour
	issued, err := refreshTokenService.Issue(t.Context(), user.ID, "device-rotation-failure", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}

	injectedErr := errors.New("注入轮转新会话创建失败")
	if err := db.Callback().Create().Before("gorm:create").Register("test:fail_api_rotated_session_create", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "refresh_token_sessions" {
			tx.AddError(injectedErr)
		}
	}); err != nil {
		t.Fatalf("注册轮转失败回调失败: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{"device_fingerprint":"device-rotation-failure"}`))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "198.51.100.99:12345"
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: issued.RawToken})
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("轮转事务失败应返回 500，实际为 %d: %s", resp.Code, resp.Body.String())
	}
	if bytes.Contains(resp.Body.Bytes(), []byte("access_token")) {
		t.Fatalf("轮转失败不得返回访问令牌: %s", resp.Body.String())
	}
	cookie := findResponseCookie(resp, util.RefreshTokenCookieName)
	if cookie == nil || cookie.MaxAge >= 0 {
		t.Fatalf("轮转失败应清除客户端 Cookie，实际为 %#v", cookie)
	}
	if _, err := refreshTokenService.Validate(t.Context(), issued.RawToken, "device-rotation-failure"); err != nil {
		t.Fatalf("轮转事务失败后旧会话应保持有效: %v", err)
	}
}

func TestRefreshReturnsSanitizedValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	user := createAccountFlowUser(t, db, "neo", "Password123!")
	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	body := bytes.NewBufferString(`{"device_fingerprint":"device-b"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if bytes.Contains(recorder.Body.Bytes(), []byte("设备指纹不匹配")) {
		t.Fatalf("expected refresh error to hide internal validation details, got %s", recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte("刷新令牌无效或已过期")) {
		t.Fatalf("expected sanitized refresh error message, got %s", recorder.Body.String())
	}
}

func TestRefreshReturnsRateLimitExceededAfterThreshold(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	user := createAccountFlowUser(t, db, "neo", "Password123!")
	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	originalLimiter := refreshTokenRateLimiter
	refreshTokenRateLimiter = NewRateLimiter(1, time.Minute)
	defer func() {
		refreshTokenRateLimiter = originalLimiter
	}()

	makeRequest := func() *httptest.ResponseRecorder {
		body := bytes.NewBufferString(`{"device_fingerprint":"device-b"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		return recorder
	}

	first := makeRequest()
	if first.Code != http.StatusUnauthorized {
		t.Fatalf("expected first request to be 401, got %d: %s", first.Code, first.Body.String())
	}

	second := makeRequest()
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request to be 429, got %d: %s", second.Code, second.Body.String())
	}
}

func TestRefreshRejectsLargeChunkedBodyWithoutRotatingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	user := createAccountFlowUser(t, db, "chunked-refresh", "Password123!")
	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("创建刷新令牌失败: %v", err)
	}

	body := fmt.Sprintf(
		`{"device_fingerprint":"device-a","padding":"%s"}`,
		strings.Repeat("x", int(authRequestBodyLimitBytes)),
	)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = -1
	req.RemoteAddr = "198.51.100.77:12345"
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("隐藏 Content-Length 的大刷新请求应返回 413，实际为 %d: %s", resp.Code, resp.Body.String())
	}
	if _, err := refreshTokenService.Validate(t.Context(), token.RawToken, "device-a"); err != nil {
		t.Fatalf("超限请求不得轮转原刷新令牌: %v", err)
	}
}

func TestRefreshRejectsMalformedJSONWithoutRotatingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	user := createAccountFlowUser(t, db, "malformed-refresh", "Password123!")
	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("创建刷新令牌失败: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(`{"device_fingerprint":`))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "198.51.100.78:12345"
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("畸形刷新请求应返回 400，实际为 %d: %s", resp.Code, resp.Body.String())
	}
	if _, err := refreshTokenService.Validate(t.Context(), token.RawToken, "device-a"); err != nil {
		t.Fatalf("畸形请求不得轮转原刷新令牌: %v", err)
	}
}

func TestRefreshRotatesRefreshTokenAndRevokesOldToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	// 刷新令牌必须对应真实数据库用户（已移除历史降级兜底）。
	user := createAccountFlowUser(t, db, "neo", "Password123!")

	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	body := bytes.NewBufferString(`{"device_fingerprint":"device-a"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response RefreshTokenResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.AccessToken == "" {
		t.Fatalf("expected access token, got %#v", response)
	}
	// 轮转后的刷新令牌通过 Set-Cookie 下发，而非响应体。
	rotatedCookie := findResponseCookie(recorder, util.RefreshTokenCookieName)
	if rotatedCookie == nil || rotatedCookie.Value == "" {
		t.Fatalf("expected rotated refresh token cookie, got none")
	}

	// 先验证轮转出的新令牌有效（此校验无副作用）。
	if _, err := refreshTokenService.Validate(t.Context(), rotatedCookie.Value, "device-a"); err != nil {
		t.Fatalf("expected rotated refresh token to be valid: %v", err)
	}

	// 再通过刷新入口复用已撤销的旧令牌，触发重放防御并清除 Cookie。
	replayReq := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{"device_fingerprint":"device-a"}`))
	replayReq.Header.Set("Content-Type", "application/json")
	replayReq.RemoteAddr = "198.51.100.42:12345"
	replayReq.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	replayResp := httptest.NewRecorder()
	router.ServeHTTP(replayResp, replayReq)
	if replayResp.Code != http.StatusUnauthorized {
		t.Fatalf("expected old token replay to return 401, got %d: %s", replayResp.Code, replayResp.Body.String())
	}
	// 重放防御生效后，新令牌也应被一并吊销。
	if _, err := refreshTokenService.Validate(t.Context(), rotatedCookie.Value, "device-a"); err == nil {
		t.Fatal("expected all tokens revoked after replay detected")
	}
}

func TestDisabledUserCannotRefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour
	user := createAccountFlowUser(t, db, "disabled-refresh", "Password123!")

	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-disabled", time.Hour)
	if err != nil {
		t.Fatalf("创建刷新令牌失败: %v", err)
	}
	if err := service.NewUserService(db, service.NewAccountSessionService()).SetUserStatus(user.ID, false, 999); err != nil {
		t.Fatalf("禁用用户失败: %v", err)
	}

	body := bytes.NewBufferString(`{"device_fingerprint":"device-disabled"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "198.51.100.41:12345"
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("期望禁用用户刷新返回 401，实际为 %d: %s", resp.Code, resp.Body.String())
	}
	if bytes.Contains(resp.Body.Bytes(), []byte("access_token")) {
		t.Fatalf("拒绝刷新时不得返回访问令牌: %s", resp.Body.String())
	}
	refreshCookie := findResponseCookie(resp, util.RefreshTokenCookieName)
	if refreshCookie == nil || refreshCookie.MaxAge >= 0 {
		t.Fatalf("拒绝刷新时必须清除 Cookie，实际为 %#v", refreshCookie)
	}
}

func TestLoginEntriesReturnLoginDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "policy-user", "Password123!")
	admin := createAccountFlowUser(t, db, "policy-admin", "Password123!")
	if err := db.Model(&admin).Update("role", "admin").Error; err != nil {
		t.Fatalf("设置管理员角色失败: %v", err)
	}
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)
	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour
	setAccountFlowAuthPolicy(t, db, false, true)

	refreshToken, err := refreshTokenService.Issue(t.Context(), user.ID, "policy-device", time.Hour)
	if err != nil {
		t.Fatalf("创建刷新令牌失败: %v", err)
	}

	testCases := []struct {
		name   string
		path   string
		body   string
		cookie string
	}{
		{name: "普通登录", path: "/api/auth/login", body: `{"username":"policy-user","password":"Password123!","remember_me":true}`},
		{name: "管理员登录", path: "/api/admin/login", body: `{"username":"policy-admin","password":"Password123!"}`},
		{name: "管理员记住登录", path: "/api/admin/login-remember", body: `{"username":"policy-admin","password":"Password123!","remember_me":true}`},
		{name: "刷新访问令牌", path: "/api/auth/refresh", body: `{"device_fingerprint":"policy-device"}`, cookie: refreshToken.RawToken},
	}

	for index, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tc.path, bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			req.RemoteAddr = fmt.Sprintf("198.51.100.%d:12345", index+60)
			if tc.cookie != "" {
				req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: tc.cookie})
			}
			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)

			assertAccountFlowErrorCode(t, resp, http.StatusForbidden, "LOGIN_DISABLED")
			if bytes.Contains(resp.Body.Bytes(), []byte("access_token")) {
				t.Fatalf("关闭登录后不得返回访问令牌: %s", resp.Body.String())
			}
			if strings.Contains(resp.Header().Get("Set-Cookie"), util.RefreshTokenCookieName+"=") {
				t.Fatalf("关闭登录后不得下发刷新 Cookie: %q", resp.Header().Get("Set-Cookie"))
			}
		})
	}

	var refreshTokenCount int64
	if err := db.Model(&model.RefreshTokenSession{}).Count(&refreshTokenCount).Error; err != nil {
		t.Fatalf("统计刷新令牌失败: %v", err)
	}
	if refreshTokenCount != 1 {
		t.Fatalf("关闭登录后不得创建新刷新令牌，实际记录数为 %d", refreshTokenCount)
	}
}

func TestSignupReturnsSignupDisabledWithoutCreatingUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	router := newAccountFlowRouter(t, db)
	setAccountFlowAuthPolicy(t, db, true, false)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(`{"username":"disabled-signup","password":"Password123!"}`))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "198.51.100.70:12345"
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	assertAccountFlowErrorCode(t, resp, http.StatusForbidden, "SIGNUP_DISABLED")
	if bytes.Contains(resp.Body.Bytes(), []byte("access_token")) {
		t.Fatalf("关闭注册后不得返回访问令牌: %s", resp.Body.String())
	}
	var userCount int64
	if err := db.Model(&model.User{}).Count(&userCount).Error; err != nil {
		t.Fatalf("统计用户失败: %v", err)
	}
	if userCount != 0 {
		t.Fatalf("关闭注册后不得创建用户，实际为 %d", userCount)
	}
}

func TestAuthPolicyUnavailableRejectsAllAuthEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)
	config.AppConfig.RefreshTokenEnabled = true

	injectedErr := errors.New("注入认证策略查询失败")
	if err := db.Callback().Query().Before("gorm:query").Register("test:fail_auth_policy_query", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "system_settings" {
			tx.AddError(injectedErr)
		}
	}); err != nil {
		t.Fatalf("注册认证策略失败回调失败: %v", err)
	}

	testCases := []struct {
		name string
		path string
		body string
	}{
		{name: "普通登录", path: "/api/auth/login", body: `{"username":"policy-user","password":"Password123!"}`},
		{name: "管理员登录", path: "/api/admin/login", body: `{"username":"policy-admin","password":"Password123!"}`},
		{name: "管理员记住登录", path: "/api/admin/login-remember", body: `{"username":"policy-admin","password":"Password123!","remember_me":true}`},
		{name: "刷新访问令牌", path: "/api/auth/refresh", body: `{}`},
		{name: "注册", path: "/api/auth/register", body: `{"username":"policy-signup","password":"Password123!"}`},
	}

	for index, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tc.path, bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			req.RemoteAddr = fmt.Sprintf("203.0.113.%d:12345", index+80)
			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)

			assertAccountFlowErrorCode(t, resp, http.StatusServiceUnavailable, "AUTH_POLICY_UNAVAILABLE")
			if bytes.Contains(resp.Body.Bytes(), []byte("access_token")) {
				t.Fatalf("认证策略不可用时不得返回访问令牌: %s", resp.Body.String())
			}
		})
	}
}

func setAccountFlowAuthPolicy(t *testing.T, db *gorm.DB, loginEnabled, signupEnabled bool) {
	t.Helper()
	settingsService := service.NewSystemSettingsService(db)
	if _, err := settingsService.UpdateSettings(service.SystemSettingsUpdateInput{
		EnableUserLogin:  &loginEnabled,
		EnableUserSignup: &signupEnabled,
	}); err != nil {
		t.Fatalf("更新认证策略失败: %v", err)
	}
}

func assertAccountFlowErrorCode(t *testing.T, resp *httptest.ResponseRecorder, status int, errorCode string) {
	t.Helper()
	if resp.Code != status {
		t.Fatalf("期望状态码 %d，实际为 %d: %s", status, resp.Code, resp.Body.String())
	}
	var body struct {
		ErrorCode string `json:"error_code"`
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &body); err != nil {
		t.Fatalf("解析错误响应失败: %v", err)
	}
	if body.ErrorCode != errorCode {
		t.Fatalf("期望错误码 %s，实际为 %q: %s", errorCode, body.ErrorCode, resp.Body.String())
	}
}

func TestRevokeRefreshTokenMarksTokenRevoked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	user := createAccountFlowUser(t, db, "neo", "Password123!")
	token, err := refreshTokenService.Issue(t.Context(), user.ID, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/revoke", nil)
	req.AddCookie(&http.Cookie{Name: util.RefreshTokenCookieName, Value: token.RawToken})
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if _, err := refreshTokenService.Validate(t.Context(), token.RawToken, "device-a"); err == nil {
		t.Fatal("expected revoked token to become invalid")
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
	var response map[string]interface{}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal change password response: %v", err)
	}
	if response["code"] != float64(200) || response["message"] != "密码修改成功" {
		t.Fatalf("expected standard success response, got %s", recorder.Body.String())
	}
	if _, exists := response["data"]; !exists {
		t.Fatalf("expected response to include data field, got %s", recorder.Body.String())
	}

	authService := service.NewAuthService(db, service.NewSystemSettingsService(db))
	if _, _, _, err := authService.Login("alice", "new-password-456"); err != nil {
		t.Fatalf("expected new password login to succeed, got %v", err)
	}

	if _, _, _, err := authService.Login("alice", "password123"); err == nil {
		t.Fatal("expected old password login to fail after password change")
	}
}

func TestChangePasswordUsesConfiguredAuthPolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	originalMinLength := config.AppConfig.AuthPasswordMinLength
	config.AppConfig.AuthPasswordMinLength = 8
	defer func() {
		config.AppConfig.AuthPasswordMinLength = originalMinLength
	}()

	payload, err := json.Marshal(map[string]string{
		"current_password": "password123",
		"new_password":     "short77",
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/user/change-password", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte("密码长度必须在8-64字符之间")) {
		t.Fatalf("expected dynamic password policy message, got %s", recorder.Body.String())
	}
}

func TestChangePasswordRejectsWhitespaceInNewPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	user := createAccountFlowUser(t, db, "alice", "password123")
	router := newAccountFlowRouter(t, db)

	payload, err := json.Marshal(map[string]string{
		"current_password": "password123",
		"new_password":     "new password 456",
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/user/change-password", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+issueJWT(t, user))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte("密码不能包含空格")) {
		t.Fatalf("expected password whitespace message, got %s", recorder.Body.String())
	}
}
