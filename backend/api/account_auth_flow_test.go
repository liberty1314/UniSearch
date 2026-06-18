package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
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
	return m.Search(keyword, nil)
}
func (m *mockAccountSearchPlugin) SetMainCacheKey(_ string)   {}
func (m *mockAccountSearchPlugin) SetCurrentKeyword(_ string) {}
func (m *mockAccountSearchPlugin) SkipServiceFilter() bool    { return false }
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

	if err := db.AutoMigrate(&model.User{}, &model.SystemSettings{}, &model.RefreshToken{}, &model.UserLoginDailyStat{}); err != nil {
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
	authService := service.NewAuthService()
	userService := service.NewUserService(db)
	systemSettingsService := service.NewSystemSettingsService(db)

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

	refreshTokenService, err := service.NewRefreshTokenService(
		service.StorageTypeDatabase,
		db,
		"",
		"01234567890123456789012345678901",
	)
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

func issueJWT(t *testing.T, user model.User) string {
	t.Helper()

	token, err := util.GenerateJWTToken(user.ID, user.Username, user.Role, config.AppConfig.AuthJWTSecret, time.Hour)
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

	authService := service.NewAuthService()
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

	body := bytes.NewBufferString(`{"username":"alice","password":"<API_KEY>"}`)
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

	body := bytes.NewBufferString(`{"username":"neo","password":"secret123"}`)
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

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/auth/check-username?username="+url.QueryEscape(tc.username), nil)
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

	authService := service.NewAuthService()
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
		body := bytes.NewBufferString(`{"username":"neo","password":"secret123"}`)
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

func TestRefreshReturnsSanitizedValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	token, err := refreshTokenService.CreateToken("neo", false, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	encryptedToken, err := refreshTokenService.EncryptForClient(token.Token)
	if err != nil {
		t.Fatalf("encrypt refresh token: %v", err)
	}

	body := bytes.NewBufferString(fmt.Sprintf(`{"refresh_token":"%s","device_fingerprint":"device-b"}`, encryptedToken))
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
	req.Header.Set("Content-Type", "application/json")
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

	token, err := refreshTokenService.CreateToken("neo", false, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	encryptedToken, err := refreshTokenService.EncryptForClient(token.Token)
	if err != nil {
		t.Fatalf("encrypt refresh token: %v", err)
	}

	originalLimiter := refreshTokenRateLimiter
	refreshTokenRateLimiter = NewRateLimiter(1, time.Minute)
	defer func() {
		refreshTokenRateLimiter = originalLimiter
	}()

	makeRequest := func() *httptest.ResponseRecorder {
		body := bytes.NewBufferString(fmt.Sprintf(`{"refresh_token":"%s","device_fingerprint":"device-b"}`, encryptedToken))
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", body)
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

func TestRevokeRefreshTokenMarksTokenRevoked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := newAccountFlowTestDB(t)
	refreshTokenService := newAccountFlowRefreshTokenService(t, db)
	router := newAccountFlowRouterWithRefreshService(t, db, refreshTokenService)

	config.AppConfig.RefreshTokenEnabled = true
	config.AppConfig.RefreshTokenTTL = time.Hour

	token, err := refreshTokenService.CreateToken("neo", false, "device-a", time.Hour)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	encryptedToken, err := refreshTokenService.EncryptForClient(token.Token)
	if err != nil {
		t.Fatalf("encrypt refresh token: %v", err)
	}

	body := bytes.NewBufferString(fmt.Sprintf(`{"refresh_token":"%s"}`, encryptedToken))
	req := httptest.NewRequest(http.MethodPost, "/api/auth/revoke", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if _, err := refreshTokenService.ValidateToken(token.Token, "device-a"); err == nil {
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

	authService := service.NewAuthService()
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
