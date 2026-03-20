package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
