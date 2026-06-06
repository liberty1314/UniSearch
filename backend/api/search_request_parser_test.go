package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"unisearch/config"
)

func TestParseSearchRequestGetMinimal(t *testing.T) {
	setupSearchRequestParserTest(t)

	req, err := parseSearchRequest(newSearchRequestParserContext(http.MethodGet, "/api/search?kw=%E4%BB%99%E9%80%86", ""))
	if err != nil {
		t.Fatalf("期望解析成功，实际错误：%v", err)
	}

	if req.Keyword != "仙逆" {
		t.Fatalf("期望关键词为仙逆，实际为 %s", req.Keyword)
	}
	if !reflect.DeepEqual(req.Channels, []string{"default-a", "default-b"}) {
		t.Fatalf("期望使用默认频道，实际为 %#v", req.Channels)
	}
	if req.ResultType != "merged_by_type" {
		t.Fatalf("期望结果类型为 merged_by_type，实际为 %s", req.ResultType)
	}
	if req.SourceType != "all" {
		t.Fatalf("期望来源类型为 all，实际为 %s", req.SourceType)
	}
	if req.Ext == nil {
		t.Fatal("期望 ext 映射已初始化")
	}
}

func TestParseSearchRequestPostMinimal(t *testing.T) {
	setupSearchRequestParserTest(t)

	req, err := parseSearchRequest(newSearchRequestParserContext(http.MethodPost, "/api/search", `{"kw":"仙逆"}`))
	if err != nil {
		t.Fatalf("期望解析成功，实际错误：%v", err)
	}

	if req.Keyword != "仙逆" {
		t.Fatalf("期望关键词为仙逆，实际为 %s", req.Keyword)
	}
	if !reflect.DeepEqual(req.Channels, []string{"default-a", "default-b"}) {
		t.Fatalf("期望使用默认频道，实际为 %#v", req.Channels)
	}
	if req.ResultType != "merged_by_type" {
		t.Fatalf("期望结果类型为 merged_by_type，实际为 %s", req.ResultType)
	}
	if req.SourceType != "all" {
		t.Fatalf("期望来源类型为 all，实际为 %s", req.SourceType)
	}
}

func TestParseSearchRequestSourceTGIgnoresPlugins(t *testing.T) {
	setupSearchRequestParserTest(t)

	values := url.Values{
		"kw":      {"仙逆"},
		"src":     {"tg"},
		"plugins": {"pan666,panyq"},
	}
	req, err := parseSearchRequest(newSearchRequestParserContext(http.MethodGet, "/api/search?"+values.Encode(), ""))
	if err != nil {
		t.Fatalf("期望解析成功，实际错误：%v", err)
	}

	if req.SourceType != "tg" {
		t.Fatalf("期望来源类型为 tg，实际为 %s", req.SourceType)
	}
	if req.Plugins != nil {
		t.Fatalf("期望 tg 来源忽略插件参数，实际为 %#v", req.Plugins)
	}
	if !reflect.DeepEqual(req.Channels, []string{"default-a", "default-b"}) {
		t.Fatalf("期望 tg 来源使用默认频道，实际为 %#v", req.Channels)
	}
}

func TestParseSearchRequestSourcePluginIgnoresChannels(t *testing.T) {
	setupSearchRequestParserTest(t)

	values := url.Values{
		"kw":       {"仙逆"},
		"src":      {"plugin"},
		"channels": {"tg-a,tg-b"},
		"plugins":  {"pan666,panyq"},
	}
	req, err := parseSearchRequest(newSearchRequestParserContext(http.MethodGet, "/api/search?"+values.Encode(), ""))
	if err != nil {
		t.Fatalf("期望解析成功，实际错误：%v", err)
	}

	if req.SourceType != "plugin" {
		t.Fatalf("期望来源类型为 plugin，实际为 %s", req.SourceType)
	}
	if req.Channels != nil {
		t.Fatalf("期望 plugin 来源忽略频道参数，实际为 %#v", req.Channels)
	}
	if !reflect.DeepEqual(req.Plugins, []string{"pan666", "panyq"}) {
		t.Fatalf("期望保留插件列表，实际为 %#v", req.Plugins)
	}
}

func TestParseSearchRequestRejectsInvalidExt(t *testing.T) {
	setupSearchRequestParserTest(t)

	values := url.Values{
		"kw":  {"仙逆"},
		"ext": {"{"},
	}
	_, err := parseSearchRequest(newSearchRequestParserContext(http.MethodGet, "/api/search?"+values.Encode(), ""))
	if err == nil {
		t.Fatal("期望返回 ext 参数格式错误")
	}
	if !strings.Contains(err.Error(), "无效的ext参数格式") {
		t.Fatalf("期望 ext 错误信息，实际为 %v", err)
	}
}

func TestParseSearchRequestRejectsInvalidFilter(t *testing.T) {
	setupSearchRequestParserTest(t)

	values := url.Values{
		"kw":     {"仙逆"},
		"filter": {"{"},
	}
	_, err := parseSearchRequest(newSearchRequestParserContext(http.MethodGet, "/api/search?"+values.Encode(), ""))
	if err == nil {
		t.Fatal("期望返回 filter 参数格式错误")
	}
	if !strings.Contains(err.Error(), "无效的filter参数格式") {
		t.Fatalf("期望 filter 错误信息，实际为 %v", err)
	}
}

func setupSearchRequestParserTest(t *testing.T) {
	t.Helper()

	gin.SetMode(gin.TestMode)
	oldConfig := config.AppConfig
	oldTGChannelService := tgChannelService
	config.AppConfig = &config.Config{
		DefaultChannels: []string{"default-a", "default-b"},
	}
	tgChannelService = nil

	t.Cleanup(func() {
		config.AppConfig = oldConfig
		tgChannelService = oldTGChannelService
	})
}

func newSearchRequestParserContext(method string, target string, body string) *gin.Context {
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		context.Request.Header.Set("Content-Type", "application/json")
	}
	return context
}
