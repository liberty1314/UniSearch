package service

import (
	"context"
	"fmt"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util/cache"
)

type HotRankingCache interface {
	Load(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory, target *model.HotRankingResponse) (bool, error)
	Store(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory, value model.HotRankingResponse) error
}

type hotRankingCache struct {
	cache *cache.RedisCache
}

func newHotRankingCache(redisCache *cache.RedisCache) HotRankingCache {
	return &hotRankingCache{cache: redisCache}
}

func (c *hotRankingCache) Load(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory, target *model.HotRankingResponse) (bool, error) {
	if c == nil || c.cache == nil {
		return false, nil
	}

	err := c.cache.Get(ctx, buildHotRankingCacheKey(period, category), target)
	switch err {
	case nil:
		return true, nil
	case cache.ErrCacheMiss:
		return false, nil
	default:
		return false, err
	}
}

func (c *hotRankingCache) Store(ctx context.Context, period model.HotRankingPeriod, category model.HotRankingCategory, value model.HotRankingResponse) error {
	if c == nil || c.cache == nil {
		return nil
	}

	return c.cache.SetWithTTL(ctx, buildHotRankingCacheKey(period, category), value, resolveHotRankingCacheTTL(period))
}

func buildHotRankingCacheKey(period model.HotRankingPeriod, category model.HotRankingCategory) string {
	language := "zh-CN"
	region := "CN"
	if config.AppConfig != nil {
		if config.AppConfig.TMDBDefaultLanguage != "" {
			language = config.AppConfig.TMDBDefaultLanguage
		}
		if config.AppConfig.TMDBDefaultRegion != "" {
			region = config.AppConfig.TMDBDefaultRegion
		}
	}
	return fmt.Sprintf("hot-ranking:%s:%s:%s:%s", period, category, language, region)
}

func resolveHotRankingCacheTTL(period model.HotRankingPeriod) time.Duration {
	if config.AppConfig == nil {
		return 30 * time.Minute
	}

	switch period {
	case model.HotRankingPeriodWeek:
		if config.AppConfig.HotRankingCacheTTLWeek > 0 {
			return config.AppConfig.HotRankingCacheTTLWeek
		}
	case model.HotRankingPeriodMonth:
		if config.AppConfig.HotRankingCacheTTLMonth > 0 {
			return config.AppConfig.HotRankingCacheTTLMonth
		}
	case model.HotRankingPeriodYear:
		if config.AppConfig.HotRankingCacheTTLYear > 0 {
			return config.AppConfig.HotRankingCacheTTLYear
		}
	default:
		if config.AppConfig.HotRankingCacheTTLDay > 0 {
			return config.AppConfig.HotRankingCacheTTLDay
		}
	}

	return 30 * time.Minute
}
