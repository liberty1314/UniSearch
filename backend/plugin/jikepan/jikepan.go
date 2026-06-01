package jikepan

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util/json"
)

const (
	pluginName      = "jikepan"
	defaultPriority = 3
	apiURL          = "https://api.jikepan.xyz/search"
	requestTimeout  = 10 * time.Second
)

// JikepanAsyncV2Plugin 即刻盘搜索异步插件。
type JikepanAsyncV2Plugin struct {
	*plugin.BaseAsyncPlugin
}

func init() {
	plugin.RegisterGlobalPlugin(NewJikepanAsyncV2Plugin())
}

// NewJikepanAsyncV2Plugin 创建即刻盘插件实例。
func NewJikepanAsyncV2Plugin() *JikepanAsyncV2Plugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.jikepan",
		Name:            "即刻盘",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于即刻盘 API 的网盘资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "即刻盘",
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv", "anime", "documentary", "unknown"},
			TargetTypes:         []string{"share"},
			Priority:            defaultPriority,
		},
		UI: model.PluginUIMetadata{
			Menus:            []string{},
			SettingsSections: []string{},
			TaskTemplates:    []string{},
		},
	})

	return &JikepanAsyncV2Plugin{
		BaseAsyncPlugin: basePlugin,
	}
}

// Search 执行搜索并返回结果。
func (p *JikepanAsyncV2Plugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *JikepanAsyncV2Plugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *JikepanAsyncV2Plugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	reqBody := map[string]interface{}{
		"name":   keyword,
		"is_all": false,
	}
	if ext != nil {
		if isAll, ok := ext["is_all"].(bool); ok && isAll {
			reqBody["is_all"] = true
		}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("[%s] 序列化请求失败: %w", p.Name(), err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Referer", "https://jikepan.xyz/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] 请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("[%s] API 返回状态码: %d", p.Name(), resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}

	var apiResp JikepanResponse
	if err := json.Unmarshal(bodyBytes, &apiResp); err != nil {
		return nil, fmt.Errorf("[%s] 解析响应失败: %w", p.Name(), err)
	}
	if apiResp.Msg != "success" {
		return nil, fmt.Errorf("[%s] API 返回错误: %s", p.Name(), apiResp.Msg)
	}

	return p.convertResults(apiResp.List), nil
}

func (p *JikepanAsyncV2Plugin) convertResults(items []JikepanItem) []model.SearchResult {
	results := make([]model.SearchResult, 0, len(items))

	for i, item := range items {
		links := make([]model.Link, 0, len(item.Links))
		for _, link := range item.Links {
			linkType := p.convertLinkType(link.Service, link.Link)
			if linkType == "" || strings.TrimSpace(link.Link) == "" {
				continue
			}

			links = append(links, model.Link{
				URL:      strings.TrimSpace(link.Link),
				Type:     linkType,
				Password: strings.TrimSpace(link.Pwd),
			})
		}

		if len(links) == 0 {
			continue
		}

		results = append(results, model.SearchResult{
			UniqueID: fmt.Sprintf("%s-%d", p.Name(), i),
			Title:    strings.TrimSpace(item.Name),
			Datetime: time.Time{},
			Links:    links,
		})
	}

	return results
}

func (p *JikepanAsyncV2Plugin) convertLinkType(service, linkURL string) string {
	service = strings.ToLower(strings.TrimSpace(service))
	lowerURL := strings.ToLower(strings.TrimSpace(linkURL))

	switch service {
	case "baidu":
		return "baidu"
	case "aliyun":
		return "aliyun"
	case "xunlei":
		return "xunlei"
	case "quark":
		return "quark"
	case "189cloud":
		return "tianyi"
	case "115":
		return "115"
	case "123":
		return "123"
	case "pikpak":
		return "pikpak"
	case "caiyun":
		return "mobile"
	case "ed2k":
		return "ed2k"
	case "magnet":
		return "magnet"
	case "other", "others":
		if strings.Contains(lowerURL, "drive.uc.cn") {
			return "uc"
		}
		return "others"
	case "unknown", "":
		if strings.Contains(lowerURL, "drive.uc.cn") {
			return "uc"
		}
		return ""
	default:
		return ""
	}
}

// JikepanResponse API 响应结构。
type JikepanResponse struct {
	Msg  string        `json:"msg"`
	List []JikepanItem `json:"list"`
}

// JikepanItem API 响应中的单个结果项。
type JikepanItem struct {
	Name  string        `json:"name"`
	Links []JikepanLink `json:"links"`
}

// JikepanLink API 响应中的链接信息。
type JikepanLink struct {
	Service string `json:"service"`
	Link    string `json:"link"`
	Pwd     string `json:"pwd,omitempty"`
}
