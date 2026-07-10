package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"error_code":"SCAN_TRANSFER_INVALID_REFRESH_KEY"`)) {
		t.Fatalf("期望响应包含稳定 refresh_key 错误码，实际为 %s", recorder.Body.String())
	}
	if bytes.Contains(recorder.Body.Bytes(), []byte("SeedHub refresh_key")) {
		t.Fatalf("响应不应泄露内部错误细节，实际为 %s", recorder.Body.String())
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

func TestRefreshScanTransferHandlerReturnsGatewayTimeoutWhenServerDeadlineExpires(t *testing.T) {
	gin.SetMode(gin.TestMode)

	releaseFetch := make(chan struct{})
	defer close(releaseFetch)
	seedHubPlugin := sidhub.NewSidHubPlugin()
	seedHubPlugin.SetFetcherForTest(func(_ string) ([]byte, error) {
		<-releaseFetch
		return nil, nil
	})

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(seedHubPlugin)
	SetSearchService(service.NewSearchService(pm, nil, nil))

	router := gin.New()
	router.POST("/api/resources/scan-transfer/refresh", refreshScanTransferHandler(5*time.Millisecond))

	body := bytes.NewBufferString(`{"link_url":"https://www.seedhub.cc/link_start/?redirect_to=quark_scan","refresh_key":"seedhub:4259:quark:1"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/resources/scan-transfer/refresh", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusGatewayTimeout {
		t.Fatalf("期望服务端刷新超时返回 504，实际为 %d，响应为 %s", recorder.Code, recorder.Body.String())
	}
	if !bytes.Contains(recorder.Body.Bytes(), []byte(`"error_code":"SCAN_TRANSFER_REFRESH_TIMEOUT"`)) {
		t.Fatalf("期望响应包含稳定超时错误码，实际为 %s", recorder.Body.String())
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
	var response struct {
		Message   string `json:"message"`
		ErrorCode string `json:"error_code"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("解析错误响应失败：%v", err)
	}
	if response.ErrorCode != "SCAN_TRANSFER_PAYLOAD_UNAVAILABLE" {
		t.Fatalf("期望响应包含稳定载荷不可用错误码，实际为 %s", recorder.Body.String())
	}
	if response.Message != "当前资源暂时无法刷新扫码载荷" {
		t.Fatalf("期望响应使用稳定用户提示，实际为 %s", recorder.Body.String())
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
