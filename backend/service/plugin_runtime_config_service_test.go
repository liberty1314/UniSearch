package service

import (
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newPluginRuntimeConfigTestService(t *testing.T) *PluginRuntimeConfigService {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开测试数据库失败: %v", err)
	}
	return NewPluginRuntimeConfigService(db)
}

func testRuntimeConfigManifest() model.PluginManifest {
	return model.PluginManifest{
		ConfigSchema: []model.PluginConfigField{
			{
				Key:     "pre_resolved_link_start_per_type",
				Label:   "每类完整解析数量",
				Type:    "number",
				Default: float64(3),
			},
		},
	}
}

func TestPluginRuntimeConfigServiceReturnsDefaults(t *testing.T) {
	service := newPluginRuntimeConfigTestService(t)

	config, err := service.GetConfig("sidhub", testRuntimeConfigManifest())
	if err != nil {
		t.Fatalf("读取默认配置失败: %v", err)
	}

	if config["pre_resolved_link_start_per_type"] != float64(3) {
		t.Fatalf("期望返回 schema 默认值，实际为 %#v", config)
	}
}

func TestPluginRuntimeConfigServiceSavesAndReadsNumber(t *testing.T) {
	service := newPluginRuntimeConfigTestService(t)

	saved, err := service.SaveConfig("sidhub", testRuntimeConfigManifest(), map[string]interface{}{
		"pre_resolved_link_start_per_type": 5,
		"unknown":                          99,
	})
	if err != nil {
		t.Fatalf("保存配置失败: %v", err)
	}
	if saved["pre_resolved_link_start_per_type"] != float64(5) {
		t.Fatalf("期望保存数字配置，实际为 %#v", saved)
	}

	config, err := service.GetConfig("sidhub", testRuntimeConfigManifest())
	if err != nil {
		t.Fatalf("读取配置失败: %v", err)
	}
	if config["pre_resolved_link_start_per_type"] != float64(5) || config["unknown"] != nil {
		t.Fatalf("期望只读取 schema 允许的配置，实际为 %#v", config)
	}
}

func TestPluginRuntimeConfigServiceRejectsInvalidNumber(t *testing.T) {
	service := newPluginRuntimeConfigTestService(t)

	_, err := service.SaveConfig("sidhub", testRuntimeConfigManifest(), map[string]interface{}{
		"pre_resolved_link_start_per_type": "不是数字",
	})
	if err == nil {
		t.Fatal("期望非法数字配置保存失败")
	}
}
