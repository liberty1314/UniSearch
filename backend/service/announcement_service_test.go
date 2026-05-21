package service

import (
	"fmt"
	"testing"
	"time"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newAnnouncementServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:announcement_service_%s?mode=memory&cache=private", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.Announcement{}, &model.SystemSettings{}); err != nil {
		t.Fatalf("auto migrate announcement tables: %v", err)
	}

	return db
}

func TestAnnouncementServiceGetActiveAnnouncementsSortsByPriorityAndCreationTime(t *testing.T) {
	db := newAnnouncementServiceTestDB(t)
	announcementService := NewAnnouncementService(db)
	systemSettingsService := NewSystemSettingsService(db)

	if err := systemSettingsService.SetAnnouncementEnabled(true); err != nil {
		t.Fatalf("enable announcement feature: %v", err)
	}

	now := time.Now()
	olderHigh := model.Announcement{
		Title:     "高优先级-旧",
		Content:   "旧内容",
		Priority:  "high",
		StartTime: now.Add(-2 * time.Hour),
		EndTime:   nil,
		IsEnabled: true,
		CreatedAt: now.Add(-2 * time.Hour),
		UpdatedAt: now.Add(-2 * time.Hour),
		CreatedBy: "admin",
	}
	newerHigh := model.Announcement{
		Title:     "高优先级-新",
		Content:   "新内容",
		Priority:  "high",
		StartTime: now.Add(-time.Hour),
		EndTime:   nil,
		IsEnabled: true,
		CreatedAt: now.Add(-time.Hour),
		UpdatedAt: now.Add(-time.Hour),
		CreatedBy: "admin",
	}
	medium := model.Announcement{
		Title:     "中优先级",
		Content:   "中内容",
		Priority:  "medium",
		StartTime: now.Add(-time.Hour),
		EndTime:   nil,
		IsEnabled: true,
		CreatedAt: now.Add(-30 * time.Minute),
		UpdatedAt: now.Add(-30 * time.Minute),
		CreatedBy: "admin",
	}

	for _, item := range []model.Announcement{medium, olderHigh, newerHigh} {
		if err := db.Create(&item).Error; err != nil {
			t.Fatalf("create announcement %s: %v", item.Title, err)
		}
	}

	announcements, err := announcementService.GetActiveAnnouncements(systemSettingsService)
	if err != nil {
		t.Fatalf("GetActiveAnnouncements returned error: %v", err)
	}

	if len(announcements) != 3 {
		t.Fatalf("expected 3 active announcements, got %d", len(announcements))
	}

	if announcements[0].Title != "高优先级-新" || announcements[1].Title != "高优先级-旧" || announcements[2].Title != "中优先级" {
		t.Fatalf("unexpected announcement order: %#v", announcements)
	}
}

func TestAnnouncementServiceSetAnnouncementStatusTracksUpdatedBy(t *testing.T) {
	db := newAnnouncementServiceTestDB(t)
	announcementService := NewAnnouncementService(db)

	announcement := model.Announcement{
		Title:     "状态变更公告",
		Content:   "内容",
		Priority:  "medium",
		StartTime: time.Now().Add(-time.Hour),
		IsEnabled: true,
		CreatedAt: time.Now().Add(-time.Hour),
		UpdatedAt: time.Now().Add(-time.Hour),
		CreatedBy: "creator",
	}
	if err := db.Create(&announcement).Error; err != nil {
		t.Fatalf("create announcement: %v", err)
	}

	if err := announcementService.SetAnnouncementStatusWithOperator(announcement.ID, false, "editor"); err != nil {
		t.Fatalf("SetAnnouncementStatus returned error: %v", err)
	}

	var updated model.Announcement
	if err := db.First(&updated, announcement.ID).Error; err != nil {
		t.Fatalf("query announcement after status update: %v", err)
	}

	if updated.IsEnabled {
		t.Fatalf("expected announcement disabled, got enabled")
	}

	if updated.UpdatedBy != "editor" {
		t.Fatalf("expected UpdatedBy to be editor, got %q", updated.UpdatedBy)
	}
}
