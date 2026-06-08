package api52

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestAPI52PluginContract(t *testing.T) {
	p := NewAPI52Plugin()
	testutil.AssertPluginContract(t, p)
}

func TestAPI52PluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewAPI52Plugin())

	if manifest.ID != "search.52api" {
		t.Fatalf("期望插件 ID 为 search.52api，实际为 %q", manifest.ID)
	}
	if manifest.Name != "52API" {
		t.Fatalf("期望插件展示名为 52API，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != defaultPriority {
		t.Fatalf("期望插件优先级为 %d，实际为 %d", defaultPriority, manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestAPI52RequiresAPIKey(t *testing.T) {
	t.Setenv(apiKeyEnvName, "")

	_, err := NewAPI52Plugin().doSearch(nil, "考研", nil)
	if err == nil || !strings.Contains(err.Error(), apiKeyEnvName) {
		t.Fatalf("期望缺少 key 时提示 %s，实际为 %v", apiKeyEnvName, err)
	}
}

func TestAPI52ParseSuccessResponse(t *testing.T) {
	body := []byte(`{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "title": "考研资料合集",
      "url": "https://pan.quark.cn/s/abc123",
      "type": "quark",
      "password": "",
      "desc": "英语与政治资料",
      "size": "3GB",
      "update_time": "2026-06-08 21:00:00"
    },
    {
      "name": "无效链接",
      "url": "https://example.com/resource"
    }
  ]
}`)

	results, err := NewAPI52Plugin().parseResponse(body)
	if err != nil {
		t.Fatalf("解析 52API 响应失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望只保留 1 条有效网盘结果，实际为 %d", len(results))
	}
	result := results[0]
	if result.Title != "考研资料合集" {
		t.Fatalf("期望标题为考研资料合集，实际为 %q", result.Title)
	}
	if result.SourcePluginID != pluginName || result.SourceName != "52API" || result.TargetType != "share" {
		t.Fatalf("期望来源协议字段完整，实际为 source=%q name=%q target=%q", result.SourcePluginID, result.SourceName, result.TargetType)
	}
	if len(result.Links) != 1 || result.Links[0].Type != "quark" {
		t.Fatalf("期望解析夸克链接，实际为 %#v", result.Links)
	}
	if !strings.Contains(result.Content, "英语与政治资料") || !strings.Contains(result.Content, "3GB") {
		t.Fatalf("期望内容包含描述和大小，实际为 %q", result.Content)
	}
	if result.Datetime.IsZero() || result.Datetime.Year() != 2026 {
		t.Fatalf("期望更新时间被解析，实际为 %v", result.Datetime)
	}
}

func TestAPI52ParseNestedListResponse(t *testing.T) {
	body := []byte(`{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "name": "百度资料",
        "link": "https://pan.baidu.com/s/xyz?pwd=8888"
      }
    ]
  }
}`)

	results, err := NewAPI52Plugin().parseResponse(body)
	if err != nil {
		t.Fatalf("解析嵌套列表响应失败: %v", err)
	}
	if len(results) != 1 || results[0].Links[0].Type != "baidu" || results[0].Links[0].Password != "8888" {
		t.Fatalf("期望解析嵌套百度链接和提取码，实际为 %#v", results)
	}
}

func TestAPI52ClassifiesHTTPError(t *testing.T) {
	p := NewAPI52Plugin()
	p.apiKeyProvider = func() string {
		return "test-key"
	}

	cases := []struct {
		name       string
		statusCode int
		want       string
	}{
		{name: "认证失败", statusCode: http.StatusForbidden, want: "PLUGIN_52API_KEY"},
		{name: "上游错误", statusCode: http.StatusBadGateway, want: "上游服务异常"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.statusCode)
				_, _ = w.Write([]byte(`{"msg":"error"}`))
			}))
			defer server.Close()

			_, err := p.doSearch(server.Client(), "考研", map[string]interface{}{"api52_api_url": server.URL})
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("期望错误包含 %q，实际为 %v", tc.want, err)
			}
		})
	}
}

func TestAPI52DoSearchUsesKeyKeywordAndCache(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if r.URL.Query().Get("apikey") != "test-key" {
			t.Fatalf("期望 apikey=test-key，实际查询为 %s", r.URL.RawQuery)
		}
		if r.URL.Query().Get("keyword") != "考研" {
			t.Fatalf("期望 keyword=考研，实际查询为 %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":200,"data":[{"title":"考研合集","url":"https://pan.quark.cn/s/abc123"}]}`))
	}))
	defer server.Close()

	api52ResponseCache.Clear()
	p := NewAPI52Plugin()
	p.apiKeyProvider = func() string {
		return "test-key"
	}

	ext := map[string]interface{}{"api52_api_url": server.URL}
	results, err := p.doSearch(server.Client(), " 考研 ", ext)
	if err != nil {
		t.Fatalf("首次搜索失败: %v", err)
	}
	cachedResults, err := p.doSearch(server.Client(), "考研", ext)
	if err != nil {
		t.Fatalf("缓存搜索失败: %v", err)
	}
	if len(results) != 1 || len(cachedResults) != 1 || requestCount != 1 {
		t.Fatalf("期望缓存命中且只请求一次，结果=%#v 缓存=%#v 请求=%d", results, cachedResults, requestCount)
	}
}
