package hunhepan

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestHunhepanUsesStablePrimaryAPI(t *testing.T) {
	if len(searchAPISources) != 1 || searchAPISources[0] != HunhepanAPI {
		t.Fatalf("期望只使用当前稳定的混合盘主 API，实际为 %#v", searchAPISources)
	}
}

func TestSearchAPISerializesPaginationRequests(t *testing.T) {
	var mu sync.Mutex
	active, maxActive := 0, 0
	var requestUserAgent string
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		requestUserAgent = req.Header.Get("User-Agent")
		mu.Lock()
		active++
		if active > maxActive {
			maxActive = active
		}
		mu.Unlock()

		// 保持请求一小段时间，确保并发分页请求会被测试捕获。
		time.Sleep(5 * time.Millisecond)
		mu.Lock()
		active--
		mu.Unlock()
		body := `{"code":200,"msg":"ok","data":{"list":[]}}`
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(body)),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	})}

	if _, err := NewHunhepanAsyncPlugin().searchAPI(client, "https://example.test/search", "test"); err != nil {
		t.Fatalf("分页请求不应失败: %v", err)
	}
	if maxActive != 1 {
		t.Fatalf("期望分页请求串行执行，最大并发数为 1，实际为 %d", maxActive)
	}
	if !strings.Contains(requestUserAgent, "Chrome/") {
		t.Fatalf("期望请求使用现代浏览器 User-Agent，实际为 %q", requestUserAgent)
	}
}

func TestDoSearchKeepsResultsWhenLaterPageFails(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		body := `{"code":200,"msg":"ok","data":{"list":[{"disk_name":"test","disk_id":"id-1","disk_type":"BDY","link":"https://pan.baidu.com/s/abc?pwd=1234"}]}}`
		if bytes.Contains(readRequestBody(req), []byte(`"page":2`)) {
			body = `Intercept illegal requests`
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header), Request: req}, nil
	})}

	p := NewHunhepanAsyncPlugin()
	items, err := p.doSearch(client, "test", nil)
	if err != nil {
		t.Fatalf("前页已有结果时不应把分页失败升级为插件失败: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("期望保留前页已获取的结果")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

func readRequestBody(req *http.Request) []byte {
	if req == nil || req.Body == nil {
		return nil
	}
	body, _ := io.ReadAll(req.Body)
	req.Body = io.NopCloser(bytes.NewReader(body))
	return body
}
