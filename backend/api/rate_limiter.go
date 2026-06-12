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
	if rl == nil {
		return true
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
		return false
	}

	rl.attempts[key] = append(validAttempts, now)
	return true
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

func readRequestBody(c *gin.Context) []byte {
	if c.Request == nil || c.Request.Body == nil {
		return nil
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Request.Body = io.NopCloser(bytes.NewBuffer(nil))
		return nil
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	return body
}

func registerRateLimitKeyResolver(c *gin.Context) string {
	body := readRequestBody(c)
	if len(body) == 0 {
		return buildRateLimitKey(c)
	}

	var req controller.RegisterRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return buildRateLimitKey(c)
	}

	return buildRateLimitKey(c, req.Username)
}

func loginRateLimitKeyResolver(c *gin.Context) string {
	body := readRequestBody(c)
	if len(body) == 0 {
		return buildRateLimitKey(c)
	}

	var req controller.LoginRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return buildRateLimitKey(c)
	}

	return buildRateLimitKey(c, req.Username)
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
		if !signupRateLimiter.Allow(registerRateLimitKeyResolver(c)) {
			denyAuthEntryRateLimit(c)
			return
		}
		c.Next()
	}
}

func loginRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !userLoginRateLimiter.Allow(loginRateLimitKeyResolver(c)) {
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
