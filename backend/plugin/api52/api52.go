package api52

import (
	"context"
	stdjson "encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/plugin/parser"
	"unisearch/util/json"
)

const (
	pluginName    = "52API"
	apiKeyEnvName = "PLUGIN_52API_KEY"

	defaultPriority = 3
	defaultAPIURL   = "https://www.52api.cn/api/pan_sou"
	requestTimeout  = 8 * time.Second
	cacheTTL        = 10 * time.Minute
)

var api52ResponseCache sync.Map

type cachedSearchResult struct {
	results   []model.SearchResult
	expiresAt time.Time
}

// API52AsyncPlugin 将 52API 网盘搜索接口转换为标准资源搜索插件。
type API52AsyncPlugin struct {
	*plugin.BaseAsyncPlugin
	apiKeyProvider func() string
}

type api52Envelope struct {
	Code    int                `json:"code"`
	Msg     string             `json:"msg"`
	Message string             `json:"message"`
	Data    stdjson.RawMessage `json:"data"`
	Result  stdjson.RawMessage `json:"result"`
	List    []api52Item        `json:"list"`
}

type api52ListEnvelope struct {
	List    []api52Item `json:"list"`
	Items   []api52Item `json:"items"`
	Records []api52Item `json:"records"`
	Results []api52Item `json:"results"`
}

type api52Item struct {
	ID          interface{} `json:"id"`
	Title       string      `json:"title"`
	Name        string      `json:"name"`
	URL         string      `json:"url"`
	Link        string      `json:"link"`
	ShareURL    string      `json:"share_url"`
	Type        string      `json:"type"`
	Password    string      `json:"password"`
	Pwd         string      `json:"pwd"`
	Desc        string      `json:"desc"`
	Description string      `json:"description"`
	Size        string      `json:"size"`
	UpdateTime  string      `json:"update_time"`
	Time        string      `json:"time"`
	Date        string      `json:"date"`
}

func init() {
	plugin.RegisterGlobalPlugin(NewAPI52Plugin())
}

// NewAPI52Plugin 创建 52API 内置插件实例。
func NewAPI52Plugin() *API52AsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.52api",
		Name:            "52API",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 52API 聚合网盘搜索接口的资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		ConfigSchema: []model.PluginConfigField{
			{
				Key:         apiKeyEnvName,
				Label:       "52API 请求密钥",
				Type:        "password",
				Required:    true,
				Description: "通过环境变量配置 52API 网盘搜索接口密钥。",
				Secret:      true,
				Group:       "network",
			},
		},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "52API",
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

	return &API52AsyncPlugin{
		BaseAsyncPlugin: basePlugin,
		apiKeyProvider: func() string {
			return strings.TrimSpace(os.Getenv(apiKeyEnvName))
		},
	}
}

// DisplayName 返回后台展示名称。
func (p *API52AsyncPlugin) DisplayName() string {
	return "52API"
}

// Search 执行搜索并返回结果。
func (p *API52AsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *API52AsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *API52AsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	trimmedKeyword := strings.TrimSpace(keyword)
	if trimmedKeyword == "" {
		return []model.SearchResult{}, nil
	}

	apiKey := ""
	if p.apiKeyProvider != nil {
		apiKey = strings.TrimSpace(p.apiKeyProvider())
	}
	if apiKey == "" {
		return nil, fmt.Errorf("[%s] 缺少 %s，请在环境变量中配置 52API 请求密钥", p.Name(), apiKeyEnvName)
	}

	cacheKey := strings.ToLower(trimmedKeyword)
	if cached, ok := api52ResponseCache.Load(cacheKey); ok {
		entry, valid := cached.(cachedSearchResult)
		if valid && time.Now().Before(entry.expiresAt) {
			return cloneResults(entry.results), nil
		}
		api52ResponseCache.Delete(cacheKey)
	}

	targetURL, err := buildAPIURL(resolveAPIURL(ext), apiKey, trimmedKeyword)
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
		return nil, classifyHTTPError(resp.StatusCode, body)
	}

	results, err := p.parseResponse(body)
	if err != nil {
		return nil, err
	}
	api52ResponseCache.Store(cacheKey, cachedSearchResult{
		results:   cloneResults(results),
		expiresAt: time.Now().Add(cacheTTL),
	})

	return results, nil
}

func (p *API52AsyncPlugin) parseResponse(body []byte) ([]model.SearchResult, error) {
	var envelope api52Envelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("[%s] 解析 JSON 响应失败: %w", p.Name(), err)
	}
	if envelope.Code != 0 && envelope.Code != http.StatusOK {
		message := firstNonEmpty(envelope.Msg, envelope.Message, fmt.Sprintf("code=%d", envelope.Code))
		return nil, fmt.Errorf("[%s] 接口返回错误: %s", p.Name(), message)
	}

	items, err := parseItems(envelope)
	if err != nil {
		return nil, fmt.Errorf("[%s] 解析 data 列表失败: %w", p.Name(), err)
	}

	results := make([]model.SearchResult, 0, len(items))
	for _, item := range items {
		result := p.convertItem(item)
		if result.UniqueID == "" || len(result.Links) == 0 {
			continue
		}
		results = append(results, result)
	}

	return results, nil
}

func parseItems(envelope api52Envelope) ([]api52Item, error) {
	if len(envelope.List) > 0 {
		return envelope.List, nil
	}

	raw := envelope.Data
	if len(raw) == 0 || string(raw) == "null" {
		raw = envelope.Result
	}
	if len(raw) == 0 || string(raw) == "null" {
		return []api52Item{}, nil
	}

	var items []api52Item
	if err := json.Unmarshal(raw, &items); err == nil {
		return items, nil
	}

	var nested api52ListEnvelope
	if err := json.Unmarshal(raw, &nested); err != nil {
		return nil, err
	}
	return firstNonEmptyList(nested.List, nested.Items, nested.Records, nested.Results), nil
}

func (p *API52AsyncPlugin) convertItem(item api52Item) model.SearchResult {
	title := firstNonEmpty(item.Title, item.Name)
	if title == "" {
		title = "52API 资源"
	}

	links := extractLinks(title, item)
	if len(links) == 0 {
		return model.SearchResult{}
	}

	uniqueSource := firstNonEmpty(fmt.Sprint(item.ID), title, firstNonEmpty(item.URL, item.Link, item.ShareURL))
	return model.SearchResult{
		UniqueID:       fmt.Sprintf("%s-%x", p.Name(), stableHash(uniqueSource)),
		Title:          title,
		Content:        buildContent(item),
		Datetime:       parseTime(item.UpdateTime, item.Time, item.Date),
		Links:          links,
		SourcePluginID: pluginName,
		SourceType:     "plugin",
		SourceName:     p.DisplayName(),
		MediaType:      "unknown",
		TargetType:     "share",
	}
}

func resolveAPIURL(ext map[string]interface{}) string {
	if ext != nil {
		if raw, ok := ext["api52_api_url"].(string); ok && strings.TrimSpace(raw) != "" {
			return strings.TrimSpace(raw)
		}
	}
	return defaultAPIURL
}

func buildAPIURL(baseURL string, apiKey string, keyword string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	query.Set("apikey", apiKey)
	query.Set("keyword", keyword)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func classifyHTTPError(statusCode int, body []byte) error {
	bodyText := strings.TrimSpace(string(body))
	switch statusCode {
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("[%s] 52API 认证失败，请检查 %s: %s", pluginName, apiKeyEnvName, bodyText)
	case http.StatusTooManyRequests:
		return fmt.Errorf("[%s] 52API 请求频率受限，请稍后重试: %s", pluginName, bodyText)
	case http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return fmt.Errorf("[%s] 52API 上游服务异常，状态码 %d: %s", pluginName, statusCode, bodyText)
	default:
		return fmt.Errorf("[%s] 52API 返回状态码 %d: %s", pluginName, statusCode, bodyText)
	}
}

func extractLinks(workTitle string, item api52Item) []model.Link {
	text := strings.Join(compactStrings(item.URL, item.Link, item.ShareURL, item.Password, item.Pwd), "\n")
	parsedLinks := parser.ExtractLinks(text)

	links := make([]model.Link, 0, len(parsedLinks))
	for _, parsedLink := range parsedLinks {
		password := firstNonEmpty(parsedLink.Password, item.Password, item.Pwd)
		if len(password) > 4 {
			password = password[:4]
		}
		links = append(links, model.Link{
			Type:      firstNonEmpty(normalizeType(item.Type), parsedLink.Type),
			URL:       parsedLink.URL,
			Password:  password,
			WorkTitle: workTitle,
		})
	}

	return links
}

func normalizeType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "quark", "夸克":
		return "quark"
	case "baidu", "百度":
		return "baidu"
	case "aliyun", "alipan", "aliyundrive", "阿里", "阿里云":
		return "aliyun"
	case "uc":
		return "uc"
	case "xunlei", "迅雷":
		return "xunlei"
	case "tianyi", "189", "天翼":
		return "tianyi"
	case "115":
		return "115"
	case "123":
		return "123"
	default:
		return ""
	}
}

func buildContent(item api52Item) string {
	parts := make([]string, 0, 3)
	if value := firstNonEmpty(item.Desc, item.Description); value != "" {
		parts = append(parts, "描述: "+value)
	}
	if value := strings.TrimSpace(item.Size); value != "" {
		parts = append(parts, "大小: "+value)
	}
	if value := firstNonEmpty(item.UpdateTime, item.Time, item.Date); value != "" {
		parts = append(parts, "更新时间: "+value)
	}
	return strings.Join(parts, "\n")
}

func parseTime(values ...string) time.Time {
	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(strings.Join(strings.Fields(value), " "))
		if value != "" && value != "<nil>" {
			return value
		}
	}
	return ""
}

func compactStrings(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

func firstNonEmptyList(lists ...[]api52Item) []api52Item {
	for _, list := range lists {
		if len(list) > 0 {
			return list
		}
	}
	return []api52Item{}
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
