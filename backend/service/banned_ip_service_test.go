package service

import (
	"fmt"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"unisearch/model"
)

func newBannedIPTestService(t *testing.T) *BannedIPService {
	t.Helper()
	dsn := fmt.Sprintf("file:banned_ip_%s?mode=memory&cache=private", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&model.BannedIP{}); err != nil {
		t.Fatalf("auto migrate banned_ips: %v", err)
	}
	return NewBannedIPService(db)
}

func TestBannedIPManualBanAndUnban(t *testing.T) {
	svc := newBannedIPTestService(t)

	if svc.IsBanned("1.2.3.4") {
		t.Fatal("初始不应被封禁")
	}

	rec, err := svc.Ban("1.2.3.4", "手动测试", model.BannedIPSourceManual, nil, "admin")
	if err != nil {
		t.Fatalf("封禁失败: %v", err)
	}
	if rec.Source != model.BannedIPSourceManual {
		t.Fatalf("source 期望 manual，实际 %s", rec.Source)
	}
	if !svc.IsBanned("1.2.3.4") {
		t.Fatal("封禁后应命中")
	}

	if err := svc.UnbanByID(rec.ID); err != nil {
		t.Fatalf("解封失败: %v", err)
	}
	if svc.IsBanned("1.2.3.4") {
		t.Fatal("解封后不应命中")
	}
}

func TestBannedIPExpiry(t *testing.T) {
	svc := newBannedIPTestService(t)

	past := time.Now().Add(-time.Minute)
	if _, err := svc.Ban("5.6.7.8", "已过期", model.BannedIPSourceAuto, &past, ""); err != nil {
		t.Fatalf("封禁失败: %v", err)
	}
	if svc.IsBanned("5.6.7.8") {
		t.Fatal("已过期封禁不应命中")
	}

	future := time.Now().Add(time.Hour)
	if _, err := svc.Ban("5.6.7.8", "未过期", model.BannedIPSourceAuto, &future, ""); err != nil {
		t.Fatalf("封禁失败: %v", err)
	}
	if !svc.IsBanned("5.6.7.8") {
		t.Fatal("未过期封禁应命中")
	}
}

func TestBannedIPWarmUpSkipsExpired(t *testing.T) {
	svc := newBannedIPTestService(t)

	past := time.Now().Add(-time.Minute)
	future := time.Now().Add(time.Hour)
	if _, err := svc.Ban("10.0.0.1", "过期", model.BannedIPSourceAuto, &past, ""); err != nil {
		t.Fatalf("封禁失败: %v", err)
	}
	if _, err := svc.Ban("10.0.0.2", "有效", model.BannedIPSourceManual, &future, ""); err != nil {
		t.Fatalf("封禁失败: %v", err)
	}

	// 重建服务并预热，验证只加载未过期记录。
	fresh := NewBannedIPService(svc.db)
	if err := fresh.WarmUp(); err != nil {
		t.Fatalf("预热失败: %v", err)
	}
	if fresh.IsBanned("10.0.0.1") {
		t.Fatal("过期记录不应被预热")
	}
	if !fresh.IsBanned("10.0.0.2") {
		t.Fatal("有效记录应被预热")
	}
}

func TestBannedIPList(t *testing.T) {
	svc := newBannedIPTestService(t)

	for i := 0; i < 3; i++ {
		if _, err := svc.Ban(fmt.Sprintf("192.168.1.%d", i), "批量", model.BannedIPSourceManual, nil, ""); err != nil {
			t.Fatalf("封禁失败: %v", err)
		}
	}

	items, total, err := svc.List(1, 20, "")
	if err != nil {
		t.Fatalf("列表失败: %v", err)
	}
	if total != 3 || len(items) != 3 {
		t.Fatalf("期望 3 条，实际 total=%d len=%d", total, len(items))
	}

	// 关键字过滤。
	items, total, err = svc.List(1, 20, "192.168.1.1")
	if err != nil {
		t.Fatalf("过滤失败: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("过滤期望 1 条，实际 total=%d len=%d", total, len(items))
	}
}
