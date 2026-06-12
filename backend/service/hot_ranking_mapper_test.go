package service

import (
	"testing"

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
