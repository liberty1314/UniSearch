package service

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func newSearchAuditServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.SearchAuditLog{}); err != nil {
		t.Fatalf("迁移搜索审计测试表失败: %v", err)
	}
	return db
}

func TestSearchAuditCleanupDeletesOnlyRecordsOlderThanRetentionDays(t *testing.T) {
	db := newSearchAuditServiceTestDB(t)
	svc := NewSearchAuditService(db)

	now := time.Now()
	logs := []model.SearchAuditLog{
		{UserID: 1, Username: "admin", Keyword: "过期记录", CreatedAt: now.AddDate(0, 0, -40)},
		{UserID: 1, Username: "admin", Keyword: "近期记录", CreatedAt: now.AddDate(0, 0, -10)},
	}
	if err := db.Create(&logs).Error; err != nil {
		t.Fatalf("写入搜索审计测试数据失败: %v", err)
	}

	deleted, err := svc.Cleanup(30)
	if err != nil {
		t.Fatalf("清理搜索审计失败: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("期望删除 1 条记录，实际删除 %d 条", deleted)
	}

	var remaining []model.SearchAuditLog
	if err := db.Find(&remaining).Error; err != nil {
		t.Fatalf("查询剩余记录失败: %v", err)
	}
	if len(remaining) != 1 || remaining[0].Keyword != "近期记录" {
		t.Fatalf("期望仅保留近期记录，实际: %+v", remaining)
	}
}

func TestSearchAuditCleanupRejectsNonPositiveRetentionDays(t *testing.T) {
	db := newSearchAuditServiceTestDB(t)
	svc := NewSearchAuditService(db)

	for _, days := range []int{0, -1} {
		if _, err := svc.Cleanup(days); err == nil {
			t.Fatalf("留存天数 %d 应返回错误", days)
		}
	}
}

func TestSearchAuditCleanupFailsWhenServiceNotInitialized(t *testing.T) {
	var svc *SearchAuditService
	if _, err := svc.Cleanup(30); err == nil {
		t.Fatal("未初始化的服务应返回错误")
	}
}
