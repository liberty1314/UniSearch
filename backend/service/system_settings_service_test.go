package service

import (
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newSystemSettingsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.SystemSettings{}); err != nil {
		t.Fatalf("auto migrate system settings: %v", err)
	}

	return db
}

func TestSystemSettingsServiceGetSettingsCreatesDefaults(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	settings, err := service.GetSettings()
	if err != nil {
		t.Fatalf("GetSettings returned error: %v", err)
	}

	if !settings.EnableUserAuth || !settings.EnableUserLogin || !settings.EnableUserSignup {
		t.Fatalf("expected auth defaults enabled, got %+v", settings)
	}

	if settings.EnableResourceDetailPage {
		t.Fatalf("expected resource detail page to be disabled by default, got %+v", settings)
	}

	if settings.PublicSiteURL != "" {
		t.Fatalf("expected empty public_site_url default, got %q", settings.PublicSiteURL)
	}

	if settings.DefaultCopyFormatTemplate != "" {
		t.Fatalf("expected empty default_copy_format_template, got %q", settings.DefaultCopyFormatTemplate)
	}
}

func TestSystemSettingsServiceUpdateSettingsPreservesExistingFields(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	initialURL := "https://example.com"
	initialTemplate := "卡密：{key}，网址：https://example.com/"

	settings, err := service.UpdateSettings(SystemSettingsUpdateInput{
		PublicSiteURL:             &initialURL,
		DefaultCopyFormatTemplate: &initialTemplate,
	})
	if err != nil {
		t.Fatalf("initial UpdateSettings returned error: %v", err)
	}

	if settings.PublicSiteURL != initialURL || settings.DefaultCopyFormatTemplate != initialTemplate {
		t.Fatalf("expected initial settings to be saved, got %+v", settings)
	}

	disableSignup := false
	disableResourceDetail := false
	updated, err := service.UpdateSettings(SystemSettingsUpdateInput{
		EnableUserSignup:         &disableSignup,
		EnableResourceDetailPage: &disableResourceDetail,
	})
	if err != nil {
		t.Fatalf("partial UpdateSettings returned error: %v", err)
	}

	if updated.EnableUserSignup {
		t.Fatalf("expected signup to be disabled, got %+v", updated)
	}

	if updated.PublicSiteURL != initialURL {
		t.Fatalf("expected public_site_url to be preserved, got %q", updated.PublicSiteURL)
	}

	if updated.EnableResourceDetailPage {
		t.Fatalf("expected resource detail page to be disabled, got %+v", updated)
	}

	if updated.DefaultCopyFormatTemplate != initialTemplate {
		t.Fatalf("expected default_copy_format_template to be preserved, got %q", updated.DefaultCopyFormatTemplate)
	}
}
