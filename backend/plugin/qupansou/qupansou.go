package qupansou

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util/json"
)

const (
	pluginName      = "qupansou"
	defaultPriority = 3
	apiURL          = "https://v.funletu.com/search"
	requestTimeout  = 6 * time.Second
	defaultPageSize = 1000
	cacheTTL        = 1 * time.Hour
)

var apiResponseCache sync.Map

// QuPanSouAsyncPlugin 趣盘搜异步插件。
type QuPanSouAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
}

type cachedResponse struct {
	results   []model.SearchResult
	expiresAt time.Time
}

func init() {
	plugin.RegisterGlobalPlugin(NewQuPanSouPlugin())
}

// NewQuPanSouPlugin 创建趣盘搜插件实例。
func NewQuPanSouPlugin() *QuPanSouAsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.qupansou",
		Name:            "趣盘搜",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于趣盘搜 API 的网盘资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "趣盘搜",
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

	return &QuPanSouAsyncPlugin{
		BaseAsyncPlugin: basePlugin,
	}
}

// Search 执行搜索并返回结果。
func (p *QuPanSouAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *QuPanSouAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *QuPanSouAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	if cached, ok := apiResponseCache.Load(keyword); ok {
		if entry, valid := cached.(cachedResponse); valid && time.Now().Before(entry.expiresAt) {
			return entry.results, nil
		}
		apiResponseCache.Delete(keyword)
	}

	items, err := p.searchAPI(keyword, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] API 请求失败: %w", p.Name(), err)
	}

	results := p.convertResults(items)
	apiResponseCache.Store(keyword, cachedResponse{
		results:   results,
		expiresAt: time.Now().Add(cacheTTL),
	})

	return results, nil
}

func (p *QuPanSouAsyncPlugin) searchAPI(keyword string, client *http.Client) ([]QuPanSouItem, error) {
	reqBody := map[string]interface{}{
		"style":   "get",
		"datasrc": "search",
		"query": map[string]interface{}{
			"id":         "",
			"datetime":   "",
			"courseid":   1,
			"categoryid": "",
			"filetypeid": "",
			"filetype":   "",
			"reportid":   "",
			"validid":    "",
			"searchtext": keyword,
		},
		"page": map[string]interface{}{
			"pageSize":  defaultPageSize,
			"pageIndex": 1,
		},
		"order": map[string]interface{}{
			"prop":  "sort",
			"order": "desc",
		},
		"message": "请求资源列表数据",
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Referer", "https://pan.funletu.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API 返回状态码: %d", resp.StatusCode)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	var apiResp QuPanSouResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if apiResp.Status != http.StatusOK {
		return nil, fmt.Errorf("API 返回错误: %s", apiResp.Message)
	}

	return apiResp.Data, nil
}

func (p *QuPanSouAsyncPlugin) convertResults(items []QuPanSouItem) []model.SearchResult {
	results := make([]model.SearchResult, 0, len(items))

	for _, item := range items {
		linkURL := strings.TrimSpace(item.URL)
		if linkURL == "" {
			linkURL = strings.TrimSpace(item.Link)
		}
		linkType := p.determineLinkType(linkURL)
		if linkURL == "" || linkType == "" {
			continue
		}

		datetime := parseUpdateTime(item.UpdateTime)
		title := cleanHTML(item.Title)
		if title == "" {
			title = cleanHTML(item.Filename)
		}
		if title == "" {
			continue
		}

		results = append(results, model.SearchResult{
			UniqueID: fmt.Sprintf("%s-%d", p.Name(), item.ID),
			Title:    title,
			Content:  buildContent(item),
			Datetime: datetime,
			Links: []model.Link{{
				URL:      linkURL,
				Type:     linkType,
				Password: strings.TrimSpace(item.ExtCode),
			}},
		})
	}

	return results
}

func parseUpdateTime(value string) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}
	}
	if parsed, err := time.Parse("2006-01-02 15:04:05", value); err == nil {
		return parsed
	}
	return time.Time{}
}

func buildContent(item QuPanSouItem) string {
	parts := make([]string, 0, 3)
	if item.Category != "" {
		parts = append(parts, fmt.Sprintf("类别: %s", item.Category))
	}
	if item.FileType != "" {
		parts = append(parts, fmt.Sprintf("文件类型: %s", item.FileType))
	}
	if item.Size != "" {
		parts = append(parts, fmt.Sprintf("大小: %s", item.Size))
	}
	return strings.Join(parts, ", ")
}

func (p *QuPanSouAsyncPlugin) determineLinkType(linkURL string) string {
	lowerURL := strings.ToLower(strings.TrimSpace(linkURL))

	switch {
	case strings.Contains(lowerURL, "pan.baidu.com"):
		return "baidu"
	case strings.Contains(lowerURL, "aliyundrive.com"), strings.Contains(lowerURL, "alipan.com"):
		return "aliyun"
	case strings.Contains(lowerURL, "pan.quark.cn"):
		return "quark"
	case strings.Contains(lowerURL, "cloud.189.cn"):
		return "tianyi"
	case strings.Contains(lowerURL, "pan.xunlei.com"):
		return "xunlei"
	case strings.Contains(lowerURL, "caiyun.139.com"):
		return "mobile"
	case strings.Contains(lowerURL, "115.com"):
		return "115"
	case strings.Contains(lowerURL, "drive.uc.cn"):
		return "uc"
	case strings.Contains(lowerURL, "pan.123.com"), strings.Contains(lowerURL, "123pan.com"):
		return "123"
	case strings.Contains(lowerURL, "mypikpak.com"):
		return "pikpak"
	case strings.Contains(lowerURL, "lanzou"):
		return "lanzou"
	default:
		return ""
	}
}

func cleanHTML(html string) string {
	replacements := map[string]string{
		"<em>":        "",
		"</em>":       "",
		"<b>":         "",
		"</b>":        "",
		"<strong>":    "",
		"</strong>":   "",
		"<i>":         "",
		"</i>":        "",
		"&lt;em&gt;":  "",
		"&lt;/em&gt;": "",
	}

	result := html
	for tag, replacement := range replacements {
		result = strings.ReplaceAll(result, tag, replacement)
	}

	return strings.TrimSpace(result)
}

// QuPanSouResponse API 响应结构。
type QuPanSouResponse struct {
	Text    string         `json:"text"`
	Data    []QuPanSouItem `json:"data"`
	Total   int            `json:"total"`
	Status  int            `json:"status"`
	Message string         `json:"message"`
}

// QuPanSouItem API 响应中的单个结果项。
type QuPanSouItem struct {
	ID           int    `json:"id"`
	Title        string `json:"title"`
	Filename     string `json:"filename"`
	URL          string `json:"url"`
	Link         string `json:"link"`
	SearchText   string `json:"searchtext"`
	ExtCode      string `json:"extcode"`
	UnzipCode    string `json:"unzipcode"`
	Size         string `json:"size"`
	CategoryID   int    `json:"categoryid"`
	Category     string `json:"category"`
	CourseID     int    `json:"courseid"`
	Course       string `json:"course"`
	FileTypeID   int    `json:"filetypeid"`
	FileType     string `json:"filetype"`
	UpdateTime   string `json:"updatetime"`
	CreateTime   string `json:"createtime"`
	Views        int    `json:"views"`
	ViewsHistory int    `json:"viewshistory"`
	Diff         int    `json:"diff"`
	Violate      int    `json:"violate"`
	State        int    `json:"state"`
	Sort         int    `json:"sort"`
	Top          int    `json:"top"`
	Valid        int    `json:"valid"`
}
