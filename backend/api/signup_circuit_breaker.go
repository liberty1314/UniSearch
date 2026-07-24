package api

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"unisearch/util/cache"

	"github.com/gin-gonic/gin"
)

// signupCircuitBreaker 实现全站注册总量熔断（L4 / 修复 W5）：
// 每次注册成功计数，单位时间（小时）累计超过阈值即进入熔断态，
// 在熔断时长内拒绝新注册。计数与熔断态优先走 Redis（多实例共享），
// Redis 不可用时降级到进程内状态。
type signupCircuitBreaker struct {
	redis     *cache.RedisCache
	limit     int           // 每小时注册成功上限，<=0 表示关闭熔断
	breakFor  time.Duration // 触发后熔断持续时长

	mu           sync.Mutex
	memCount     int       // 内存降级：当前小时窗口计数
	memWindowKey string    // 内存降级：当前小时窗口标识
	memOpenUntil time.Time // 内存降级：熔断解除时间
}

var signupBreaker = &signupCircuitBreaker{}

// InitSignupCircuitBreaker 按配置初始化全局熔断。limitPerHour<=0 关闭熔断。
func InitSignupCircuitBreaker(limitPerHour, breakMin int, redisCache *cache.RedisCache) {
	if breakMin <= 0 {
		breakMin = 10
	}
	signupBreaker = &signupCircuitBreaker{
		redis:    redisCache,
		limit:    limitPerHour,
		breakFor: time.Duration(breakMin) * time.Minute,
	}
	if limitPerHour > 0 {
		log.Printf("信息: 注册全局熔断已启用（阈值 %d/小时，熔断时长 %v）", limitPerHour, signupBreaker.breakFor)
	} else {
		log.Println("信息: 注册全局熔断未启用（SIGNUP_GLOBAL_LIMIT_PER_HOUR=0）")
	}
}

func (b *signupCircuitBreaker) enabled() bool {
	return b != nil && b.limit > 0
}

func hourWindowKey(t time.Time) string {
	return t.UTC().Format("2006010215")
}

const (
	signupGlobalCountKeyPrefix = "signup:global:count:"
	signupGlobalOpenKey        = "signup:global:open"
)

// isOpen 返回当前是否处于熔断态（拒绝新注册）。
func (b *signupCircuitBreaker) isOpen(ctx context.Context) bool {
	if !b.enabled() {
		return false
	}
	if b.redis != nil {
		open, err := b.redis.KeyExists(ctx, signupGlobalOpenKey)
		if err == nil {
			return open
		}
		// Redis 异常，降级到内存判断（不 return，落到下方内存分支）。
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	return time.Now().Before(b.memOpenUntil)
}

// recordSuccess 记一次注册成功；若累计超阈值则打开熔断。
func (b *signupCircuitBreaker) recordSuccess(ctx context.Context) {
	if !b.enabled() {
		return
	}

	if b.redis != nil {
		key := signupGlobalCountKeyPrefix + hourWindowKey(time.Now())
		count, err := b.redis.IncrCounter(ctx, key, time.Hour)
		if err == nil {
			if count > int64(b.limit) {
				if setErr := b.redis.SetRawWithTTL(ctx, signupGlobalOpenKey, "1", b.breakFor); setErr != nil {
					log.Printf("警告: 写入注册熔断标记失败: %v", setErr)
				} else {
					log.Printf("安全: 注册量触发全局熔断（本小时成功 %d 次，超过阈值 %d），暂停注册 %v", count, b.limit, b.breakFor)
				}
			}
			return
		}
		log.Printf("警告: Redis 注册计数失败，降级到内存计数: %v", err)
	}

	// 内存降级计数。
	b.mu.Lock()
	defer b.mu.Unlock()
	windowKey := hourWindowKey(time.Now())
	if windowKey != b.memWindowKey {
		b.memWindowKey = windowKey
		b.memCount = 0
	}
	b.memCount++
	if b.memCount > b.limit {
		b.memOpenUntil = time.Now().Add(b.breakFor)
		log.Printf("安全: 注册量触发全局熔断（内存计数本小时 %d 次，超过阈值 %d），暂停注册 %v", b.memCount, b.limit, b.breakFor)
	}
}

// SignupCircuitBreakerMiddleware 熔断态下直接拒绝新注册。挂在注册限流之后、控制器之前。
// 注册成功由 c.Next() 之后依据响应状态码计数（200 视为成功）。
func SignupCircuitBreakerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !signupBreaker.enabled() {
			c.Next()
			return
		}

		ctx := c.Request.Context()
		if signupBreaker.isOpen(ctx) {
			recordSignupBlocked("global")
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"code":    http.StatusServiceUnavailable,
				"message": "注册繁忙，请稍后再试",
				"data":    nil,
			})
			return
		}

		c.Next()

		// 注册成功（注册即登录返回 200）才计入全局总量。
		if c.Writer.Status() == http.StatusOK {
			signupBreaker.recordSuccess(ctx)
		}
	}
}
