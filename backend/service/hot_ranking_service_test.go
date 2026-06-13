package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"unisearch/model"
)

type fakeTMDBService struct {
	trendingMovieCalls int
	trendingTVCalls    int
	discoverMovieCalls int
	discoverTVCalls    int
	movieGenres        map[int]string
	tvGenres           map[int]string
	trendingMovies     []TMDBMovieResult
	trendingTV         []TMDBTVResult
	discoverMovies     []TMDBMovieResult
	discoverTV         []TMDBTVResult
	err                error
	lastMovieDiscover  TMDBDiscoverMovieParams
	lastTVDiscover     TMDBDiscoverTVParams
}

func (f *fakeTMDBService) GetTrendingMovies(_ context.Context, _ string) ([]TMDBMovieResult, error) {
	f.trendingMovieCalls++
	return f.trendingMovies, f.err
}

func (f *fakeTMDBService) GetTrendingTV(_ context.Context, _ string) ([]TMDBTVResult, error) {
	f.trendingTVCalls++
	return f.trendingTV, f.err
}

func (f *fakeTMDBService) DiscoverMovies(_ context.Context, params TMDBDiscoverMovieParams) ([]TMDBMovieResult, error) {
	f.discoverMovieCalls++
	f.lastMovieDiscover = params
	return f.discoverMovies, f.err
}

func (f *fakeTMDBService) DiscoverTV(_ context.Context, params TMDBDiscoverTVParams) ([]TMDBTVResult, error) {
	f.discoverTVCalls++
	f.lastTVDiscover = params
	return f.discoverTV, f.err
}

func (f *fakeTMDBService) GetMovieGenres(_ context.Context) (map[int]string, error) {
	return f.movieGenres, nil
}

func (f *fakeTMDBService) GetTVGenres(_ context.Context) (map[int]string, error) {
	return f.tvGenres, nil
}

type fakeHotRankingCache struct {
	loadResult bool
	loadValue  model.HotRankingResponse
	loadErr    error
	loadCalls  int
	loadQuery  model.HotRankingQuery
	storeCalls int
	storeErr   error
	storeQuery model.HotRankingQuery
}

func (f *fakeHotRankingCache) Load(_ context.Context, query model.HotRankingQuery, target *model.HotRankingResponse) (bool, error) {
	f.loadCalls++
	f.loadQuery = query
	if f.loadResult {
		*target = f.loadValue
	}
	return f.loadResult, f.loadErr
}

func (f *fakeHotRankingCache) Store(_ context.Context, query model.HotRankingQuery, value model.HotRankingResponse) error {
	f.storeCalls++
	f.storeQuery = query
	f.loadValue = value
	return f.storeErr
}

func (f *fakeHotRankingCache) ClearByPrefix(_ context.Context, _ string) error {
	return nil
}

func TestHotRankingServiceUsesTrendingForDailyMovie(t *testing.T) {
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		trendingMovies: []TMDBMovieResult{
			{
				ID:            1,
				Title:         "沙丘 2",
				OriginalTitle: "Dune: Part Two",
				Overview:      "test",
				PosterPath:    "/poster.jpg",
				BackdropPath:  "/backdrop.jpg",
				VoteAverage:   8.5,
				VoteCount:     1000,
				Popularity:    999,
				ReleaseDate:   "2024-03-01",
				GenreIDs:      []int{28},
			},
		},
	}
	cache := &fakeHotRankingCache{}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryMovie,
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.trendingMovieCalls != 1 {
		t.Fatalf("expected trending movie call, got %d", tmdb.trendingMovieCalls)
	}

	if len(response.Sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(response.Sections))
	}

	if response.Sections[0].Spotlight == nil {
		t.Fatal("expected spotlight item")
	}
}

func TestHotRankingServiceUsesDiscoverForYearAnime(t *testing.T) {
	tmdb := &fakeTMDBService{
		tvGenres: map[int]string{16: "动画", 18: "剧情"},
		discoverTV: []TMDBTVResult{
			{
				ID:            11,
				Name:          "葬送的芙莉莲",
				OriginalName:  "葬送のフリーレン",
				Overview:      "test",
				PosterPath:    "/poster.jpg",
				BackdropPath:  "/backdrop.jpg",
				VoteAverage:   9.1,
				VoteCount:     5000,
				Popularity:    1200,
				FirstAirDate:  "2023-09-29",
				GenreIDs:      []int{16, 18},
				OriginCountry: []string{"JP"},
			},
		},
	}
	cache := &fakeHotRankingCache{}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModePopular,
		Period:   model.HotRankingPeriodYear,
		Category: model.HotRankingCategoryAnime,
		Year:     "2026",
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.discoverTVCalls != 5 {
		t.Fatalf("expected discover tv calls for default 100 items, got %d", tmdb.discoverTVCalls)
	}

	if response.Sections[0].Category != model.HotRankingCategoryAnime {
		t.Fatalf("expected anime section, got %q", response.Sections[0].Category)
	}
}

func TestHotRankingServicePopularDayOnlyLimitsReleaseDateUpperBound(t *testing.T) {
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		discoverMovies: []TMDBMovieResult{
			{
				ID:            1,
				Title:         "杰克·莱恩：幽灵之战",
				OriginalTitle: "Tom Clancy's Jack Ryan: Ghost War",
				Overview:      "test",
				PosterPath:    "/poster.jpg",
				BackdropPath:  "/backdrop.jpg",
				VoteAverage:   7.3,
				VoteCount:     1000,
				Popularity:    459,
				ReleaseDate:   "2026-05-20",
				GenreIDs:      []int{28},
			},
		},
	}

	service := NewHotRankingService(tmdb, &fakeHotRankingCache{})

	_, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModePopular,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryMovie,
		Date:     "2026-05-24",
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.lastMovieDiscover.PrimaryReleaseGTE != "" {
		t.Fatalf("expected no lower release date bound, got %q", tmdb.lastMovieDiscover.PrimaryReleaseGTE)
	}
	if tmdb.lastMovieDiscover.PrimaryReleaseLTE != "2026-05-24" {
		t.Fatalf("expected upper release date bound to today, got %q", tmdb.lastMovieDiscover.PrimaryReleaseLTE)
	}
}

func TestHotRankingServiceUsesCustomSortForPopularSingleCategory(t *testing.T) {
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		discoverMovies: []TMDBMovieResult{
			{
				ID:            1,
				Title:         "沙丘 2",
				OriginalTitle: "Dune: Part Two",
				Overview:      "test",
				PosterPath:    "/poster.jpg",
				BackdropPath:  "/backdrop.jpg",
				VoteAverage:   8.8,
				VoteCount:     1000,
				Popularity:    999,
				ReleaseDate:   "2024-03-01",
				GenreIDs:      []int{28},
			},
		},
	}

	service := NewHotRankingService(tmdb, &fakeHotRankingCache{})

	_, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModePopular,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryMovie,
		SortBy:   model.HotRankingSortByVoteAverage,
		Date:     "2026-05-24",
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.lastMovieDiscover.SortBy != string(model.HotRankingSortByVoteAverage) {
		t.Fatalf("expected discover sort to be vote_average.desc, got %q", tmdb.lastMovieDiscover.SortBy)
	}
}

func TestHotRankingServiceUsesDiscoverForTrendWhenCustomSortSelected(t *testing.T) {
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		discoverMovies: []TMDBMovieResult{
			{
				ID:            1,
				Title:         "高分新片",
				OriginalTitle: "Top Rated New Movie",
				Overview:      "test",
				PosterPath:    "/poster.jpg",
				BackdropPath:  "/backdrop.jpg",
				VoteAverage:   9.4,
				VoteCount:     1200,
				Popularity:    300,
				ReleaseDate:   "2026-05-20",
				GenreIDs:      []int{28},
			},
		},
	}

	service := NewHotRankingService(tmdb, &fakeHotRankingCache{})

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryMovie,
		SortBy:   model.HotRankingSortByVoteAverage,
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.trendingMovieCalls != 0 {
		t.Fatalf("expected no trending movie calls for custom sorted trend, got %d", tmdb.trendingMovieCalls)
	}

	if tmdb.discoverMovieCalls == 0 {
		t.Fatal("expected discover movie calls for custom sorted trend")
	}

	if tmdb.lastMovieDiscover.SortBy != string(model.HotRankingSortByVoteAverage) {
		t.Fatalf("expected discover sort to be vote_average.desc, got %q", tmdb.lastMovieDiscover.SortBy)
	}

	expectedDayUpperBound := time.Now().UTC().Format("2006-01-02")
	if tmdb.lastMovieDiscover.PrimaryReleaseLTE != expectedDayUpperBound {
		t.Fatalf("expected trend daily custom sort to use day upper bound, got %q", tmdb.lastMovieDiscover.PrimaryReleaseLTE)
	}

	if response.Note != "当前展示趋势时间范围内按评分排序的热门榜单。" {
		t.Fatalf("expected custom trend note, got %q", response.Note)
	}
}

func TestHotRankingServiceReturnsCachedValueWithoutCallingTMDB(t *testing.T) {
	SetGlobalCacheSettingsService(nil)
	now := time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC)
	cache := &fakeHotRankingCache{
		loadResult: true,
		loadValue: model.HotRankingResponse{
			Period:    model.HotRankingPeriodWeek,
			PageSize:  50,
			UpdatedAt: now,
			Source:    "tmdb",
			Sections: []model.HotRankingSection{
				{
					Category: model.HotRankingCategoryTV,
					Title:    "热门电视剧",
				},
			},
		},
	}
	tmdb := &fakeTMDBService{}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodWeek,
		Category: model.HotRankingCategoryTV,
		Page:     1,
		PageSize: 50,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if tmdb.trendingTVCalls != 0 && tmdb.discoverTVCalls != 0 {
		t.Fatalf("expected no tmdb calls when cache hit, got trending=%d discover=%d", tmdb.trendingTVCalls, tmdb.discoverTVCalls)
	}

	if response.UpdatedAt != now {
		t.Fatalf("expected cached updated time, got %v", response.UpdatedAt)
	}
}

func TestHotRankingServiceUsesFullCacheForHomepageSizedRequests(t *testing.T) {
	SetGlobalCacheSettingsService(nil)
	now := time.Date(2026, 5, 24, 8, 0, 0, 0, time.UTC)
	cache := &fakeHotRankingCache{
		loadResult: true,
		loadValue: model.HotRankingResponse{
			Mode:      model.HotRankingModeTrend,
			Period:    model.HotRankingPeriodDay,
			Page:      1,
			PageSize:  50,
			UpdatedAt: now,
			Source:    "tmdb",
			Sections: []model.HotRankingSection{
				{
					Category: model.HotRankingCategoryMovie,
					Title:    "热门电影",
					Items: []model.HotRankingItem{
						{Title: "木乃伊"},
						{Title: "疯狂计划"},
						{Title: "女士优先"},
						{Title: "超级马力欧银河大电影"},
						{Title: "多余条目"},
					},
				},
			},
		},
	}
	service := NewHotRankingService(&fakeTMDBService{}, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryAll,
		Page:     1,
		PageSize: 20,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if cache.loadQuery.PageSize != 50 {
		t.Fatalf("expected cache lookup with preload page size 50, got %d", cache.loadQuery.PageSize)
	}

	if response.PageSize != 20 {
		t.Fatalf("expected adapted response page size 20, got %d", response.PageSize)
	}

	if len(response.Sections) != 1 || len(response.Sections[0].Items) != 5 {
		t.Fatalf("expected cached items to be preserved when under request size, got %+v", response.Sections)
	}
}

func TestHotRankingServiceStoresHomepageSizedRequestsIntoFullCacheSlot(t *testing.T) {
	SetGlobalCacheSettingsService(nil)
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		tvGenres:    map[int]string{18: "剧情", 16: "动画"},
		trendingMovies: []TMDBMovieResult{
			{ID: 1, Title: "木乃伊", PosterPath: "/a.jpg", BackdropPath: "/ab.jpg", ReleaseDate: "2026-05-20"},
		},
		trendingTV: []TMDBTVResult{
			{ID: 2, Name: "女士优先", PosterPath: "/b.jpg", BackdropPath: "/bb.jpg", FirstAirDate: "2026-05-21", GenreIDs: []int{18}, OriginCountry: []string{"US"}},
			{ID: 3, Name: "星空冒险团", PosterPath: "/c.jpg", BackdropPath: "/cb.jpg", FirstAirDate: "2026-05-22", GenreIDs: []int{16}, OriginCountry: []string{"JP"}},
		},
	}
	cache := &fakeHotRankingCache{}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryAll,
		Page:     1,
		PageSize: 20,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if cache.storeCalls != 1 {
		t.Fatalf("expected one cache store call, got %d", cache.storeCalls)
	}

	if cache.storeQuery.PageSize != 50 {
		t.Fatalf("expected preload cache slot page size 50, got %d", cache.storeQuery.PageSize)
	}

	if cache.loadValue.PageSize != 50 {
		t.Fatalf("expected stored cache value page size 50, got %d", cache.loadValue.PageSize)
	}

	if response.PageSize != 20 {
		t.Fatalf("expected caller response page size 20, got %d", response.PageSize)
	}
}

func TestHotRankingServiceReturnsUnderlyingError(t *testing.T) {
	tmdb := &fakeTMDBService{err: errors.New("tmdb failed")}
	cache := &fakeHotRankingCache{}
	service := NewHotRankingService(tmdb, cache)

	if _, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodDay,
		Category: model.HotRankingCategoryMovie,
		Page:     1,
		PageSize: 100,
	}); err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestHotRankingServiceRefreshBypassesCacheAndStoresLatestValue(t *testing.T) {
	cache := &fakeHotRankingCache{
		loadResult: true,
		loadValue: model.HotRankingResponse{
			Period: model.HotRankingPeriodDay,
			Sections: []model.HotRankingSection{
				{Title: "旧缓存"},
			},
		},
	}
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		trendingMovies: []TMDBMovieResult{
			{
				ID:           7,
				Title:        "新片",
				Overview:     "new",
				PosterPath:   "/poster.jpg",
				BackdropPath: "/backdrop.jpg",
				VoteAverage:  8.8,
				VoteCount:    300,
				Popularity:   900,
				ReleaseDate:  "2026-05-23",
				GenreIDs:     []int{28},
			},
		},
	}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.RefreshHotRankings(context.Background(), model.HotRankingPeriodDay, model.HotRankingCategoryMovie)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if cache.loadCalls != 0 {
		t.Fatalf("expected refresh to bypass cache load, got %d", cache.loadCalls)
	}

	if tmdb.trendingMovieCalls != 1 {
		t.Fatalf("expected one tmdb refresh call, got %d", tmdb.trendingMovieCalls)
	}

	if cache.storeCalls != 1 {
		t.Fatalf("expected one cache store call, got %d", cache.storeCalls)
	}

	if cache.storeQuery.Period != model.HotRankingPeriodDay || cache.storeQuery.Category != model.HotRankingCategoryMovie {
		t.Fatalf("expected store key day/movie, got %s/%s", cache.storeQuery.Period, cache.storeQuery.Category)
	}

	if len(response.Sections) == 0 || response.Sections[0].Title != "热门电影" {
		t.Fatalf("expected refreshed hot ranking response, got %+v", response.Sections)
	}
}

func TestHotRankingServiceReturnsAggregatedSectionsForAll(t *testing.T) {
	SetGlobalCacheSettingsService(nil)
	tmdb := &fakeTMDBService{
		movieGenres: map[int]string{28: "动作"},
		tvGenres:    map[int]string{16: "动画", 18: "剧情"},
		trendingMovies: []TMDBMovieResult{
			{
				ID:            1,
				Title:         "沙丘 2",
				OriginalTitle: "Dune: Part Two",
				Overview:      "movie overview",
				PosterPath:    "/movie-poster.jpg",
				BackdropPath:  "/movie-backdrop.jpg",
				VoteAverage:   8.5,
				VoteCount:     1000,
				Popularity:    999,
				ReleaseDate:   "2024-03-01",
				GenreIDs:      []int{28},
			},
		},
		trendingTV: []TMDBTVResult{
			{
				ID:            11,
				Name:          "最后生还者",
				OriginalName:  "The Last of Us",
				Overview:      "tv overview",
				PosterPath:    "/tv-poster.jpg",
				BackdropPath:  "/tv-backdrop.jpg",
				VoteAverage:   9.0,
				VoteCount:     800,
				Popularity:    880,
				FirstAirDate:  "2023-01-15",
				GenreIDs:      []int{18},
				OriginCountry: []string{"US"},
			},
			{
				ID:            22,
				Name:          "葬送的芙莉莲",
				OriginalName:  "葬送のフリーレン",
				Overview:      "anime overview",
				PosterPath:    "/anime-poster.jpg",
				BackdropPath:  "/anime-backdrop.jpg",
				VoteAverage:   9.3,
				VoteCount:     1200,
				Popularity:    910,
				FirstAirDate:  "2023-09-29",
				GenreIDs:      []int{16, 18},
				OriginCountry: []string{"JP"},
			},
		},
	}
	cache := &fakeHotRankingCache{}
	service := NewHotRankingService(tmdb, cache)

	response, err := service.GetHotRankings(context.Background(), model.HotRankingQuery{
		Mode:     model.HotRankingModeTrend,
		Period:   model.HotRankingPeriodWeek,
		Category: model.HotRankingCategoryAll,
		Page:     1,
		PageSize: 20,
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if len(response.Sections) != 3 {
		t.Fatalf("expected 3 aggregated sections, got %d", len(response.Sections))
	}

	expectedCategories := []model.HotRankingCategory{
		model.HotRankingCategoryMovie,
		model.HotRankingCategoryTV,
		model.HotRankingCategoryAnime,
	}

	for index, category := range expectedCategories {
		if response.Sections[index].Category != category {
			t.Fatalf("expected section %d category %q, got %q", index, category, response.Sections[index].Category)
		}
	}

	if cache.storeQuery.Category != model.HotRankingCategoryAll {
		t.Fatalf("expected aggregated response stored under all category, got %q", cache.storeQuery.Category)
	}
}
