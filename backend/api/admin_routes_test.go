package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
	"unisearch/service"
	"unisearch/util"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAdminCustomPluginRoutesAreRemoved(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	registerAdminRoutes(router.Group("/api"), RouterDeps{})

	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: "/api/admin/plugin-center/install"},
		{method: http.MethodPost, path: "/api/admin/plugins"},
		{method: http.MethodPut, path: "/api/admin/plugins/custom-pan"},
		{method: http.MethodDelete, path: "/api/admin/plugins/custom-pan"},
		{method: http.MethodPost, path: "/api/admin/plugins/batch-delete"},
		{method: http.MethodPost, path: "/api/admin/test-url"},
	}

	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			if w.Code != http.StatusNotFound {
				t.Fatalf("期望旧自定义插件入口返回 404，实际为 %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestPluginWebRoutesRequireAdminAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	oldConfig := config.AppConfig
	t.Cleanup(func() {
		config.AppConfig = oldConfig
	})
	config.AppConfig = &config.Config{
		AsyncPluginEnabled: true,
		AuthJWTSecret:      "test-plugin-web-secret",
	}

	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(&mockAdminWebPlugin{name: "mock-web"})
	searchSvc := service.NewSearchService(manager, nil, nil)

	router := gin.New()
	registerAdminRoutes(router.Group("/api"), RouterDeps{SearchService: searchSvc})

	oldReq := httptest.NewRequest(http.MethodGet, "/mock/ping", nil)
	oldResp := httptest.NewRecorder()
	router.ServeHTTP(oldResp, oldReq)
	if oldResp.Code != http.StatusNotFound {
		t.Fatalf("期望旧插件 Web 裸路径返回 404，实际为 %d: %s", oldResp.Code, oldResp.Body.String())
	}

	anonymousReq := httptest.NewRequest(http.MethodGet, "/api/admin/plugins/mock-web/web/mock/ping", nil)
	anonymousResp := httptest.NewRecorder()
	router.ServeHTTP(anonymousResp, anonymousReq)
	if anonymousResp.Code != http.StatusUnauthorized {
		t.Fatalf("期望匿名访问受保护插件 Web 路由返回 401，实际为 %d: %s", anonymousResp.Code, anonymousResp.Body.String())
	}

	userToken, err := util.GenerateJWTToken(2, "normal-user", "user", 0, config.AppConfig.AuthJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("生成普通用户 token 失败: %v", err)
	}
	userReq := httptest.NewRequest(http.MethodGet, "/api/admin/plugins/mock-web/web/mock/ping", nil)
	userReq.Header.Set("Authorization", "Bearer "+userToken)
	userResp := httptest.NewRecorder()
	router.ServeHTTP(userResp, userReq)
	if userResp.Code != http.StatusForbidden {
		t.Fatalf("期望普通用户访问受保护插件 Web 路由返回 403，实际为 %d: %s", userResp.Code, userResp.Body.String())
	}

	adminToken, err := util.GenerateJWTToken(1, "admin-user", "admin", 0, config.AppConfig.AuthJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("生成管理员 token 失败: %v", err)
	}
	adminReq := httptest.NewRequest(http.MethodGet, "/api/admin/plugins/mock-web/web/mock/ping", nil)
	adminReq.Header.Set("Authorization", "Bearer "+adminToken)
	adminResp := httptest.NewRecorder()
	router.ServeHTTP(adminResp, adminReq)
	if adminResp.Code != http.StatusOK {
		t.Fatalf("期望管理员访问受保护插件 Web 路由返回 200，实际为 %d: %s", adminResp.Code, adminResp.Body.String())
	}
}

func TestAdminUserStatsRouteReturnsSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	config.AppConfig.AuthJWTSecret = "test-admin-user-stats-secret"
	SetAuthService(nil)

	db := newAdminRouteTestDB(t)
	userService := service.NewUserService(db)
	now := time.Now()
	recentLogin := now.Add(-time.Hour)
	silentLogin := now.AddDate(0, 0, -31)

	admin := createAdminRouteTestUser(t, db, "stats-admin", "admin", &recentLogin)
	activeUser := createAdminRouteTestUser(t, db, "stats-active", "user", &recentLogin)
	createAdminRouteTestUser(t, db, "stats-silent", "user", &silentLogin)
	createAdminRouteTestUser(t, db, "stats-never", "user", nil)

	if err := db.Create(&[]model.UserLoginDailyStat{
		{UserID: activeUser.ID, LoginDate: now.Format("2006-01-02"), LoginCount: 2},
		{UserID: admin.ID, LoginDate: now.Format("2006-01-02"), LoginCount: 1},
	}).Error; err != nil {
		t.Fatalf("create active stat: %v", err)
	}

	router := gin.New()
	registerAdminRoutes(router.Group("/api"), RouterDeps{UserService: userService})

	token, err := util.GenerateJWTToken(admin.ID, admin.Username, admin.Role, 0, config.AppConfig.AuthJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/users/stats", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected stats route to return 200, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]int64
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode stats response: %v", err)
	}
	if body["total_users"] != 3 {
		t.Fatalf("expected total users 3, got %d", body["total_users"])
	}
	if body["month_new_users"] != 3 {
		t.Fatalf("expected month new users 3, got %d", body["month_new_users"])
	}
	if body["seven_day_active_users"] != 1 {
		t.Fatalf("expected seven day active users 1, got %d", body["seven_day_active_users"])
	}
	if body["inactive_30_day_users"] != 2 {
		t.Fatalf("expected inactive 30 day users 2, got %d", body["inactive_30_day_users"])
	}
	if _, exists := body["today_active_users"]; exists {
		t.Fatal("expected user stats response to omit today_active_users")
	}
	if _, exists := body["month_active_users"]; exists {
		t.Fatal("expected user stats response to omit month_active_users")
	}
}

func newAdminRouteTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open admin route test db: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.UserLoginDailyStat{}); err != nil {
		t.Fatalf("migrate admin route test db: %v", err)
	}
	return db
}

func createAdminRouteTestUser(t *testing.T, db *gorm.DB, username string, role string, lastLoginAt *time.Time) model.User {
	t.Helper()

	passwordHash, err := util.HashPassword("password123")
	if err != nil {
		t.Fatalf("hash route test password: %v", err)
	}

	user := model.User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		IsEnabled:    true,
		LastLoginAt:  lastLoginAt,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create route test user: %v", err)
	}
	return user
}

type mockAdminWebPlugin struct {
	*plugin.BaseAsyncPlugin
	name string
}

func (p *mockAdminWebPlugin) Name() string {
	return p.name
}

func (p *mockAdminWebPlugin) Priority() int {
	return 1
}

func (p *mockAdminWebPlugin) AsyncSearch(_ string, _ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error), _ string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return nil, nil
}

func (p *mockAdminWebPlugin) SetMainCacheKey(_ string) {}

func (p *mockAdminWebPlugin) SetCurrentKeyword(_ string) {}

func (p *mockAdminWebPlugin) SearchWithResult(_ string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{Results: []model.SearchResult{}, IsFinal: true}, nil
}

func (p *mockAdminWebPlugin) SkipServiceFilter() bool {
	return false
}

func (p *mockAdminWebPlugin) RegisterWebRoutes(group *gin.RouterGroup) {
	group.GET("/mock/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
