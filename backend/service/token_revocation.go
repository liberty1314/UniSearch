package service

import (
	"context"
	"log"
	"sync"
	"time"

	"unisearch/util/cache"
)

// TokenRevocationService 维护被吊销的 access token JTI 名单，用于单个 Token 精确失效（登出）。
// 优先使用 Redis（多实例共享），Redis 不可用时降级到进程内 map（单实例有效）。
// 名单项的 TTL 取该 Token 的剩余有效期，过期后自动清理，避免名单无限增长。
type TokenRevocationService struct {
	redis *cache.RedisCache

	mu        sync.Mutex
	memRevoke map[string]time.Time // jti -> 过期时间（内存降级）
}

const revokedJTIKeyPrefix = "auth:revoked:jti:"

// NewTokenRevocationService 创建吊销服务。redisCache 为 nil 时仅用内存实现。
func NewTokenRevocationService(redisCache *cache.RedisCache) *TokenRevocationService {
	s := &TokenRevocationService{
		redis:     redisCache,
		memRevoke: make(map[string]time.Time),
	}
	if redisCache == nil {
		go s.cleanupExpiredLoop()
	}
	return s
}

// Revoke 将指定 JTI 加入吊销名单，ttl 为该 Token 的剩余有效期。
// ttl<=0（Token 已过期）时无需吊销，直接返回。
func (s *TokenRevocationService) Revoke(ctx context.Context, jti string, ttl time.Duration) error {
	if jti == "" || ttl <= 0 {
		return nil
	}

	if s.redis != nil {
		if err := s.redis.SetRawWithTTL(ctx, revokedJTIKeyPrefix+jti, "1", ttl); err != nil {
			log.Printf("警告: 写入 Token 吊销名单失败，降级到内存: %v", err)
			// 落到内存兜底，避免登出未生效。
		} else {
			return nil
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.memRevoke[jti] = time.Now().Add(ttl)
	return nil
}

// IsRevoked 判断指定 JTI 是否已被吊销。
func (s *TokenRevocationService) IsRevoked(ctx context.Context, jti string) bool {
	if jti == "" {
		return false
	}

	if s.redis != nil {
		revoked, err := s.redis.KeyExists(ctx, revokedJTIKeyPrefix+jti)
		if err == nil {
			return revoked
		}
		// Redis 异常，降级到内存判断。
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	until, ok := s.memRevoke[jti]
	if !ok {
		return false
	}
	if time.Now().After(until) {
		delete(s.memRevoke, jti)
		return false
	}
	return true
}

// cleanupExpiredLoop 定期清理内存名单中已过期的项（仅内存模式启用）。
func (s *TokenRevocationService) cleanupExpiredLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		s.mu.Lock()
		for jti, until := range s.memRevoke {
			if now.After(until) {
				delete(s.memRevoke, jti)
			}
		}
		s.mu.Unlock()
	}
}
