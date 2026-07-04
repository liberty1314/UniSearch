package service

import (
	"testing"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newPluginHealthTestService(t *testing.T) *PluginHealthService {
	t.Helper()

	db := newPluginHealthTestDB(t)
	if err := db.AutoMigrate(&model.PluginHealthStatus{}); err != nil {
		t.Fatalf("迁移插件健康状态表失败: %v", err)
	}

	return NewPluginHealthService(db)
}

func newPluginHealthTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	return db
}

func TestPluginHealthServiceGetStatusReturnsNilForUnknownPlugin(t *testing.T) {
	service := newPluginHealthTestService(t)

	status, err := service.GetStatus("missing-plugin")
	if err != nil {
		t.Fatalf("查询未知插件不应失败: %v", err)
	}
	if status != nil {
		t.Fatalf("未知插件应返回 nil，实际为 %#v", status)
	}
}

func TestPluginHealthServiceRecordResultTracksTimeoutStats(t *testing.T) {
	service := newPluginHealthTestService(t)

	if err := service.RecordResult("PanSearch", false, "插件搜索超时", "timeout"); err != nil {
		t.Fatalf("记录超时失败: %v", err)
	}
	if err := service.RecordResult(" pansearch ", false, "远端返回错误", "search_failure"); err != nil {
		t.Fatalf("记录普通失败失败: %v", err)
	}
	if err := service.RecordResult("PANSEARCH", true, "", "search_failure"); err != nil {
		t.Fatalf("记录成功失败: %v", err)
	}

	status, err := service.GetStatus("pansearch")
	if err != nil {
		t.Fatalf("查询插件健康状态失败: %v", err)
	}
	if status == nil {
		t.Fatal("期望获取到插件健康状态")
	}
	if status.PluginName != "pansearch" {
		t.Fatalf("插件名应归一化为 pansearch，实际为 %q", status.PluginName)
	}
	if !status.IsHealthy {
		t.Fatal("最后一次成功记录后应为健康状态")
	}
	if status.TotalChecks != 3 {
		t.Fatalf("总检查次数应为 3，实际为 %d", status.TotalChecks)
	}
	if status.TimeoutCount != 1 {
		t.Fatalf("超时次数应为 1，实际为 %d", status.TimeoutCount)
	}
	if status.TimeoutRate != float64(1)/float64(3) {
		t.Fatalf("超时率应为 1/3，实际为 %v", status.TimeoutRate)
	}
	if status.ConsecutiveFailures != 0 {
		t.Fatalf("成功记录后连续失败次数应归零，实际为 %d", status.ConsecutiveFailures)
	}
	if status.LastError != "" {
		t.Fatalf("成功记录后最近错误应清空，实际为 %q", status.LastError)
	}
}

func TestPluginHealthServiceRecordResultAutoMigratesSchema(t *testing.T) {
	service := NewPluginHealthService(newPluginHealthTestDB(t))

	if err := service.RecordResult("auto-migrate-plugin", false, "timeout", "timeout"); err != nil {
		t.Fatalf("记录健康状态应自动迁移表结构: %v", err)
	}

	status, err := service.GetStatus("auto-migrate-plugin")
	if err != nil {
		t.Fatalf("查询自动迁移后的健康状态失败: %v", err)
	}
	if status == nil {
		t.Fatal("自动迁移后应能读取健康状态")
	}
	if status.TotalChecks != 1 || status.TimeoutCount != 1 || status.TimeoutRate != 1 {
		t.Fatalf("自动迁移后统计字段应可写入，实际为 %#v", status)
	}
}

func TestPluginHealthServiceRecordResultTracksConsecutiveFailures(t *testing.T) {
	service := newPluginHealthTestService(t)

	if err := service.RecordResult("fail-plugin", false, "第一次失败", "manual_test"); err != nil {
		t.Fatalf("记录第一次失败失败: %v", err)
	}
	if err := service.RecordResult("fail-plugin", false, "第二次失败", "manual_test"); err != nil {
		t.Fatalf("记录第二次失败失败: %v", err)
	}

	status, err := service.GetStatus("fail-plugin")
	if err != nil {
		t.Fatalf("查询插件健康状态失败: %v", err)
	}
	if status == nil {
		t.Fatal("期望获取到插件健康状态")
	}
	if status.ConsecutiveFailures != 2 {
		t.Fatalf("连续失败次数应为 2，实际为 %d", status.ConsecutiveFailures)
	}
	if status.TimeoutCount != 0 || status.TimeoutRate != 0 {
		t.Fatalf("普通失败不应计入超时统计，实际 timeout_count=%d timeout_rate=%v", status.TimeoutCount, status.TimeoutRate)
	}
}

func TestPluginHealthServiceRejectsEmptyPluginName(t *testing.T) {
	service := newPluginHealthTestService(t)

	if err := service.RecordResult("  ", true, "", "manual_test"); err == nil {
		t.Fatal("空插件名应返回错误")
	}
}
