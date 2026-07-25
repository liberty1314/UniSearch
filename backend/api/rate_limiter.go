package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
	"unisearch/api/controller"
	"unisearch/model"

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

	// 注册 IP 维度限流阈值：仅以 ClientIP 为 key 计数，不含 username，
	// 确保同一 IP 换不同用户名也受同一计数器约束（修复 W1）。
	// 实际计数走 signupRateLimitStore（内存或 Redis，见 rate_limiter_store.go）。
	signupIPLimitPerMin  = 5
	signupIPLimitPerHour = 20

	// 自动封禁触发计数：统计单 IP 在触发窗口内的注册请求数，
	// 超过阈值即写入封禁名单（L1.5 / 修复 W6）。计数走 signupRateLimitStore，
	// 与限流共用后端（Redis 时多实例共享）。阈值/窗口由 InitSignupAutoban 配置。
	signupAutobanEnabled   = false
	signupAutobanThreshold = 30
	signupAutobanWindow    = 10 * time.Minute
	signupAutobanDuration  = 24 * time.Hour

	// 登录 IP 维度限流阈值：仅以 ClientIP 为 key 计数，不含 username，
	// 确保同一 IP 换不同用户名撞库也受同一计数器约束（对齐注册的 W1 修复）。
	// 实际计数走 loginRateLimitStore（内存或 Redis）。
	loginIPLimitPerMin  = 10
	loginIPLimitPerHour = 100
)

// InitLoginRateLimiters 按配置设置登录 IP 维度限流阈值。
func InitLoginRateLimiters(perMin, perHour int) {
	if perMin <= 0 {
		perMin = 10
	}
	if perHour <= 0 {
		perHour = 100
	}
	loginIPLimitPerMin = perMin
	loginIPLimitPerHour = perHour
}

// InitSignupRateLimiters 按配置设置注册 IP 维度限流阈值。
// 需在 config.Init 之后、开始处理请求之前调用（如 SetupRouter 内）。
func InitSignupRateLimiters(perMin, perHour int) {
	if perMin <= 0 {
		perMin = 5
	}
	if perHour <= 0 {
		perHour = 20
	}
	signupIPLimitPerMin = perMin
	signupIPLimitPerHour = perHour
}

// InitSignupAutoban 按配置初始化自动封禁触发器。窗口内注册请求超过阈值即封禁。
func InitSignupAutoban(enabled bool, threshold, windowMin, durationMin int) {
	signupAutobanEnabled = enabled
	if threshold <= 0 {
		threshold = 30
	}
	if windowMin <= 0 {
		windowMin = 10
	}
	signupAutobanThreshold = threshold
	signupAutobanWindow = time.Duration(windowMin) * time.Minute
	if durationMin > 0 {
		signupAutobanDuration = time.Duration(durationMin) * time.Minute
	} else {
		signupAutobanDuration = 0 // 0 表示永久封禁
	}
}

// maybeAutobanSignupIP 在自动封禁开启时统计该 IP 的注册请求；超过阈值则写入封禁名单。
func maybeAutobanSignupIP(ip string) {
	if !signupAutobanEnabled || bannedIPService == nil {
		return
	}
	if strings.TrimSpace(ip) == "" {
		return
	}
	// tracker 未超限时返回 true，无需封禁；超限（false）说明触发窗口内请求过多。
	// 走 signupRateLimitStore 以在多实例间共享计数（Redis 不可用时降级到内存）。
	allowed, _ := signupRateLimitStore.Allow(context.Background(), "signup:autoban:"+ip, signupAutobanThreshold, signupAutobanWindow)
	if allowed {
		return
	}

	var expiresAt *time.Time
	if signupAutobanDuration > 0 {
		t := time.Now().Add(signupAutobanDuration)
		expiresAt = &t
	}
	if _, err := bannedIPService.Ban(ip, "注册请求过于频繁，自动封禁", model.BannedIPSourceAuto, expiresAt, ""); err != nil {
		log.Printf("警告: 自动封禁 IP %s 失败: %v", ip, err)
		return
	}
	log.Printf("安全: IP %s 因注册请求过于频繁被自动封禁 (时长: %v)", ip, signupAutobanDuration)
}

// SignupBanGuardMiddleware 命中封禁名单的请求直接 403 拒绝。挂在 auth 公开入口之前。
func SignupBanGuardMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if bannedIPService != nil && bannedIPService.IsBanned(c.ClientIP()) {
			recordSignupBlocked("banned")
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"code":    http.StatusForbidden,
				"message": "您的访问已被限制，如有疑问请联系管理员",
				"data":    nil,
			})
			return
		}
		c.Next()
	}
}

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
	key, _, err := loginRateLimitKeyResolverWithUsername(c)
	return key, err
}

// loginRateLimitKeyResolverWithUsername 解析登录请求体，返回 IP+username 限流键与用户名。
// 用户名用于账户级失败锁定判断。
func loginRateLimitKeyResolverWithUsername(c *gin.Context) (key, username string, err error) {
	body, readErr := readRequestBody(c)
	if readErr != nil {
		return buildRateLimitKey(c), "", readErr
	}
	if len(body) == 0 {
		return buildRateLimitKey(c), "", nil
	}

	var req controller.LoginRequest
	if unmarshalErr := json.Unmarshal(body, &req); unmarshalErr != nil {
		return buildRateLimitKey(c), "", nil
	}

	return buildRateLimitKey(c, req.Username), req.Username, nil
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

		recordSignupAttempt()

		// IP 维度双窗口：同一 IP 无论换多少用户名都受同一计数器约束（修复 W1）。
		// 计数走 signupRateLimitStore（内存或 Redis），实现多实例共享、重启不丢（M3）。
		ctx := c.Request.Context()
		ip := c.ClientIP()
		if allowed, _ := signupRateLimitStore.Allow(ctx, "signup:ip:min:"+ip, signupIPLimitPerMin, time.Minute); !allowed {
			recordSignupBlocked("ip_min")
			maybeAutobanSignupIP(ip)
			denyAuthEntryRateLimit(c)
			return
		}
		if allowed, _ := signupRateLimitStore.Allow(ctx, "signup:ip:hour:"+ip, signupIPLimitPerHour, time.Hour); !allowed {
			recordSignupBlocked("ip_hour")
			maybeAutobanSignupIP(ip)
			denyAuthEntryRateLimit(c)
			return
		}

		// IP+username 维度：防止针对单一目标用户名的撞注册。
		if !signupRateLimiter.Allow(key) {
			recordSignupBlocked("ip_username")
			denyAuthEntryRateLimit(c)
			return
		}
		c.Next()

		// 注册即登录成功返回 200，计入成功指标。
		if c.Writer.Status() == http.StatusOK {
			recordSignupSuccess()
		}
	}
}

func loginRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key, username, err := loginRateLimitKeyResolverWithUsername(c)
		if isRequestBodyTooLargeError(err) {
			abortRequestBodyTooLarge(c)
			return
		}

		ctx := c.Request.Context()
		ip := c.ClientIP()

		// IP 纯维度双窗口：同一 IP 换不同用户名撞库也受同一计数器约束。
		// 计数走 loginRateLimitStore（内存或 Redis），支持多实例共享、重启不丢。
		if allowed, _ := loginRateLimitStore.Allow(ctx, "login:ip:min:"+ip, loginIPLimitPerMin, time.Minute); !allowed {
			denyAuthEntryRateLimit(c)
			return
		}
		if allowed, _ := loginRateLimitStore.Allow(ctx, "login:ip:hour:"+ip, loginIPLimitPerHour, time.Hour); !allowed {
			denyAuthEntryRateLimit(c)
			return
		}

		// 账户级锁定：针对单一账户的在线爆破，达到阈值后锁定该账户一段时间。
		if loginLockoutGuard.isLocked(ctx, username) {
			c.AbortWithStatusJSON(429, gin.H{
				"code":    429,
				"message": "账户因多次登录失败已被临时锁定，请稍后再试",
				"data":    nil,
			})
			return
		}

		// IP+username 维度：防止针对单一目标账户的高频尝试。
		if !userLoginRateLimiter.Allow(key) {
			denyAuthEntryRateLimit(c)
			return
		}

		c.Next()

		// 依据登录结果更新账户失败计数：200 成功清零，401 凭据错误记一次失败。
		switch c.Writer.Status() {
		case http.StatusOK:
			loginLockoutGuard.recordSuccess(ctx, username)
		case http.StatusUnauthorized:
			loginLockoutGuard.recordFailure(ctx, username)
		}
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
