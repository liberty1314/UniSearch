package hdr4k

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
	linkparser "unisearch/plugin/parser"
)

const (
	pluginName       = "hdr4k"
	defaultPriority  = 1
	searchURL        = "https://www.4khdr.cn/search.php?mod=forum"
	threadURLPattern = "https://www.4khdr.cn/thread-%s-1-1.html"
	requestTimeout   = 10 * time.Second
	detailTimeout    = 10 * time.Second
	maxConcurrency   = 12
	cacheTTL         = 1 * time.Hour
)

// Hdr4kAsyncPlugin 4KHDR 搜索插件。
type Hdr4kAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
	detailCache sync.Map
}

type detailCacheItem struct {
	links     []model.Link
	content   string
	expiresAt time.Time
}

func init() {
	plugin.RegisterGlobalPlugin(NewHdr4kAsyncPlugin())
}

// NewHdr4kAsyncPlugin 创建 4KHDR 插件实例。
func NewHdr4kAsyncPlugin() *Hdr4kAsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.hdr4k",
		Name:            "4KHDR",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 4KHDR 论坛搜索的高清影视网盘资源插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "4KHDR",
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv", "documentary", "unknown"},
			TargetTypes:         []string{"share"},
			Priority:            defaultPriority,
		},
		UI: model.PluginUIMetadata{
			Menus:            []string{},
			SettingsSections: []string{},
			TaskTemplates:    []string{},
		},
	})

	return &Hdr4kAsyncPlugin{BaseAsyncPlugin: basePlugin}
}

// Search 执行搜索并返回结果。
func (p *Hdr4kAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *Hdr4kAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *Hdr4kAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	searchKeyword := strings.TrimSpace(keyword)
	if ext != nil {
		if titleEn, ok := ext["title_en"].(string); ok && strings.TrimSpace(titleEn) != "" {
			searchKeyword = strings.TrimSpace(titleEn)
		}
	}

	form := url.Values{}
	form.Set("srchtxt", searchKeyword)
	form.Set("searchsubmit", "yes")

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, searchURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Referer", "https://www.4khdr.cn/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] 请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("[%s] 搜索返回状态码: %d", p.Name(), resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 解析搜索页面失败: %w", p.Name(), err)
	}

	return p.parseSearchDocument(client, doc, keyword), nil
}

func (p *Hdr4kAsyncPlugin) parseSearchDocument(client *http.Client, doc *goquery.Document, keyword string) []model.SearchResult {
	items := make([]*goquery.Selection, 0)
	doc.Find(".slst.mtw ul li.pbw").Each(func(_ int, item *goquery.Selection) {
		if p.matchSearchItem(item, keyword) {
			items = append(items, item)
		}
	})

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		results []model.SearchResult
		sem     = make(chan struct{}, maxConcurrency)
	)

	for _, item := range items {
		item := item
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()

			result := p.parseSearchItem(client, item)
			if result.UniqueID == "" || isEmptyRequestPost(result.Title, result.Links) {
				return
			}
			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}()
	}

	wg.Wait()
	return results
}

func (p *Hdr4kAsyncPlugin) matchSearchItem(item *goquery.Selection, keyword string) bool {
	keyword = strings.ToLower(strings.TrimSpace(keyword))
	if keyword == "" {
		return true
	}
	text := strings.ToLower(cleanHTML(item.Find("h3.xs3 a").Text() + " " + item.Find("p").First().Text()))
	for _, part := range strings.Fields(keyword) {
		if !strings.Contains(text, part) {
			return false
		}
	}
	return true
}

func (p *Hdr4kAsyncPlugin) parseSearchItem(client *http.Client, item *goquery.Selection) model.SearchResult {
	postID := strings.TrimPrefix(strings.TrimSpace(getAttr(item, "id")), "thread_")
	if postID == "" {
		return model.SearchResult{}
	}

	title := cleanHTML(item.Find("h3.xs3 a").Text())
	content := cleanHTML(item.Find("p").First().Text())
	datetime := parseDateTime(strings.TrimSpace(item.Find("p span").First().Text()))

	tags := make([]string, 0, 1)
	if category := strings.TrimSpace(item.Find("p span a.xi1").Text()); category != "" {
		tags = append(tags, category)
	}

	links, detailContent := p.fetchDetailLinks(client, postID)
	if detailContent != "" {
		content = detailContent
	}

	return model.SearchResult{
		UniqueID: fmt.Sprintf("%s-%s", p.Name(), postID),
		Title:    title,
		Content:  content,
		Datetime: datetime,
		Links:    links,
		Tags:     tags,
	}
}

func (p *Hdr4kAsyncPlugin) fetchDetailLinks(client *http.Client, postID string) ([]model.Link, string) {
	cacheKey := fmt.Sprintf("detail:%s", postID)
	if cached, ok := p.detailCache.Load(cacheKey); ok {
		if item, valid := cached.(detailCacheItem); valid && time.Now().Before(item.expiresAt) {
			return item.links, item.content
		}
		p.detailCache.Delete(cacheKey)
	}

	ctx, cancel := context.WithTimeout(context.Background(), detailTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf(threadURLPattern, postID), nil)
	if err != nil {
		return nil, ""
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Referer", "https://www.4khdr.cn/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ""
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, ""
	}

	links, detailContent := p.extractDetailFromDocument(doc)
	p.detailCache.Store(cacheKey, detailCacheItem{
		links:     links,
		content:   detailContent,
		expiresAt: time.Now().Add(cacheTTL),
	})
	return links, detailContent
}

func (p *Hdr4kAsyncPlugin) extractDetailFromDocument(doc *goquery.Document) ([]model.Link, string) {
	content := ""
	links := make([]model.Link, 0)
	seen := make(map[string]struct{})

	doc.Find(".t_f, [id^='postmessage_']").Each(func(_ int, area *goquery.Selection) {
		if content == "" {
			text := cleanHTML(area.Text())
			if len([]rune(text)) > 50 {
				content = truncateRunes(text, 500)
			}
		}

		for _, parsed := range linkparser.ExtractLinksFromSelection(area) {
			key := strings.ToLower(parsed.URL)
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			links = append(links, model.Link{
				Type:     parsed.Type,
				URL:      parsed.URL,
				Password: parsed.Password,
			})
		}
	})

	return links, content
}

func getAttr(selection *goquery.Selection, name string) string {
	value, _ := selection.Attr(name)
	return value
}

func isEmptyRequestPost(title string, links []model.Link) bool {
	if len(links) > 0 {
		return false
	}
	lowerTitle := strings.ToLower(title)
	keywords := []string{"求片", "有资源吗", "有没有资源", "跪求", "求资源", "求阿里云盘", "求百度网盘", "求夸克网盘"}
	for _, keyword := range keywords {
		if strings.Contains(lowerTitle, keyword) {
			return true
		}
	}
	return strings.HasPrefix(lowerTitle, "求") && len([]rune(title)) < 10
}

func parseDateTime(value string) time.Time {
	value = strings.TrimSpace(value)
	layouts := []string{"2006-1-2 15:04", "2006-01-02 15:04:05", "2006-1-2 15:04:05", "2006-01-02 15:04"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed
		}
	}
	return time.Time{}
}

func cleanHTML(html string) string {
	replacements := map[string]string{
		"<br>":     " ",
		"<br/>":    " ",
		"<br />":   " ",
		"&nbsp;":   " ",
		"&hellip;": "...",
		"&amp;":    "&",
		"&lt;":     "<",
		"&gt;":     ">",
		"&quot;":   "\"",
		"&#039;":   "'",
	}
	result := html
	for old, replacement := range replacements {
		result = strings.ReplaceAll(result, old, replacement)
	}
	for {
		start := strings.Index(result, "<")
		end := strings.Index(result, ">")
		if start < 0 || end < start {
			break
		}
		result = result[:start] + " " + result[end+1:]
	}
	return strings.Join(strings.Fields(result), " ")
}

func truncateRunes(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit]) + "..."
}

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
