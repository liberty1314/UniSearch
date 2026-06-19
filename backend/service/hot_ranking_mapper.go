package service

import (
	"fmt"
	"strings"
	"time"

	"unisearch/config"
	"unisearch/model"
)

var hotRankingNow = func() time.Time {
	return time.Now().UTC()
}

func mapMovieResultToHotRankingItem(item TMDBMovieResult, category model.HotRankingCategory, genres map[int]string) model.HotRankingItem {
	return annotateHotRankingItemAvailability(model.HotRankingItem{
		ID:              item.ID,
		TMDBID:          item.ID,
		MediaType:       "movie",
		RankingCategory: category,
		Title:           item.Title,
		OriginalTitle:   item.OriginalTitle,
		Overview:        item.Overview,
		PosterURL:       buildTMDBImageURL(item.PosterPath),
		BackdropURL:     buildTMDBImageURL(item.BackdropPath),
		VoteAverage:     item.VoteAverage,
		VoteCount:       item.VoteCount,
		Popularity:      item.Popularity,
		ReleaseDate:     item.ReleaseDate,
		GenreNames:      resolveGenreNames(item.GenreIDs, genres),
		TMDBURL:         fmt.Sprintf("https://www.themoviedb.org/movie/%d", item.ID),
	})
}

func mapTVResultToHotRankingItem(item TMDBTVResult, category model.HotRankingCategory, genres map[int]string) model.HotRankingItem {
	return annotateHotRankingItemAvailability(model.HotRankingItem{
		ID:              item.ID,
		TMDBID:          item.ID,
		MediaType:       "tv",
		RankingCategory: category,
		Title:           item.Name,
		OriginalTitle:   item.OriginalName,
		Overview:        item.Overview,
		PosterURL:       buildTMDBImageURL(item.PosterPath),
		BackdropURL:     buildTMDBImageURL(item.BackdropPath),
		VoteAverage:     item.VoteAverage,
		VoteCount:       item.VoteCount,
		Popularity:      item.Popularity,
		ReleaseDate:     item.FirstAirDate,
		GenreNames:      resolveGenreNames(item.GenreIDs, genres),
		OriginCountries: item.OriginCountry,
		TMDBURL:         fmt.Sprintf("https://www.themoviedb.org/tv/%d", item.ID),
	})
}

func annotateHotRankingItemAvailability(item model.HotRankingItem) model.HotRankingItem {
	item.AvailabilityStatus = "unknown"
	item.SearchAvailable = true
	item.DaysUntilRelease = 0
	item.SearchHint = "上映时间未知，搜索结果可能不准确"

	releaseDate := strings.TrimSpace(item.ReleaseDate)
	if releaseDate == "" {
		return item
	}

	parsedReleaseDate, err := time.Parse("2006-01-02", releaseDate)
	if err != nil {
		return item
	}

	now := hotRankingNow().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	releaseDay := time.Date(parsedReleaseDate.Year(), parsedReleaseDate.Month(), parsedReleaseDate.Day(), 0, 0, 0, 0, time.UTC)
	if releaseDay.After(today) {
		item.AvailabilityStatus = "upcoming"
		item.SearchAvailable = false
		item.DaysUntilRelease = int(releaseDay.Sub(today).Hours() / 24)
		item.SearchHint = fmt.Sprintf("预计 %s 上映，当前站内资源可能不可用", releaseDate)
		return item
	}

	item.AvailabilityStatus = "released"
	item.SearchAvailable = true
	item.DaysUntilRelease = 0
	item.SearchHint = ""
	return item
}

func resolveGenreNames(genreIDs []int, genres map[int]string) []string {
	if len(genreIDs) == 0 || len(genres) == 0 {
		return []string{}
	}

	result := make([]string, 0, len(genreIDs))
	for _, genreID := range genreIDs {
		name := strings.TrimSpace(genres[genreID])
		if name == "" {
			continue
		}
		result = append(result, name)
	}
	if len(result) == 0 {
		return []string{}
	}
	return result
}

func buildTMDBImageURL(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}

	baseURL := "https://image.tmdb.org/t/p/w500"
	if config.AppConfig != nil && strings.TrimSpace(config.AppConfig.TMDBImageBaseURL) != "" {
		baseURL = strings.TrimRight(config.AppConfig.TMDBImageBaseURL, "/")
	}
	return baseURL + trimmed
}

func isAnimeTV(item TMDBTVResult) bool {
	for _, genreID := range item.GenreIDs {
		if genreID == 16 {
			return true
		}
	}
	return false
}
