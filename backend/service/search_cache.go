package service

import (
	"context"
	"log"

	"unisearch/config"
	"unisearch/util/cache"
)

type SearchCache interface {
	Load(scope string, key string, keyword string, target interface{}) (bool, error)
	Store(scope string, key string, keyword string, value interface{})
}

type redisSearchCache struct {
	cache   *cache.RedisCache
	metrics *SearchMetricsRecorder
}

func newSearchCache(redisCache *cache.RedisCache, metrics *SearchMetricsRecorder) SearchCache {
	return &redisSearchCache{
		cache:   redisCache,
		metrics: metrics,
	}
}

func (c *redisSearchCache) Load(scope string, key string, keyword string, target interface{}) (bool, error) {
	if c == nil || c.cache == nil || config.AppConfig == nil || !config.AppConfig.CacheEnabled {
		return false, nil
	}

	err := c.cache.Get(context.Background(), key, target)
	switch err {
	case nil:
		c.metrics.RecordCache(scope, true)
		logSearchEvent("cache_hit", map[string]interface{}{
			"scope":   scope,
			"keyword": keyword,
		})
		return true, nil
	case cache.ErrCacheMiss:
		c.metrics.RecordCache(scope, false)
		logSearchEvent("cache_miss", map[string]interface{}{
			"scope":   scope,
			"keyword": keyword,
		})
		return false, nil
	default:
		log.Printf("⚠️ [%s搜索] Redis 缓存读取失败: %v", scope, err)
		return false, err
	}
}

func (c *redisSearchCache) Store(scope string, key string, keyword string, value interface{}) {
	if c == nil || c.cache == nil || config.AppConfig == nil || !config.AppConfig.CacheEnabled {
		return
	}

	go func() {
		if err := c.cache.Set(context.Background(), key, value); err != nil {
			log.Printf("❌ [%s搜索] Redis 缓存写入失败: %v", scope, err)
			return
		}

		logSearchEvent("cache_store", map[string]interface{}{
			"scope":   scope,
			"keyword": keyword,
		})
	}()
}
