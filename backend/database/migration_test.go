package database

import (
	"errors"
	"strings"
	"testing"
	"time"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestValidateRuntimeSchemaRejectsNilDatabase(t *testing.T) {
	err := ValidateRuntimeSchema(nil)
	if err == nil || !strings.Contains(err.Error(), "数据库连接未初始化") {
		t.Fatalf("nil 数据库必须返回稳定错误，实际为 %v", err)
	}
}

func TestValidateRuntimeSchemaRejectsMissingTables(t *testing.T) {
	db := setupMigrationTestDB(t)
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("准备 users 表失败: %v", err)
	}

	err := ValidateRuntimeSchema(db)
	if err == nil {
		t.Fatal("缺少业务表时必须拒绝启动")
	}
	if !strings.Contains(err.Error(), "数据库结构未完成迁移") ||
		!strings.Contains(err.Error(), "secrets") ||
		!strings.Contains(err.Error(), "unisearch-migrate") {
		t.Fatalf("缺表错误必须列出表名和迁移命令，实际为 %v", err)
	}
	if db.Migrator().HasTable(&model.Secret{}) {
		t.Fatal("运行时结构校验不得创建缺失表")
	}
}

func TestValidateRuntimeSchemaAcceptsMigratedDatabase(t *testing.T) {
	setupMigrationTestDB(t)
	if err := AutoMigrate(); err != nil {
		t.Fatalf("迁移测试库失败: %v", err)
	}
	if err := ValidateRuntimeSchema(DB); err != nil {
		t.Fatalf("完整结构应通过校验: %v", err)
	}
}

func TestPurgeRemovedPluginDataDeletesOnlyRemovedPluginsAndIsIdempotent(t *testing.T) {
	db := setupMigrationTestDB(t)
	preparePluginPurgeTables(t, db)

	for _, name := range RemovedPluginNames() {
		seedPluginPurgeRecords(t, db, name)
	}
	seedPluginPurgeRecords(t, db, "sidhub")

	result, err := PurgeRemovedPluginData(db)
	if err != nil {
		t.Fatalf("清理已下线插件数据失败: %v", err)
	}
	if result.PluginStatesDeleted != int64(len(RemovedPluginNames())) ||
		result.PluginHealthStatusesDeleted != int64(len(RemovedPluginNames())) ||
		result.PluginRuntimeConfigsDeleted != int64(len(RemovedPluginNames())) ||
		result.PluginPerformanceMetricsDeleted != int64(len(RemovedPluginNames())) ||
		result.PluginErrorLogsDeleted != int64(len(RemovedPluginNames())) {
		t.Fatalf("应删除每张表中的全部已下线插件记录，实际为 %#v", result)
	}

	assertPluginPurgeRecordCount(t, db, RemovedPluginNames(), 0)
	assertPluginPurgeRecordCount(t, db, []string{"sidhub"}, 1)

	retryResult, err := PurgeRemovedPluginData(db)
	if err != nil {
		t.Fatalf("重复清理已下线插件数据失败: %v", err)
	}
	if retryResult.TotalDeleted() != 0 {
		t.Fatalf("重复清理不应再删除记录，实际为 %#v", retryResult)
	}
}

func TestPurgeRemovedPluginDataRollsBackWhenAnyTableDeleteFails(t *testing.T) {
	db := setupMigrationTestDB(t)
	preparePluginPurgeTables(t, db)

	for _, name := range RemovedPluginNames() {
		seedPluginPurgeRecords(t, db, name)
	}

	const callbackName = "test:fail-removed-plugin-purge"
	if err := db.Callback().Delete().Before("gorm:delete").Register(callbackName, func(tx *gorm.DB) {
		if tx.Statement.Table == (model.PluginErrorLog{}).TableName() {
			tx.AddError(errors.New("forced plugin error log delete failure"))
		}
	}); err != nil {
		t.Fatalf("注册删除失败回调失败: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Callback().Delete().Remove(callbackName)
	})

	if _, err := PurgeRemovedPluginData(db); err == nil {
		t.Fatal("任一表删除失败时应返回错误")
	}

	assertPluginPurgeRecordCount(t, db, RemovedPluginNames(), len(RemovedPluginNames()))
}

func TestAutoMigrateKeepsDeprecatedAPIKeyTable(t *testing.T) {
	setupMigrationTestDB(t)

	if err := DB.AutoMigrate(&model.APIKey{}); err != nil {
		t.Fatalf("准备 api_keys 表失败：%v", err)
	}

	if err := AutoMigrate(); err != nil {
		t.Fatalf("执行自动迁移失败：%v", err)
	}

	if !DB.Migrator().HasTable(&model.APIKey{}) {
		t.Fatal("普通自动迁移不应删除 api_keys 表")
	}
}

func TestDropDeprecatedTablesRemovesAPIKeyTableExplicitly(t *testing.T) {
	setupMigrationTestDB(t)

	if err := DB.AutoMigrate(&model.APIKey{}); err != nil {
		t.Fatalf("准备 api_keys 表失败：%v", err)
	}

	if err := DropDeprecatedTables(); err != nil {
		t.Fatalf("显式清理废弃表失败：%v", err)
	}

	if DB.Migrator().HasTable(&model.APIKey{}) {
		t.Fatal("显式清理后应删除 api_keys 表")
	}
}

func TestMigrateRefreshTokenSessionsCreatesDigestTableAndClearsLegacyRows(t *testing.T) {
	db := setupMigrationTestDB(t)
	createLegacyRefreshTokensTable(t, db)
	if err := db.Exec(`INSERT INTO refresh_tokens (token, username, expires_at, is_revoked) VALUES (?, ?, ?, ?)`,
		"legacy-plaintext-token", "legacy-user", time.Now().Add(time.Hour), false).Error; err != nil {
		t.Fatalf("创建旧刷新令牌夹具失败: %v", err)
	}

	if err := MigrateRefreshTokenSessions(db); err != nil {
		t.Fatalf("迁移刷新会话失败: %v", err)
	}
	if !db.Migrator().HasTable(&model.RefreshTokenSession{}) {
		t.Fatal("迁移后应创建 refresh_token_sessions 表")
	}
	var legacyCount int64
	if err := db.Table("refresh_tokens").Count(&legacyCount).Error; err != nil {
		t.Fatalf("统计旧刷新令牌失败: %v", err)
	}
	if legacyCount != 0 {
		t.Fatalf("迁移后旧原文记录必须清零，实际为 %d", legacyCount)
	}
	var newCount int64
	if err := db.Model(&model.RefreshTokenSession{}).Count(&newCount).Error; err != nil {
		t.Fatalf("统计新刷新会话失败: %v", err)
	}
	if newCount != 0 {
		t.Fatalf("禁止把旧原文转换为新会话，实际为 %d", newCount)
	}
	if err := MigrateRefreshTokenSessions(db); err != nil {
		t.Fatalf("重复迁移应保持幂等: %v", err)
	}
}

func TestEnsureLegacyRefreshTokensEmptyRejectsNonEmptyTable(t *testing.T) {
	db := setupMigrationTestDB(t)
	createLegacyRefreshTokensTable(t, db)
	if err := db.Exec(`INSERT INTO refresh_tokens (token, username, expires_at, is_revoked) VALUES (?, ?, ?, ?)`,
		"legacy-plaintext-token", "legacy-user", time.Now().Add(time.Hour), false).Error; err != nil {
		t.Fatalf("创建旧刷新令牌夹具失败: %v", err)
	}

	if err := EnsureLegacyRefreshTokensEmpty(db); err == nil {
		t.Fatal("旧刷新令牌表非空时必须拒绝启动")
	}
	if err := db.Exec("DELETE FROM refresh_tokens").Error; err != nil {
		t.Fatalf("清空旧刷新令牌失败: %v", err)
	}
	if err := EnsureLegacyRefreshTokensEmpty(db); err != nil {
		t.Fatalf("旧刷新令牌表为空时不应阻断启动: %v", err)
	}
}

func TestDropLegacyRefreshTokensRequiresEmptyTable(t *testing.T) {
	db := setupMigrationTestDB(t)
	createLegacyRefreshTokensTable(t, db)
	if err := db.Exec(`INSERT INTO refresh_tokens (token, username, expires_at, is_revoked) VALUES (?, ?, ?, ?)`,
		"legacy-plaintext-token", "legacy-user", time.Now().Add(time.Hour), false).Error; err != nil {
		t.Fatalf("创建旧刷新令牌夹具失败: %v", err)
	}

	if err := DropLegacyRefreshTokens(db); err == nil {
		t.Fatal("旧刷新令牌表非空时不得删除")
	}
	if !db.Migrator().HasTable("refresh_tokens") {
		t.Fatal("拒绝删除时必须保留旧表")
	}
	if err := db.Exec("DELETE FROM refresh_tokens").Error; err != nil {
		t.Fatalf("清空旧刷新令牌失败: %v", err)
	}
	if err := DropLegacyRefreshTokens(db); err != nil {
		t.Fatalf("旧表清空后应允许删除: %v", err)
	}
	if db.Migrator().HasTable("refresh_tokens") {
		t.Fatal("显式删除后旧刷新令牌表仍存在")
	}
}

func createLegacyRefreshTokensTable(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.Exec(`CREATE TABLE refresh_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT NOT NULL,
		username TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		is_revoked BOOLEAN NOT NULL DEFAULT FALSE
	)`).Error; err != nil {
		t.Fatalf("创建旧刷新令牌表失败: %v", err)
	}
}

func setupMigrationTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	oldDB := DB
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开测试数据库失败：%v", err)
	}
	DB = db

	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
		DB = oldDB
	})

	return db
}

func preparePluginPurgeTables(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.AutoMigrate(
		&model.PluginState{},
		&model.PluginHealthStatus{},
		&model.PluginRuntimeConfig{},
		&model.PluginPerformanceMetric{},
		&model.PluginErrorLog{},
	); err != nil {
		t.Fatalf("创建插件清理测试表失败: %v", err)
	}
}

func seedPluginPurgeRecords(t *testing.T, db *gorm.DB, pluginName string) {
	t.Helper()
	now := time.Now()
	records := []interface{}{
		&model.PluginState{PluginName: pluginName, PluginType: "builtin", IsEnabled: true},
		&model.PluginHealthStatus{PluginName: pluginName, IsHealthy: true, LastCheckedAt: now},
		&model.PluginRuntimeConfig{PluginName: pluginName, ConfigJSON: "{}"},
		&model.PluginPerformanceMetric{PluginName: pluginName, BucketStartedAt: now, BucketEndedAt: now},
		&model.PluginErrorLog{PluginName: pluginName, KeywordHash: "hash", ErrorType: "error", OccurredAt: now},
	}
	for _, record := range records {
		if err := db.Create(record).Error; err != nil {
			t.Fatalf("创建 %s 的插件清理测试记录失败: %v", pluginName, err)
		}
	}
}

func assertPluginPurgeRecordCount(t *testing.T, db *gorm.DB, pluginNames []string, want int) {
	t.Helper()
	models := []interface{}{
		&model.PluginState{},
		&model.PluginHealthStatus{},
		&model.PluginRuntimeConfig{},
		&model.PluginPerformanceMetric{},
		&model.PluginErrorLog{},
	}
	for _, item := range models {
		var count int64
		if err := db.Model(item).Where("plugin_name IN ?", pluginNames).Count(&count).Error; err != nil {
			t.Fatalf("统计插件清理记录失败: %v", err)
		}
		if count != int64(want) {
			t.Fatalf("%T 中 plugin_name=%v 的记录数量应为 %d，实际为 %d", item, pluginNames, want, count)
		}
	}
}
