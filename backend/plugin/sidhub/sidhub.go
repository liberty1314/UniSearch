package sidhub

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	cloudscraper "github.com/Advik-B/cloudscraper/lib"
	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
)

const (
	pluginName           = "sidhub"
	defaultPriority      = 3
	primaryBaseURL       = "https://sidhub.cc"
	fallbackBaseURL      = "https://www.seedhub.cc"
	maxSearchCards       = 5
	maxDetailLinks       = 80
	maxQuarkResolveLinks = 8
	cacheTTL             = 1 * time.Hour
)

var (
	searchCache sync.Map

	movieIDRegex        = regexp.MustCompile(`/movies/(\d+)/?`)
	movieInfoRegex      = regexp.MustCompile(`\d{4}\s*/\s*(?:电影|剧集|动漫)[^豆瓣评分类型]*`)
	ratingRegex         = regexp.MustCompile(`豆瓣评分[:：]\s*([0-9.]+)`)
	yearRegex           = regexp.MustCompile(`\b(19|20)\d{2}\b`)
	magnetRegex         = regexp.MustCompile(`(?i)magnet:\?xt=urn:btih:[0-9a-f]{32,40}[^\s<"']*`)
	ed2kRegex           = regexp.MustCompile(`(?i)ed2k://\|file\|[^\s<"']+`)
	thunderRegex        = regexp.MustCompile(`(?i)thunder://[^\s<"']+`)
	quarkResolvedRegex  = regexp.MustCompile(`https?://pan\.quark\.cn/s/[0-9A-Za-z]+`)
	spaceCollapseRegex  = regexp.MustCompile(`\s+`)
	linkStartPathPrefix = "/link_start/"
)

type cachedSearchResult struct {
	results   []model.SearchResult
	expiresAt time.Time
}

// SidHubAsyncPlugin 接入 SidHub / SeedHub 影视资源搜索。
type SidHubAsyncPlugin struct {
	*plugin.BaseAsyncPlugin
	scraper     *cloudscraper.Scraper
	scraperErr  error
	scraperOnce sync.Once
	fetcher     func(string) ([]byte, error)
}

type sidHubMovie struct {
	ID        string
	Title     string
	DetailURL string
	CoverURL  string
	Content   string
	MediaType string
	Tags      []string
}

type sidHubLinkEntry struct {
	Link  model.Link
	Title string
}

func init() {
	plugin.RegisterGlobalPlugin(NewSidHubPlugin())
}

// NewSidHubPlugin 创建 SidHub 搜索插件。
func NewSidHubPlugin() *SidHubAsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.sidhub",
		Name:            "SidHub",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 SidHub 的影视、动漫资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "SidHub",
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

	return &SidHubAsyncPlugin{
		BaseAsyncPlugin: basePlugin,
	}
}

// DisplayName 返回后台展示名称。
func (p *SidHubAsyncPlugin) DisplayName() string {
	return "SidHub"
}

// Search 执行搜索并返回结果。
func (p *SidHubAsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *SidHubAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *SidHubAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	trimmedKeyword := strings.TrimSpace(keyword)
	if trimmedKeyword == "" {
		return []model.SearchResult{}, nil
	}

	cacheKey := strings.ToLower(trimmedKeyword)
	if cached, ok := searchCache.Load(cacheKey); ok {
		entry, valid := cached.(cachedSearchResult)
		if valid && time.Now().Before(entry.expiresAt) {
			return cloneResults(entry.results), nil
		}
		searchCache.Delete(cacheKey)
	}

	var lastErr error
	for _, baseURL := range resolveBaseURLs(ext) {
		results, err := p.searchBaseURL(baseURL, trimmedKeyword)
		if err != nil {
			lastErr = err
			continue
		}
		if len(results) == 0 {
			continue
		}

		searchCache.Store(cacheKey, cachedSearchResult{
			results:   cloneResults(results),
			expiresAt: time.Now().Add(cacheTTL),
		})
		return results, nil
	}

	if lastErr != nil {
		return nil, fmt.Errorf("[%s] SidHub 搜索失败: %w", p.Name(), lastErr)
	}
	return []model.SearchResult{}, nil
}

func (p *SidHubAsyncPlugin) searchBaseURL(baseURL string, keyword string) ([]model.SearchResult, error) {
	searchURL := buildSearchURL(baseURL, keyword)
	body, err := p.fetchURL(searchURL)
	if err != nil {
		return nil, err
	}

	cards, err := parseSearchCards(bytes.NewReader(body), baseURL, maxSearchCards)
	if err != nil {
		return nil, err
	}

	results := make([]model.SearchResult, 0, len(cards))
	for _, card := range cards {
		entries := []sidHubLinkEntry{}
		detailBody, detailErr := p.fetchURL(card.DetailURL)
		if detailErr == nil {
			parsedEntries, parseErr := parseDetailLinkEntries(bytes.NewReader(detailBody), baseURL, card.Title)
			if parseErr == nil {
				entries = limitLinkEntries(p.resolveQuarkLinks(parsedEntries), maxDetailLinks)
			}
		}

		results = append(results, buildResult(card, entries))
	}

	return results, nil
}

func (p *SidHubAsyncPlugin) fetchURL(targetURL string) ([]byte, error) {
	if p.fetcher != nil {
		return p.fetcher(targetURL)
	}

	scraper, err := p.getScraper()
	if err != nil {
		return nil, err
	}

	resp, err := scraper.Get(targetURL)
	if err != nil {
		return nil, fmt.Errorf("请求 %s 失败: %w", targetURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("请求 %s 返回状态码 %d", targetURL, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 %s 响应失败: %w", targetURL, err)
	}
	if isCloudflareChallenge(body) {
		return nil, fmt.Errorf("请求 %s 仍返回 Cloudflare 挑战页", targetURL)
	}

	return body, nil
}

func (p *SidHubAsyncPlugin) getScraper() (*cloudscraper.Scraper, error) {
	p.scraperOnce.Do(func() {
		p.scraper, p.scraperErr = cloudscraper.New(
			cloudscraper.WithSessionConfig(true, 30*time.Minute, 2),
		)
	})
	if p.scraperErr != nil {
		return nil, fmt.Errorf("初始化 Cloudflare 会话失败: %w", p.scraperErr)
	}
	return p.scraper, nil
}

func (p *SidHubAsyncPlugin) resolveQuarkLinks(entries []sidHubLinkEntry) []sidHubLinkEntry {
	resolved := make([]sidHubLinkEntry, 0, len(entries))
	quarkResolveCount := 0

	for _, entry := range entries {
		nextEntry := entry
		if entry.Link.Type == "quark" && strings.Contains(entry.Link.URL, linkStartPathPrefix) && quarkResolveCount < maxQuarkResolveLinks {
			if resolvedURL, err := p.resolveQuarkURL(entry.Link.URL); err == nil && resolvedURL != "" {
				nextEntry.Link.URL = resolvedURL
			}
			quarkResolveCount++
		}
		resolved = append(resolved, nextEntry)
	}

	return resolved
}

func (p *SidHubAsyncPlugin) resolveQuarkURL(linkURL string) (string, error) {
	body, err := p.fetchURL(linkURL)
	if err != nil {
		return "", err
	}
	matches := quarkResolvedRegex.FindAllString(string(body), 1)
	if len(matches) == 0 {
		return "", nil
	}
	return matches[0], nil
}

func parseSearchCards(reader io.Reader, baseURL string, limit int) ([]sidHubMovie, error) {
	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return nil, fmt.Errorf("解析 SidHub 搜索页失败: %w", err)
	}

	cards := make([]sidHubMovie, 0, limit)
	seenIDs := make(map[string]struct{})

	doc.Find(`a[title][href*="/movies/"]`).EachWithBreak(func(index int, selection *goquery.Selection) bool {
		if limit > 0 && len(cards) >= limit {
			return false
		}

		href, exists := selection.Attr("href")
		if !exists {
			return true
		}
		movieID := extractMovieID(href)
		if movieID == "" {
			return true
		}
		if _, exists := seenIDs[movieID]; exists {
			return true
		}

		title := cleanText(attrOrText(selection, "title"))
		if title == "" {
			return true
		}

		container := searchCardContainer(selection)
		containerText := cleanText(container.Text())
		content := buildMovieContent(containerText)

		cards = append(cards, sidHubMovie{
			ID:        movieID,
			Title:     title,
			DetailURL: absoluteURL(baseURL, href),
			CoverURL:  extractCoverURL(selection, baseURL),
			Content:   content,
			MediaType: inferMediaType(containerText),
			Tags:      extractTags(containerText),
		})
		seenIDs[movieID] = struct{}{}
		return true
	})

	return cards, nil
}

func parseDetailLinks(reader io.Reader, baseURL string, movieTitle string) ([]model.Link, error) {
	entries, err := parseDetailLinkEntries(reader, baseURL, movieTitle)
	if err != nil {
		return nil, err
	}

	links := make([]model.Link, 0, len(entries))
	for _, entry := range entries {
		links = append(links, entry.Link)
	}
	return links, nil
}

func parseDetailLinkEntries(reader io.Reader, baseURL string, movieTitle string) ([]sidHubLinkEntry, error) {
	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return nil, fmt.Errorf("解析 SidHub 详情页失败: %w", err)
	}

	entries := make([]sidHubLinkEntry, 0, maxDetailLinks)
	seen := make(map[string]struct{})

	doc.Find("a[href]").Each(func(index int, selection *goquery.Selection) {
		href, _ := selection.Attr("href")
		href = strings.TrimSpace(href)
		if href == "" {
			return
		}

		linkType := normalizeLinkType(dataLinkValue(selection))
		if linkType == "" {
			linkType = determineDirectLinkType(href)
		}
		if linkType == "" {
			return
		}

		linkURL := absoluteURL(baseURL, href)
		if linkURL == "" {
			return
		}

		addLinkEntry(&entries, seen, sidHubLinkEntry{
			Link: model.Link{
				Type:      linkType,
				URL:       linkURL,
				Password:  extractPassword(linkURL),
				WorkTitle: cleanText(movieTitle),
			},
			Title: cleanText(attrOrText(selection, "title")),
		})
	})

	for _, linkURL := range extractDirectTextLinks(doc.Text()) {
		linkType := determineDirectLinkType(linkURL)
		if linkType == "" {
			continue
		}
		addLinkEntry(&entries, seen, sidHubLinkEntry{
			Link: model.Link{
				Type:      linkType,
				URL:       linkURL,
				WorkTitle: cleanText(movieTitle),
			},
			Title: cleanText(movieTitle),
		})
	}

	return entries, nil
}

func buildResult(card sidHubMovie, entries []sidHubLinkEntry) model.SearchResult {
	links := make([]model.Link, 0, len(entries))
	for _, entry := range entries {
		links = append(links, entry.Link)
	}

	images := []string{}
	if card.CoverURL != "" {
		images = append(images, card.CoverURL)
	}

	return model.SearchResult{
		UniqueID:       fmt.Sprintf("%s-%s", pluginName, card.ID),
		Title:          card.Title,
		Content:        buildResultContent(card, entries),
		Links:          links,
		Tags:           append([]string(nil), card.Tags...),
		Images:         images,
		SourcePluginID: pluginName,
		SourceType:     "plugin",
		SourceName:     "SidHub",
		MediaType:      card.MediaType,
		TargetType:     "share",
		DetailURL:      card.DetailURL,
		Capabilities: model.ResourceCapabilities{
			Searchable:      true,
			ShareSearchable: len(links) > 0,
			Downloadable:    len(links) > 0,
		},
		Meta: map[string]interface{}{
			"sid_hub_movie_id": card.ID,
			"detail_url":       card.DetailURL,
			"link_count":       len(links),
		},
	}
}

func buildSearchURL(baseURL string, keyword string) string {
	trimmedBase := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	return fmt.Sprintf("%s/s/%s/", trimmedBase, url.PathEscape(strings.TrimSpace(keyword)))
}

func resolveBaseURLs(ext map[string]interface{}) []string {
	if ext != nil {
		if customBaseURL, ok := ext["sidhub_base_url"].(string); ok && strings.TrimSpace(customBaseURL) != "" {
			return []string{strings.TrimRight(strings.TrimSpace(customBaseURL), "/")}
		}
	}
	return []string{primaryBaseURL, fallbackBaseURL}
}

func extractMovieID(href string) string {
	matches := movieIDRegex.FindStringSubmatch(href)
	if len(matches) < 2 {
		return ""
	}
	return matches[1]
}

func searchCardContainer(selection *goquery.Selection) *goquery.Selection {
	container := selection.ParentsFiltered("article, li, .movie-card, .card, .item, .col, div").First()
	if container.Length() == 0 {
		return selection.Parent()
	}
	return container
}

func extractCoverURL(selection *goquery.Selection, baseURL string) string {
	image := selection.Find("img").First()
	for _, attr := range []string{"data-src", "data-original", "src"} {
		if value, exists := image.Attr(attr); exists && strings.TrimSpace(value) != "" {
			return absoluteURL(baseURL, strings.TrimSpace(value))
		}
	}
	return ""
}

func buildMovieContent(text string) string {
	parts := make([]string, 0, 3)
	if info := extractMovieInfo(text); info != "" {
		parts = append(parts, info)
	}
	if genre := extractPrefixedValue(text, "类型"); genre != "" {
		parts = append(parts, "类型: "+genre)
	}
	if rating := extractRating(text); rating != "" {
		parts = append(parts, "豆瓣评分: "+rating)
	}
	return strings.Join(parts, " | ")
}

func buildResultContent(card sidHubMovie, entries []sidHubLinkEntry) string {
	parts := make([]string, 0, len(entries)+3)
	if card.Content != "" {
		parts = append(parts, card.Content)
	}
	if len(entries) > 0 {
		parts = append(parts, "资源类型: "+formatLinkTypeSummary(entries))
	}
	for _, entry := range entries {
		if entry.Title == "" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s %s", entry.Title, entry.Link.URL))
		if len(parts) >= 24 {
			break
		}
	}
	return strings.Join(parts, "\n")
}

func extractMovieInfo(text string) string {
	return cleanText(movieInfoRegex.FindString(text))
}

func extractRating(text string) string {
	matches := ratingRegex.FindStringSubmatch(text)
	if len(matches) < 2 {
		return ""
	}
	return cleanText(matches[1])
}

func extractPrefixedValue(text string, prefix string) string {
	marker := prefix + ":"
	index := strings.Index(text, marker)
	if index < 0 {
		marker = prefix + "："
		index = strings.Index(text, marker)
	}
	if index < 0 {
		return ""
	}
	value := text[index+len(marker):]
	for _, separator := range []string{"豆瓣评分", "年份", "主演"} {
		if separatorIndex := strings.Index(value, separator); separatorIndex >= 0 {
			value = value[:separatorIndex]
		}
	}
	return cleanText(value)
}

func extractTags(text string) []string {
	matches := yearRegex.FindAllString(text, 1)
	if len(matches) == 0 {
		return []string{}
	}
	return []string{matches[0]}
}

func inferMediaType(text string) string {
	switch {
	case strings.Contains(text, "动漫"):
		return "anime"
	case strings.Contains(text, "剧集"):
		return "tv"
	case strings.Contains(text, "电影"):
		return "movie"
	default:
		return "unknown"
	}
}

func normalizeLinkType(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch {
	case strings.Contains(normalized, "quark"):
		return "quark"
	case strings.Contains(normalized, "baidu"):
		return "baidu"
	case strings.Contains(normalized, "alipan"), strings.Contains(normalized, "aliyun"):
		return "aliyun"
	case normalized == "uc" || strings.Contains(normalized, "ucpan") || strings.Contains(normalized, "drive_uc"):
		return "uc"
	case strings.Contains(normalized, "xunlei"):
		return "xunlei"
	case strings.Contains(normalized, "magnet"):
		return "magnet"
	case strings.Contains(normalized, "ed2k"):
		return "ed2k"
	case strings.Contains(normalized, "thunder"):
		return "thunder"
	default:
		return ""
	}
}

func determineDirectLinkType(linkURL string) string {
	lowerURL := strings.ToLower(strings.TrimSpace(linkURL))
	switch {
	case strings.HasPrefix(lowerURL, "magnet:"):
		return "magnet"
	case strings.HasPrefix(lowerURL, "ed2k:"):
		return "ed2k"
	case strings.HasPrefix(lowerURL, "thunder:"):
		return "thunder"
	case strings.Contains(lowerURL, "pan.quark.cn"):
		return "quark"
	case strings.Contains(lowerURL, "pan.baidu.com"):
		return "baidu"
	case strings.Contains(lowerURL, "aliyundrive.com"), strings.Contains(lowerURL, "alipan.com"):
		return "aliyun"
	case strings.Contains(lowerURL, "drive.uc.cn"):
		return "uc"
	case strings.Contains(lowerURL, "pan.xunlei.com"):
		return "xunlei"
	default:
		return ""
	}
}

func dataLinkValue(selection *goquery.Selection) string {
	if value, exists := selection.Attr("data-link"); exists {
		return value
	}
	parent := selection.ParentsFiltered("[data-link]").First()
	if value, exists := parent.Attr("data-link"); exists {
		return value
	}
	return ""
}

func addLinkEntry(entries *[]sidHubLinkEntry, seen map[string]struct{}, entry sidHubLinkEntry) {
	if entry.Link.URL == "" || entry.Link.Type == "" {
		return
	}
	key := entry.Link.Type + "|" + entry.Link.URL
	if _, exists := seen[key]; exists {
		return
	}
	seen[key] = struct{}{}
	*entries = append(*entries, entry)
}

func extractDirectTextLinks(text string) []string {
	links := make([]string, 0)
	links = append(links, magnetRegex.FindAllString(text, -1)...)
	links = append(links, ed2kRegex.FindAllString(text, -1)...)
	links = append(links, thunderRegex.FindAllString(text, -1)...)
	return links
}

func attrOrText(selection *goquery.Selection, attr string) string {
	if value, exists := selection.Attr(attr); exists && strings.TrimSpace(value) != "" {
		return value
	}
	return selection.Text()
}

func absoluteURL(baseURL string, rawURL string) string {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return ""
	}

	lowerURL := strings.ToLower(trimmed)
	if strings.HasPrefix(lowerURL, "magnet:") || strings.HasPrefix(lowerURL, "ed2k:") || strings.HasPrefix(lowerURL, "thunder:") {
		return trimmed
	}

	parsedURL, err := url.Parse(trimmed)
	if err != nil {
		return ""
	}
	if parsedURL.IsAbs() {
		return parsedURL.String()
	}

	parsedBaseURL, err := url.Parse(strings.TrimRight(baseURL, "/") + "/")
	if err != nil {
		return ""
	}
	return parsedBaseURL.ResolveReference(parsedURL).String()
}

func extractPassword(linkURL string) string {
	parsedURL, err := url.Parse(linkURL)
	if err != nil {
		return ""
	}
	for _, key := range []string{"pwd", "password", "code"} {
		if value := strings.TrimSpace(parsedURL.Query().Get(key)); value != "" {
			return value
		}
	}
	return ""
}

func cleanText(value string) string {
	return strings.TrimSpace(spaceCollapseRegex.ReplaceAllString(value, " "))
}

func formatLinkTypeSummary(entries []sidHubLinkEntry) string {
	counts := make(map[string]int)
	for _, entry := range entries {
		counts[entry.Link.Type]++
	}

	orderedTypes := []string{"quark", "baidu", "aliyun", "uc", "xunlei", "magnet", "thunder", "ed2k"}
	parts := make([]string, 0, len(counts))
	for _, linkType := range orderedTypes {
		if count := counts[linkType]; count > 0 {
			parts = append(parts, fmt.Sprintf("%s %d", linkType, count))
		}
	}

	otherTypes := make([]string, 0)
	for linkType := range counts {
		if !containsString(orderedTypes, linkType) {
			otherTypes = append(otherTypes, linkType)
		}
	}
	sort.Strings(otherTypes)
	for _, linkType := range otherTypes {
		parts = append(parts, fmt.Sprintf("%s %d", linkType, counts[linkType]))
	}
	return strings.Join(parts, " / ")
}

func limitLinkEntries(entries []sidHubLinkEntry, limit int) []sidHubLinkEntry {
	if limit <= 0 || len(entries) <= limit {
		return entries
	}
	limited := make([]sidHubLinkEntry, limit)
	copy(limited, entries[:limit])
	return limited
}

func cloneResults(results []model.SearchResult) []model.SearchResult {
	cloned := make([]model.SearchResult, len(results))
	copy(cloned, results)
	return cloned
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func isCloudflareChallenge(body []byte) bool {
	text := strings.ToLower(string(body))
	return strings.Contains(text, "just a moment") &&
		(strings.Contains(text, "cf_chl") || strings.Contains(text, "cloudflare"))
}
