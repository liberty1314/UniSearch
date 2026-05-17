package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"unisearch/model"
	"unisearch/service"
)

func newAdminTagTestRouter(t *testing.T) *gin.Engine {
	t.Helper()

	gin.SetMode(gin.TestMode)
	dsn := fmt.Sprintf("file:admin_tag_api_%s?mode=memory&cache=private", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminTag{}, &model.TGChannel{}); err != nil {
		t.Fatalf("auto migrate admin tags: %v", err)
	}

	SetAdminTagService(service.NewAdminTagService(db))
	router := gin.New()
	router.GET("/tags", ListAdminTagsHandler)
	router.POST("/tags", CreateAdminTagHandler)
	router.PUT("/tags/:id", UpdateAdminTagHandler)
	router.DELETE("/tags/:id", DeleteAdminTagHandler)
	return router
}

func TestCreateAdminTagHandlerRejectsInvalidScope(t *testing.T) {
	router := newAdminTagTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/tags", strings.NewReader(`{"scope":"invalid","name":"电影"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAdminTagHandlersCreateAndListByScope(t *testing.T) {
	router := newAdminTagTestRouter(t)

	for _, body := range []string{
		`{"scope":"plugin","name":"电影"}`,
		`{"scope":"channel","name":"推荐"}`,
	} {
		req := httptest.NewRequest(http.MethodPost, "/tags", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/tags?scope=plugin", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if !strings.Contains(body, `"scope":"plugin"`) || strings.Contains(body, `"scope":"channel"`) {
		t.Fatalf("expected plugin scope only, got %s", body)
	}
}

func TestAdminTagHandlersUpdateAndDelete(t *testing.T) {
	router := newAdminTagTestRouter(t)

	createReq := httptest.NewRequest(http.MethodPost, "/tags", strings.NewReader(`{"scope":"plugin","name":"电影"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createResp := httptest.NewRecorder()
	router.ServeHTTP(createResp, createReq)
	if createResp.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", createResp.Code, createResp.Body.String())
	}

	updateReq := httptest.NewRequest(http.MethodPut, "/tags/1", strings.NewReader(`{"name":"剧集"}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateResp := httptest.NewRecorder()
	router.ServeHTTP(updateResp, updateReq)
	if updateResp.Code != http.StatusOK || !strings.Contains(updateResp.Body.String(), `"name":"剧集"`) {
		t.Fatalf("expected update success, got %d: %s", updateResp.Code, updateResp.Body.String())
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/tags/1", nil)
	deleteResp := httptest.NewRecorder()
	router.ServeHTTP(deleteResp, deleteReq)
	if deleteResp.Code != http.StatusOK {
		t.Fatalf("expected delete success, got %d: %s", deleteResp.Code, deleteResp.Body.String())
	}
}

func TestAdminTagHandlersRejectInvalidTagID(t *testing.T) {
	router := newAdminTagTestRouter(t)

	req := httptest.NewRequest(http.MethodPut, "/tags/abc", strings.NewReader(`{"name":"剧集"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}
