package service

import (
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
)

func TestHotRankingMapperBuildsMovieItem(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		TMDBImageBaseURL: "https://image.tmdb.org/t/p/w500",
	}

	item := mapMovieResultToHotRankingItem(TMDBMovieResult{
		ID:            7,
		Title:         "你的名字。",
		OriginalTitle: "君の名は。",
		Overview:      "test",
		PosterPath:    "/poster.jpg",
		BackdropPath:  "/backdrop.jpg",
		VoteAverage:   8.8,
		VoteCount:     100,
		Popularity:    99,
		ReleaseDate:   "2016-08-26",
		GenreIDs:      []int{16, 18},
	}, model.HotRankingCategoryMovie, map[int]string{
		16: "动画",
		18: "剧情",
	})

	if item.Title != "你的名字。" {
		t.Fatalf("expected title, got %q", item.Title)
	}

	if item.PosterURL != "https://image.tmdb.org/t/p/w500/poster.jpg" {
		t.Fatalf("expected poster url, got %q", item.PosterURL)
	}

	if len(item.GenreNames) != 2 {
		t.Fatalf("expected 2 genres, got %d", len(item.GenreNames))
	}
}

func TestIsAnimeTVDetectsAnimationGenre(t *testing.T) {
	if !isAnimeTV(TMDBTVResult{GenreIDs: []int{16, 18}}) {
		t.Fatal("expected animation genre to be treated as anime")
	}

	if isAnimeTV(TMDBTVResult{GenreIDs: []int{18, 35}}) {
		t.Fatal("expected non-animation tv not to be anime")
	}
}

func TestResolveGenreNamesReturnsEmptySliceWhenMissing(t *testing.T) {
	result := resolveGenreNames(nil, map[int]string{16: "动画"})

	if result == nil {
		t.Fatal("expected empty slice instead of nil")
	}

	if len(result) != 0 {
		t.Fatalf("expected empty slice, got %d items", len(result))
	}
}

func TestHotRankingMapperMarksUpcomingMovieUnavailable(t *testing.T) {
	oldNow := hotRankingNow
	hotRankingNow = func() time.Time {
		return time.Date(2026, 6, 19, 10, 0, 0, 0, time.UTC)
	}
	defer func() {
		hotRankingNow = oldNow
	}()

	item := mapMovieResultToHotRankingItem(TMDBMovieResult{
		ID:          8,
		Title:       "蜘蛛侠：崭新之日",
		ReleaseDate: "2026-07-29",
	}, model.HotRankingCategoryMovie, nil)

	if item.AvailabilityStatus != "upcoming" {
		t.Fatalf("期望未上映状态，实际为 %q", item.AvailabilityStatus)
	}
	if item.SearchAvailable {
		t.Fatal("未上映影片不应允许站内搜索")
	}
	if item.DaysUntilRelease != 40 {
		t.Fatalf("期望距离上映 40 天，实际为 %d", item.DaysUntilRelease)
	}
	if item.SearchHint != "预计 2026-07-29 上映，当前站内资源可能不可用" {
		t.Fatalf("提示文案不符合预期：%q", item.SearchHint)
	}
}

func TestHotRankingMapperMarksReleasedAndUnknownItems(t *testing.T) {
	oldNow := hotRankingNow
	hotRankingNow = func() time.Time {
		return time.Date(2026, 6, 19, 10, 0, 0, 0, time.UTC)
	}
	defer func() {
		hotRankingNow = oldNow
	}()

	released := mapMovieResultToHotRankingItem(TMDBMovieResult{
		ID:          9,
		Title:       "已上映影片",
		ReleaseDate: "2026-06-19",
	}, model.HotRankingCategoryMovie, nil)
	if released.AvailabilityStatus != "released" || !released.SearchAvailable {
		t.Fatalf("已上映影片应允许搜索，实际为 status=%q available=%v", released.AvailabilityStatus, released.SearchAvailable)
	}
	if released.SearchHint != "" {
		t.Fatalf("已上映影片不应有搜索提示，实际为 %q", released.SearchHint)
	}

	unknown := mapMovieResultToHotRankingItem(TMDBMovieResult{
		ID:    10,
		Title: "未知上映时间影片",
	}, model.HotRankingCategoryMovie, nil)
	if unknown.AvailabilityStatus != "unknown" || !unknown.SearchAvailable {
		t.Fatalf("未知上映时间影片应允许谨慎搜索，实际为 status=%q available=%v", unknown.AvailabilityStatus, unknown.SearchAvailable)
	}
	if unknown.SearchHint != "上映时间未知，搜索结果可能不准确" {
		t.Fatalf("未知上映时间提示不符合预期：%q", unknown.SearchHint)
	}
}
