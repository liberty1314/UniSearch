package plugin

import (
	"net/http"
	"net/url"
	"testing"
	"time"

	"unisearch/config"
)

func TestNewPooledHTTPClientUsesConfiguredHTTPProxy(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		UseProxy: true,
		ProxyURL: "http://127.0.0.1:18080",
	}
	SyncConfiguredProxyFromAppConfig()
	t.Cleanup(func() {
		config.AppConfig = oldConfig
		SyncConfiguredProxyFromAppConfig()
	})

	client := NewPooledHTTPClient(HTTPClientOptions{Timeout: time.Second})
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("期望 Transport 为 *http.Transport，实际为 %T", client.Transport)
	}
	if transport.Proxy == nil {
		t.Fatal("期望插件池化客户端继承 HTTP 代理配置")
	}

	req := &http.Request{URL: mustParseURLForTest(t, "https://example.com")}
	proxyURL, err := transport.Proxy(req)
	if err != nil {
		t.Fatalf("读取代理配置失败：%v", err)
	}
	if proxyURL.String() != "http://127.0.0.1:18080" {
		t.Fatalf("期望代理地址为 http://127.0.0.1:18080，实际为 %s", proxyURL.String())
	}
}

func TestNewPooledHTTPClientUsesProxyConfiguredAfterCreation(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = nil
	t.Cleanup(func() {
		config.AppConfig = oldConfig
		SyncConfiguredProxyFromAppConfig()
	})

	client := NewPooledHTTPClient(HTTPClientOptions{Timeout: time.Second})
	config.AppConfig = &config.Config{
		UseProxy: true,
		ProxyURL: "http://127.0.0.1:18081",
	}
	SyncConfiguredProxyFromAppConfig()

	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("期望 Transport 为 *http.Transport，实际为 %T", client.Transport)
	}
	if transport.Proxy == nil {
		t.Fatal("期望插件客户端在启动配置加载后仍能读取代理")
	}

	req := &http.Request{URL: mustParseURLForTest(t, "https://example.com")}
	proxyURL, err := transport.Proxy(req)
	if err != nil {
		t.Fatalf("读取延迟加载的代理配置失败：%v", err)
	}
	if proxyURL.String() != "http://127.0.0.1:18081" {
		t.Fatalf("期望代理地址为 http://127.0.0.1:18081，实际为 %s", proxyURL.String())
	}
}

func mustParseURLForTest(t *testing.T, value string) *url.URL {
	t.Helper()
	parsed, err := url.Parse(value)
	if err != nil {
		t.Fatalf("解析测试 URL 失败：%v", err)
	}
	return parsed
}
