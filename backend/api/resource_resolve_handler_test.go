package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"unisearch/config"
	"unisearch/plugin"
	"unisearch/plugin/sidhub"
	"unisearch/service"
)

const resourceResolveTestSecret = "resource-resolve-handler-test-secret-32-bytes"

func setupResourceResolveTest(t *testing.T, seedHubPlugin *sidhub.SidHubAsyncPlugin, timeout time.Duration) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{ResourcePublicIDSecret: resourceResolveTestSecret}
	t.Cleanup(func() { config.AppConfig = oldConfig })
	resetResourceResolveStateForTest()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/resolve", func(c *gin.Context) {
		c.Set("user_id", 42)
		c.Next()
	}, resourceResolveHandler(timeout))
	return router
}

func issueResourceResolveTestToken(t *testing.T, resourceID string, linkID string, sourceURL string) string {
	t.Helper()
	token, err := service.IssueResourceResolveToken(resourceResolveTestSecret, service.ResourceResolveTokenClaims{
		ResourceID: resourceID,
		LinkID:     linkID,
		PluginID:   "sidhub",
		Provider:   "quark",
		SourceURL:  sourceURL,
		MovieID:    "4259",
		EntryIndex: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func performResourceResolveRequest(router http.Handler, resourceID string, linkID string, token string, ctx context.Context) *httptest.ResponseRecorder {
	body, _ := json.Marshal(map[string]string{
		"resource_id":   resourceID,
		"link_id":       linkID,
		"resolve_token": token,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/resources/resolve", bytes.NewReader(body))
	if ctx != nil {
		req = req.WithContext(ctx)
	}
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

func TestResourceResolveHandlerReturnsResolvedLinkWithoutSourceURL(t *testing.T) {
	p := sidhub.NewSidHubPlugin()
	sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_1"
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		return []byte(`<a href="https://pan.quark.cn/s/resolved123">打开资源</a>`), nil
	})
	router := setupResourceResolveTest(t, p, 12*time.Second)
	token := issueResourceResolveTestToken(t, "r_v1_resource", "lnk_v1_link", sourceURL)

	recorder := performResourceResolveRequest(router, "r_v1_resource", "lnk_v1_link", token, nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if bytes.Contains(recorder.Body.Bytes(), []byte("seedhub.cc")) || bytes.Contains(recorder.Body.Bytes(), []byte("source_page_url")) || bytes.Contains(recorder.Body.Bytes(), []byte("refresh_key")) {
		t.Fatalf("resolver response leaked source data: %s", recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"url":"https://pan.quark.cn/s/resolved123"`)) {
		t.Fatalf("resolver response missing real target: %s", recorder.Body.String())
	}
}

func TestResourceResolveHandlerLimitsFourthRequestInFiveSecondWindow(t *testing.T) {
	p := sidhub.NewSidHubPlugin()
	sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=rate"
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		return []byte(`<a href="https://pan.quark.cn/s/rate">打开资源</a>`), nil
	})
	router := setupResourceResolveTest(t, p, 12*time.Second)
	token := issueResourceResolveTestToken(t, "r_v1_rate", "lnk_v1_rate", sourceURL)

	for index := 1; index <= 4; index++ {
		recorder := performResourceResolveRequest(router, "r_v1_rate", "lnk_v1_rate", token, nil)
		if index <= 3 && recorder.Code != http.StatusOK {
			t.Fatalf("request %d should pass, got %d: %s", index, recorder.Code, recorder.Body.String())
		}
		if index == 4 {
			if recorder.Code != http.StatusTooManyRequests || recorder.Header().Get("Retry-After") == "" {
				t.Fatalf("fourth request must be rate limited: %d %s", recorder.Code, recorder.Body.String())
			}
		}
	}
}

func TestResourceResolveHandlerLimitsThirdConcurrentRequest(t *testing.T) {
	p := sidhub.NewSidHubPlugin()
	started := make(chan struct{}, 2)
	release := make(chan struct{})
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		started <- struct{}{}
		<-release
		return []byte(`<a href="https://pan.quark.cn/s/concurrent">打开资源</a>`), nil
	})
	router := setupResourceResolveTest(t, p, 12*time.Second)

	var wg sync.WaitGroup
	for index := 1; index <= 2; index++ {
		index := index
		wg.Add(1)
		go func() {
			defer wg.Done()
			resourceID := fmt.Sprintf("r_v1_%d", index)
			linkID := fmt.Sprintf("lnk_v1_%d", index)
			sourceURL := fmt.Sprintf("https://www.seedhub.cc/link_start/?redirect_to=%d", index)
			token := issueResourceResolveTestToken(t, resourceID, linkID, sourceURL)
			performResourceResolveRequest(router, resourceID, linkID, token, nil)
		}()
	}
	<-started
	<-started

	thirdSource := "https://www.seedhub.cc/link_start/?redirect_to=3"
	thirdToken := issueResourceResolveTestToken(t, "r_v1_3", "lnk_v1_3", thirdSource)
	third := performResourceResolveRequest(router, "r_v1_3", "lnk_v1_3", thirdToken, nil)
	if third.Code != http.StatusTooManyRequests || !bytes.Contains(third.Body.Bytes(), []byte("RESOURCE_RESOLVE_CONCURRENCY_LIMITED")) {
		t.Fatalf("third concurrent request must be rejected: %d %s", third.Code, third.Body.String())
	}
	close(release)
	wg.Wait()
}

func TestResourceResolveHandlerSingleflightsSameLinkID(t *testing.T) {
	p := sidhub.NewSidHubPlugin()
	var fetchCount atomic.Int32
	started := make(chan struct{}, 1)
	release := make(chan struct{})
	p.SetFetcherForTest(func(_ string) ([]byte, error) {
		fetchCount.Add(1)
		started <- struct{}{}
		<-release
		return []byte(`<a href="https://pan.quark.cn/s/singleflight">打开资源</a>`), nil
	})
	router := setupResourceResolveTest(t, p, 12*time.Second)
	sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=singleflight"
	token := issueResourceResolveTestToken(t, "r_v1_sf", "lnk_v1_sf", sourceURL)

	responses := make(chan *httptest.ResponseRecorder, 2)
	go func() { responses <- performResourceResolveRequest(router, "r_v1_sf", "lnk_v1_sf", token, nil) }()
	<-started
	go func() { responses <- performResourceResolveRequest(router, "r_v1_sf", "lnk_v1_sf", token, nil) }()
	time.Sleep(10 * time.Millisecond)
	close(release)
	for index := 0; index < 2; index++ {
		if recorder := <-responses; recorder.Code != http.StatusOK {
			t.Fatalf("singleflight request failed: %d %s", recorder.Code, recorder.Body.String())
		}
	}
	if fetchCount.Load() != 1 {
		t.Fatalf("same link ID must fetch once, got %d", fetchCount.Load())
	}
}

func TestResourceResolveHandlerMapsExpiredCanceledTimeoutAndTypedErrors(t *testing.T) {
	t.Run("expired token", func(t *testing.T) {
		p := sidhub.NewSidHubPlugin()
		router := setupResourceResolveTest(t, p, 12*time.Second)
		oldVerifier := verifyResourceResolveToken
		verifyResourceResolveToken = func(_ string, _ string, _ string, _ string) (service.ResourceResolveTokenClaims, error) {
			return service.ResourceResolveTokenClaims{}, service.ErrResolveTokenExpired
		}
		t.Cleanup(func() { verifyResourceResolveToken = oldVerifier })
		recorder := performResourceResolveRequest(router, "r_v1_expired", "lnk_v1_expired", "rrt_v1_expired", nil)
		if recorder.Code != http.StatusGone || !bytes.Contains(recorder.Body.Bytes(), []byte("RESOURCE_RESOLVE_TOKEN_EXPIRED")) {
			t.Fatalf("unexpected expired response: %d %s", recorder.Code, recorder.Body.String())
		}
	})

	t.Run("request canceled", func(t *testing.T) {
		p := sidhub.NewSidHubPlugin()
		sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=canceled"
		p.SetFetcherForTest(func(_ string) ([]byte, error) { return nil, errors.New("must not matter") })
		router := setupResourceResolveTest(t, p, 12*time.Second)
		token := issueResourceResolveTestToken(t, "r_v1_cancel", "lnk_v1_cancel", sourceURL)
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		recorder := performResourceResolveRequest(router, "r_v1_cancel", "lnk_v1_cancel", token, ctx)
		if recorder.Code != 499 {
			t.Fatalf("unexpected canceled response: %d %s", recorder.Code, recorder.Body.String())
		}
	})

	t.Run("timeout", func(t *testing.T) {
		p := sidhub.NewSidHubPlugin()
		release := make(chan struct{})
		defer close(release)
		sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=timeout"
		p.SetFetcherForTest(func(_ string) ([]byte, error) { <-release; return nil, nil })
		router := setupResourceResolveTest(t, p, 5*time.Millisecond)
		token := issueResourceResolveTestToken(t, "r_v1_timeout", "lnk_v1_timeout", sourceURL)
		recorder := performResourceResolveRequest(router, "r_v1_timeout", "lnk_v1_timeout", token, nil)
		if recorder.Code != http.StatusGatewayTimeout || !bytes.Contains(recorder.Body.Bytes(), []byte("RESOURCE_RESOLVE_TIMEOUT")) {
			t.Fatalf("unexpected timeout response: %d %s", recorder.Code, recorder.Body.String())
		}
	})

	tests := []struct {
		name       string
		body       []byte
		fetchErr   error
		wantStatus int
		wantCode   string
	}{
		{name: "permanent invalid", body: []byte("分享链接已失效"), wantStatus: http.StatusGone, wantCode: "RESOURCE_INVALID"},
		{name: "parse failure", body: []byte("页面结构变化"), wantStatus: http.StatusBadGateway, wantCode: "RESOURCE_UPSTREAM_PARSE_FAILED"},
		{name: "unavailable", fetchErr: errors.New("network down"), wantStatus: http.StatusServiceUnavailable, wantCode: "RESOURCE_RESOLVER_UNAVAILABLE"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := sidhub.NewSidHubPlugin()
			p.SetFetcherForTest(func(_ string) ([]byte, error) { return tc.body, tc.fetchErr })
			router := setupResourceResolveTest(t, p, 12*time.Second)
			sourceURL := "https://www.seedhub.cc/link_start/?redirect_to=typed"
			token := issueResourceResolveTestToken(t, "r_v1_typed", "lnk_v1_typed", sourceURL)
			recorder := performResourceResolveRequest(router, "r_v1_typed", "lnk_v1_typed", token, nil)
			if recorder.Code != tc.wantStatus || !bytes.Contains(recorder.Body.Bytes(), []byte(tc.wantCode)) {
				t.Fatalf("unexpected typed response: %d %s", recorder.Code, recorder.Body.String())
			}
		})
	}
}
