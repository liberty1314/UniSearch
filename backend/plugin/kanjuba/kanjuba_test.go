package kanjuba

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"unisearch/plugin"
	"unisearch/plugin/testutil"
)

func TestKanjubaPluginContract(t *testing.T) {
	p := NewKanjubaPlugin()
	testutil.AssertPluginContract(t, p)
}

func TestKanjubaPluginManifest(t *testing.T) {
	manifest := plugin.ResolvePluginManifest(NewKanjubaPlugin())

	if manifest.ID != "search.kanjuba" {
		t.Fatalf("期望插件 ID 为 search.kanjuba，实际为 %q", manifest.ID)
	}
	if manifest.Name != "看剧吧" {
		t.Fatalf("期望插件展示名为看剧吧，实际为 %q", manifest.Name)
	}
	if manifest.Resource.Priority != defaultPriority {
		t.Fatalf("期望插件优先级为 %d，实际为 %d", defaultPriority, manifest.Resource.Priority)
	}
	if manifest.ManifestStatus != "complete" {
		t.Fatalf("期望插件清单完整，实际状态为 %q", manifest.ManifestStatus)
	}
}

func TestKanjubaParseMacCMSVodResponse(t *testing.T) {
	body := []byte(`{
  "code": 1,
  "msg": "数据列表",
  "list": [
    {
      "vod_id": 101,
      "vod_name": "考研英语",
      "vod_remarks": "完结",
      "vod_year": "2026",
      "type_name": "课程",
      "vod_time": "2026-06-08 20:30:00",
      "vod_play_url": "夸克$https://pan.quark.cn/s/abc123#百度$https://pan.baidu.com/s/xyz?pwd=8888"
    },
    {
      "vod_id": 102,
      "vod_name": "无网盘链接",
      "vod_play_url": "在线播放$https://example.com/video.m3u8"
    }
  ]
}`)

	results, err := NewKanjubaPlugin().parseResponse(body)
	if err != nil {
		t.Fatalf("解析 MacCMS 响应失败: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("期望只保留 1 条带网盘链接的结果，实际为 %d", len(results))
	}

	result := results[0]
	if result.UniqueID != "kanjuba-101" {
		t.Fatalf("期望 UniqueID 为 kanjuba-101，实际为 %q", result.UniqueID)
	}
	if result.Title != "考研英语" {
		t.Fatalf("期望标题为考研英语，实际为 %q", result.Title)
	}
	if result.MediaType != "unknown" || result.TargetType != "share" || result.SourcePluginID != pluginName {
		t.Fatalf("期望来源协议字段完整，实际为 media=%q target=%q source=%q", result.MediaType, result.TargetType, result.SourcePluginID)
	}
	if len(result.Tags) != 1 || result.Tags[0] != "课程" {
		t.Fatalf("期望分类标签为课程，实际为 %#v", result.Tags)
	}
	if !strings.Contains(result.Content, "状态: 完结") || !strings.Contains(result.Content, "年份: 2026") {
		t.Fatalf("期望内容包含状态和年份，实际为 %q", result.Content)
	}
	if result.Datetime.IsZero() || result.Datetime.Year() != 2026 {
		t.Fatalf("期望更新时间被解析，实际为 %v", result.Datetime)
	}
	if len(result.Links) != 2 {
		t.Fatalf("期望解析 2 个网盘链接，实际为 %#v", result.Links)
	}
	if result.Links[0].Type != "quark" || result.Links[1].Type != "baidu" || result.Links[1].Password != "8888" {
		t.Fatalf("期望链接类型和提取码被标准化，实际为 %#v", result.Links)
	}
}

func TestKanjubaDoSearchBuildsKeywordRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("wd") != "考研" {
			t.Fatalf("期望请求携带 wd=考研，实际查询为 %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":1,"list":[{"vod_id":7,"vod_name":"考研资料","vod_play_url":"夸克$https://pan.quark.cn/s/abc123"}]}`))
	}))
	defer server.Close()

	p := NewKanjubaPlugin()
	results, err := p.doSearch(server.Client(), " 考研 ", map[string]interface{}{"kanjuba_api_url": server.URL + "/api.php/v1.vod"})
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}
	if len(results) != 1 || results[0].Title != "考研资料" {
		t.Fatalf("期望返回测试服务端结果，实际为 %#v", results)
	}
}

func TestKanjubaParseResponseReportsHTML(t *testing.T) {
	_, err := NewKanjubaPlugin().parseResponse([]byte(`<html><body>域名出售</body></html>`))
	if err == nil || !strings.Contains(err.Error(), "JSON") {
		t.Fatalf("期望 HTML 响应返回 JSON 解析错误，实际为 %v", err)
	}
}
