package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// newLoginTestRouter 构造一个登录路由，status 决定处理器返回码，
// 用于模拟登录成功（200）与凭据错误（401）两种结果。
func newLoginTestRouter(status int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/login", loginRateLimitMiddleware(), func(c *gin.Context) {
		c.JSON(status, gin.H{"ok": status == http.StatusOK})
	})
	return router
}

func doLogin(router *gin.Engine, ip, username string) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"username":%q,"password":"Secret123!"}`, username)
	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = ip + ":12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func resetLoginGuards() {
	InitLoginRateLimiters(10, 100)
	loginRateLimitStore = newMemoryRateLimiterStore()
	userLoginRateLimiter = NewRateLimiter(5, time.Minute)
	loginLockoutGuard = &loginLockout{}
}

// TestLoginIPRateLimitBlocksDifferentUsernames 验证同一 IP 换不同用户名撞库
// 超过分钟阈值后仍被 429（对齐注册的 W1 修复）。
func TestLoginIPRateLimitBlocksDifferentUsernames(t *testing.T) {
	resetLoginGuards()
	defer resetLoginGuards()
	InitLoginRateLimiters(5, 100)
	// 放宽 IP+username 维度，确保先命中 IP 纯维度。
	userLoginRateLimiter = NewRateLimiter(1000, time.Minute)
	router := newLoginTestRouter(http.StatusOK)

	ip := "203.0.113.30"
	for i := 0; i < 5; i++ {
		if w := doLogin(router, ip, fmt.Sprintf("user_%d", i)); w.Code != http.StatusOK {
			t.Fatalf("请求 %d 期望 200，实际 %d: %s", i, w.Code, w.Body.String())
		}
	}
	if w := doLogin(router, ip, "user_overflow"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("超过分钟阈值应返回 429，实际 %d: %s", w.Code, w.Body.String())
	}
}

// TestLoginAccountLockoutAfterFailures 验证同一账户连续失败达到阈值后被锁定，
// 即使换 IP 也会命中账户级锁定。
func TestLoginAccountLockoutAfterFailures(t *testing.T) {
	resetLoginGuards()
	defer resetLoginGuards()
	// IP 维度放高，隔离账户锁定行为。
	InitLoginRateLimiters(1000, 100000)
	userLoginRateLimiter = NewRateLimiter(1000, time.Minute)
	InitLoginLockout(3, 15, nil)
	router := newLoginTestRouter(http.StatusUnauthorized)

	// 连续 3 次凭据错误（每次换 IP，证明锁定是账户维度而非 IP 维度）。
	for i := 0; i < 3; i++ {
		ip := fmt.Sprintf("198.51.100.%d", 10+i)
		if w := doLogin(router, ip, "victim"); w.Code != http.StatusUnauthorized {
			t.Fatalf("失败请求 %d 期望 401，实际 %d", i, w.Code)
		}
	}

	// 第 4 次应被账户锁定拦截为 429。
	if w := doLogin(router, "198.51.100.99", "victim"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("账户锁定后应返回 429，实际 %d: %s", w.Code, w.Body.String())
	}

	// 其它账户不受影响。
	if w := doLogin(router, "198.51.100.99", "other"); w.Code != http.StatusUnauthorized {
		t.Fatalf("其它账户不应被锁定，实际 %d", w.Code)
	}
}

// TestLoginSuccessResetsFailureCount 验证登录成功清零失败计数，避免误锁。
func TestLoginSuccessResetsFailureCount(t *testing.T) {
	resetLoginGuards()
	defer resetLoginGuards()
	InitLoginRateLimiters(1000, 100000)
	userLoginRateLimiter = NewRateLimiter(1000, time.Minute)
	InitLoginLockout(3, 15, nil)

	failRouter := newLoginTestRouter(http.StatusUnauthorized)
	okRouter := newLoginTestRouter(http.StatusOK)

	// 2 次失败（未达阈值）。
	for i := 0; i < 2; i++ {
		doLogin(failRouter, "203.0.113.40", "alice")
	}
	// 一次成功清零。
	if w := doLogin(okRouter, "203.0.113.40", "alice"); w.Code != http.StatusOK {
		t.Fatalf("成功登录期望 200，实际 %d", w.Code)
	}
	// 再 2 次失败仍不应触发锁定（计数已清零）。
	for i := 0; i < 2; i++ {
		if w := doLogin(failRouter, "203.0.113.40", "alice"); w.Code != http.StatusUnauthorized {
			t.Fatalf("清零后失败请求 %d 期望 401，实际 %d", i, w.Code)
		}
	}
}
