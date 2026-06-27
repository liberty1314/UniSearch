package api

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"unisearch/plugin"
	"unisearch/plugin/sidhub"
	"unisearch/service"
)

func TestRefreshScanTransferHandlerReturnsLatestPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	seedHubPlugin := sidhub.NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	seedHubPlugin.SetCurrentKeyword("")

	seedHubPluginFetcherHTML := `<html><body><p>请使用手机扫码转存</p><img src="data:image/png;base64,abc123" /><a href="quark://scan-transfer/123">打开夸克 App</a><code>转存口令：ABCD1234</code></body></html>`
	seedHubPlugin.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			return nil, http.ErrMissingFile
		}
		return []byte(seedHubPluginFetcherHTML), nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", RefreshScanTransferHandler)

	body := bytes.NewBufferString(`{"resource_id":"seedhub-scan","link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"seedhub:4259:quark:1"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("期望返回 200，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"access_mode":"scan_transfer"`)) {
		t.Fatalf("期望响应包含扫码访问模式，实际为 %s", recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"refresh_key":"seedhub:4259:quark:1"`)) {
		t.Fatalf("期望响应包含稳定 refresh_key，实际为 %s", recorder.Body.String())
	}
}

func TestRefreshScanTransferHandlerRejectsInvalidRefreshKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	seedHubPlugin := sidhub.NewSidHubPlugin()
	seedHubPlugin.SetFetcherForTest(func(_ string) ([]byte, error) {
		t.Fatal("refresh_key 无效时不应发起页面抓取")
		return nil, nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", RefreshScanTransferHandler)

	body := bytes.NewBufferString(`{"link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"broken-key"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("期望无效 refresh_key 返回 400，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte("无效的 SeedHub refresh_key")) {
		t.Fatalf("期望响应提示 refresh_key 无效，实际为 %s", recorder.Body.String())
	}
}

func TestRefreshScanTransferHandlerReturns499WhenRequestCanceled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	seedHubPlugin := sidhub.NewSidHubPlugin()
	seedHubPlugin.SetFetcherForTest(func(_ string) ([]byte, error) {
		t.Fatal("请求已取消时不应发起页面抓取")
		return nil, nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", RefreshScanTransferHandler)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	body := bytes.NewBufferString(`{"link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"seedhub:4259:quark:1"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body).WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != 499 {
		t.Fatalf("期望请求取消返回 499，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}
}

func TestRefreshScanTransferHandlerReportsChangedPageStructure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	seedHubPlugin := sidhub.NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	seedHubPlugin.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			return nil, http.ErrMissingFile
		}
		return []byte(`<html><body><p>页面结构已变化，暂无二维码或口令</p></body></html>`), nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", RefreshScanTransferHandler)

	body := bytes.NewBufferString(`{"link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"seedhub:4259:quark:1"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("期望页面结构变化返回 400，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte("当前资源未返回可刷新的扫码转存载荷")) {
		t.Fatalf("期望响应提示扫码载荷不可刷新，实际为 %s", recorder.Body.String())
	}
}

func TestRefreshScanTransferHandlerRepeatedRefreshKeepsCurrentPayloadIsolated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	seedHubPlugin := sidhub.NewSidHubPlugin()
	linkStartURL := "https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
	callCount := 0
	seedHubPlugin.SetFetcherForTest(func(targetURL string) ([]byte, error) {
		if targetURL != linkStartURL {
			return nil, http.ErrMissingFile
		}
		callCount++
		if callCount == 1 {
			return []byte(`<html><body><p>请使用手机扫码转存</p><img src="data:image/png;base64,first" /><code>转存口令：FIRST</code></body></html>`), nil
		}
		return []byte(`<html><body><p>请使用手机扫码转存</p><img src="data:image/png;base64,second" /><code>转存口令：SECOND</code></body></html>`), nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", RefreshScanTransferHandler)

	serveRefresh := func(refreshKey string) *httptest.ResponseRecorder {
		body := bytes.NewBufferString(`{"link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"` + refreshKey + `"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)
		return recorder
	}

	firstRecorder := serveRefresh("seedhub:4259:quark:1")
	secondRecorder := serveRefresh("seedhub:4259:quark:2")

	if firstRecorder.Code != http.StatusOK || secondRecorder.Code != http.StatusOK {
		t.Fatalf("期望两次刷新都成功，首次 %d: %s，第二次 %d: %s", firstRecorder.Code, firstRecorder.Body.String(), secondRecorder.Code, secondRecorder.Body.String())
	}
	if !bytes.Contains(firstRecorder.Body.Bytes(), []byte("data:image/png;base64,first")) {
		t.Fatalf("期望首次响应保留首次二维码，实际为 %s", firstRecorder.Body.String())
	}
	if bytes.Contains(firstRecorder.Body.Bytes(), []byte("data:image/png;base64,second")) {
		t.Fatalf("首次响应不应被第二次刷新污染，实际为 %s", firstRecorder.Body.String())
	}
	if !bytes.Contains(secondRecorder.Body.Bytes(), []byte("data:image/png;base64,second")) {
		t.Fatalf("期望第二次响应返回最新二维码，实际为 %s", secondRecorder.Body.String())
	}
}
