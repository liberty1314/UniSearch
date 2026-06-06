package database

import (
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

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

func setupMigrationTestDB(t *testing.T) {
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
}
