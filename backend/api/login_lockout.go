package api

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"unisearch/util/cache"
)

// loginLockout 实现账户级登录失败锁定：同一用户名在触发窗口内连续登录失败达到阈值，
// 即锁定该账户一段时间，期间拒绝其登录尝试（针对单一账户的在线爆破防护）。
// 失败计数与锁定标记优先走 Redis（多实例共享），Redis 不可用时降级到进程内状态。
type loginLockout struct {
	redis     *cache.RedisCache
	threshold int           // 触发锁定的连续失败次数，<=0 表示关闭
	window    time.Duration // 失败计数窗口
	lockFor   time.Duration // 触发后锁定时长

	mu       sync.Mutex
	memFails map[string][]time.Time // username -> 窗口内失败时间戳（内存降级）
	memLocks map[string]time.Time   // username -> 锁定解除时间（内存降级）
}

var loginLockoutGuard = &loginLockout{}

// InitLoginLockout 按配置初始化账户锁定。threshold<=0 关闭锁定。
func InitLoginLockout(threshold, lockMin int, redisCache *cache.RedisCache) {
	window := 15 * time.Minute
	if lockMin <= 0 {
		lockMin = 15
	}
	loginLockoutGuard = &loginLockout{
		redis:     redisCache,
		threshold: threshold,
		window:    window,
		lockFor:   time.Duration(lockMin) * time.Minute,
		memFails:  make(map[string][]time.Time),
		memLocks:  make(map[string]time.Time),
	}
	if threshold > 0 {
		log.Printf("信息: 账户登录失败锁定已启用（阈值 %d 次，锁定 %v）", threshold, loginLockoutGuard.lockFor)
	} else {
		log.Println("信息: 账户登录失败锁定未启用（LOGIN_ACCOUNT_LOCK_THRESHOLD=0）")
	}
}

func (l *loginLockout) enabled() bool {
	return l != nil && l.threshold > 0
}

func normalizeLockoutKey(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

const (
	loginFailCountKeyPrefix = "login:fail:"
	loginLockKeyPrefix      = "login:lock:"
)

// isLocked 返回该用户名当前是否处于锁定态。
func (l *loginLockout) isLocked(ctx context.Context, username string) bool {
	if !l.enabled() {
		return false
	}
	key := normalizeLockoutKey(username)
	if key == "" {
		return false
	}

	if l.redis != nil {
		locked, err := l.redis.KeyExists(ctx, loginLockKeyPrefix+key)
		if err == nil {
			return locked
		}
		// Redis 异常，降级到内存判断。
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	until, ok := l.memLocks[key]
	if !ok {
		return false
	}
	if time.Now().After(until) {
		delete(l.memLocks, key)
		return false
	}
	return true
}

// recordFailure 记一次登录失败；若窗口内累计达到阈值则锁定该账户。
func (l *loginLockout) recordFailure(ctx context.Context, username string) {
	if !l.enabled() {
		return
	}
	key := normalizeLockoutKey(username)
	if key == "" {
		return
	}

	if l.redis != nil {
		count, err := l.redis.IncrCounter(ctx, loginFailCountKeyPrefix+key, l.window)
		if err == nil {
			if count >= int64(l.threshold) {
				if setErr := l.redis.SetRawWithTTL(ctx, loginLockKeyPrefix+key, "1", l.lockFor); setErr != nil {
					log.Printf("警告: 写入账户锁定标记失败: %v", setErr)
				} else {
					_ = l.redis.DeleteKey(ctx, loginFailCountKeyPrefix+key)
					log.Printf("安全: 账户 %s 连续登录失败 %d 次，锁定 %v", key, count, l.lockFor)
				}
			}
			return
		}
		log.Printf("警告: Redis 账户失败计数失败，降级到内存计数: %v", err)
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-l.window)
	fails := l.memFails[key][:0]
	for _, at := range l.memFails[key] {
		if at.After(cutoff) {
			fails = append(fails, at)
		}
	}
	fails = append(fails, now)
	l.memFails[key] = fails
	if len(fails) >= l.threshold {
		l.memLocks[key] = now.Add(l.lockFor)
		delete(l.memFails, key)
		log.Printf("安全: 账户 %s 连续登录失败 %d 次，锁定 %v", key, len(fails), l.lockFor)
	}
}

// recordSuccess 登录成功后清除该账户的失败计数与锁定标记。
func (l *loginLockout) recordSuccess(ctx context.Context, username string) {
	if !l.enabled() {
		return
	}
	key := normalizeLockoutKey(username)
	if key == "" {
		return
	}

	if l.redis != nil {
		_ = l.redis.DeleteKey(ctx, loginFailCountKeyPrefix+key)
		_ = l.redis.DeleteKey(ctx, loginLockKeyPrefix+key)
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.memFails, key)
	delete(l.memLocks, key)
}
