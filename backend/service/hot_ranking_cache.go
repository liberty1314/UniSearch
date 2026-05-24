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
	Load(ctx context.Context, query model.HotRankingQuery, target *model.HotRankingResponse) (bool, error)
	Store(ctx context.Context, query model.HotRankingQuery, value model.HotRankingResponse) error
	ClearByPrefix(ctx context.Context, prefix string) error
}

type hotRankingCache struct {
	cache *cache.RedisCache
}

func newHotRankingCache(redisCache *cache.RedisCache) HotRankingCache {
	return &hotRankingCache{cache: redisCache}
}

func (c *hotRankingCache) Load(ctx context.Context, query model.HotRankingQuery, target *model.HotRankingResponse) (bool, error) {
	if c == nil || c.cache == nil {
		return false, nil
	}

	err := c.cache.Get(ctx, buildHotRankingCacheKey(query), target)
	switch err {
	case nil:
		return true, nil
	case cache.ErrCacheMiss:
		return false, nil
	default:
		return false, err
	}
}

func (c *hotRankingCache) Store(ctx context.Context, query model.HotRankingQuery, value model.HotRankingResponse) error {
	if c == nil || c.cache == nil {
		return nil
	}

	return c.cache.SetWithTTL(ctx, buildHotRankingCacheKey(query), value, resolveHotRankingCacheTTL(query.Period))
}

func (c *hotRankingCache) ClearByPrefix(ctx context.Context, prefix string) error {
	if c == nil || c.cache == nil {
		return nil
	}

	return c.cache.DeleteByPattern(ctx, prefix+"*")
}

func buildHotRankingCacheKey(query model.HotRankingQuery) string {
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
	return fmt.Sprintf("hot-ranking:v2:%s:%s:%s:%s:%s:%s", query.Mode, query.Period, query.Category, resolveHotRankingTimeKey(query), language, region)
}

func resolveHotRankingTimeKey(query model.HotRankingQuery) string {
	switch query.Period {
	case model.HotRankingPeriodDay:
		if query.Date != "" {
			return query.Date
		}
	case model.HotRankingPeriodWeek:
		if query.WeekStart != "" {
			return query.WeekStart
		}
	case model.HotRankingPeriodMonth:
		if query.Month != "" {
			return query.Month
		}
	case model.HotRankingPeriodYear:
		if query.Year != "" {
			return query.Year
		}
	}

	return "default"
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
