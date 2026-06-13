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
	IsCacheEnabled() bool
}

type hotRankingCache struct {
	cache *cache.RedisCache
}

func newHotRankingCache(redisCache *cache.RedisCache) HotRankingCache {
	return &hotRankingCache{cache: redisCache}
}

func (c *hotRankingCache) IsCacheEnabled() bool {
	if c == nil || c.cache == nil {
		return false
	}
	return GetRuntimeCacheSettings().HotRankingCacheEnabled
}

func (c *hotRankingCache) Load(ctx context.Context, query model.HotRankingQuery, target *model.HotRankingResponse) (bool, error) {
	if c == nil || c.cache == nil {
		return false, nil
	}
	if !GetRuntimeCacheSettings().HotRankingCacheEnabled {
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
	if !GetRuntimeCacheSettings().HotRankingCacheEnabled {
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
	sortBy := "default"
	if config.AppConfig != nil {
		if config.AppConfig.TMDBDefaultLanguage != "" {
			language = config.AppConfig.TMDBDefaultLanguage
		}
		if config.AppConfig.TMDBDefaultRegion != "" {
			region = config.AppConfig.TMDBDefaultRegion
		}
	}
	if query.SortBy != "" {
		sortBy = string(query.SortBy)
	}
	return fmt.Sprintf(
		"hot-ranking:v2:%s:%s:%s:%s:%s:%s:%s",
		query.Mode,
		query.Period,
		query.Category,
		sortBy,
		resolveHotRankingTimeKey(query),
		language,
		region,
	)
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
	_ = period
	cacheSettings := GetRuntimeCacheSettings()
	if cacheSettings.HotRankingCacheTTLSeconds > 0 {
		return time.Duration(cacheSettings.HotRankingCacheTTLSeconds) * time.Second
	}

	if config.AppConfig != nil && config.AppConfig.HotRankingCacheTTLDay > 0 {
		return config.AppConfig.HotRankingCacheTTLDay
	}

	return 24 * time.Hour
}
