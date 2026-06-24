package service

import (
	"strings"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newSystemSettingsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.SystemSettings{}); err != nil {
		t.Fatalf("auto migrate system settings: %v", err)
	}

	return db
}

func TestSystemSettingsServiceGetSettingsCreatesDefaults(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		CacheEnabled:                 true,
		CacheWriteQueueSize:          512,
		CacheWriteWorkers:            6,
		HotRankingPreloadEnabled:     true,
		HotRankingPreloadTime:        "00:30",
		HotRankingPreloadConcurrency: 3,
		HotRankingPreloadTimeout:     45 * time.Second,
		HotRankingCacheTTLDay:        12 * time.Hour,
		RedisTTL:                     2 * time.Hour,
	}

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

	if !settings.CacheEnabled {
		t.Fatalf("expected cache_enabled default to be true, got %+v", settings)
	}

	if settings.SearchCacheTTLSeconds != 7200 {
		t.Fatalf("expected search_cache_ttl_seconds to use env default 7200, got %d", settings.SearchCacheTTLSeconds)
	}

	if settings.CacheWriteQueueSize != 512 || settings.CacheWriteWorkers != 6 {
		t.Fatalf("expected cache write settings to use env defaults, got queue=%d workers=%d", settings.CacheWriteQueueSize, settings.CacheWriteWorkers)
	}

	if settings.HotRankingPreloadTime != "00:30" {
		t.Fatalf("expected hot_ranking_preload_time to use env default 00:30, got %q", settings.HotRankingPreloadTime)
	}

	if settings.HotRankingPreloadLimit != 50 {
		t.Fatalf("expected hot_ranking_preload_limit default 50, got %d", settings.HotRankingPreloadLimit)
	}

	if settings.HotRankingCacheTTLSeconds != 43200 {
		t.Fatalf("expected hot_ranking_cache_ttl_seconds to use env default 43200, got %d", settings.HotRankingCacheTTLSeconds)
	}

	if !settings.RuntimeProgressiveSearchEnabled {
		t.Fatalf("expected progressive search to be enabled by default, got %+v", settings)
	}
}

func TestSystemSettingsServiceGetRuntimeSettingsUsesConfigDefaults(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		DefaultConcurrency:        42,
		HTTPMaxConns:              1200,
		AsyncPluginEnabled:        true,
		AsyncResponseTimeout:      6,
		AsyncResponseTimeoutDur:   6 * time.Second,
		AsyncMaxBackgroundWorkers: 24,
		AsyncMaxBackgroundTasks:   240,
		ProxyURL:                  "socks5://127.0.0.1:7890",
		UseProxy:                  true,
	}

	service := NewSystemSettingsService(newSystemSettingsTestDB(t))
	runtimeSettings, err := service.GetRuntimeSettings()
	if err != nil {
		t.Fatalf("GetRuntimeSettings returned error: %v", err)
	}

	if runtimeSettings.DefaultConcurrency != 42 {
		t.Fatalf("expected default concurrency 42, got %d", runtimeSettings.DefaultConcurrency)
	}
	if runtimeSettings.HTTPMaxConns != 1200 {
		t.Fatalf("expected http max conns 1200, got %d", runtimeSettings.HTTPMaxConns)
	}
	if !runtimeSettings.AsyncPluginEnabled {
		t.Fatalf("expected async plugin enabled default from app config")
	}
	if runtimeSettings.AsyncResponseTimeout != 6 {
		t.Fatalf("expected async response timeout 6, got %d", runtimeSettings.AsyncResponseTimeout)
	}
	if runtimeSettings.AsyncMaxBackgroundWorkers != 24 || runtimeSettings.AsyncMaxBackgroundTasks != 240 {
		t.Fatalf("expected async defaults workers=24 tasks=240, got %+v", runtimeSettings)
	}
	if !runtimeSettings.ProxyEnabled || runtimeSettings.ProxyURL != "socks5://127.0.0.1:7890" {
		t.Fatalf("expected proxy defaults from app config, got %+v", runtimeSettings)
	}
	if !runtimeSettings.ProgressiveSearchEnabled {
		t.Fatalf("expected progressive search enabled by default, got %+v", runtimeSettings)
	}
}

func TestSystemSettingsServiceUpdateRuntimeSettingsPreservesExistingFields(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	defaultConcurrency := 60
	proxyEnabled := true
	proxyURL := "https://proxy.example.com:8443"
	progressiveEnabled := false
	initial, err := service.UpdateRuntimeSettings(RuntimeSettingsUpdateInput{
		DefaultConcurrency:       &defaultConcurrency,
		ProxyEnabled:             &proxyEnabled,
		ProxyURL:                 &proxyURL,
		ProgressiveSearchEnabled: &progressiveEnabled,
	})
	if err != nil {
		t.Fatalf("initial UpdateRuntimeSettings returned error: %v", err)
	}
	if initial.DefaultConcurrency != 60 || !initial.ProxyEnabled || initial.ProxyURL != proxyURL || initial.ProgressiveSearchEnabled {
		t.Fatalf("expected initial runtime settings to be saved, got %+v", initial)
	}

	workers := 32
	updated, err := service.UpdateRuntimeSettings(RuntimeSettingsUpdateInput{
		AsyncMaxBackgroundWorkers: &workers,
	})
	if err != nil {
		t.Fatalf("partial UpdateRuntimeSettings returned error: %v", err)
	}

	if updated.DefaultConcurrency != 60 {
		t.Fatalf("expected default concurrency to be preserved, got %d", updated.DefaultConcurrency)
	}
	if !updated.ProxyEnabled || updated.ProxyURL != proxyURL {
		t.Fatalf("expected proxy fields to be preserved, got %+v", updated)
	}
	if updated.AsyncMaxBackgroundWorkers != 32 {
		t.Fatalf("expected workers to be updated, got %d", updated.AsyncMaxBackgroundWorkers)
	}
	if updated.ProgressiveSearchEnabled {
		t.Fatalf("expected progressive search flag to be preserved as false, got %+v", updated)
	}
}

func TestSystemSettingsServiceUpdateRuntimeSettingsRejectsInvalidValues(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	defaultConcurrency := 0
	if _, err := service.UpdateRuntimeSettings(RuntimeSettingsUpdateInput{
		DefaultConcurrency: &defaultConcurrency,
	}); err == nil {
		t.Fatal("expected invalid default concurrency to be rejected")
	}

	workers := 20
	tasks := 10
	_, err := service.UpdateRuntimeSettings(RuntimeSettingsUpdateInput{
		AsyncMaxBackgroundWorkers: &workers,
		AsyncMaxBackgroundTasks:   &tasks,
	})
	if err == nil {
		t.Fatal("expected max tasks smaller than workers to be rejected")
	}
	if !strings.Contains(err.Error(), "最大任务数不能小于最大工作者数量") {
		t.Fatalf("unexpected error: %v", err)
	}

	proxyURL := "ftp://127.0.0.1:21"
	if _, err := service.UpdateRuntimeSettings(RuntimeSettingsUpdateInput{
		ProxyURL: &proxyURL,
	}); err == nil {
		t.Fatal("expected invalid proxy url to be rejected")
	}
}

func TestSystemSettingsServiceApplyRuntimeSettingsUpdatesAppConfig(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{}
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	service.ApplyRuntimeSettings(&RuntimeSettings{
		DefaultConcurrency:        70,
		HTTPMaxConns:              2000,
		AsyncPluginEnabled:        true,
		AsyncResponseTimeout:      8,
		AsyncMaxBackgroundWorkers: 40,
		AsyncMaxBackgroundTasks:   400,
		ProgressiveSearchEnabled:  false,
		ProxyEnabled:              true,
		ProxyURL:                  "http://127.0.0.1:8080",
	})

	if config.AppConfig.DefaultConcurrency != 70 {
		t.Fatalf("expected app config default concurrency 70, got %d", config.AppConfig.DefaultConcurrency)
	}
	if config.AppConfig.HTTPMaxConns != 2000 {
		t.Fatalf("expected app config http max conns 2000, got %d", config.AppConfig.HTTPMaxConns)
	}
	if !config.AppConfig.AsyncPluginEnabled {
		t.Fatal("expected app config async plugin enabled")
	}
	if config.AppConfig.AsyncResponseTimeout != 8 || config.AppConfig.AsyncResponseTimeoutDur != 8*time.Second {
		t.Fatalf("expected async timeout to be updated, got %d / %s", config.AppConfig.AsyncResponseTimeout, config.AppConfig.AsyncResponseTimeoutDur)
	}
	if config.AppConfig.AsyncMaxBackgroundWorkers != 40 || config.AppConfig.AsyncMaxBackgroundTasks != 400 {
		t.Fatalf("expected async worker settings to be updated, got %+v", config.AppConfig)
	}
	if config.AppConfig.ProgressiveSearchEnabled {
		t.Fatalf("expected progressive search config to be disabled, got %+v", config.AppConfig)
	}
	if !config.AppConfig.UseProxy || config.AppConfig.ProxyURL != "http://127.0.0.1:8080" {
		t.Fatalf("expected proxy config to be updated, got use=%v url=%q", config.AppConfig.UseProxy, config.AppConfig.ProxyURL)
	}
}

func TestSystemSettingsServiceUpdateCacheSettingsAutoMigratesLegacySchema(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	createLegacyTableSQL := `
	CREATE TABLE system_settings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		enable_user_auth NUMERIC NOT NULL DEFAULT 1,
		enable_user_login NUMERIC NOT NULL DEFAULT 1,
		enable_user_signup NUMERIC NOT NULL DEFAULT 1,
		announcement_enabled NUMERIC NOT NULL DEFAULT 0,
		enable_resource_detail_page NUMERIC NOT NULL DEFAULT 0,
		public_site_url TEXT NOT NULL DEFAULT '',
		default_copy_format_template TEXT NOT NULL DEFAULT '',
		created_at DATETIME,
		updated_at DATETIME
	);`
	if err := db.Exec(createLegacyTableSQL).Error; err != nil {
		t.Fatalf("create legacy system_settings table: %v", err)
	}

	service := NewSystemSettingsService(db)
	searchTTL := 5400
	queueSize := 512

	cacheSettings, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		SearchCacheTTLSeconds: &searchTTL,
		CacheWriteQueueSize:   &queueSize,
	})
	if err != nil {
		t.Fatalf("UpdateCacheSettings on legacy schema returned error: %v", err)
	}

	if cacheSettings.SearchCacheTTLSeconds != 5400 {
		t.Fatalf("expected migrated schema to persist search cache ttl, got %d", cacheSettings.SearchCacheTTLSeconds)
	}

	if !db.Migrator().HasColumn(&model.SystemSettings{}, "cache_enabled") {
		t.Fatal("expected legacy schema to auto-migrate cache_enabled column")
	}

	if !db.Migrator().HasColumn(&model.SystemSettings{}, "search_cache_ttl_seconds") {
		t.Fatal("expected legacy schema to auto-migrate search_cache_ttl_seconds column")
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

func TestSystemSettingsServiceGetCacheSettingsReturnsPlanDefaults(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = nil
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	cacheSettings, err := service.GetCacheSettings()
	if err != nil {
		t.Fatalf("GetCacheSettings returned error: %v", err)
	}

	if cacheSettings.SearchCacheTTLSeconds != 3600 {
		t.Fatalf("expected search cache ttl default 3600, got %d", cacheSettings.SearchCacheTTLSeconds)
	}

	if !cacheSettings.HotRankingCacheEnabled || !cacheSettings.HotRankingPreloadEnabled {
		t.Fatalf("expected hot ranking cache defaults enabled, got %+v", cacheSettings)
	}

	if cacheSettings.HotRankingPreloadTime != "00:00" {
		t.Fatalf("expected hot ranking preload time default 00:00, got %q", cacheSettings.HotRankingPreloadTime)
	}

	if cacheSettings.HotRankingPreloadLimit != 50 {
		t.Fatalf("expected hot ranking preload limit default 50, got %d", cacheSettings.HotRankingPreloadLimit)
	}

	if cacheSettings.HotRankingCacheTTLSeconds != 86400 {
		t.Fatalf("expected hot ranking cache ttl default 86400, got %d", cacheSettings.HotRankingCacheTTLSeconds)
	}
}

func TestSystemSettingsServiceUpdateCacheSettingsPreservesExistingFields(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	searchTTL := 5400
	queueSize := 1024
	preloadTime := "01:30"
	initial, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		SearchCacheTTLSeconds: &searchTTL,
		CacheWriteQueueSize:   &queueSize,
		HotRankingPreloadTime: &preloadTime,
	})
	if err != nil {
		t.Fatalf("initial UpdateCacheSettings returned error: %v", err)
	}

	if initial.SearchCacheTTLSeconds != 5400 || initial.CacheWriteQueueSize != 1024 || initial.HotRankingPreloadTime != "01:30" {
		t.Fatalf("expected initial cache settings to be stored, got %+v", initial)
	}

	workers := 8
	preloadLimit := 80
	updated, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		CacheWriteWorkers:      &workers,
		HotRankingPreloadLimit: &preloadLimit,
	})
	if err != nil {
		t.Fatalf("partial UpdateCacheSettings returned error: %v", err)
	}

	if updated.SearchCacheTTLSeconds != 5400 {
		t.Fatalf("expected search cache ttl to be preserved, got %d", updated.SearchCacheTTLSeconds)
	}

	if updated.CacheWriteQueueSize != 1024 {
		t.Fatalf("expected queue size to be preserved, got %d", updated.CacheWriteQueueSize)
	}

	if updated.CacheWriteWorkers != 8 || updated.HotRankingPreloadLimit != 80 {
		t.Fatalf("expected updated fields to be applied, got %+v", updated)
	}

	if updated.HotRankingPreloadTime != "01:30" {
		t.Fatalf("expected preload time to be preserved, got %q", updated.HotRankingPreloadTime)
	}
}

func TestSystemSettingsServiceUpdateCacheSettingsRejectsInvalidValues(t *testing.T) {
	service := NewSystemSettingsService(newSystemSettingsTestDB(t))

	invalidTime := "24:60"
	if _, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		HotRankingPreloadTime: &invalidTime,
	}); err == nil {
		t.Fatal("expected invalid preload time to be rejected")
	}

	searchTTL := 30
	if _, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		SearchCacheTTLSeconds: &searchTTL,
	}); err == nil {
		t.Fatal("expected invalid search ttl to be rejected")
	}

	concurrency := 99
	if _, err := service.UpdateCacheSettings(CacheSettingsUpdateInput{
		HotRankingPreloadConcurrency: &concurrency,
	}); err == nil {
		t.Fatal("expected invalid preload concurrency to be rejected")
	}
}

func TestSystemSettingsServiceGetCacheSettingOptionsMarksDynamicDefaults(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		CacheEnabled:                 true,
		CacheWriteQueueSize:          768,
		CacheWriteWorkers:            6,
		HotRankingPreloadEnabled:     true,
		HotRankingPreloadTime:        "03:15",
		HotRankingPreloadConcurrency: 5,
		HotRankingPreloadTimeout:     75 * time.Second,
		HotRankingCacheTTLDay:        36 * time.Hour,
		RedisTTL:                     90 * time.Minute,
	}

	service := NewSystemSettingsService(newSystemSettingsTestDB(t))
	options := service.GetCacheSettingOptions()

	assertContainsCacheSettingOption(t, options.SearchCacheTTLSeconds, "5400", "90 分钟（默认）")
	assertContainsCacheSettingOption(t, options.CacheWriteQueueSize, "768", "768（默认）")
	assertContainsCacheSettingOption(t, options.CacheWriteWorkers, "6", "6（默认）")
	assertContainsCacheSettingOption(t, options.HotRankingPreloadTime, "03:15", "03:15（默认）")
	assertContainsCacheSettingOption(t, options.HotRankingCacheTTLSeconds, "129600", "36 小时（默认）")
	assertContainsCacheSettingOption(t, options.HotRankingPreloadConcurrency, "5", "5（默认）")
	assertContainsCacheSettingOption(t, options.HotRankingPreloadTimeoutSeconds, "75", "75 秒（默认）")
}

func assertContainsCacheSettingOption(t *testing.T, options []CacheSettingOption, expectedValue string, expectedLabel string) {
	t.Helper()

	for _, option := range options {
		if option.Value == expectedValue {
			if option.Label != expectedLabel {
				t.Fatalf("expected option label %q for value %s, got %q", expectedLabel, expectedValue, option.Label)
			}
			return
		}
	}

	t.Fatalf("expected option value %s to exist in %+v", expectedValue, options)
}
