package api

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"sync"
	"time"
	"unisearch/api/controller"

	"github.com/gin-gonic/gin"
)

// RateLimiter 简单的内存速率限制器。
type RateLimiter struct {
	attempts    map[string][]time.Time
	mu          sync.Mutex
	maxAttempts int
	window      time.Duration
}

// NewRateLimiter 创建速率限制器实例。
func NewRateLimiter(maxAttempts int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		attempts:    make(map[string][]time.Time),
		maxAttempts: maxAttempts,
		window:      window,
	}
}

// Allow 检查指定键是否允许继续请求。
func (rl *RateLimiter) Allow(key string) bool {
	allowed, _ := rl.AllowWithRetryAfter(key)
	return allowed
}

// AllowWithRetryAfter 返回是否允许请求以及被限流时距离窗口释放的时间。
func (rl *RateLimiter) AllowWithRetryAfter(key string) (bool, time.Duration) {
	if rl == nil {
		return true, 0
	}

	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	validAttempts := rl.attempts[key][:0]
	for _, attemptAt := range rl.attempts[key] {
		if attemptAt.After(cutoff) {
			validAttempts = append(validAttempts, attemptAt)
		}
	}

	if len(validAttempts) >= rl.maxAttempts {
		rl.attempts[key] = validAttempts
		retryAfter := rl.window
		if len(validAttempts) > 0 {
			retryAfter = validAttempts[0].Add(rl.window).Sub(now)
		}
		if retryAfter < 0 {
			retryAfter = 0
		}
		return false, retryAfter
	}

	rl.attempts[key] = append(validAttempts, now)
	return true, 0
}

var (
	adminLoginRateLimiter    = NewRateLimiter(5, time.Minute)
	userLoginRateLimiter     = NewRateLimiter(5, time.Minute)
	signupRateLimiter        = NewRateLimiter(5, time.Minute)
	usernameCheckRateLimiter = NewRateLimiter(12, time.Minute)
	refreshTokenRateLimiter  = NewRateLimiter(10, time.Minute)
)

func buildRateLimitKey(c *gin.Context, parts ...string) string {
	keyParts := []string{c.ClientIP()}
	for _, part := range parts {
		normalized := strings.TrimSpace(part)
		if normalized != "" {
			keyParts = append(keyParts, normalized)
		}
	}
	return strings.Join(keyParts, "|")
}

func readRequestBody(c *gin.Context) ([]byte, error) {
	if c.Request == nil || c.Request.Body == nil {
		return nil, nil
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Request.Body = io.NopCloser(bytes.NewBuffer(nil))
		if isRequestBodyTooLargeError(err) {
			return nil, errRequestBodyTooLarge
		}
		return nil, err
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	return body, nil
}

func registerRateLimitKeyResolver(c *gin.Context) (string, error) {
	body, err := readRequestBody(c)
	if err != nil {
		return buildRateLimitKey(c), err
	}
	if len(body) == 0 {
		return buildRateLimitKey(c), nil
	}

	var req controller.RegisterRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return buildRateLimitKey(c), nil
	}

	return buildRateLimitKey(c, req.Username), nil
}

func loginRateLimitKeyResolver(c *gin.Context) (string, error) {
	body, err := readRequestBody(c)
	if err != nil {
		return buildRateLimitKey(c), err
	}
	if len(body) == 0 {
		return buildRateLimitKey(c), nil
	}

	var req controller.LoginRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return buildRateLimitKey(c), nil
	}

	return buildRateLimitKey(c, req.Username), nil
}

func denyAuthEntryRateLimit(c *gin.Context) {
	c.AbortWithStatusJSON(429, gin.H{
		"code":    429,
		"message": "请求过于频繁，请稍后再试",
		"data":    nil,
	})
}

func denyCheckUsernameRateLimit(c *gin.Context) {
	c.AbortWithStatusJSON(429, gin.H{
		"code":    429,
		"message": "请求过于频繁，请稍后再试",
		"data":    false,
	})
}

func denyRefreshRateLimit(c *gin.Context) {
	c.AbortWithStatusJSON(429, gin.H{
		"error": "请求过于频繁，请稍后再试",
		"code":  "RATE_LIMIT_EXCEEDED",
	})
}

func registerRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key, err := registerRateLimitKeyResolver(c)
		if isRequestBodyTooLargeError(err) {
			abortRequestBodyTooLarge(c)
			return
		}
		if !signupRateLimiter.Allow(key) {
			denyAuthEntryRateLimit(c)
			return
		}
		c.Next()
	}
}

func loginRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key, err := loginRateLimitKeyResolver(c)
		if isRequestBodyTooLargeError(err) {
			abortRequestBodyTooLarge(c)
			return
		}
		if !userLoginRateLimiter.Allow(key) {
			denyAuthEntryRateLimit(c)
			return
		}
		c.Next()
	}
}

func checkUsernameRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := buildRateLimitKey(c, c.Query("username"))
		if !usernameCheckRateLimiter.Allow(key) {
			denyCheckUsernameRateLimit(c)
			return
		}
		c.Next()
	}
}

func refreshRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !refreshTokenRateLimiter.Allow(buildRateLimitKey(c)) {
			denyRefreshRateLimit(c)
			return
		}
		c.Next()
	}
}
