package service

import (
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
)

func TestHotRankingCacheKeyIncludesModePeriodCategoryTimeLanguageAndRegion(t *testing.T) {
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
		WeekStart: "2026-05-18",
		Page:      1,
		PageSize:  100,
	})
	expected := "hot-ranking:v2:popular:week:anime:2026-05-18:zh-CN:CN"
	if key != expected {
		t.Fatalf("expected %q, got %q", expected, key)
	}
}

func TestResolveHotRankingCacheTTLUsesPeriodSpecificConfig(t *testing.T) {
	oldConfig := config.AppConfig
	defer func() {
		config.AppConfig = oldConfig
	}()

	config.AppConfig = &config.Config{
		HotRankingCacheTTLDay:   10 * time.Minute,
		HotRankingCacheTTLWeek:  2 * time.Hour,
		HotRankingCacheTTLMonth: 6 * time.Hour,
		HotRankingCacheTTLYear:  12 * time.Hour,
	}

	if got := resolveHotRankingCacheTTL(model.HotRankingPeriodDay); got != 10*time.Minute {
		t.Fatalf("expected day ttl, got %v", got)
	}
	if got := resolveHotRankingCacheTTL(model.HotRankingPeriodYear); got != 12*time.Hour {
		t.Fatalf("expected year ttl, got %v", got)
	}
}
