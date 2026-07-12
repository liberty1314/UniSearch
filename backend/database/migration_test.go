package database

import (
	"errors"
	"testing"
	"time"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

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
