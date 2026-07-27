package api

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"unisearch/config"
)

func captureStandardLog(t *testing.T, run func()) string {
	t.Helper()
	var output bytes.Buffer
	previous := log.Writer()
	log.SetOutput(&output)
	t.Cleanup(func() { log.SetOutput(previous) })
	run()
	return output.String()
}

func TestLoggerMiddlewareRedactsSensitiveRequestData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(LoggerMiddleware())
	router.GET("/api/search", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	output := captureStandardLog(t, func() {
		req := httptest.NewRequest(http.MethodGet, "/api/search?kw=%E7%A7%98%E5%AF%86%E8%AF%8D", nil)
		req.Header.Set("Authorization", "Bearer secret-token")
		req.Header.Set("Cookie", "refresh_token=secret-cookie")
		resp := httptest.NewRecorder()
		router.ServeHTTP(resp, req)
	})

	for _, required := range []string{"method=GET", "path=/api/search", "status=200"} {
		if !strings.Contains(output, required) {
			t.Fatalf("请求日志缺少 %q: %s", required, output)
		}
	}
	for _, forbidden := range []string{"秘密词", "secret-token", "secret-cookie", "?kw="} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("请求日志暴露敏感值 %q: %s", forbidden, output)
		}
	}
}

func TestSecurityHeadersUseEnforcedMinimalCSP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{AppEnv: "development"}
	t.Cleanup(func() { config.AppConfig = oldConfig })

	router := gin.New()
	router.Use(SecurityHeadersMiddleware())
	router.GET("/api/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	const expectedCSP = "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"
	if got := resp.Header().Get("Content-Security-Policy"); got != expectedCSP {
		t.Fatalf("API 强制 CSP 不符合预期: %q", got)
	}
	if got := resp.Header().Get("Content-Security-Policy-Report-Only"); got != "" {
		t.Fatalf("API 不得返回报告模式 CSP: %q", got)
	}
	if got := resp.Header().Get("Referrer-Policy"); got != "no-referrer" {
		t.Fatalf("Referrer-Policy 不符合预期: %q", got)
	}
	if got := resp.Header().Get("Permissions-Policy"); got != "camera=(), microphone=(), geolocation=()" {
		t.Fatalf("Permissions-Policy 不符合预期: %q", got)
	}
	if got := resp.Header().Get("Strict-Transport-Security"); got != "" {
		t.Fatalf("开发环境不得返回 HSTS: %q", got)
	}
}

func TestCORSMiddlewareAllowsWhitelistedOrigin(t *testing.T) {
	router := newCORSRouterForTest(t, []string{"https://app.example.com"})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("白名单 Origin 应被回显，实际为 %q", got)
	}
	if got := resp.Header().Get("Vary"); got != "Origin" {
		t.Fatalf("跨域响应应包含 Vary: Origin，实际为 %q", got)
	}
}

func TestCORSMiddlewareRejectsUnlistedOriginHeader(t *testing.T) {
	router := newCORSRouterForTest(t, []string{"https://app.example.com"})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("非白名单 Origin 不应返回允许头，实际为 %q", got)
	}
	if resp.Code != http.StatusOK {
		t.Fatalf("非跨域访问本身不应被中间件拦截，状态码 %d", resp.Code)
	}
}

func TestCORSMiddlewareKeepsRequestsWithoutOrigin(t *testing.T) {
	router := newCORSRouterForTest(t, []string{"https://app.example.com"})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("无 Origin 请求不应返回 CORS 允许头，实际为 %q", got)
	}
	if resp.Code != http.StatusOK {
		t.Fatalf("无 Origin 请求应正常通过，状态码 %d", resp.Code)
	}
}

func TestCORSMiddlewareHandlesPreflight(t *testing.T) {
	router := newCORSRouterForTest(t, []string{"https://app.example.com"})

	req := httptest.NewRequest(http.MethodOptions, "/ping", nil)
	req.Header.Set("Origin", "https://app.example.com")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusNoContent {
		t.Fatalf("OPTIONS 预检应返回 204，状态码 %d", resp.Code)
	}
	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("白名单预检应返回允许来源，实际为 %q", got)
	}
}

func TestBodySizeLimitMiddlewareAllowsSmallBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/limited", BodySizeLimitMiddleware(16), func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/limited", strings.NewReader(`{"ok":true}`))
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("小请求体应通过，状态码 %d", resp.Code)
	}
}

func TestBodySizeLimitMiddlewareRejectsLargeContentLength(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/limited", BodySizeLimitMiddleware(4), func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/limited", strings.NewReader(`{"too":"large"}`))
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("大请求体应返回 413，状态码 %d", resp.Code)
	}
}

func TestLoginRateLimitMiddlewareRejectsLargeChunkedBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/login", BodySizeLimitMiddleware(8), loginRateLimitMiddleware(), func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(`{"username":"neo","password":"very-large"}`))
	req.ContentLength = -1
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("隐藏 Content-Length 的大登录请求应返回 413，状态码 %d", resp.Code)
	}
}

func TestSearchHandlerRejectsLargeChunkedBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/search", BodySizeLimitMiddleware(8), SearchHandler)

	req := httptest.NewRequest(http.MethodPost, "/search", strings.NewReader(`{"kw":"仙逆","ext":{"payload":"too-large"}}`))
	req.ContentLength = -1
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("隐藏 Content-Length 的大搜索请求应返回 413，状态码 %d", resp.Code)
	}
}

func newCORSRouterForTest(t *testing.T, allowedOrigins []string) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	oldConfig := config.AppConfig
	t.Cleanup(func() {
		config.AppConfig = oldConfig
	})
	config.AppConfig = &config.Config{AllowedOrigins: allowedOrigins}

	router := gin.New()
	router.Use(CORSMiddleware())
	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})
	return router
}
