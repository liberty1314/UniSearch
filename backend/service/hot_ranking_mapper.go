package service

import (
	"fmt"
	"strings"

	"unisearch/config"
	"unisearch/model"
)

func mapMovieResultToHotRankingItem(item TMDBMovieResult, category model.HotRankingCategory, genres map[int]string) model.HotRankingItem {
	return model.HotRankingItem{
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
	}
}

func mapTVResultToHotRankingItem(item TMDBTVResult, category model.HotRankingCategory, genres map[int]string) model.HotRankingItem {
	return model.HotRankingItem{
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
	}
}

func resolveGenreNames(genreIDs []int, genres map[int]string) []string {
	if len(genreIDs) == 0 || len(genres) == 0 {
		return nil
	}

	result := make([]string, 0, len(genreIDs))
	for _, genreID := range genreIDs {
		name := strings.TrimSpace(genres[genreID])
		if name == "" {
			continue
		}
		result = append(result, name)
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
