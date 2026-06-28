package plugin

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"sort"
	"time"

	"github.com/PuerkitoBio/goquery"
	"golang.org/x/net/proxy"
	"unisearch/config"
	"unisearch/util/logger"
)

type HTTPClientOptions struct {
	Timeout               time.Duration
	MaxIdleConns          int
	MaxIdleConnsPerHost   int
	MaxConnsPerHost       int
	IdleConnTimeout       time.Duration
	TLSHandshakeTimeout   time.Duration
	ExpectContinueTimeout time.Duration
}

func NewPooledHTTPClient(options HTTPClientOptions) *http.Client {
	transport := &http.Transport{
		MaxIdleConns:          options.MaxIdleConns,
		MaxIdleConnsPerHost:   options.MaxIdleConnsPerHost,
		MaxConnsPerHost:       options.MaxConnsPerHost,
		IdleConnTimeout:       options.IdleConnTimeout,
		TLSHandshakeTimeout:   options.TLSHandshakeTimeout,
		ExpectContinueTimeout: options.ExpectContinueTimeout,
		ForceAttemptHTTP2:     true,
	}
	applyConfiguredProxy(transport)

	return &http.Client{
		Transport: transport,
		Timeout:   options.Timeout,
	}
}

func applyConfiguredProxy(transport *http.Transport) {
	if transport == nil || config.AppConfig == nil || !config.AppConfig.UseProxy {
		return
	}

	proxyURL, err := url.Parse(config.AppConfig.ProxyURL)
	if err != nil {
		logger.Warn("plugin_proxy_config_invalid", logger.Any("error", err))
		return
	}

	if proxyURL.Scheme == "socks5" {
		dialer, err := proxy.FromURL(proxyURL, proxy.Direct)
		if err != nil {
			logger.Warn("plugin_proxy_socks5_invalid", logger.Any("error", err))
			return
		}
		transport.DialContext = func(_ context.Context, network string, addr string) (net.Conn, error) {
			return dialer.Dial(network, addr)
		}
		return
	}

	transport.Proxy = http.ProxyURL(proxyURL)
}

func ApplyBrowserHeaders(req *http.Request, referer string) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Connection", "keep-alive")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}
}

func DoRequestWithRetry(req *http.Request, client *http.Client, maxRetries int, baseDelay time.Duration) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err := client.Do(req.Clone(req.Context()))
		if err == nil && resp.StatusCode == http.StatusOK {
			return resp, nil
		}
		if resp != nil {
			resp.Body.Close()
		}

		lastErr = err
		if attempt < maxRetries-1 {
			time.Sleep(baseDelay * time.Duration(1<<attempt))
		}
	}

	return nil, fmt.Errorf("重试 %d 次后失败: %w", maxRetries, lastErr)
}

func ParseHTMLDocument(resp *http.Response) (*goquery.Document, error) {
	return goquery.NewDocumentFromReader(resp.Body)
}

func LogEvent(pluginName string, event string, fields map[string]interface{}) {
	loggerFields := make([]logger.Field, 0, len(fields)+2)
	loggerFields = append(loggerFields, logger.String("plugin", pluginName))
	loggerFields = append(loggerFields, logger.String("plugin_event", event))

	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	for _, key := range keys {
		loggerFields = append(loggerFields, logger.Any(key, fields[key]))
	}

	logger.Info("plugin", loggerFields...)
}
