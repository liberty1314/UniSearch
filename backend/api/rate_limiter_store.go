package api

import (
	"context"
	"log"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"unisearch/util/cache"
)

// RateLimiterStore 抽象限流计数后端，便于在内存与 Redis 实现间切换。
type RateLimiterStore interface {
	// Allow 在 window 窗口内对 key 计数，未超过 limit 返回 allowed=true；
	// 超过返回 false 与建议重试间隔。
	Allow(ctx context.Context, key string, limit int, window time.Duration) (allowed bool, retryAfter time.Duration)
}

// memoryRateLimiterStore 基于进程内滑动窗口计数（复用 RateLimiter），
// 作为默认实现与 Redis 不可用时的降级兜底。
type memoryRateLimiterStore struct {
	mu       sync.Mutex
	limiters map[string]*RateLimiter // "limit|window" -> limiter
}

func newMemoryRateLimiterStore() *memoryRateLimiterStore {
	return &memoryRateLimiterStore{limiters: make(map[string]*RateLimiter)}
}

func (m *memoryRateLimiterStore) limiterFor(limit int, window time.Duration) *RateLimiter {
	bucketKey := limiterBucketKey(limit, window)
	m.mu.Lock()
	defer m.mu.Unlock()
	rl, ok := m.limiters[bucketKey]
	if !ok {
		rl = NewRateLimiter(limit, window)
		m.limiters[bucketKey] = rl
	}
	return rl
}

func (m *memoryRateLimiterStore) Allow(_ context.Context, key string, limit int, window time.Duration) (bool, time.Duration) {
	if limit <= 0 || window <= 0 {
		return true, 0
	}
	return m.limiterFor(limit, window).AllowWithRetryAfter(bucketScopedKey(limit, window, key))
}

func limiterBucketKey(limit int, window time.Duration) string {
	return window.String() + "|" + strconv.Itoa(limit)
}

func bucketScopedKey(limit int, window time.Duration, key string) string {
	return limiterBucketKey(limit, window) + "|" + key
}

// redisRateLimiterStore 基于 Redis 固定窗口原子计数，实现多实例共享、重启不丢。
// Redis 调用失败时自动降级到内存实现，并按节流频率打告警日志。
type redisRateLimiterStore struct {
	redis    *cache.RedisCache
	fallback *memoryRateLimiterStore
	degraded atomic.Bool
	lastWarn atomic.Int64
}

func newRedisRateLimiterStore(rc *cache.RedisCache) *redisRateLimiterStore {
	return &redisRateLimiterStore{
		redis:    rc,
		fallback: newMemoryRateLimiterStore(),
	}
}

func (r *redisRateLimiterStore) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, time.Duration) {
	if limit <= 0 || window <= 0 {
		return true, 0
	}

	allowed, retryAfter, err := r.redis.AllowFixedWindow(ctx, "ratelimit:"+key, limit, window)
	if err != nil {
		r.markDegraded(err)
		return r.fallback.Allow(ctx, key, limit, window)
	}
	if r.degraded.CompareAndSwap(true, false) {
		log.Printf("信息: Redis 限流已恢复，切回 Redis 计数")
	}
	return allowed, retryAfter
}

func (r *redisRateLimiterStore) markDegraded(err error) {
	r.degraded.Store(true)
	now := time.Now().Unix()
	last := r.lastWarn.Load()
	// 每 30 秒最多告警一次，避免 Redis 故障时刷屏。
	if now-last >= 30 && r.lastWarn.CompareAndSwap(last, now) {
		log.Printf("警告: Redis 限流不可用，已降级到内存限流（安全性下降）: %v", err)
	}
}

// signupRateLimitStore 为注册限流选择的后端，默认内存，M3 装配时可切到 Redis。
var signupRateLimitStore RateLimiterStore = newMemoryRateLimiterStore()

// InitSignupRateLimitStore 按配置选择限流后端。useRedis 且 redisCache 可用时用 Redis，否则用内存。
func InitSignupRateLimitStore(useRedis bool, redisCache *cache.RedisCache) {
	if useRedis && redisCache != nil {
		signupRateLimitStore = newRedisRateLimiterStore(redisCache)
		log.Println("信息: 注册限流使用 Redis 计数后端（多实例共享）")
		return
	}
	signupRateLimitStore = newMemoryRateLimiterStore()
	log.Println("信息: 注册限流使用内存计数后端（单实例）")
}

// loginRateLimitStore 为登录限流与账户失败锁定选择的后端，默认内存，装配时可切到 Redis。
var loginRateLimitStore RateLimiterStore = newMemoryRateLimiterStore()

// InitLoginRateLimitStore 按配置选择登录限流后端。useRedis 且 redisCache 可用时用 Redis，否则用内存。
func InitLoginRateLimitStore(useRedis bool, redisCache *cache.RedisCache) {
	if useRedis && redisCache != nil {
		loginRateLimitStore = newRedisRateLimiterStore(redisCache)
		log.Println("信息: 登录限流使用 Redis 计数后端（多实例共享）")
		return
	}
	loginRateLimitStore = newMemoryRateLimiterStore()
	log.Println("信息: 登录限流使用内存计数后端（单实例）")
}
