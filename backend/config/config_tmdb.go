package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// 本文件集中 TMDB 与热门榜单（Hot Ranking）相关的环境变量读取函数。

func getTMDBReadAccessToken() string {
	return strings.TrimSpace(os.Getenv("TMDB_READ_ACCESS_TOKEN"))
}

func getTMDBAPIKey() string {
	return strings.TrimSpace(os.Getenv("TMDB_API_KEY"))
}

func getTMDBBaseURL() string {
	value := strings.TrimSpace(os.Getenv("TMDB_BASE_URL"))
	if value == "" {
		return "https://api.themoviedb.org/3"
	}
	return value
}

func getTMDBDefaultLanguage() string {
	value := strings.TrimSpace(os.Getenv("TMDB_DEFAULT_LANGUAGE"))
	if value == "" {
		return "zh-CN"
	}
	return value
}

func getTMDBDefaultRegion() string {
	value := strings.TrimSpace(os.Getenv("TMDB_DEFAULT_REGION"))
	if value == "" {
		return "CN"
	}
	return value
}

func getTMDBImageBaseURL() string {
	value := strings.TrimSpace(os.Getenv("TMDB_IMAGE_BASE_URL"))
	if value == "" {
		return "https://image.tmdb.org/t/p/w500"
	}
	return value
}

func getTMDBRequestTimeout() time.Duration {
	value := strings.TrimSpace(os.Getenv("TMDB_REQUEST_TIMEOUT"))
	if value == "" {
		return 8 * time.Second
	}

	timeout, err := time.ParseDuration(value)
	if err != nil || timeout <= 0 {
		return 8 * time.Second
	}
	return timeout
}

func getHotRankingPreloadEnabled() bool {
	value := strings.TrimSpace(os.Getenv("HOT_RANKING_PRELOAD_ENABLED"))
	if value == "" {
		return true
	}

	enabled, err := strconv.ParseBool(value)
	if err != nil {
		return true
	}
	return enabled
}

func getHotRankingPreloadTime() string {
	value := strings.TrimSpace(os.Getenv("HOT_RANKING_PRELOAD_TIME"))
	if value == "" {
		return "10:00"
	}
	if _, err := time.Parse("15:04", value); err != nil {
		return "10:00"
	}
	return value
}

func getHotRankingPreloadTimeout() time.Duration {
	value := strings.TrimSpace(os.Getenv("HOT_RANKING_PRELOAD_TIMEOUT"))
	if value == "" {
		return 30 * time.Second
	}

	timeout, err := time.ParseDuration(value)
	if err != nil || timeout <= 0 {
		return 30 * time.Second
	}
	return timeout
}

func getHotRankingPreloadConcurrency() int {
	value := strings.TrimSpace(os.Getenv("HOT_RANKING_PRELOAD_CONCURRENCY"))
	if value == "" {
		return 2
	}

	concurrency, err := strconv.Atoi(value)
	if err != nil || concurrency <= 0 {
		return 2
	}
	return concurrency
}

func getHotRankingCacheTTL(envKey string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(envKey))
	if value == "" {
		return fallback
	}

	ttl, err := time.ParseDuration(value)
	if err != nil || ttl <= 0 {
		return fallback
	}
	return ttl
}
