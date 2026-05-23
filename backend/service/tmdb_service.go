package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode"

	"unisearch/config"
)

type TMDBMovieResult struct {
	ID            int     `json:"id"`
	Title         string  `json:"title"`
	OriginalTitle string  `json:"original_title"`
	Overview      string  `json:"overview"`
	PosterPath    string  `json:"poster_path"`
	BackdropPath  string  `json:"backdrop_path"`
	VoteAverage   float64 `json:"vote_average"`
	VoteCount     int     `json:"vote_count"`
	Popularity    float64 `json:"popularity"`
	ReleaseDate   string  `json:"release_date"`
	GenreIDs      []int   `json:"genre_ids"`
}

type TMDBTVResult struct {
	ID            int      `json:"id"`
	Name          string   `json:"name"`
	OriginalName  string   `json:"original_name"`
	Overview      string   `json:"overview"`
	PosterPath    string   `json:"poster_path"`
	BackdropPath  string   `json:"backdrop_path"`
	VoteAverage   float64  `json:"vote_average"`
	VoteCount     int      `json:"vote_count"`
	Popularity    float64  `json:"popularity"`
	FirstAirDate  string   `json:"first_air_date"`
	GenreIDs      []int    `json:"genre_ids"`
	OriginCountry []string `json:"origin_country"`
}

type TMDBDiscoverMovieParams struct {
	SortBy            string
	PrimaryReleaseGTE string
	PrimaryReleaseLTE string
	PrimaryReleaseYear int
	VoteCountGTE      int
}

type TMDBDiscoverTVParams struct {
	SortBy           string
	FirstAirDateGTE  string
	FirstAirDateLTE  string
	FirstAirDateYear int
	VoteCountGTE     int
	WithGenres       []int
}

type TMDBService interface {
	GetTrendingMovies(ctx context.Context, window string) ([]TMDBMovieResult, error)
	GetTrendingTV(ctx context.Context, window string) ([]TMDBTVResult, error)
	DiscoverMovies(ctx context.Context, params TMDBDiscoverMovieParams) ([]TMDBMovieResult, error)
	DiscoverTV(ctx context.Context, params TMDBDiscoverTVParams) ([]TMDBTVResult, error)
	GetMovieGenres(ctx context.Context) (map[int]string, error)
	GetTVGenres(ctx context.Context) (map[int]string, error)
}

type tmdbAPIError struct {
	StatusCode int
	Message    string
}

func (e *tmdbAPIError) Error() string {
	return fmt.Sprintf("tmdb 请求失败: status=%d message=%s", e.StatusCode, e.Message)
}

type tmdbService struct {
	client *http.Client
}

type tmdbListResponse[T any] struct {
	Results []T `json:"results"`
}

type tmdbGenreResponse struct {
	Genres []struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	} `json:"genres"`
}

func NewTMDBService() TMDBService {
	timeout := 8 * time.Second
	if config.AppConfig != nil && config.AppConfig.TMDBRequestTimeout > 0 {
		timeout = config.AppConfig.TMDBRequestTimeout
	}

	return &tmdbService{
		client: &http.Client{Timeout: timeout},
	}
}

func (s *tmdbService) GetTrendingMovies(ctx context.Context, window string) ([]TMDBMovieResult, error) {
	var response tmdbListResponse[TMDBMovieResult]
	if err := s.get(ctx, fmt.Sprintf("/trending/movie/%s", window), nil, &response); err != nil {
		return nil, err
	}
	return response.Results, nil
}

func (s *tmdbService) GetTrendingTV(ctx context.Context, window string) ([]TMDBTVResult, error) {
	var response tmdbListResponse[TMDBTVResult]
	if err := s.get(ctx, fmt.Sprintf("/trending/tv/%s", window), nil, &response); err != nil {
		return nil, err
	}
	return response.Results, nil
}

func (s *tmdbService) DiscoverMovies(ctx context.Context, params TMDBDiscoverMovieParams) ([]TMDBMovieResult, error) {
	query := url.Values{}
	if params.SortBy != "" {
		query.Set("sort_by", params.SortBy)
	}
	if params.PrimaryReleaseGTE != "" {
		query.Set("primary_release_date.gte", params.PrimaryReleaseGTE)
	}
	if params.PrimaryReleaseLTE != "" {
		query.Set("primary_release_date.lte", params.PrimaryReleaseLTE)
	}
	if params.PrimaryReleaseYear > 0 {
		query.Set("primary_release_year", fmt.Sprintf("%d", params.PrimaryReleaseYear))
	}
	if params.VoteCountGTE > 0 {
		query.Set("vote_count.gte", fmt.Sprintf("%d", params.VoteCountGTE))
	}

	var response tmdbListResponse[TMDBMovieResult]
	if err := s.get(ctx, "/discover/movie", query, &response); err != nil {
		return nil, err
	}
	return response.Results, nil
}

func (s *tmdbService) DiscoverTV(ctx context.Context, params TMDBDiscoverTVParams) ([]TMDBTVResult, error) {
	query := url.Values{}
	if params.SortBy != "" {
		query.Set("sort_by", params.SortBy)
	}
	if params.FirstAirDateGTE != "" {
		query.Set("first_air_date.gte", params.FirstAirDateGTE)
	}
	if params.FirstAirDateLTE != "" {
		query.Set("first_air_date.lte", params.FirstAirDateLTE)
	}
	if params.FirstAirDateYear > 0 {
		query.Set("first_air_date_year", fmt.Sprintf("%d", params.FirstAirDateYear))
	}
	if params.VoteCountGTE > 0 {
		query.Set("vote_count.gte", fmt.Sprintf("%d", params.VoteCountGTE))
	}
	if len(params.WithGenres) > 0 {
		raw := make([]string, 0, len(params.WithGenres))
		for _, genreID := range params.WithGenres {
			raw = append(raw, fmt.Sprintf("%d", genreID))
		}
		query.Set("with_genres", strings.Join(raw, ","))
	}

	var response tmdbListResponse[TMDBTVResult]
	if err := s.get(ctx, "/discover/tv", query, &response); err != nil {
		return nil, err
	}
	return response.Results, nil
}

func (s *tmdbService) GetMovieGenres(ctx context.Context) (map[int]string, error) {
	var response tmdbGenreResponse
	if err := s.get(ctx, "/genre/movie/list", nil, &response); err != nil {
		return nil, err
	}
	return toGenreMap(response), nil
}

func (s *tmdbService) GetTVGenres(ctx context.Context) (map[int]string, error) {
	var response tmdbGenreResponse
	if err := s.get(ctx, "/genre/tv/list", nil, &response); err != nil {
		return nil, err
	}
	return toGenreMap(response), nil
}

func (s *tmdbService) get(ctx context.Context, path string, query url.Values, target interface{}) error {
	if config.AppConfig == nil {
		return fmt.Errorf("TMDB 配置未初始化")
	}

	baseURL := "https://api.themoviedb.org/3"
	if config.AppConfig.TMDBBaseURL != "" {
		baseURL = strings.TrimRight(config.AppConfig.TMDBBaseURL, "/")
	}

	if query == nil {
		query = url.Values{}
	}
	if config.AppConfig.TMDBDefaultLanguage != "" {
		query.Set("language", config.AppConfig.TMDBDefaultLanguage)
	}
	if config.AppConfig.TMDBDefaultRegion != "" {
		query.Set("region", config.AppConfig.TMDBDefaultRegion)
	}

	readAccessToken := strings.TrimSpace(config.AppConfig.TMDBReadAccessToken)
	apiKey := strings.TrimSpace(config.AppConfig.TMDBAPIKey)
	if apiKey == "" && looksLikeTMDBAPIKey(readAccessToken) {
		apiKey = readAccessToken
		readAccessToken = ""
	}
	if readAccessToken == "" && apiKey == "" {
		return fmt.Errorf("TMDB_READ_ACCESS_TOKEN 或 TMDB_API_KEY 未配置")
	}
	if readAccessToken == "" {
		query.Set("api_key", apiKey)
	}

	requestURL := baseURL + path
	if encoded := query.Encode(); encoded != "" {
		requestURL += "?" + encoded
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}
	if readAccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+readAccessToken)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		var payload map[string]interface{}
		_ = json.Unmarshal(body, &payload)
		message, _ := payload["status_message"].(string)
		if message == "" {
			message = string(body)
		}
		return &tmdbAPIError{StatusCode: resp.StatusCode, Message: message}
	}

	if err := json.Unmarshal(body, target); err != nil {
		return err
	}
	return nil
}

func looksLikeTMDBAPIKey(value string) bool {
	if len(value) != 32 {
		return false
	}

	for _, char := range value {
		if !unicode.IsDigit(char) && (char < 'a' || char > 'f') && (char < 'A' || char > 'F') {
			return false
		}
	}

	return true
}

func toGenreMap(response tmdbGenreResponse) map[int]string {
	result := make(map[int]string, len(response.Genres))
	for _, genre := range response.Genres {
		result[genre.ID] = genre.Name
	}
	return result
}
