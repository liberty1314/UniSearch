package panwiki

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
	linkparser "unisearch/plugin/parser"
)

const (
	pluginName      = "panwiki"
	defaultPriority = 3
	primaryBaseURL  = "https://www.panwiki.com"
	backupBaseURL   = "https://pan666.net"
	searchPath      = "/search.php?mod=forum&srchtxt=%s&searchsubmit=yes&orderby=lastpost"
	userAgent       = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	requestTimeout  = 12 * time.Second
	detailTimeout   = 10 * time.Second
	maxPages        = 2
	maxConcurrency  = 16
	cacheTTL        = 30 * time.Minute
)

var tidRegex = regexp.MustCompile(`tid=(\d+)`)

// PanwikiPlugin Panwiki 论坛搜索插件。
type PanwikiPlugin struct {
	*plugin.BaseAsyncPlugin
	detailCache    sync.Map
	currentBaseURL string
	mu             sync.RWMutex
}

type cacheItem struct {
	links     []model.Link
	expiresAt time.Time
}

func init() {
	plugin.RegisterGlobalPlugin(NewPanwikiPlugin())
}

// NewPanwikiPlugin 创建 Panwiki 插件实例。
func NewPanwikiPlugin() *PanwikiPlugin {
	basePlugin := plugin.NewBaseAsyncPluginWithFilter(pluginName, defaultPriority, true)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.panwiki",
		Name:            "PanWiki",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 PanWiki 论坛搜索的网盘资源插件，支持主备域名切换和详情页链接解析。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "PanWiki",
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv", "anime", "documentary", "unknown"},
			TargetTypes:         []string{"share"},
			Priority:            defaultPriority,
			SkipServiceFilter:   true,
		},
		UI: model.PluginUIMetadata{
			Menus:            []string{},
			SettingsSections: []string{},
			TaskTemplates:    []string{},
		},
	})

	return &PanwikiPlugin{
		BaseAsyncPlugin: basePlugin,
		currentBaseURL:  primaryBaseURL,
	}
}

// Search 执行搜索并返回结果。
// SearchWithResult 执行搜索并返回带状态的结果。
func (p *PanwikiPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.searchImpl, p.MainCacheKey, ext)
}

func (p *PanwikiPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return nil, fmt.Errorf("[%s] 关键词不能为空", p.Name())
	}

	allResults := make([]model.SearchResult, 0)
	for page := 1; page <= maxPages; page++ {
		results, err := p.searchPage(client, keyword, page)
		if err != nil {
			if page == 1 {
				return nil, fmt.Errorf("[%s] 搜索第一页失败: %w", p.Name(), err)
			}
			continue
		}
		allResults = append(allResults, results...)
	}

	p.enrichWithDetailLinks(client, allResults)

	withLinks := make([]model.SearchResult, 0, len(allResults))
	for _, result := range allResults {
		if len(result.Links) > 0 {
			withLinks = append(withLinks, result)
		}
	}

	return plugin.FilterResultsByKeyword(withLinks, keyword), nil
}

func (p *PanwikiPlugin) searchPage(client *http.Client, keyword string, page int) ([]model.SearchResult, error) {
	baseCandidates := p.baseCandidates()
	var lastErr error

	for _, baseURL := range baseCandidates {
		doc, err := p.fetchSearchDocument(client, baseURL, keyword, page)
		if err != nil {
			lastErr = err
			continue
		}
		p.setCurrentBaseURL(baseURL)
		return p.extractSearchResults(doc), nil
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("未能获取搜索页面")
}

func (p *PanwikiPlugin) fetchSearchDocument(client *http.Client, baseURL, keyword string, page int) (*goquery.Document, error) {
	initialURL := p.buildSearchURL(baseURL, keyword, page)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, initialURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建初始请求失败: %w", err)
	}
	p.setRequestHeaders(req, baseURL)

	noRedirectClient := cloneHTTPClient(client)
	noRedirectClient.CheckRedirect = func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}

	resp, err := noRedirectClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%s 初始请求失败: %w", baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return goquery.NewDocumentFromReader(resp.Body)
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return nil, fmt.Errorf("%s 未获取到重定向 URL，状态码: %d", baseURL, resp.StatusCode)
	}

	searchURL := p.resolveLocation(baseURL, location)
	if page > 1 {
		searchURL = p.rewritePageURL(baseURL, searchURL, page)
	}

	ctx2, cancel2 := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel2()

	req2, err := http.NewRequestWithContext(ctx2, http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("创建搜索请求失败: %w", err)
	}
	p.setRequestHeaders(req2, baseURL)

	resp2, err := client.Do(req2)
	if err != nil {
		return nil, fmt.Errorf("搜索请求失败: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("搜索请求返回状态码: %d", resp2.StatusCode)
	}

	return goquery.NewDocumentFromReader(resp2.Body)
}

func cloneHTTPClient(client *http.Client) *http.Client {
	if client == nil {
		return &http.Client{Timeout: requestTimeout}
	}
	cloned := *client
	return &cloned
}

func (p *PanwikiPlugin) buildSearchURL(baseURL, keyword string, page int) string {
	searchURL := fmt.Sprintf(baseURL+searchPath, url.QueryEscape(keyword))
	if page > 1 {
		searchURL = fmt.Sprintf("%s&page=%d", searchURL, page)
	}
	return searchURL
}

func (p *PanwikiPlugin) resolveLocation(baseURL, location string) string {
	if strings.HasPrefix(location, "http://") || strings.HasPrefix(location, "https://") {
		return location
	}
	return baseURL + "/" + strings.TrimPrefix(location, "/")
}

func (p *PanwikiPlugin) rewritePageURL(baseURL, searchURL string, page int) string {
	parsed, err := url.Parse(searchURL)
	if err != nil {
		return searchURL
	}
	searchID := parsed.Query().Get("searchid")
	if searchID == "" {
		return searchURL
	}
	return fmt.Sprintf("%s/search.php?mod=forum&searchid=%s&orderby=lastpost&ascdesc=desc&searchsubmit=yes&page=%d", baseURL, searchID, page)
}

func (p *PanwikiPlugin) setRequestHeaders(req *http.Request, baseURL string) {
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Referer", baseURL+"/")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
}

func (p *PanwikiPlugin) extractSearchResults(doc *goquery.Document) []model.SearchResult {
	results := make([]model.SearchResult, 0)
	doc.Find(".slst ul li.pbw").Each(func(_ int, item *goquery.Selection) {
		result := p.parseSearchResult(item)
		if result.UniqueID != "" && result.Title != "" {
			results = append(results, result)
		}
	})
	return results
}

func (p *PanwikiPlugin) parseSearchResult(item *goquery.Selection) model.SearchResult {
	titleLink := item.Find("h3.xs3 a").First()
	title := cleanTitle(titleLink.Text())
	detailPath, _ := titleLink.Attr("href")
	detailURL := p.absoluteURL(detailPath)
	if title == "" || detailURL == "" {
		return model.SearchResult{}
	}

	content := ""
	item.Find("p").Each(func(i int, node *goquery.Selection) {
		if i == 1 {
			content = strings.TrimSpace(node.Text())
		}
	})

	var publishText, author, category string
	spans := item.Find("p").Last().Find("span")
	if spans.Length() >= 3 {
		publishText = strings.TrimSpace(spans.Eq(0).Text())
		author = strings.TrimSpace(spans.Eq(1).Find("a").Text())
		category = strings.TrimSpace(spans.Eq(2).Find("a").Text())
	}

	postID := extractPostID(detailURL)
	if postID == "" {
		postID = fmt.Sprintf("%x", strings.ToLower(detailURL))
	}

	contentParts := make([]string, 0, 4)
	if content != "" {
		contentParts = append(contentParts, content)
	}
	if author != "" {
		contentParts = append(contentParts, fmt.Sprintf("作者: %s", author))
	}
	if category != "" {
		contentParts = append(contentParts, fmt.Sprintf("分类: %s", category))
	}
	contentParts = append(contentParts, fmt.Sprintf("详情: %s", detailURL))

	tags := make([]string, 0, 1)
	if category != "" {
		tags = append(tags, category)
	}

	return model.SearchResult{
		MessageID: fmt.Sprintf("%s-%s", p.Name(), postID),
		UniqueID:  fmt.Sprintf("%s-%s", p.Name(), postID),
		Title:     title,
		Content:   strings.Join(contentParts, " | "),
		Datetime:  parsePublishTime(publishText),
		Tags:      tags,
		Channel:   "",
	}
}

func (p *PanwikiPlugin) enrichWithDetailLinks(client *http.Client, results []model.SearchResult) {
	if len(results) == 0 {
		return
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, maxConcurrency)

	for index := range results {
		index := index
		detailURL := extractDetailURLFromContent(results[index].Content)
		if detailURL == "" {
			continue
		}

		wg.Add(1)
		semaphore <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-semaphore }()

			links := p.fetchDetailLinks(client, detailURL)
			if len(links) > 0 {
				results[index].Links = links
			}
		}()
	}

	wg.Wait()
}

func (p *PanwikiPlugin) fetchDetailLinks(client *http.Client, detailURL string) []model.Link {
	if cached, ok := p.detailCache.Load(detailURL); ok {
		if item, valid := cached.(cacheItem); valid {
			if time.Now().Before(item.expiresAt) {
				return item.links
			}
			p.detailCache.Delete(detailURL)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), detailTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, detailURL, nil)
	if err != nil {
		return nil
	}
	p.setRequestHeaders(req, p.currentBase())

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil
	}

	links := p.extractDetailLinksFromDocument(doc)
	if len(links) > 0 {
		p.detailCache.Store(detailURL, cacheItem{
			links:     links,
			expiresAt: time.Now().Add(cacheTTL),
		})
	}
	return links
}

func (p *PanwikiPlugin) extractDetailLinksFromDocument(doc *goquery.Document) []model.Link {
	contentArea := doc.Find(".t_f[id^='postmessage_']").First()
	if contentArea.Length() == 0 {
		contentArea = doc.Find(".t_msgfont, .plhin, .message, [id^='postmessage_']").First()
	}
	if contentArea.Length() == 0 {
		contentArea = doc.Selection
	}

	parsedLinks := linkparser.ExtractLinksFromSelection(contentArea)
	links := make([]model.Link, 0, len(parsedLinks))
	for _, parsed := range parsedLinks {
		links = append(links, model.Link{
			Type:     parsed.Type,
			URL:      parsed.URL,
			Password: parsed.Password,
		})
	}
	return links
}

func (p *PanwikiPlugin) absoluteURL(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	return p.currentBase() + "/" + strings.TrimPrefix(path, "/")
}

func (p *PanwikiPlugin) currentBase() string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.currentBaseURL == "" {
		return primaryBaseURL
	}
	return p.currentBaseURL
}

func (p *PanwikiPlugin) setCurrentBaseURL(baseURL string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.currentBaseURL = baseURL
}

func (p *PanwikiPlugin) baseCandidates() []string {
	current := p.currentBase()
	if current == backupBaseURL {
		return []string{backupBaseURL, primaryBaseURL}
	}
	return []string{primaryBaseURL, backupBaseURL}
}

func cleanTitle(title string) string {
	title = strings.TrimSpace(title)
	adPatterns := []string{
		`【[^】]*(?:论坛|网站|\.com|\.net|\.cn)[^】]*】`,
		`\[[^\]]*(?:论坛|网站|\.com|\.net|\.cn)[^\]]*\]`,
	}
	for _, pattern := range adPatterns {
		title = regexp.MustCompile(pattern).ReplaceAllString(title, "")
	}
	return strings.TrimSpace(title)
}

func extractPostID(detailURL string) string {
	if matches := tidRegex.FindStringSubmatch(detailURL); len(matches) > 1 {
		return matches[1]
	}
	return ""
}

func extractDetailURLFromContent(content string) string {
	const marker = "详情: "
	index := strings.LastIndex(content, marker)
	if index < 0 {
		return ""
	}
	value := strings.TrimSpace(content[index+len(marker):])
	if stop := strings.Index(value, " | "); stop >= 0 {
		value = value[:stop]
	}
	return strings.TrimSpace(value)
}

func parsePublishTime(value string) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}
	}

	layouts := []string{
		"2006-01-02 15:04",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed
		}
	}
	return time.Time{}
}
