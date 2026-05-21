package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"unisearch/model"
	"unisearch/service"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newAnnouncementHandlerTestServices(t *testing.T) (*service.AnnouncementService, *service.SystemSettingsService) {
	t.Helper()

	dsn := fmt.Sprintf("file:announcement_handler_%s?mode=memory&cache=private", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.Announcement{}, &model.SystemSettings{}); err != nil {
		t.Fatalf("auto migrate announcement tables: %v", err)
	}

	return service.NewAnnouncementService(db), service.NewSystemSettingsService(db)
}

func seedAnnouncementHandlerData(t *testing.T, announcementService *service.AnnouncementService) {
	t.Helper()

	records := []model.Announcement{
		{
			Title:     "进行中公告",
			Content:   "内容1",
			Priority:  "high",
			StartTime: time.Date(2026, 5, 20, 0, 0, 0, 0, time.UTC),
			EndTime:   func() *time.Time { value := time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC); return &value }(),
			IsEnabled: true,
		},
		{
			Title:     "未生效公告",
			Content:   "内容2",
			Priority:  "medium",
			StartTime: time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC),
			EndTime:   nil,
			IsEnabled: true,
		},
		{
			Title:     "已过期公告",
			Content:   "内容3",
			Priority:  "low",
			StartTime: time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC),
			EndTime:   func() *time.Time { value := time.Date(2026, 5, 20, 0, 0, 0, 0, time.UTC); return &value }(),
			IsEnabled: true,
		},
	}

	for _, record := range records {
		if _, err := announcementService.CreateAnnouncement(&record, "admin"); err != nil {
			t.Fatalf("seed announcement %s: %v", record.Title, err)
		}
	}
}

func TestListAnnouncementsHandlerSupportsKeywordAndLifecycleFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	announcementService, _ := newAnnouncementHandlerTestServices(t)
	seedAnnouncementHandlerData(t, announcementService)

	router := gin.New()
	router.GET("/announcements", ListAnnouncementsHandler(announcementService))

	req := httptest.NewRequest(http.MethodGet, "/announcements?page=1&page_size=10&keyword=%E6%9C%AA%E7%94%9F%E6%95%88&lifecycle_status=scheduled", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var response struct {
		Data ListAnnouncementsResponse `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(response.Data.Announcements) != 1 {
		t.Fatalf("expected 1 announcement, got %d", len(response.Data.Announcements))
	}

	if response.Data.Announcements[0].Title != "未生效公告" {
		t.Fatalf("expected scheduled announcement, got %#v", response.Data.Announcements[0])
	}
}
