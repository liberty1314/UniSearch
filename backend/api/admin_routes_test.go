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

	token, err := util.GenerateJWTToken(admin.ID, admin.Username, admin.Role, config.AppConfig.AuthJWTSecret, time.Hour)
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
