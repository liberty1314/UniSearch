package service

import (
	"strings"
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func pluginConfigNumber(value float64) *float64 {
	return &value
}

func newPluginRuntimeConfigTestService(t *testing.T) *PluginRuntimeConfigService {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开测试数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.PluginRuntimeConfig{}); err != nil {
		t.Fatalf("迁移插件运行配置表失败: %v", err)
	}
	return NewPluginRuntimeConfigService(db)
}

func testRuntimeConfigManifest() model.PluginManifest {
	return model.PluginManifest{
		ConfigSchema: []model.PluginConfigField{
			{
				Key:     "max_resource_entries_per_type",
				Label:   "每类资源获取数量",
				Type:    "number",
				Default: float64(10),
				Minimum: pluginConfigNumber(1),
				Maximum: pluginConfigNumber(40),
				Integer: true,
			},
			{
				Key:               "pre_resolved_link_start_per_type",
				Label:             "每类完整解析数量",
				Type:              "number",
				Default:           float64(3),
				Minimum:           pluginConfigNumber(0),
				Maximum:           pluginConfigNumber(20),
				Integer:           true,
				LessThanOrEqualTo: "max_resource_entries_per_type",
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

	if config["max_resource_entries_per_type"] != float64(10) || config["pre_resolved_link_start_per_type"] != float64(3) {
		t.Fatalf("期望返回 schema 默认值，实际为 %#v", config)
	}
}

func TestPluginRuntimeConfigServiceSavesAndReadsNumber(t *testing.T) {
	service := newPluginRuntimeConfigTestService(t)

	saved, err := service.SaveConfig("sidhub", testRuntimeConfigManifest(), map[string]interface{}{
		"max_resource_entries_per_type":    10,
		"pre_resolved_link_start_per_type": 5,
		"unknown":                          99,
	})
	if err != nil {
		t.Fatalf("保存配置失败: %v", err)
	}
	if saved["max_resource_entries_per_type"] != float64(10) || saved["pre_resolved_link_start_per_type"] != float64(5) {
		t.Fatalf("期望保存数字配置，实际为 %#v", saved)
	}

	config, err := service.GetConfig("sidhub", testRuntimeConfigManifest())
	if err != nil {
		t.Fatalf("读取配置失败: %v", err)
	}
	if config["max_resource_entries_per_type"] != float64(10) || config["pre_resolved_link_start_per_type"] != float64(5) || config["unknown"] != nil {
		t.Fatalf("期望只读取 schema 允许的配置，实际为 %#v", config)
	}
}

func TestPluginRuntimeConfigServiceRejectsNumericConstraints(t *testing.T) {
	service := newPluginRuntimeConfigTestService(t)
	tests := []struct {
		name    string
		config  map[string]interface{}
		message string
	}{
		{
			name: "低于最小值",
			config: map[string]interface{}{
				"max_resource_entries_per_type":    0,
				"pre_resolved_link_start_per_type": 0,
			},
			message: "每类资源获取数量不能小于 1",
		},
		{
			name: "高于最大值",
			config: map[string]interface{}{
				"max_resource_entries_per_type":    41,
				"pre_resolved_link_start_per_type": 0,
			},
			message: "每类资源获取数量不能大于 40",
		},
		{
			name: "非整数",
			config: map[string]interface{}{
				"max_resource_entries_per_type":    10.5,
				"pre_resolved_link_start_per_type": 0,
			},
			message: "每类资源获取数量必须是整数",
		},
		{
			name: "预解析超过资源数量",
			config: map[string]interface{}{
				"max_resource_entries_per_type":    10,
				"pre_resolved_link_start_per_type": 11,
			},
			message: "每类完整解析数量不能大于每类资源获取数量",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := service.SaveConfig("sidhub", testRuntimeConfigManifest(), tc.config)
			if err == nil || !strings.Contains(err.Error(), tc.message) {
				t.Fatalf("期望错误包含 %q，实际为 %v", tc.message, err)
			}
		})
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

func TestPluginRuntimeConfigServiceReturnsErrorWhenSchemaMissing(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}

	service := NewPluginRuntimeConfigService(db)
	if _, err := service.GetConfig("missing-schema", testRuntimeConfigManifest()); err == nil {
		t.Fatal("缺少插件运行配置表时必须返回错误")
	}
	if db.Migrator().HasTable(&model.PluginRuntimeConfig{}) {
		t.Fatal("服务运行路径不得创建插件运行配置表")
	}
}
