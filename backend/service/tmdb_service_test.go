package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"unisearch/config"
	"unisearch/model"
)

type tmdbTestSecretManager struct {
	token string
	err   error
}

func (m *tmdbTestSecretManager) GetSecret(name string) (string, error) {
	if name != SecretNameTMDBReadAccessKey {
		return "", m.err
	}
	return m.token, m.err
}

func (m *tmdbTestSecretManager) SetSecret(name string, value string, secretType model.SecretType, description string) error {
	return nil
}

func (m *tmdbTestSecretManager) RotateSecret(name string, newValue string) error {
	return nil
}

func (m *tmdbTestSecretManager) DeleteSecret(name string) error {
	return nil
}

func (m *tmdbTestSecretManager) ListSecrets() ([]model.Secret, error) {
	return nil, nil
}

func TestTMDBServiceGetTrendingMoviesUsesBearerTokenAndLanguage(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	var authHeader string
	var languageParam string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		languageParam = r.URL.Query().Get("language")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[{"id":1,"title":"流浪地球 2","original_title":"The Wandering Earth II","overview":"test","poster_path":"/poster.jpg","backdrop_path":"/backdrop.jpg","vote_average":8.4,"vote_count":1000,"popularity":999.5,"release_date":"2023-01-22","genre_ids":[28,878]}]}`))
	}))
	defer server.Close()

	config.AppConfig = &config.Config{
		TMDBReadAccessToken: "test-token",
		TMDBBaseURL:         server.URL,
		TMDBDefaultLanguage: "zh-CN",
		TMDBImageBaseURL:    "https://image.tmdb.org/t/p/w500",
	}

	service := NewTMDBService()
	results, err := service.GetTrendingMovies(context.Background(), "day")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if authHeader != "Bearer test-token" {
		t.Fatalf("expected bearer token header, got %q", authHeader)
	}

	if languageParam != "zh-CN" {
		t.Fatalf("expected zh-CN language, got %q", languageParam)
	}
}

func TestTMDBServiceReturnsRateLimitError(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"status_message":"rate limit"}`, http.StatusTooManyRequests)
	}))
	defer server.Close()

	config.AppConfig = &config.Config{
		TMDBReadAccessToken: "test-token",
		TMDBBaseURL:         server.URL,
		TMDBDefaultLanguage: "zh-CN",
	}

	service := NewTMDBService()
	if _, err := service.GetTrendingTV(context.Background(), "week"); err == nil {
		t.Fatal("expected rate limit error, got nil")
	}
}

func TestTMDBServiceFallsBackToAPIKeyQuery(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	var authHeader string
	var apiKeyParam string
	var languageParam string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		apiKeyParam = r.URL.Query().Get("api_key")
		languageParam = r.URL.Query().Get("language")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[{"id":2,"title":"示例电影","original_title":"Example Movie","overview":"test","poster_path":"/poster.jpg","backdrop_path":"/backdrop.jpg","vote_average":7.1,"vote_count":220,"popularity":123.4,"release_date":"2024-02-01","genre_ids":[18]}]}`))
	}))
	defer server.Close()

	config.AppConfig = &config.Config{
		TMDBAPIKey:          "test-api-key",
		TMDBBaseURL:         server.URL,
		TMDBDefaultLanguage: "zh-CN",
	}

	service := NewTMDBService()
	results, err := service.GetTrendingMovies(context.Background(), "day")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if authHeader != "" {
		t.Fatalf("expected empty authorization header when using api key, got %q", authHeader)
	}

	if apiKeyParam != "test-api-key" {
		t.Fatalf("expected api_key query param, got %q", apiKeyParam)
	}

	if languageParam != "zh-CN" {
		t.Fatalf("expected zh-CN language, got %q", languageParam)
	}
}

func TestTMDBServiceTreatsLegacyReadAccessTokenEnvAsAPIKeyWhenFormatMatches(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	var authHeader string
	var apiKeyParam string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		apiKeyParam = r.URL.Query().Get("api_key")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[{"id":3,"title":"示例剧集","original_name":"Example Show","overview":"test","poster_path":"/poster.jpg","backdrop_path":"/backdrop.jpg","vote_average":8.1,"vote_count":520,"popularity":345.6,"first_air_date":"2024-01-01","genre_ids":[18],"origin_country":["US"]}]}`))
	}))
	defer server.Close()

	config.AppConfig = &config.Config{
		TMDBReadAccessToken: "eb817574a7755281fdf7e31b208ed222",
		TMDBBaseURL:         server.URL,
		TMDBDefaultLanguage: "zh-CN",
	}

	service := NewTMDBService()
	results, err := service.GetTrendingTV(context.Background(), "day")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if authHeader != "" {
		t.Fatalf("expected empty authorization header when read access token env actually contains api key, got %q", authHeader)
	}

	if apiKeyParam != "eb817574a7755281fdf7e31b208ed222" {
		t.Fatalf("expected api_key query param, got %q", apiKeyParam)
	}
}

func TestTMDBServicePrefersSecretManagerTokenOverEnvConfig(t *testing.T) {
	oldConfig := config.AppConfig
	oldManager := GetGlobalSecretManager()
	defer func() {
		config.AppConfig = oldConfig
		SetGlobalSecretManager(oldManager)
	}()

	var authHeader string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"results":[{"id":1,"title":"test","original_title":"test","overview":"test","poster_path":"/poster.jpg","backdrop_path":"/backdrop.jpg","vote_average":8.4,"vote_count":1000,"popularity":999.5,"release_date":"2023-01-22","genre_ids":[28,878]}]}`))
	}))
	defer server.Close()

	config.AppConfig = &config.Config{
		TMDBReadAccessToken: "env-token",
		TMDBBaseURL:         server.URL,
		TMDBDefaultLanguage: "zh-CN",
	}
	SetGlobalSecretManager(&tmdbTestSecretManager{token: "secret-manager-token"})

	service := NewTMDBService()
	_, err := service.GetTrendingMovies(context.Background(), "day")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if authHeader != "Bearer secret-manager-token" {
		t.Fatalf("expected secret manager token, got %q", authHeader)
	}
}
