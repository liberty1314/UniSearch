package service

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func newAdminAuditServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminAuditLog{}); err != nil {
		t.Fatalf("迁移操作审计测试表失败: %v", err)
	}
	return db
}

func TestAdminAuditCleanupDeletesOnlyRecordsOlderThanRetentionDays(t *testing.T) {
	db := newAdminAuditServiceTestDB(t)
	svc := NewAdminAuditService(db)

	now := time.Now()
	logs := []model.AdminAuditLog{
		{OperatorID: 1, Operator: "admin", Method: "DELETE", Path: "/api/admin/users/1", Action: "delete_user", CreatedAt: now.AddDate(0, 0, -100)},
		{OperatorID: 1, Operator: "admin", Method: "POST", Path: "/api/admin/users", Action: "create_user", CreatedAt: now.AddDate(0, 0, -20)},
	}
	if err := db.Create(&logs).Error; err != nil {
		t.Fatalf("写入操作审计测试数据失败: %v", err)
	}

	deleted, err := svc.Cleanup(90)
	if err != nil {
		t.Fatalf("清理操作审计失败: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("期望删除 1 条记录，实际删除 %d 条", deleted)
	}

	var remaining []model.AdminAuditLog
	if err := db.Find(&remaining).Error; err != nil {
		t.Fatalf("查询剩余记录失败: %v", err)
	}
	if len(remaining) != 1 || remaining[0].Action != "create_user" {
		t.Fatalf("期望仅保留近期记录，实际: %+v", remaining)
	}
}

func TestAdminAuditCleanupRejectsNonPositiveRetentionDays(t *testing.T) {
	db := newAdminAuditServiceTestDB(t)
	svc := NewAdminAuditService(db)

	for _, days := range []int{0, -1} {
		if _, err := svc.Cleanup(days); err == nil {
			t.Fatalf("留存天数 %d 应返回错误", days)
		}
	}
}

func TestAdminAuditCleanupFailsWhenServiceNotInitialized(t *testing.T) {
	var svc *AdminAuditService
	if _, err := svc.Cleanup(90); err == nil {
		t.Fatal("未初始化的服务应返回错误")
	}
}
