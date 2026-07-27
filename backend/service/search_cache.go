package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"unisearch/config"
	"unisearch/util/cache"
	"unisearch/util/logger"
)

type SearchCache interface {
	Load(scope string, key string, keyword string, target interface{}) (bool, error)
	Store(scope string, key string, keyword string, value interface{})
	Close(ctx context.Context) error
}

type cacheBackend interface {
	Get(ctx context.Context, key string, dest interface{}) error
	SetWithTTL(ctx context.Context, key string, value interface{}, ttl time.Duration) error
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
	storeWG          sync.WaitGroup
	storeMu          sync.RWMutex
	closed           bool
	droppedWriteLogs atomic.Int64
}

func newSearchCache(redisCache *cache.RedisCache, metrics *SearchMetricsRecorder) SearchCache {
	searchCache := &redisSearchCache{
		metrics: metrics,
	}

	if redisCache == nil {
		return searchCache
	}

	searchCache.cache = redisCache

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
	searchCache.startStoreWorkers(workerCount)

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
			"scope":          scope,
			"keyword_length": len([]rune(keyword)),
		})
		return true, nil
	case cache.ErrCacheMiss:
		c.metrics.RecordCache(scope, false)
		logSearchEventIfEnabled("cache_miss", map[string]interface{}{
			"scope":          scope,
			"keyword_length": len([]rune(keyword)),
		})
		return false, nil
	default:
		logger.Warn(
			"search_cache_load_failed",
			logger.String("scope", scope),
			logger.Int("keyword_length", len([]rune(keyword))),
			logger.String("error_class", "cache_load_error"),
		)
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

	c.storeMu.RLock()
	defer c.storeMu.RUnlock()
	if c.closed {
		return
	}

	select {
	case c.storeQueue <- request:
	default:
		if c.droppedWriteLogs.Add(1) == 1 {
			logger.Warn("search_cache_store_queue_full")
		}
	}
}

func (c *redisSearchCache) Close(ctx context.Context) error {
	if c == nil || c.storeQueue == nil {
		return nil
	}

	c.storeMu.Lock()
	if !c.closed {
		c.closed = true
		close(c.storeQueue)
	}
	c.storeMu.Unlock()

	done := make(chan struct{})
	go func() {
		c.storeWG.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return fmt.Errorf("等待搜索缓存写队列关闭超时: %w", ctx.Err())
	}
}

func (c *redisSearchCache) startStoreWorkers(workerCount int) {
	for i := 0; i < workerCount; i++ {
		c.storeWG.Add(1)
		go c.storeWorker()
	}
}

func (c *redisSearchCache) storeWorker() {
	defer c.storeWG.Done()
	for request := range c.storeQueue {
		c.writeToCache(request)
	}
}

func (c *redisSearchCache) writeToCache(request cacheStoreRequest) {
	cacheSettings := GetRuntimeCacheSettings()
	if err := c.cache.SetWithTTL(context.Background(), request.key, request.value, time.Duration(cacheSettings.SearchCacheTTLSeconds)*time.Second); err != nil {
		logger.Error(
			"search_cache_store_failed",
			logger.String("scope", request.scope),
			logger.Int("keyword_length", len([]rune(request.keyword))),
			logger.String("error_class", "cache_store_error"),
		)
		return
	}

	c.droppedWriteLogs.Store(0)
	logSearchEventIfEnabled("cache_store", map[string]interface{}{
		"scope":          request.scope,
		"keyword_length": len([]rune(request.keyword)),
	})
}
