package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newSignupRateLimitTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/register", registerRateLimitMiddleware(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	return router
}

func doRegister(router *gin.Engine, ip, username string) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"username":%q,"password":"secret123"}`, username)
	req := httptest.NewRequest(http.MethodPost, "/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = ip + ":12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// TestSignupIPRateLimitBlocksDifferentUsernames 验证 W1 已封堵：
// 同一 IP 用不同用户名注册，超过分钟阈值后仍被 429。
func TestSignupIPRateLimitBlocksDifferentUsernames(t *testing.T) {
	InitSignupRateLimiters(5, 20)
	router := newSignupRateLimitTestRouter()

	ip := "203.0.113.10"
	for i := 0; i < 5; i++ {
		w := doRegister(router, ip, fmt.Sprintf("user_%d", i))
		if w.Code != http.StatusOK {
			t.Fatalf("请求 %d 期望 200，实际 %d: %s", i, w.Code, w.Body.String())
		}
	}

	// 第 6 次（仍是新用户名）应被 IP 维度分钟窗口拦截。
	w := doRegister(router, ip, "user_overflow")
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("超过分钟阈值应返回 429，实际 %d: %s", w.Code, w.Body.String())
	}
}

// TestSignupIPRateLimitIsolatesDistinctIPs 验证不同 IP 互不影响。
func TestSignupIPRateLimitIsolatesDistinctIPs(t *testing.T) {
	InitSignupRateLimiters(5, 20)
	router := newSignupRateLimitTestRouter()

	for i := 0; i < 5; i++ {
		if w := doRegister(router, "198.51.100.1", fmt.Sprintf("a_%d", i)); w.Code != http.StatusOK {
			t.Fatalf("IP1 请求 %d 期望 200，实际 %d", i, w.Code)
		}
	}
	// 另一个 IP 不应受第一个 IP 计数影响。
	if w := doRegister(router, "198.51.100.2", "fresh"); w.Code != http.StatusOK {
		t.Fatalf("不同 IP 应不受影响，实际 %d: %s", w.Code, w.Body.String())
	}
}

// TestSignupIPHourWindowBlocks 验证小时窗口累计超限被拦截。
func TestSignupIPHourWindowBlocks(t *testing.T) {
	// 分钟阈值设高避免先命中；小时阈值设低。
	InitSignupRateLimiters(1000, 8)
	router := newSignupRateLimitTestRouter()

	ip := "203.0.113.20"
	for i := 0; i < 8; i++ {
		if w := doRegister(router, ip, fmt.Sprintf("h_%d", i)); w.Code != http.StatusOK {
			t.Fatalf("请求 %d 期望 200，实际 %d", i, w.Code)
		}
	}
	if w := doRegister(router, ip, "h_overflow"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("超过小时阈值应返回 429，实际 %d", w.Code)
	}

	// 恢复默认，避免影响其它测试。
	InitSignupRateLimiters(5, 20)
}
