package kanjuba

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/plugin/parser"
	"unisearch/util/json"
)

const (
	pluginName      = "kanjuba"
	defaultPriority = 3
	defaultAPIURL   = "http://app.ishen520.com/api.php/v1.vod"
	requestTimeout  = 8 * time.Second
	cacheTTL        = 1 * time.Hour
)

var kanjubaResponseCache sync.Map

type cachedSearchResult struct {
	results   []model.SearchResult
	expiresAt time.Time
}

// KanjubaAsyncPlugin 将看剧吧 MacCMS vod 接口转换为标准网盘资源搜索插件。
type KanjubaAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
}

type macCMSVodResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	List []macCMSVod `json:"list"`
}

type macCMSVod struct {
	VodID       int    `json:"vod_id"`
	VodName     string `json:"vod_name"`
	VodRemarks  string `json:"vod_remarks"`
	VodYear     string `json:"vod_year"`
	TypeName    string `json:"type_name"`
	VodTime     string `json:"vod_time"`
	VodPubdate  string `json:"vod_pubdate"`
	VodContent  string `json:"vod_content"`
	VodBlurb    string `json:"vod_blurb"`
	VodPlayURL  string `json:"vod_play_url"`
	VodDownURL  string `json:"vod_down_url"`
	VodPic      string `json:"vod_pic"`
	VodActor    string `json:"vod_actor"`
	VodDirector string `json:"vod_director"`
}

func init() {
	plugin.RegisterGlobalPlugin(NewKanjubaPlugin())
}

// NewKanjubaPlugin 创建看剧吧内置插件实例。
func NewKanjubaPlugin() *KanjubaAsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.kanjuba",
		Name:            "看剧吧",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于看剧吧 MacCMS vod 接口的课程、影视网盘资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "看剧吧",
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv", "anime", "documentary", "course", "unknown"},
			TargetTypes:         []string{"share"},
			Priority:            defaultPriority,
		},
		UI: model.PluginUIMetadata{
			Menus:            []string{},
			SettingsSections: []string{},
			TaskTemplates:    []string{},
		},
	})

	return &KanjubaAsyncPlugin{
		BaseAsyncPlugin: basePlugin,
	}
}

// DisplayName 返回后台展示名称。
func (p *KanjubaAsyncPlugin) DisplayName() string {
	return "看剧吧"
}

// Search 执行搜索并返回结果。
func (p *KanjubaAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *KanjubaAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *KanjubaAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	trimmedKeyword := strings.TrimSpace(keyword)
	if trimmedKeyword == "" {
		return []model.SearchResult{}, nil
	}

	cacheKey := strings.ToLower(trimmedKeyword)
	if cached, ok := kanjubaResponseCache.Load(cacheKey); ok {
		entry, valid := cached.(cachedSearchResult)
		if valid && time.Now().Before(entry.expiresAt) {
			return cloneResults(entry.results), nil
		}
		kanjubaResponseCache.Delete(cacheKey)
	}

	targetURL, err := buildSearchURL(resolveAPIURL(ext), trimmedKeyword)
	if err != nil {
		return nil, fmt.Errorf("[%s] 构造搜索 URL 失败: %w", p.Name(), err)
	}
	if client == nil {
		client = http.DefaultClient
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	req.Header.Set("Accept", "application/json,text/plain,*/*")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] 请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("[%s] 接口返回状态码 %d: %s", p.Name(), resp.StatusCode, strings.TrimSpace(string(body)))
	}

	results, err := p.parseResponse(body)
	if err != nil {
		return nil, err
	}
	kanjubaResponseCache.Store(cacheKey, cachedSearchResult{
		results:   cloneResults(results),
		expiresAt: time.Now().Add(cacheTTL),
	})

	return results, nil
}

func (p *KanjubaAsyncPlugin) parseResponse(body []byte) ([]model.SearchResult, error) {
	var apiResp macCMSVodResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("[%s] 解析 JSON 响应失败: %w", p.Name(), err)
	}
	if apiResp.Code != 0 && apiResp.Code != 1 {
		message := strings.TrimSpace(apiResp.Msg)
		if message == "" {
			message = fmt.Sprintf("code=%d", apiResp.Code)
		}
		return nil, fmt.Errorf("[%s] 接口返回错误: %s", p.Name(), message)
	}

	results := make([]model.SearchResult, 0, len(apiResp.List))
	for _, item := range apiResp.List {
		result := p.convertVod(item)
		if result.UniqueID == "" || len(result.Links) == 0 {
			continue
		}
		results = append(results, result)
	}

	return results, nil
}

func (p *KanjubaAsyncPlugin) convertVod(item macCMSVod) model.SearchResult {
	title := strings.TrimSpace(item.VodName)
	if title == "" {
		return model.SearchResult{}
	}

	links := extractVodLinks(title, item.VodPlayURL, item.VodDownURL, item.VodContent, item.VodBlurb)
	if len(links) == 0 {
		return model.SearchResult{}
	}

	tags := compactStrings(item.TypeName)
	images := compactStrings(item.VodPic)
	uniqueID := fmt.Sprintf("%s-%d", p.Name(), item.VodID)
	if item.VodID == 0 {
		uniqueID = fmt.Sprintf("%s-%x", p.Name(), stableHash(title+item.VodPlayURL+item.VodDownURL))
	}

	return model.SearchResult{
		UniqueID:       uniqueID,
		Title:          title,
		Content:        buildContent(item),
		Datetime:       parseTime(item.VodTime, item.VodPubdate),
		Links:          links,
		Tags:           tags,
		Images:         images,
		SourcePluginID: pluginName,
		SourceType:     "plugin",
		SourceName:     p.DisplayName(),
		MediaType:      "unknown",
		TargetType:     "share",
	}
}

func resolveAPIURL(ext map[string]interface{}) string {
	if ext != nil {
		if raw, ok := ext["kanjuba_api_url"].(string); ok && strings.TrimSpace(raw) != "" {
			return strings.TrimSpace(raw)
		}
	}
	return defaultAPIURL
}

func buildSearchURL(baseURL string, keyword string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	query.Set("wd", keyword)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func extractVodLinks(workTitle string, values ...string) []model.Link {
	links := make([]model.Link, 0)
	seen := make(map[string]struct{})

	for _, value := range values {
		for _, fragment := range splitMacCMSLinkFragments(value) {
			for _, parsedLink := range parser.ExtractLinks(fragment) {
				key := strings.ToLower(parsedLink.URL)
				if _, exists := seen[key]; exists {
					continue
				}
				seen[key] = struct{}{}
				links = append(links, model.Link{
					Type:      parsedLink.Type,
					URL:       parsedLink.URL,
					Password:  parsedLink.Password,
					WorkTitle: workTitle,
				})
			}
		}
	}

	return links
}

func splitMacCMSLinkFragments(value string) []string {
	replacer := strings.NewReplacer(
		"$$$", "\n",
		"#", "\n",
		"$", "\n",
		"\r", "\n",
		"\t", "\n",
	)
	normalized := replacer.Replace(value)
	fragments := strings.Split(normalized, "\n")
	result := make([]string, 0, len(fragments))
	for _, fragment := range fragments {
		fragment = strings.TrimSpace(fragment)
		if fragment != "" {
			result = append(result, fragment)
		}
	}
	return result
}

func buildContent(item macCMSVod) string {
	parts := make([]string, 0, 6)
	if value := strings.TrimSpace(item.TypeName); value != "" {
		parts = append(parts, "分类: "+value)
	}
	if value := strings.TrimSpace(item.VodRemarks); value != "" {
		parts = append(parts, "状态: "+value)
	}
	if value := strings.TrimSpace(item.VodYear); value != "" {
		parts = append(parts, "年份: "+value)
	}
	if value := strings.TrimSpace(item.VodDirector); value != "" {
		parts = append(parts, "导演: "+value)
	}
	if value := strings.TrimSpace(item.VodActor); value != "" {
		parts = append(parts, "主演: "+value)
	}
	if value := firstNonEmpty(item.VodBlurb, item.VodContent); value != "" {
		parts = append(parts, "简介: "+value)
	}
	return strings.Join(parts, "\n")
}

func parseTime(values ...string) time.Time {
	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02",
		time.RFC3339,
	}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		for _, format := range formats {
			if parsed, err := time.Parse(format, value); err == nil {
				return parsed
			}
		}
	}
	return time.Time{}
}

func compactStrings(values ...string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(strings.Join(strings.Fields(value), " "))
		if value != "" {
			return value
		}
	}
	return ""
}

func cloneResults(results []model.SearchResult) []model.SearchResult {
	cloned := make([]model.SearchResult, len(results))
	for i, result := range results {
		cloned[i] = result
		cloned[i].Links = append([]model.Link(nil), result.Links...)
		cloned[i].Tags = append([]string(nil), result.Tags...)
		cloned[i].Images = append([]string(nil), result.Images...)
	}
	return cloned
}

func stableHash(value string) uint64 {
	var hash uint64 = 1469598103934665603
	for _, b := range []byte(value) {
		hash ^= uint64(b)
		hash *= 1099511628211
	}
	return hash
}
