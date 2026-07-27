package service

import (
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestPluginStateServiceReturnsErrorWhenSchemaMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}

	service := NewPluginStateService(db)
	if err := service.SetStatus("missing-schema", "builtin", true); err == nil {
		t.Fatal("缺少插件状态表时必须返回错误")
	}
	if db.Migrator().HasTable(&model.PluginState{}) {
		t.Fatal("服务运行路径不得创建插件状态表")
	}
}
