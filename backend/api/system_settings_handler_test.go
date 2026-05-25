package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newSystemSettingsHandlerService(t *testing.T) *service.SystemSettingsService {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
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

func TestGetSystemSettingsHandlerReturnsPublicConfigFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	SetSystemSettingsService(newSystemSettingsHandlerService(t))

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
