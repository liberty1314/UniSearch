package service

import (
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
)

func TestHotRankingCacheKeyIncludesModePeriodCategorySortTimeLanguageAndRegion(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		TMDBDefaultLanguage: "zh-CN",
		TMDBDefaultRegion:   "CN",
	}

	key := buildHotRankingCacheKey(model.HotRankingQuery{
		Mode:      model.HotRankingModePopular,
		Period:    model.HotRankingPeriodWeek,
		Category:  model.HotRankingCategoryAnime,
		SortBy:    model.HotRankingSortByVoteAverage,
		WeekStart: "2026-05-18",
		Page:      1,
		PageSize:  100,
	})
	expected := "hot-ranking:v2:popular:week:anime:vote_average.desc:2026-05-18:zh-CN:CN"
	if key != expected {
		t.Fatalf("expected %q, got %q", expected, key)
	}
}

func TestResolveHotRankingCacheTTLUsesPeriodSpecificConfig(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
		SetGlobalCacheSettingsService(nil)
	}()

	config.AppConfig = &config.Config{}
	settingsService := NewSystemSettingsService(newSystemSettingsTestDB(t))
	ttl := 24 * 60 * 60
	if _, err := settingsService.UpdateCacheSettings(CacheSettingsUpdateInput{
		HotRankingCacheTTLSeconds: &ttl,
	}); err != nil {
		t.Fatalf("update cache settings: %v", err)
	}
	SetGlobalCacheSettingsService(settingsService)

	if got := resolveHotRankingCacheTTL(model.HotRankingPeriodDay); got != 24*time.Hour {
		t.Fatalf("expected unified ttl 24h, got %v", got)
	}
	if got := resolveHotRankingCacheTTL(model.HotRankingPeriodYear); got != 24*time.Hour {
		t.Fatalf("expected unified ttl 24h for year, got %v", got)
	}
}
