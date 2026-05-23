package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"unisearch/model"

	"github.com/gin-gonic/gin"
)

type fakeHotRankingQueryService struct {
	response       model.HotRankingResponse
	err            error
	lastPeriod     model.HotRankingPeriod
	lastCategory   model.HotRankingCategory
	invocationCount int
}

func (f *fakeHotRankingQueryService) GetHotRankings(_ context.Context, period model.HotRankingPeriod, category model.HotRankingCategory) (model.HotRankingResponse, error) {
	f.invocationCount++
	f.lastPeriod = period
	f.lastCategory = category
	return f.response, f.err
}

func TestHotRankingHandlerUsesDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Period:    model.HotRankingPeriodDay,
			UpdatedAt: time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC),
			Source:    "tmdb",
			Sections: []model.HotRankingSection{
				{Category: model.HotRankingCategoryMovie, Title: "热门电影", Items: []model.HotRankingItem{}},
			},
		},
	}

	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if service.lastPeriod != model.HotRankingPeriodDay {
		t.Fatalf("expected default day, got %q", service.lastPeriod)
	}

	if service.lastCategory != model.HotRankingCategoryMovie {
		t.Fatalf("expected default movie, got %q", service.lastCategory)
	}
}

func TestHotRankingHandlerNormalizesInvalidParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Period:    model.HotRankingPeriodDay,
			UpdatedAt: time.Now(),
			Source:    "tmdb",
			Sections:  []model.HotRankingSection{},
		},
	}

	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?period=bad&category=bad", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if service.lastPeriod != model.HotRankingPeriodDay || service.lastCategory != model.HotRankingCategoryMovie {
		t.Fatalf("expected normalized defaults, got period=%q category=%q", service.lastPeriod, service.lastCategory)
	}
}

func TestHotRankingHandlerReturnsServerError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{err: errors.New("tmdb busy")}
	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?period=week&category=tv", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["message"] == "" {
		t.Fatalf("expected message in error response, got %v", response)
	}
}
