package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newSystemSettingsHandlerService(t *testing.T) *service.SystemSettingsService {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.SystemSettings{}); err != nil {
		t.Fatalf("auto migrate system settings: %v", err)
	}
	if err := db.AutoMigrate(&model.Secret{}); err != nil {
		t.Fatalf("auto migrate secrets: %v", err)
	}

	service.SetGlobalSecretManager(service.NewDatabaseSecretManager(db, "test-master-key-12345678901234567890"))

	return service.NewSystemSettingsService(db)
}

type fakeHotRankingCacheAdminService struct {
	mu         sync.Mutex
	warmCalls  int
	clearCalls int
	lastResult *service.HotRankingPreloadSnapshot
}

func (f *fakeHotRankingCacheAdminService) WarmCache(_ *service.SystemSettingsService, _ service.HotRankingPreloaderConfig) service.HotRankingPreloadResult {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.warmCalls++
	now := time.Date(2026, 6, 13, 9, 45, 0, 0, time.FixedZone("CST", 8*3600))
	f.lastResult = &service.HotRankingPreloadSnapshot{
		Result: service.HotRankingPreloadResult{
			Total:   56,
			Success: 56,
			Failed:  0,
		},
		UpdatedAt: now,
	}
	return f.lastResult.Result
}

func (f *fakeHotRankingCacheAdminService) ClearCache(_ *service.SystemSettingsService) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.clearCalls++
	return nil
}

func (f *fakeHotRankingCacheAdminService) HasCacheBackend() bool {
	return true
}

func (f *fakeHotRankingCacheAdminService) GetLastPreloadSnapshot() *service.HotRankingPreloadSnapshot {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.lastResult == nil {
		return nil
	}

	copyValue := *f.lastResult
	return &copyValue
}

func TestGetSystemSettingsHandlerReturnsPublicConfigFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))
	config.AppConfig = &config.Config{
		AuthUsernameMinLength: 5,
		AuthUsernameMaxLength: 18,
		AuthPasswordMinLength: 8,
		AuthPasswordMaxLength: 72,
	}

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/system-settings", nil)

	GetSystemSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if _, ok := response["public_site_url"]; !ok {
		t.Fatalf("expected public_site_url in response, got %v", response)
	}

	if _, ok := response["default_copy_format_template"]; !ok {
		t.Fatalf("expected default_copy_format_template in response, got %v", response)
	}

	if _, ok := response["enable_resource_detail_page"]; !ok {
		t.Fatalf("expected enable_resource_detail_page in response, got %v", response)
	}

	if response["auth_username_min_length"] != float64(5) {
		t.Fatalf("expected auth_username_min_length to be 5, got %v", response["auth_username_min_length"])
	}

	if response["auth_username_max_length"] != float64(18) {
		t.Fatalf("expected auth_username_max_length to be 18, got %v", response["auth_username_max_length"])
	}

	if response["auth_password_min_length"] != float64(8) {
		t.Fatalf("expected auth_password_min_length to be 8, got %v", response["auth_password_min_length"])
	}

	if response["auth_password_max_length"] != float64(72) {
		t.Fatalf("expected auth_password_max_length to be 72, got %v", response["auth_password_max_length"])
	}
}

func TestUpdateSystemSettingsHandlerSupportsDisplayConfigFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	body := bytes.NewBufferString(`{
		"public_site_url":"https://example.com",
		"default_copy_format_template":"卡密：{key}，网址：https://example.com/"
	}`)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateSystemSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["public_site_url"] != "https://example.com" {
		t.Fatalf("expected public_site_url to be updated, got %v", response["public_site_url"])
	}

	if response["default_copy_format_template"] != "卡密：{key}，网址：https://example.com/" {
		t.Fatalf("expected default_copy_format_template to be updated, got %v", response["default_copy_format_template"])
	}
}

func TestUpdateSystemSettingsHandlerSupportsResourceDetailSwitch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	body := bytes.NewBufferString(`{
		"enable_resource_detail_page":false
	}`)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateSystemSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["enable_resource_detail_page"] != false {
		t.Fatalf("expected enable_resource_detail_page to be false, got %v", response["enable_resource_detail_page"])
	}
}

func TestGetTMDBAdminSettingsHandlerReturnsUnconfiguredByDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/admin/system-settings/tmdb", nil)

	GetTMDBAdminSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["configured"] != false {
		t.Fatalf("expected configured false, got %v", response["configured"])
	}

	if response["source"] != "unconfigured" {
		t.Fatalf("expected unconfigured source, got %v", response["source"])
	}
}

func TestUpdateTMDBAdminSettingsHandlerStoresToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	body := bytes.NewBufferString(`{"tmdb_read_access_token":"test-read-token"}`)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/tmdb", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateTMDBAdminSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["configured"] != true {
		t.Fatalf("expected configured true, got %v", response["configured"])
	}

	if response["source"] != "secret_manager" {
		t.Fatalf("expected secret_manager source, got %v", response["source"])
	}

	if response["read_access_token"] != "test-read-token" {
		t.Fatalf("expected read_access_token to echo stored token, got %v", response["read_access_token"])
	}
}

func TestUpdateTMDBAdminSettingsHandlerUpdatesExistingTokenWithoutDuplicateKey(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	firstBody := bytes.NewBufferString(`{"tmdb_read_access_token":"first-token"}`)
	firstRecorder := httptest.NewRecorder()
	firstContext, _ := gin.CreateTestContext(firstRecorder)
	firstContext.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/tmdb", firstBody)
	firstContext.Request.Header.Set("Content-Type", "application/json")

	UpdateTMDBAdminSettingsHandler(firstContext)

	if firstRecorder.Code != http.StatusOK {
		t.Fatalf("expected first update 200, got %d: %s", firstRecorder.Code, firstRecorder.Body.String())
	}

	secondBody := bytes.NewBufferString(`{"tmdb_read_access_token":"second-token"}`)
	secondRecorder := httptest.NewRecorder()
	secondContext, _ := gin.CreateTestContext(secondRecorder)
	secondContext.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/tmdb", secondBody)
	secondContext.Request.Header.Set("Content-Type", "application/json")

	UpdateTMDBAdminSettingsHandler(secondContext)

	if secondRecorder.Code != http.StatusOK {
		t.Fatalf("expected second update 200, got %d: %s", secondRecorder.Code, secondRecorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(secondRecorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["read_access_token"] != "second-token" {
		t.Fatalf("expected updated read_access_token, got %v", response["read_access_token"])
	}
}

func TestUpdateTMDBAdminSettingsHandlerRejectsEmptyToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	body := bytes.NewBufferString(`{"tmdb_read_access_token":"   "}`)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/tmdb", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateTMDBAdminSettingsHandler(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestUpdateTMDBAdminSettingsHandlerReturnsErrorForEnvironmentSecretBackend(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))
	service.SetGlobalSecretManager(service.NewEnvironmentSecretManager())
	t.Setenv("TMDB_READ_ACCESS_TOKEN", "env-token")

	body := bytes.NewBufferString(`{"tmdb_read_access_token":"new-token"}`)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/tmdb", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateTMDBAdminSettingsHandler(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if !strings.Contains(recorder.Body.String(), "后台不可写") {
		t.Fatalf("expected env backend error message, got %s", recorder.Body.String())
	}
}

func TestGetCacheSettingsHandlerReturnsCacheConfigAndRuntimeInfo(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))
	SetHotRankingCacheAdminService(&fakeHotRankingCacheAdminService{})

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/admin/system-settings/cache", nil)

	GetCacheSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["search_cache_ttl_seconds"] != float64(3600) {
		t.Fatalf("expected search cache ttl 3600, got %v", response["search_cache_ttl_seconds"])
	}

	if response["redis_connected"] != true {
		t.Fatalf("expected redis_connected true, got %v", response["redis_connected"])
	}

	if response["config_source"] != "database" {
		t.Fatalf("expected config_source database, got %v", response["config_source"])
	}

	cacheSettingOptions, ok := response["cache_setting_options"].(map[string]any)
	if !ok {
		t.Fatalf("expected cache_setting_options object, got %T", response["cache_setting_options"])
	}

	searchTTLOptions, ok := cacheSettingOptions["search_cache_ttl_seconds"].([]any)
	if !ok || len(searchTTLOptions) == 0 {
		t.Fatalf("expected search_cache_ttl_seconds options, got %v", cacheSettingOptions["search_cache_ttl_seconds"])
	}
}

func TestUpdateCacheSettingsHandlerPersistsNewValues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	body := bytes.NewBufferString(`{
		"cache_enabled":true,
		"search_cache_ttl_seconds":5400,
		"cache_write_queue_size":512,
		"hot_ranking_preload_time":"01:15",
		"hot_ranking_preload_limit":60
	}`)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/cache", body)
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateCacheSettingsHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["search_cache_ttl_seconds"] != float64(5400) {
		t.Fatalf("expected updated search cache ttl, got %v", response["search_cache_ttl_seconds"])
	}

	if response["hot_ranking_preload_time"] != "01:15" {
		t.Fatalf("expected updated preload time, got %v", response["hot_ranking_preload_time"])
	}
}

func TestUpdateCacheSettingsHandlerRejectsEmptyPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/admin/system-settings/cache", bytes.NewBufferString(`{}`))
	context.Request.Header.Set("Content-Type", "application/json")

	UpdateCacheSettingsHandler(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
}

func TestTriggerHotRankingPreloadHandlerRunsWarmTask(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))
	adminService := &fakeHotRankingCacheAdminService{}
	SetHotRankingCacheAdminService(adminService)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/api/admin/system-settings/cache/hot-ranking/preload", nil)

	TriggerHotRankingPreloadHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if adminService.warmCalls != 1 {
		t.Fatalf("expected warm cache to be called once, got %d", adminService.warmCalls)
	}
}

func TestClearHotRankingCacheHandlerClearsCache(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))
	adminService := &fakeHotRankingCacheAdminService{}
	SetHotRankingCacheAdminService(adminService)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodDelete, "/api/admin/system-settings/cache/hot-ranking", nil)

	ClearHotRankingCacheHandler(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	if adminService.clearCalls != 1 {
		t.Fatalf("expected clear cache to be called once, got %d", adminService.clearCalls)
	}
}
