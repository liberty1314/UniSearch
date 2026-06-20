package panyq

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"
	"unisearch/util/json"
)

const (
	pluginName      = "panyq"
	defaultPriority = 2
	baseURL         = "https://panyq.com"
	requestTimeout  = 15 * time.Second
	maxPages        = 3
	maxConcurrency  = 20
	cacheTTL        = 30 * time.Minute
)

var actionIDKeys = []string{"credential_action_id", "intermediate_action_id", "final_link_action_id"}

var (
	actionIDCache = struct {
		sync.RWMutex
		values map[string]string
	}{values: make(map[string]string)}

	searchResultCache sync.Map
	finalLinkCache    sync.Map
)

// PanyqPlugin 盘友圈搜索插件。
type PanyqPlugin struct {
	*plugin.BaseAsyncPlugin
	client *http.Client
}

type cacheEntry struct {
	results   []model.SearchResult
	expiresAt time.Time
}

type credentials struct {
	Sign string
	Hash string
	Sha  string
}

type searchHit struct {
	EID     string `json:"eid"`
	Desc    string `json:"desc"`
	SizeStr string `json:"size_str"`
}

type searchResponse struct {
	Data struct {
		Hits       []searchHit `json:"hits"`
		MaxPageNum int         `json:"maxPageNum"`
	} `json:"data"`
}

func init() {
	plugin.RegisterGlobalPlugin(NewPanyqPlugin())
}

// NewPanyqPlugin 创建盘友圈插件实例。
func NewPanyqPlugin() *PanyqPlugin {
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Timeout: requestTimeout,
		Jar:     jar,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("重定向次数过多")
			}
			return nil
		},
	}

	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.panyq",
		Name:            "盘友圈",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于盘友圈动态接口的网盘资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "盘友圈",
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

	return &PanyqPlugin{
		BaseAsyncPlugin: basePlugin,
		client:          client,
	}
}

// Search 执行搜索并返回结果。
// SearchWithResult 执行搜索并返回带状态的结果。
func (p *PanyqPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *PanyqPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	if p.client != nil {
		client = p.client
	}
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return nil, fmt.Errorf("[%s] 关键词不能为空", p.Name())
	}

	if cached, ok := searchResultCache.Load(keyword); ok {
		if entry, valid := cached.(cacheEntry); valid && time.Now().Before(entry.expiresAt) {
			return entry.results, nil
		}
		searchResultCache.Delete(keyword)
	}

	actionIDs, err := p.getOrDiscoverActionIDs(client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 获取 Action ID 失败: %w", p.Name(), err)
	}

	creds, err := p.getCredentials(keyword, actionIDs[actionIDKeys[0]], client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 获取搜索凭证失败: %w", p.Name(), err)
	}

	hits, maxPageNum, err := p.getSearchResults(creds.Sign, 1, client)
	if err != nil {
		return nil, fmt.Errorf("[%s] 获取搜索结果失败: %w", p.Name(), err)
	}
	for page := 2; page <= maxPageNum && page <= maxPages; page++ {
		pageHits, _, err := p.getSearchResults(creds.Sign, page, client)
		if err == nil {
			hits = append(hits, pageHits...)
		}
	}

	results := p.convertHits(client, hits, creds, actionIDs)
	filtered := plugin.FilterResultsByKeyword(results, keyword)
	if len(filtered) > 0 {
		searchResultCache.Store(keyword, cacheEntry{results: filtered, expiresAt: time.Now().Add(cacheTTL)})
	}
	return filtered, nil
}

func (p *PanyqPlugin) getOrDiscoverActionIDs(client *http.Client) (map[string]string, error) {
	actionIDCache.RLock()
	if len(actionIDCache.values) >= len(actionIDKeys) {
		ids := make(map[string]string, len(actionIDKeys))
		for _, key := range actionIDKeys {
			ids[key] = actionIDCache.values[key]
		}
		actionIDCache.RUnlock()
		return ids, nil
	}
	actionIDCache.RUnlock()

	candidates, err := p.findPotentialActionIDs(client)
	if err != nil {
		return nil, err
	}
	if len(candidates) < len(actionIDKeys) {
		return nil, fmt.Errorf("Action ID 数量不足")
	}

	ids := map[string]string{
		actionIDKeys[0]: candidates[0],
		actionIDKeys[1]: candidates[len(candidates)-2],
		actionIDKeys[2]: candidates[len(candidates)-1],
	}

	actionIDCache.Lock()
	for key, value := range ids {
		actionIDCache.values[key] = value
	}
	actionIDCache.Unlock()

	return ids, nil
}

func (p *PanyqPlugin) findPotentialActionIDs(client *http.Client) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("首页状态码: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	jsRegex := regexp.MustCompile(`<script src="(/_next/static/[^"]+\.js)"`)
	idRegex := regexp.MustCompile(`["']([a-f0-9]{40})["']`)
	seen := make(map[string]struct{})
	for _, match := range jsRegex.FindAllStringSubmatch(string(body), -1) {
		jsURL := baseURL + match[1]
		ids := p.fetchActionIDsFromJS(client, jsURL, idRegex)
		for _, id := range ids {
			seen[id] = struct{}{}
		}
	}

	ids := make([]string, 0, len(seen))
	for id := range seen {
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, fmt.Errorf("未找到 Action ID")
	}
	return ids, nil
}

func (p *PanyqPlugin) fetchActionIDsFromJS(client *http.Client, jsURL string, idRegex *regexp.Regexp) []string {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jsURL, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Referer", baseURL)
	req.Header.Set("Origin", baseURL)
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	ids := make([]string, 0)
	for _, match := range idRegex.FindAllStringSubmatch(string(body), -1) {
		ids = append(ids, match[1])
	}
	return ids
}

func (p *PanyqPlugin) getCredentials(query, actionID string, client *http.Client) (*credentials, error) {
	payload := fmt.Sprintf(`[{"cat":"all","query":"%s","pageNum":1}]`, query)
	req, err := http.NewRequest(http.MethodPost, baseURL, strings.NewReader(payload))
	if err != nil {
		return nil, err
	}
	setActionHeaders(req, actionID, baseURL)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	signMatch := regexp.MustCompile(`"sign":"([^"]+)"`).FindStringSubmatch(string(body))
	shaMatch := regexp.MustCompile(`"sha":"([a-f0-9]{64})"`).FindStringSubmatch(string(body))
	hashMatch := regexp.MustCompile(`"hash","([^"]+)"`).FindStringSubmatch(string(body))
	if len(signMatch) < 2 || len(shaMatch) < 2 || len(hashMatch) < 2 {
		return nil, fmt.Errorf("提取凭证失败")
	}
	return &credentials{Sign: signMatch[1], Sha: shaMatch[1], Hash: hashMatch[1]}, nil
}

func (p *PanyqPlugin) getSearchResults(sign string, pageNum int, client *http.Client) ([]searchHit, int, error) {
	searchURL := fmt.Sprintf("%s/api/search?sign=%s&page=%d", baseURL, url.QueryEscape(sign), pageNum)
	req, err := http.NewRequest(http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Referer", baseURL)
	req.Header.Set("Origin", baseURL)
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}

	var payload searchResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, 0, err
	}
	return payload.Data.Hits, payload.Data.MaxPageNum, nil
}

func (p *PanyqPlugin) convertHits(client *http.Client, hits []searchHit, creds *credentials, actionIDs map[string]string) []model.SearchResult {
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		results []model.SearchResult
		sem     = make(chan struct{}, maxConcurrency)
	)

	for index, hit := range hits {
		index, hit := index, hit
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()

			_ = p.performIntermediateStep(actionIDs[actionIDKeys[1]], creds.Hash, creds.Sha, hit.EID, client)
			finalLink, err := p.getFinalLink(actionIDs[actionIDKeys[2]], hit.EID, client)
			if err != nil || finalLink == "" {
				return
			}

			linkType := util.GetLinkType(finalLink)
			if linkType == "others" {
				return
			}

			result := model.SearchResult{
				UniqueID: fmt.Sprintf("%s-%d", p.Name(), index),
				Title:    extractTitle(hit.Desc),
				Content:  cleanEscapedHTML(hit.Desc),
				Links: []model.Link{{
					URL:      finalLink,
					Type:     linkType,
					Password: extractPassword(finalLink, linkType),
				}},
				Datetime: time.Time{},
			}

			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}()
	}

	wg.Wait()
	return results
}

func (p *PanyqPlugin) performIntermediateStep(actionID, hashVal, shaVal, eid string, client *http.Client) error {
	intermediateURL := fmt.Sprintf("%s/search/%s", baseURL, hashVal)
	payload := fmt.Sprintf(`[{"eid":"%s","sha":"%s","page_num":"1"}]`, eid, shaVal)
	req, err := http.NewRequest(http.MethodPost, intermediateURL, strings.NewReader(payload))
	if err != nil {
		return err
	}
	setActionHeaders(req, actionID, intermediateURL)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("中间步骤状态码: %d", resp.StatusCode)
	}
	return nil
}

func (p *PanyqPlugin) getFinalLink(actionID, eid string, client *http.Client) (string, error) {
	cacheKey := fmt.Sprintf("%s:%s", actionID, eid)
	if cached, ok := finalLinkCache.Load(cacheKey); ok {
		if link, valid := cached.(string); valid {
			return link, nil
		}
	}

	finalURL := fmt.Sprintf("%s/go/%s", baseURL, eid)
	req, err := http.NewRequest(http.MethodPost, finalURL, strings.NewReader(fmt.Sprintf(`[{"eid":"%s"}]`, eid)))
	if err != nil {
		return "", err
	}
	setActionHeaders(req, actionID, finalURL)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	link := extractFinalLink(string(body))
	if link == "" {
		return "", fmt.Errorf("提取最终链接失败")
	}
	finalLinkCache.Store(cacheKey, link)
	return link, nil
}

func setActionHeaders(req *http.Request, actionID, referer string) {
	req.Header.Set("Content-Type", "text/plain;charset=UTF-8")
	req.Header.Set("next-action", actionID)
	req.Header.Set("Referer", referer)
	req.Header.Set("Origin", baseURL)
	req.Header.Set("User-Agent", userAgent)
}

func extractFinalLink(responseText string) string {
	lines := strings.Split(strings.TrimSpace(responseText), "\n")
	if len(lines) > 0 {
		lastLine := lines[len(lines)-1]
		var linkData []interface{}
		if err := json.Unmarshal([]byte(lastLine), &linkData); err == nil && len(linkData) > 1 {
			if linkMap, ok := linkData[1].(map[string]interface{}); ok {
				if link, ok := linkMap["url"].(string); ok {
					return strings.TrimSpace(link)
				}
			}
		}
	}

	urlRegex := regexp.MustCompile(`(https?://[^\s"'<>]+|magnet:\?[^\s"'<>]+|ed2k://[^\s"'<>]+)`)
	if match := urlRegex.FindString(responseText); match != "" {
		return match
	}
	return ""
}

func extractPassword(rawURL string, linkType string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	switch linkType {
	case "baidu", "xunlei":
		return truncatePassword(parsed.Query().Get("pwd"))
	case "aliyun":
		return truncatePassword(parsed.Query().Get("password"))
	default:
		return ""
	}
}

func truncatePassword(password string) string {
	password = strings.TrimSpace(password)
	if len(password) > 4 {
		return password[:4]
	}
	return password
}

func extractTitle(desc string) string {
	cleanDesc := cleanEscapedHTML(desc)
	for _, pattern := range []string{`《([^》]+)》`, `【([^】]+)】`} {
		if matches := regexp.MustCompile(pattern).FindStringSubmatch(cleanDesc); len(matches) > 1 {
			return strings.TrimSpace(matches[1])
		}
	}
	if parts := strings.Split(cleanDesc, "✔"); len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
		return strings.TrimSpace(parts[0])
	}
	runes := []rune(cleanDesc)
	if len(runes) > 30 {
		return string(runes[:30]) + "..."
	}
	return strings.TrimSpace(cleanDesc)
}

func cleanEscapedHTML(text string) string {
	replacers := map[string]string{
		`\u003Cmark\u003E`:    "",
		`\u003C/mark\u003E`:   "",
		`\u003Cb\u003E`:       "",
		`\u003C/b\u003E`:      "",
		`\u003Cem\u003E`:      "",
		`\u003C/em\u003E`:     "",
		`\u003Cstrong\u003E`:  "",
		`\u003C/strong\u003E`: "",
		`\u003Cbr\u003E`:      " ",
		"<mark>":              "",
		"</mark>":             "",
		"<b>":                 "",
		"</b>":                "",
		"<em>":                "",
		"</em>":               "",
		"<strong>":            "",
		"</strong>":           "",
		"<br>":                " ",
		"<br/>":               " ",
		"<br />":              " ",
	}
	result := text
	for old, replacement := range replacers {
		result = strings.ReplaceAll(result, old, replacement)
	}
	return strings.Join(strings.Fields(result), " ")
}

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
