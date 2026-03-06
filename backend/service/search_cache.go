package service

import (
	"context"
	"log"
	"sync/atomic"

	"unisearch/config"
	"unisearch/util/cache"
)

type SearchCache interface {
	Load(scope string, key string, keyword string, target interface{}) (bool, error)
	Store(scope string, key string, keyword string, value interface{})
}

type cacheBackend interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}) error
}

type cacheStoreRequest struct {
	scope   string
	key     string
	keyword string
	value   interface{}
}

type redisSearchCache struct {
	cache            cacheBackend
	metrics          *SearchMetricsRecorder
	storeQueue       chan cacheStoreRequest
	droppedWriteLogs atomic.Int64
}

func newSearchCache(redisCache *cache.RedisCache, metrics *SearchMetricsRecorder) SearchCache {
	searchCache := &redisSearchCache{
		cache:   redisCache,
		metrics: metrics,
	}

	if redisCache == nil {
		return searchCache
	}

	queueSize := 256
	workerCount := 4
	if config.AppConfig != nil {
		if config.AppConfig.CacheWriteQueueSize > 0 {
			queueSize = config.AppConfig.CacheWriteQueueSize
		}
		if config.AppConfig.CacheWriteWorkers > 0 {
			workerCount = config.AppConfig.CacheWriteWorkers
		}
	}

	searchCache.storeQueue = make(chan cacheStoreRequest, queueSize)
	for i := 0; i < workerCount; i++ {
		go searchCache.storeWorker()
	}

	return searchCache
}

func (c *redisSearchCache) Load(scope string, key string, keyword string, target interface{}) (bool, error) {
	if c == nil || c.cache == nil || config.AppConfig == nil || !config.AppConfig.CacheEnabled {
		return false, nil
	}

	err := c.cache.Get(context.Background(), key, target)
	switch err {
	case nil:
		c.metrics.RecordCache(scope, true)
		logSearchEventIfEnabled("cache_hit", map[string]interface{}{
			"scope":   scope,
			"keyword": keyword,
		})
		return true, nil
	case cache.ErrCacheMiss:
		c.metrics.RecordCache(scope, false)
		logSearchEventIfEnabled("cache_miss", map[string]interface{}{
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

	request := cacheStoreRequest{
		scope:   scope,
		key:     key,
		keyword: keyword,
		value:   value,
	}

	if c.storeQueue == nil {
		c.writeToCache(request)
		return
	}

	select {
	case c.storeQueue <- request:
	default:
		if c.droppedWriteLogs.Add(1) == 1 {
			log.Printf("⚠️ 搜索缓存写队列已满，后续写入将被丢弃直至队列恢复")
		}
	}
}

func (c *redisSearchCache) storeWorker() {
	for request := range c.storeQueue {
		c.writeToCache(request)
	}
}

func (c *redisSearchCache) writeToCache(request cacheStoreRequest) {
	if err := c.cache.Set(context.Background(), request.key, request.value); err != nil {
		log.Printf("❌ [%s搜索] Redis 缓存写入失败: %v", request.scope, err)
		return
	}

	c.droppedWriteLogs.Store(0)
	logSearchEventIfEnabled("cache_store", map[string]interface{}{
		"scope":   request.scope,
		"keyword": request.keyword,
	})
}
