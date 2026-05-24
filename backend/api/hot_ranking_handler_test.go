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
	lastQuery      model.HotRankingQuery
	invocationCount int
}

func (f *fakeHotRankingQueryService) GetHotRankings(_ context.Context, query model.HotRankingQuery) (model.HotRankingResponse, error) {
	f.invocationCount++
	f.lastQuery = query
	return f.response, f.err
}

func TestHotRankingHandlerUsesDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Mode:      model.HotRankingModeTrend,
			Period:    model.HotRankingPeriodDay,
			Page:      1,
			PageSize:  100,
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

	if service.lastQuery.Mode != model.HotRankingModeTrend {
		t.Fatalf("expected default trend, got %q", service.lastQuery.Mode)
	}
	if service.lastQuery.Period != model.HotRankingPeriodDay {
		t.Fatalf("expected default day, got %q", service.lastQuery.Period)
	}
	if service.lastQuery.Category != model.HotRankingCategoryAll {
		t.Fatalf("expected default all, got %q", service.lastQuery.Category)
	}
	if service.lastQuery.Page != 1 || service.lastQuery.PageSize != 100 {
		t.Fatalf("expected default paging 1/100, got %d/%d", service.lastQuery.Page, service.lastQuery.PageSize)
	}
}

func TestHotRankingHandlerNormalizesInvalidParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Mode:      model.HotRankingModeTrend,
			Period:    model.HotRankingPeriodDay,
			Page:      1,
			PageSize:  100,
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

	if service.lastQuery.Mode != model.HotRankingModeTrend || service.lastQuery.Period != model.HotRankingPeriodDay || service.lastQuery.Category != model.HotRankingCategoryAll {
		t.Fatalf("expected normalized defaults, got mode=%q period=%q category=%q", service.lastQuery.Mode, service.lastQuery.Period, service.lastQuery.Category)
	}
}

func TestHotRankingHandlerSupportsAllCategory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Mode:      model.HotRankingModeTrend,
			Period:    model.HotRankingPeriodWeek,
			Page:      1,
			PageSize:  100,
			UpdatedAt: time.Now(),
			Source:    "tmdb",
			Sections: []model.HotRankingSection{
				{Category: model.HotRankingCategoryMovie, Title: "热门电影"},
				{Category: model.HotRankingCategoryTV, Title: "热门电视剧"},
				{Category: model.HotRankingCategoryAnime, Title: "热门动漫"},
			},
		},
	}

	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?period=week&category=all", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if service.lastQuery.Category != model.HotRankingCategoryAll {
		t.Fatalf("expected all category, got %q", service.lastQuery.Category)
	}
}

func TestHotRankingHandlerPassesExtendedQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{
		response: model.HotRankingResponse{
			Mode:      model.HotRankingModePopular,
			Period:    model.HotRankingPeriodMonth,
			Page:      2,
			PageSize:  100,
			UpdatedAt: time.Now(),
			Source:    "tmdb",
			Sections:  []model.HotRankingSection{},
		},
	}

	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?mode=popular&period=month&category=movie&sort_by=vote_average.desc&month=2026-05&page=2&page_size=150", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if service.lastQuery.Mode != model.HotRankingModePopular {
		t.Fatalf("expected popular mode, got %q", service.lastQuery.Mode)
	}
	if service.lastQuery.Month != "2026-05" {
		t.Fatalf("expected month=2026-05, got %q", service.lastQuery.Month)
	}
	if service.lastQuery.SortBy != model.HotRankingSortByVoteAverage {
		t.Fatalf("expected sort_by=vote_average.desc, got %q", service.lastQuery.SortBy)
	}
	if service.lastQuery.Page != 2 || service.lastQuery.PageSize != 100 {
		t.Fatalf("expected normalized page/pageSize 2/100, got %d/%d", service.lastQuery.Page, service.lastQuery.PageSize)
	}
}

func TestHotRankingHandlerAllowsCustomSortForAllCategory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{}
	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?mode=popular&period=day&category=all&sort_by=vote_average.desc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if service.lastQuery.SortBy != model.HotRankingSortByVoteAverage {
		t.Fatalf("expected sort_by=vote_average.desc, got %q", service.lastQuery.SortBy)
	}
}

func TestHotRankingHandlerRejectsTrendMonthQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{}
	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?mode=trend&period=month", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}

	if service.invocationCount != 0 {
		t.Fatalf("expected service not called, got %d", service.invocationCount)
	}
}

func TestHotRankingHandlerRejectsTrendHistoryFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{}
	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?mode=trend&period=day&date=2026-05-24", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHotRankingHandlerRejectsInvalidPopularMonth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeHotRankingQueryService{}
	router := gin.New()
	router.GET("/api/hot", GetHotRankingHandler(service))

	req := httptest.NewRequest(http.MethodGet, "/api/hot?mode=popular&period=month&month=2026-13", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestNormalizeHotRankingCategorySupportsAll(t *testing.T) {
	if got := model.NormalizeHotRankingCategory("all"); got != model.HotRankingCategoryAll {
		t.Fatalf("expected all, got %q", got)
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
