package sidhub

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	cloudscraper "github.com/Advik-B/cloudscraper/lib"
	"github.com/PuerkitoBio/goquery"

	"unisearch/model"
	"unisearch/plugin"
)

const (
	pluginName                         = "sidhub"
	pluginDisplayName                  = "SeedHub"
	defaultPriority                    = 3
	defaultPreResolvedLinkStartPerType = 0
	maxPreResolvedLinkStartPerType     = 20
	primaryBaseURL                     = "https://sidhub.cc"
	fallbackBaseURL                    = "https://www.seedhub.cc"
	maxSearchCards                     = 5
	maxExpandedResultsPerMovie         = 240
	cacheTTL                           = 1 * time.Hour
)

const (
	sidHubResolutionResolved = "resolved"
	sidHubResolutionFallback = "fallback"
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
	httpURLRegex        = regexp.MustCompile(`https?://[^\s"'<>]+`)
	atobValueRegex      = regexp.MustCompile(`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["']([A-Za-z0-9+/=]{16,})["']`)
	atobCallRegex       = regexp.MustCompile(`\batob\s*\(\s*([A-Za-z_$][\w$]*)\s*\)`)
	base64ImageRegex    = regexp.MustCompile(`data:image/[^;]+;base64,[A-Za-z0-9+/=]+`)
	panLinkRegex        = regexp.MustCompile(`(?i)var\s+panLink\s*=\s*["']([^"']+)["']`)
	transferCodeRegex   = regexp.MustCompile(`(?:转存|提取|访问|分享)?(?:口令|密码|验证码|提取码|访问码)\s*[:：]?\s*([A-Za-z0-9]{4,})`)
	spaceCollapseRegex  = regexp.MustCompile(`\s+`)
	groupCountRegex     = regexp.MustCompile(`[（(]\d+[）)]`)
	sidHubSizeRegex     = regexp.MustCompile(`(?i)\d+(?:\.\d+)?\s*(?:G|GB|M|MB)`)
	sidHubYearTextRegex = regexp.MustCompile(`20\d{2}年`)
	sidHubDateTextRegex = regexp.MustCompile(`(?:今天|昨天|\d+\s*天前)`)
	linkStartPathPrefix = "/link_start/"
)

var scanTransferHintTexts = []string{
	"手机扫码转存",
	"请使用手机",
	"扫码转存",
	"网盘链接容易被吞",
	"使用手机扫码",
}

var sidHubLowSignalEntryTitles = map[string]struct{}{
	"打开":   {},
	"打开链接": {},
	"查看":   {},
	"查看链接": {},
	"下载":   {},
	"复制":   {},
	"复制链接": {},
	"链接":   {},
	"网盘":   {},
	"网盘链接": {},
	"夸克":   {},
	"百度":   {},
	"迅雷":   {},
	"uc":   {},
	"阿里":   {},
	"磁力":   {},
}

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
	Link             model.Link
	Title            string
	GroupLabel       string
	Index            int
	Size             string
	Year             string
	Badges           []string
	TitleSource      string
	LinkTypeSource   string
	ResolutionStatus string
	ResolutionRank   int
}

type sidHubRuntimeConfig struct {
	PreResolvedLinkStartPerType int
}

func init() {
	plugin.RegisterGlobalPlugin(NewSidHubPlugin())
}

// NewSidHubPlugin 创建 SidHub 搜索插件。
func NewSidHubPlugin() *SidHubAsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.sidhub",
		Name:            pluginDisplayName,
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 SeedHub 的影视、动漫资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		ConfigSchema: []model.PluginConfigField{
			{
				Key:         "pre_resolved_link_start_per_type",
				Label:       "每类完整解析数量",
				Type:        "number",
				Default:     float64(defaultPreResolvedLinkStartPerType),
				Description: "SeedHub 每个资源类型前 N 条 link_start 会在搜索阶段尝试完整解析；0 表示点击时再获取扫码载荷。",
				Group:       "解析性能",
			},
		},
		Resource: model.ResourceDescriptor{
			SourceLabel:         pluginDisplayName,
			SourceGroup:         "search",
			SupportedMediaTypes: []string{"movie", "tv", "anime", "documentary", "unknown"},
			TargetTypes:         []string{"share", "download"},
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
	return pluginDisplayName
}

// SetFetcherForTest 注入测试抓取器，便于在单测中固定 link_start 页面样本。
func (p *SidHubAsyncPlugin) SetFetcherForTest(fetcher func(string) ([]byte, error)) {
	p.fetcher = fetcher
}

// Search 执行搜索并返回结果。
// SearchWithResult 执行搜索并返回带状态的结果。
func (p *SidHubAsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	results, err := p.doSearch(p.GetClient(), keyword, ext)
	if err != nil {
		return model.PluginSearchResult{}, err
	}

	return model.PluginSearchResult{
		Results:   results,
		IsFinal:   true,
		Timestamp: time.Now(),
		Source:    p.Name(),
		Message:   "搜索完成",
	}, nil
}

func (p *SidHubAsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	trimmedKeyword := strings.TrimSpace(keyword)
	if trimmedKeyword == "" {
		return []model.SearchResult{}, nil
	}

	runtimeConfig := resolveSidHubRuntimeConfig(ext)
	cacheKey := fmt.Sprintf("%s:%d:%s", strings.ToLower(trimmedKeyword), runtimeConfig.PreResolvedLinkStartPerType, strings.Join(resolveBaseURLs(ext), ","))
	if cached, ok := searchCache.Load(cacheKey); ok {
		entry, valid := cached.(cachedSearchResult)
		if valid && time.Now().Before(entry.expiresAt) {
			return cloneResults(entry.results), nil
		}
		searchCache.Delete(cacheKey)
	}

	var lastErr error
	for _, baseURL := range resolveBaseURLs(ext) {
		results, err := p.searchBaseURL(context.Background(), baseURL, trimmedKeyword, runtimeConfig)
		if err != nil {
			lastErr = err
			continue
		}
		if len(results) == 0 {
			return []model.SearchResult{}, nil
		}

		searchCache.Store(cacheKey, cachedSearchResult{
			results:   cloneResults(results),
			expiresAt: time.Now().Add(cacheTTL),
		})
		return results, nil
	}

	if lastErr != nil {
		return nil, fmt.Errorf("[%s] %s 搜索失败: %w", p.Name(), pluginDisplayName, lastErr)
	}
	return []model.SearchResult{}, nil
}

func (p *SidHubAsyncPlugin) searchBaseURL(ctx context.Context, baseURL string, keyword string, runtimeConfig sidHubRuntimeConfig) ([]model.SearchResult, error) {
	searchURL := buildSearchURL(baseURL, keyword)
	body, err := p.fetchURL(ctx, searchURL)
	if err != nil {
		return nil, err
	}

	cards, err := parseSearchCards(bytes.NewReader(body), baseURL, maxSearchCards)
	if err != nil {
		return nil, err
	}

	results := make([]model.SearchResult, 0, len(cards))
	for _, card := range cards {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		entries := []sidHubLinkEntry{}
		detailBody, detailErr := p.fetchURL(ctx, card.DetailURL)
		if detailErr == nil {
			parsedEntries, parseErr := parseDetailLinkEntries(bytes.NewReader(detailBody), baseURL, card.Title)
			if parseErr == nil {
				entries, _ = limitExpandedSidHubEntries(p.resolveLinkStartEntries(ctx, parsedEntries, card.ID, runtimeConfig.PreResolvedLinkStartPerType))
			}
		}

		results = append(results, buildExpandedResults(card, entries)...)
	}

	return results, nil
}

func (p *SidHubAsyncPlugin) fetchURL(ctx context.Context, targetURL string) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if p.fetcher != nil {
		type fetchResult struct {
			body []byte
			err  error
		}
		resultCh := make(chan fetchResult, 1)
		go func() {
			body, err := p.fetcher(targetURL)
			select {
			case resultCh <- fetchResult{body: body, err: err}:
			case <-ctx.Done():
			}
		}()
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case result := <-resultCh:
			if result.err != nil {
				return nil, result.err
			}
			if isCloudflareChallenge(result.body) {
				return nil, fmt.Errorf("请求 %s 仍返回 Cloudflare 挑战页", targetURL)
			}
			return result.body, nil
		}
	}

	scraper, err := p.getScraper()
	if err != nil {
		return nil, err
	}

	type scraperResult struct {
		resp *http.Response
		err  error
	}
	resultCh := make(chan scraperResult, 1)
	go func() {
		resp, err := scraper.Get(targetURL)
		select {
		case resultCh <- scraperResult{resp: resp, err: err}:
		case <-ctx.Done():
			if resp != nil && resp.Body != nil {
				_ = resp.Body.Close()
			}
		}
	}()

	var resp *http.Response
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case result := <-resultCh:
		if result.err != nil {
			return nil, fmt.Errorf("请求 %s 失败: %w", targetURL, result.err)
		}
		resp = result.resp
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("请求 %s 返回状态码 %d", targetURL, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 %s 响应失败: %w", targetURL, err)
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	body, err = decodeSidHubHTTPBody(body, resp.Header.Get("Content-Encoding"))
	if err != nil {
		return nil, fmt.Errorf("解压 %s 响应失败: %w", targetURL, err)
	}
	if isCloudflareChallenge(body) {
		return nil, fmt.Errorf("请求 %s 仍返回 Cloudflare 挑战页", targetURL)
	}

	return body, nil
}

func decodeSidHubHTTPBody(body []byte, contentEncoding string) ([]byte, error) {
	encoding := strings.ToLower(strings.TrimSpace(contentEncoding))
	if encoding != "gzip" && !hasGzipMagicHeader(body) {
		return body, nil
	}

	reader, err := gzip.NewReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	decoded, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func hasGzipMagicHeader(body []byte) bool {
	return len(body) >= 2 && body[0] == 0x1f && body[1] == 0x8b
}

// RefreshScanTransfer 重新抓取当前扫码转存页并返回最新载荷。
func (p *SidHubAsyncPlugin) RefreshScanTransfer(ctx context.Context, linkURL string, refreshKey string) (model.Link, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	refreshTarget, err := parseSeedHubRefreshKey(refreshKey)
	if err != nil {
		return model.Link{}, err
	}

	trimmedURL := strings.TrimSpace(linkURL)
	if refreshTarget.linkURL != "" {
		trimmedURL = refreshTarget.linkURL
	}
	if trimmedURL == "" || !strings.Contains(trimmedURL, linkStartPathPrefix) {
		return model.Link{}, fmt.Errorf("无效的 SeedHub 刷新链接")
	}

	body, err := p.fetchURL(ctx, trimmedURL)
	if err != nil {
		return model.Link{}, fmt.Errorf("获取 SeedHub 刷新页失败: %w", err)
	}
	if err := ctx.Err(); err != nil {
		return model.Link{}, err
	}

	refreshedLink, handled, err := resolveLinkStartLink(model.Link{
		Type: refreshTarget.linkType,
		URL:  trimmedURL,
	}, body, refreshTarget.movieID, refreshTarget.entryIndex)
	if err != nil {
		return model.Link{}, err
	}
	if !handled || refreshedLink.AccessMode != "scan_transfer" || refreshedLink.ScanTransfer == nil {
		return model.Link{}, fmt.Errorf("当前资源未返回可刷新的扫码转存载荷")
	}
	if refreshTarget.linkURL != "" {
		refreshedLink.ScanTransfer.Refreshable = true
		refreshedLink.ScanTransfer.RefreshKey = strings.TrimSpace(refreshKey)
		refreshedLink.ScanTransfer.SourcePageURL = trimmedURL
	}

	return refreshedLink, nil
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

func (p *SidHubAsyncPlugin) resolveLinkStartEntries(ctx context.Context, entries []sidHubLinkEntry, movieID string, limits ...int) []sidHubLinkEntry {
	if ctx == nil {
		ctx = context.Background()
	}
	resolved := make([]sidHubLinkEntry, 0, len(entries))
	limit := defaultPreResolvedLinkStartPerType
	if len(limits) > 0 {
		limit = clampSidHubPreResolvedLimit(limits[0])
	}
	resolvedCountByType := make(map[string]int)

	for _, entry := range entries {
		if ctx.Err() != nil {
			return resolved
		}
		nextEntry := entry
		if !shouldResolveSeedHubLinkStart(entry.Link) {
			resolved = append(resolved, nextEntry)
			continue
		}

		linkType := normalizeLinkType(entry.Link.Type)
		if linkType == "" {
			linkType = strings.TrimSpace(entry.Link.Type)
		}
		if resolvedCountByType[linkType] < limit {
			resolvedCountByType[linkType]++
			if body, err := p.fetchURL(ctx, entry.Link.URL); err == nil {
				if resolvedLink, handled, resolveErr := resolveLinkStartLink(entry.Link, body, movieID, entry.Index); resolveErr == nil && handled {
					nextEntry.Link = resolvedLink
					nextEntry.ResolutionStatus = sidHubResolutionResolved
					nextEntry.ResolutionRank = 0
					resolved = append(resolved, nextEntry)
					continue
				}
			}
			nextEntry.ResolutionStatus = sidHubResolutionFallback
			nextEntry.ResolutionRank = 1
		}

		nextEntry.Link = buildFallbackScanTransferLink(entry.Link, movieID, entry.Index)
		resolved = append(resolved, nextEntry)
	}

	return resolved
}

func shouldResolveSeedHubLinkStart(link model.Link) bool {
	if !strings.Contains(link.URL, linkStartPathPrefix) {
		return false
	}
	return normalizeLinkType(link.Type) != ""
}

func resolveLinkStartLink(original model.Link, body []byte, movieID string, entryIndex int) (model.Link, bool, error) {
	resolvedLink := cloneSidHubLink(original)

	if isSeedHubDownloadType(original.Type) {
		if directURL := extractDirectResourceURLFromLinkStart(body, original.Type); directURL != "" {
			return applyDirectSeedHubLink(resolvedLink, directURL), true, nil
		}
	}

	scanTransfer, detected, err := extractScanTransferInfo(body, original.URL, original.Type, movieID, entryIndex)
	if err != nil {
		return original, false, err
	}
	if detected {
		resolvedLink.AccessMode = "scan_transfer"
		resolvedLink.ScanTransfer = scanTransfer
		return resolvedLink, true, nil
	}

	if directURL := extractDirectResourceURLFromLinkStart(body, original.Type); directURL != "" {
		return applyDirectSeedHubLink(resolvedLink, directURL), true, nil
	}

	return original, false, nil
}

func applyDirectSeedHubLink(link model.Link, directURL string) model.Link {
	resolvedLink := cloneSidHubLink(link)
	resolvedLink.URL = directURL
	if directType := determineDirectLinkType(directURL); directType != "" {
		resolvedLink.Type = directType
	}
	resolvedLink.Password = extractPassword(directURL)
	resolvedLink.AccessMode = resolveSeedHubLinkAccessMode(resolvedLink)
	resolvedLink.ScanTransfer = nil
	return resolvedLink
}

func buildFallbackScanTransferLink(link model.Link, movieID string, entryIndex int) model.Link {
	resolvedLink := cloneSidHubLink(link)
	resolvedLink.AccessMode = "scan_transfer"
	resolvedLink.ScanTransfer = &model.ScanTransferInfo{
		Provider:      strings.TrimSpace(link.Type),
		Instruction:   "请使用手机网盘 App 扫码转存。",
		SourcePageURL: strings.TrimSpace(link.URL),
	}

	if refreshKey := buildSeedHubRefreshKey(movieID, link.Type, entryIndex); refreshKey != "" {
		resolvedLink.ScanTransfer.Refreshable = true
		resolvedLink.ScanTransfer.RefreshKey = refreshKey
	} else if refreshKey := buildSeedHubURLRefreshKey(link.URL, link.Type); refreshKey != "" {
		resolvedLink.ScanTransfer.Refreshable = true
		resolvedLink.ScanTransfer.RefreshKey = refreshKey
	}

	return resolvedLink
}

func extractDirectResourceURLFromLinkStart(body []byte, expectedType string) string {
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return ""
	}

	candidates := make([]string, 0, 8)
	doc.Find("[href], [data-url], [data-href], [data-clipboard-text]").Each(func(_ int, selection *goquery.Selection) {
		for _, attr := range []string{"href", "data-url", "data-href", "data-clipboard-text"} {
			if value, exists := selection.Attr(attr); exists {
				value = cleanText(value)
				if value != "" {
					candidates = append(candidates, value)
				}
			}
		}
	})
	bodyText := string(body)
	candidates = append(candidates, httpURLRegex.FindAllString(bodyText, -1)...)
	candidates = append(candidates, extractAtobDirectLinkCandidates(bodyText)...)

	expectedType = strings.TrimSpace(expectedType)
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		directType := determineDirectLinkType(candidate)
		if directType == "" {
			continue
		}
		if expectedType == "" || expectedType == directType {
			return candidate
		}
	}

	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if determineDirectLinkType(candidate) != "" {
			return candidate
		}
	}

	return ""
}

func extractAtobDirectLinkCandidates(bodyText string) []string {
	usedNames := make(map[string]struct{})
	for _, match := range atobCallRegex.FindAllStringSubmatch(bodyText, -1) {
		if len(match) == 2 {
			usedNames[match[1]] = struct{}{}
		}
	}
	if len(usedNames) == 0 {
		return nil
	}

	candidates := []string{}
	for _, match := range atobValueRegex.FindAllStringSubmatch(bodyText, -1) {
		if len(match) != 3 {
			continue
		}
		if _, ok := usedNames[match[1]]; !ok {
			continue
		}
		decoded, err := decodeSeedHubAtobValue(match[2])
		if err != nil {
			continue
		}
		value := strings.TrimSpace(string(decoded))
		if determineDirectLinkType(value) != "" {
			candidates = append(candidates, value)
		}
	}
	return candidates
}

func decodeSeedHubAtobValue(value string) ([]byte, error) {
	if decoded, err := base64.StdEncoding.DecodeString(value); err == nil {
		return decoded, nil
	}
	return base64.RawStdEncoding.DecodeString(value)
}

func extractScanTransferInfo(body []byte, sourcePageURL string, linkType string, movieID string, entryIndex int) (*model.ScanTransferInfo, bool, error) {
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, false, err
	}

	bodyText := string(body)
	qrCodeValue := extractScanTransferQRCodeValue(doc)
	if qrCodeValue == "" {
		qrCodeValue = extractScanTransferPanLink(bodyText)
	}
	doc.Find("script, style").Remove()
	pageText := cleanText(doc.Text())
	qrCodeBase64 := base64ImageRegex.FindString(string(body))
	qrCodeImageURL := extractScanTransferQRCodeImage(doc)
	mobileURL := extractScanTransferMobileURL(doc)
	transferCode := extractScanTransferCode(pageText)
	instruction := extractScanTransferInstruction(pageText)

	detected := qrCodeBase64 != "" ||
		qrCodeImageURL != "" ||
		qrCodeValue != "" ||
		mobileURL != "" ||
		transferCode != "" ||
		instruction != ""
	if !detected {
		return nil, false, nil
	}

	scanTransfer := &model.ScanTransferInfo{
		Provider:       strings.TrimSpace(linkType),
		QRCodeBase64:   qrCodeBase64,
		QRCodeImageURL: qrCodeImageURL,
		QRCodeValue:    qrCodeValue,
		MobileURL:      mobileURL,
		TransferCode:   transferCode,
		Instruction:    instruction,
		SourcePageURL:  sourcePageURL,
	}

	if refreshKey := buildSeedHubRefreshKey(movieID, linkType, entryIndex); refreshKey != "" {
		scanTransfer.Refreshable = true
		scanTransfer.RefreshKey = refreshKey
	}

	return scanTransfer, true, nil
}

func extractScanTransferQRCodeImage(doc *goquery.Document) string {
	qrCodeImageURL := ""
	doc.Find("img").EachWithBreak(func(_ int, selection *goquery.Selection) bool {
		src, exists := selection.Attr("src")
		if !exists {
			return true
		}
		src = strings.TrimSpace(src)
		if src == "" || strings.HasPrefix(strings.ToLower(src), "data:image/") {
			return true
		}

		marker := strings.ToLower(strings.Join([]string{
			selection.AttrOr("class", ""),
			selection.AttrOr("alt", ""),
			selection.AttrOr("id", ""),
			src,
		}, " "))
		if strings.Contains(marker, "qr") || strings.Contains(marker, "二维码") || strings.Contains(marker, "qrcode") {
			qrCodeImageURL = src
			return false
		}
		return true
	})
	return qrCodeImageURL
}

func extractScanTransferQRCodeValue(doc *goquery.Document) string {
	for _, selector := range []string{"[data-qrcode]", "[data-qr]", "[data-qr-code]", "input[value]", "textarea"} {
		found := ""
		doc.Find(selector).EachWithBreak(func(_ int, selection *goquery.Selection) bool {
			for _, attr := range []string{"data-qrcode", "data-qr", "data-qr-code", "value"} {
				if value, exists := selection.Attr(attr); exists {
					value = strings.TrimSpace(value)
					if value != "" && !strings.HasPrefix(strings.ToLower(value), "data:image/") {
						found = value
						return false
					}
				}
			}
			text := cleanText(selection.Text())
			if text != "" && strings.Contains(strings.ToLower(text), "://") {
				found = text
				return false
			}
			return true
		})
		if found != "" {
			return found
		}
	}
	return ""
}

func extractScanTransferPanLink(body string) string {
	matches := panLinkRegex.FindStringSubmatch(body)
	if len(matches) < 2 {
		return ""
	}
	return strings.TrimSpace(matches[1])
}

func extractScanTransferMobileURL(doc *goquery.Document) string {
	mobileURL := ""
	doc.Find("[href], [data-url], [data-href]").EachWithBreak(func(_ int, selection *goquery.Selection) bool {
		for _, attr := range []string{"href", "data-url", "data-href"} {
			value, exists := selection.Attr(attr)
			if !exists {
				continue
			}
			value = strings.TrimSpace(value)
			lowerValue := strings.ToLower(value)
			if value == "" {
				continue
			}
			if strings.HasPrefix(lowerValue, "quark://") ||
				strings.HasPrefix(lowerValue, "baiduboxapp://") ||
				strings.HasPrefix(lowerValue, "alipan://") ||
				strings.HasPrefix(lowerValue, "uc://") ||
				strings.HasPrefix(lowerValue, "xunlei://") {
				mobileURL = value
				return false
			}
		}
		return true
	})
	return mobileURL
}

func extractScanTransferCode(pageText string) string {
	matches := transferCodeRegex.FindStringSubmatch(pageText)
	if len(matches) < 2 {
		return ""
	}
	return cleanText(matches[1])
}

func extractScanTransferInstruction(pageText string) string {
	for _, hint := range scanTransferHintTexts {
		if strings.Contains(pageText, hint) {
			return pageText
		}
	}
	return ""
}

func buildSeedHubRefreshKey(movieID string, linkType string, entryIndex int) string {
	if strings.TrimSpace(movieID) == "" || strings.TrimSpace(linkType) == "" || entryIndex <= 0 {
		return ""
	}
	return fmt.Sprintf("seedhub:%s:%s:%d", strings.TrimSpace(movieID), strings.TrimSpace(linkType), entryIndex)
}

func buildSeedHubURLRefreshKey(linkURL string, linkType string) string {
	trimmedURL := strings.TrimSpace(linkURL)
	normalizedType := normalizeLinkType(linkType)
	if trimmedURL == "" || normalizedType == "" || !strings.Contains(trimmedURL, linkStartPathPrefix) {
		return ""
	}
	encodedURL := base64.RawURLEncoding.EncodeToString([]byte(trimmedURL))
	return fmt.Sprintf("seedhub-url:%s:%s", normalizedType, encodedURL)
}

type seedHubRefreshTarget struct {
	movieID    string
	linkType   string
	entryIndex int
	linkURL    string
}

func parseSeedHubRefreshKey(refreshKey string) (seedHubRefreshTarget, error) {
	parts := strings.Split(strings.TrimSpace(refreshKey), ":")
	if len(parts) == 3 && parts[0] == "seedhub-url" {
		linkType := normalizeLinkType(parts[1])
		decodedURL, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(parts[2]))
		linkURL := strings.TrimSpace(string(decodedURL))
		if linkType == "" || err != nil || linkURL == "" || !strings.Contains(linkURL, linkStartPathPrefix) {
			return seedHubRefreshTarget{}, fmt.Errorf("无效的 SeedHub refresh_key")
		}
		return seedHubRefreshTarget{
			linkType:   linkType,
			entryIndex: 1,
			linkURL:    linkURL,
		}, nil
	}

	if len(parts) != 4 || parts[0] != "seedhub" {
		return seedHubRefreshTarget{}, fmt.Errorf("无效的 SeedHub refresh_key")
	}

	movieID := strings.TrimSpace(parts[1])
	linkType := normalizeLinkType(parts[2])
	entryIndex, err := strconv.Atoi(strings.TrimSpace(parts[3]))
	if movieID == "" || linkType == "" || err != nil || entryIndex <= 0 {
		return seedHubRefreshTarget{}, fmt.Errorf("无效的 SeedHub refresh_key")
	}

	return seedHubRefreshTarget{
		movieID:    movieID,
		linkType:   linkType,
		entryIndex: entryIndex,
	}, nil
}

func resolveSeedHubLinkAccessMode(link model.Link) string {
	if strings.TrimSpace(link.AccessMode) != "" {
		return strings.TrimSpace(link.AccessMode)
	}
	if link.ScanTransfer != nil {
		return "scan_transfer"
	}
	if strings.TrimSpace(link.Password) != "" {
		return "password_open"
	}
	if strings.TrimSpace(link.URL) != "" {
		return "direct_open"
	}
	return ""
}

func cloneSidHubLink(link model.Link) model.Link {
	cloned := link
	if link.ScanTransfer != nil {
		scanTransfer := *link.ScanTransfer
		cloned.ScanTransfer = &scanTransfer
	}
	return cloned
}

func resolveSidHubRuntimeConfig(ext map[string]interface{}) sidHubRuntimeConfig {
	config := sidHubRuntimeConfig{PreResolvedLinkStartPerType: defaultPreResolvedLinkStartPerType}
	if ext == nil {
		return config
	}
	rawConfig, ok := ext["plugin_runtime_config"].(map[string]interface{})
	if !ok {
		return config
	}
	rawValue, exists := rawConfig["pre_resolved_link_start_per_type"]
	if !exists {
		return config
	}
	value, ok := sidHubNumberToInt(rawValue)
	if !ok {
		return config
	}
	config.PreResolvedLinkStartPerType = clampSidHubPreResolvedLimit(value)
	return config
}

func sidHubNumberToInt(value interface{}) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int64:
		return int(typed), true
	case int32:
		return int(typed), true
	case float64:
		return int(typed), true
	case float32:
		return int(typed), true
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		return parsed, err == nil
	default:
		return 0, false
	}
}

func clampSidHubPreResolvedLimit(value int) int {
	if value < 0 {
		return defaultPreResolvedLinkStartPerType
	}
	if value > maxPreResolvedLinkStartPerType {
		return maxPreResolvedLinkStartPerType
	}
	return value
}

func (p *SidHubAsyncPlugin) resolveQuarkURL(linkURL string) (string, error) {
	body, err := p.fetchURL(context.Background(), linkURL)
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

	doc.Find(`a[href*="/movies/"]`).EachWithBreak(func(index int, selection *goquery.Selection) bool {
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

		container := searchCardContainer(selection)
		title := resolveSidHubSearchCardTitle(selection, container)
		if title == "" {
			return true
		}

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

func resolveSidHubSearchCardTitle(selection *goquery.Selection, container *goquery.Selection) string {
	candidates := make([]string, 0, 8)
	candidates = append(candidates, selection.AttrOr("title", ""))

	selection.Find("img").EachWithBreak(func(_ int, image *goquery.Selection) bool {
		for _, attr := range []string{"alt", "title", "aria-label"} {
			if value := cleanText(image.AttrOr(attr, "")); value != "" {
				candidates = append(candidates, value)
				return false
			}
		}
		return true
	})

	candidates = append(candidates, selection.Text())
	if container != nil && container.Length() > 0 {
		container.Find(".movie-title, .title, h1, h2, h3, strong, figcaption, [aria-label], [title]").EachWithBreak(func(_ int, node *goquery.Selection) bool {
			for _, attr := range []string{"title", "aria-label"} {
				if value := cleanText(node.AttrOr(attr, "")); value != "" {
					candidates = append(candidates, value)
					return false
				}
			}
			if value := cleanText(node.Text()); value != "" {
				candidates = append(candidates, value)
				return false
			}
			return true
		})
	}

	for _, candidate := range candidates {
		title := cleanText(candidate)
		if isUsefulSidHubSearchCardTitle(title) {
			return title
		}
	}
	return ""
}

func isUsefulSidHubSearchCardTitle(title string) bool {
	title = cleanText(title)
	if title == "" || isLowSignalSidHubEntryTitle(title) {
		return false
	}
	if movieInfoRegex.MatchString(title) {
		return false
	}
	return len([]rune(title)) >= 2
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

	entries := make([]sidHubLinkEntry, 0)
	seen := make(map[string]struct{})
	entries = append(entries, parseNativeSidHubDetailEntries(doc, baseURL, movieTitle, seen)...)
	entries = append(entries, parseTabbedDetailEntries(doc, baseURL, movieTitle, seen)...)

	doc.Find("a[href]").Each(func(index int, selection *goquery.Selection) {
		href, _ := selection.Attr("href")
		href = strings.TrimSpace(href)
		if href == "" || !isPotentialSidHubResourceURL(href) {
			return
		}

		contextLabel := resolveSidHubContextLabel(selection, doc)
		linkType, linkTypeSource := resolveSidHubLinkType(selection, href, contextLabel)
		if linkType == "" {
			return
		}

		linkURL := absoluteURL(baseURL, href)
		if linkURL == "" {
			return
		}

		row := resourceRowContainer(selection)
		rowText := cleanText(row.Text())
		badges := extractSidHubBadges(row)
		title, titleSource := resolveSidHubEntryTitle(selection, row, movieTitle, badges)
		addLinkEntry(&entries, seen, sidHubLinkEntry{
			Link: model.Link{
				Type:      linkType,
				URL:       linkURL,
				Password:  extractPassword(linkURL),
				WorkTitle: cleanText(movieTitle),
			},
			Title:          title,
			GroupLabel:     cleanSidHubGroupLabel(contextLabel),
			Size:           extractSidHubSize(rowText),
			Year:           extractSidHubYear(rowText),
			Badges:         badges,
			TitleSource:    titleSource,
			LinkTypeSource: linkTypeSource,
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
			Title:          cleanText(movieTitle),
			TitleSource:    "movie_title_fallback",
			LinkTypeSource: "direct_url",
		})
	}

	return entries, nil
}

func parseNativeSidHubDetailEntries(doc *goquery.Document, baseURL string, movieTitle string, seen map[string]struct{}) []sidHubLinkEntry {
	entries := []sidHubLinkEntry{}
	groups := []struct {
		selector string
		label    string
		linkType string
	}{
		{selector: ".seed-list", label: "磁力", linkType: "magnet"},
		{selector: ".baidu-list", label: "百度", linkType: "baidu"},
		{selector: ".quark-list", label: "夸克", linkType: "quark"},
		{selector: ".xunlei-list", label: "迅雷", linkType: "xunlei"},
		{selector: ".uc-list", label: "UC", linkType: "uc"},
		{selector: ".ali-list, .aliyun-list", label: "阿里", linkType: "aliyun"},
	}

	for _, group := range groups {
		doc.Find(group.selector).Each(func(_ int, scope *goquery.Selection) {
			parseEntriesInScope(scope, baseURL, movieTitle, group.linkType, group.label, &entries, seen)
		})
	}

	return entries
}

func parseTabbedDetailEntries(doc *goquery.Document, baseURL string, movieTitle string, seen map[string]struct{}) []sidHubLinkEntry {
	entries := []sidHubLinkEntry{}

	doc.Find("a,button").Each(func(_ int, tab *goquery.Selection) {
		rawLabel := cleanText(tab.Text())
		linkType := normalizeSidHubGroupLabel(rawLabel)
		if linkType == "" {
			return
		}

		targetID := resolveTabTargetID(tab)
		if targetID == "" {
			return
		}

		panel := doc.Find("#" + targetID).First()
		if panel.Length() == 0 {
			return
		}

		parseEntriesInScope(panel, baseURL, movieTitle, linkType, cleanSidHubGroupLabel(rawLabel), &entries, seen)
	})

	return entries
}

func resolveTabTargetID(tab *goquery.Selection) string {
	for _, attr := range []string{"aria-controls", "data-target", "data-tab"} {
		if value, exists := tab.Attr(attr); exists {
			value = strings.TrimPrefix(strings.TrimSpace(value), "#")
			if value != "" {
				return value
			}
		}
	}

	if href, exists := tab.Attr("href"); exists {
		href = strings.TrimSpace(href)
		if strings.HasPrefix(href, "#") {
			return strings.TrimPrefix(href, "#")
		}
	}

	return ""
}

func parseEntriesInScope(scope *goquery.Selection, baseURL string, movieTitle string, linkType string, groupLabel string, entries *[]sidHubLinkEntry, seen map[string]struct{}) {
	scope.Find("a[href], [data-url], [data-href], [data-clipboard-text], input[value]").Each(func(_ int, selection *goquery.Selection) {
		rawURL := firstNonEmptyAttr(selection, "href", "data-url", "data-href", "data-clipboard-text", "value")
		if !isPotentialSidHubResourceURL(rawURL) {
			return
		}
		linkURL := absoluteURL(baseURL, rawURL)
		if linkURL == "" {
			return
		}

		row := resourceRowContainer(selection)
		rowText := cleanText(row.Text())
		badges := extractSidHubBadges(row)
		title, titleSource := resolveSidHubEntryTitle(selection, row, movieTitle, badges)
		entry := sidHubLinkEntry{
			Link: model.Link{
				Type:      linkType,
				URL:       linkURL,
				Password:  extractPassword(linkURL),
				WorkTitle: cleanText(movieTitle),
			},
			Title:          title,
			GroupLabel:     groupLabel,
			Index:          len(*entries) + 1,
			Size:           extractSidHubSize(rowText),
			Year:           extractSidHubYear(rowText),
			Badges:         badges,
			TitleSource:    titleSource,
			LinkTypeSource: "group_label",
		}
		addLinkEntry(entries, seen, entry)
	})
}

func buildResult(card sidHubMovie, entries []sidHubLinkEntry) model.SearchResult {
	links := make([]model.Link, 0, len(entries))
	for _, entry := range entries {
		links = append(links, entry.Link)
	}

	return model.SearchResult{
		UniqueID:       fmt.Sprintf("%s-%s", pluginName, card.ID),
		Title:          card.Title,
		Content:        buildResultContent(card, entries),
		Links:          links,
		Tags:           append([]string(nil), card.Tags...),
		Images:         imagesFromCard(card),
		SourcePluginID: pluginName,
		SourceType:     "plugin",
		SourceName:     pluginDisplayName,
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

func buildExpandedResults(card sidHubMovie, entries []sidHubLinkEntry) []model.SearchResult {
	if len(entries) == 0 {
		return []model.SearchResult{buildResult(card, nil)}
	}

	results := make([]model.SearchResult, 0, len(entries))
	for index, entry := range entries {
		if entry.Index == 0 {
			entry.Index = index + 1
		}
		results = append(results, buildExpandedResult(card, entry))
	}
	return results
}

func buildExpandedResult(card sidHubMovie, entry sidHubLinkEntry) model.SearchResult {
	title := cleanText(entry.Title)
	if title == "" {
		title = card.Title
	}

	return model.SearchResult{
		UniqueID:       buildExpandedUniqueID(card.ID, entry),
		Title:          title,
		Content:        buildExpandedContent(card, entry),
		Links:          []model.Link{entry.Link},
		Tags:           mergeSidHubTags(card.Tags, entry.Badges),
		Images:         imagesFromCard(card),
		SourcePluginID: pluginName,
		SourceType:     "plugin",
		SourceName:     pluginDisplayName,
		MediaType:      card.MediaType,
		TargetType:     resolveSidHubTargetType(entry.Link.Type),
		DetailURL:      card.DetailURL,
		Capabilities: model.ResourceCapabilities{
			Searchable:      true,
			ShareSearchable: isShareType(entry.Link.Type),
			Downloadable:    true,
		},
		Meta: map[string]interface{}{
			"sid_hub_movie_id":          card.ID,
			"sid_hub_detail_url":        card.DetailURL,
			"sid_hub_link_type":         entry.Link.Type,
			"sid_hub_group_label":       entry.GroupLabel,
			"sid_hub_size":              entry.Size,
			"sid_hub_year":              entry.Year,
			"sid_hub_index":             entry.Index,
			"sid_hub_title_source":      entry.TitleSource,
			"sid_hub_link_type_source":  entry.LinkTypeSource,
			"sid_hub_resolution_status": entry.ResolutionStatus,
			"sid_hub_resolution_rank":   entry.ResolutionRank,
		},
	}
}

func imagesFromCard(card sidHubMovie) []string {
	if card.CoverURL == "" {
		return []string{}
	}
	return []string{card.CoverURL}
}

func buildExpandedUniqueID(movieID string, entry sidHubLinkEntry) string {
	hash := fnv.New32a()
	_, _ = hash.Write([]byte(entry.Link.Type))
	_, _ = hash.Write([]byte(entry.Link.URL))
	return fmt.Sprintf("%s-%s-%s-%08x", pluginName, movieID, entry.Link.Type, hash.Sum32())
}

func buildExpandedContent(card sidHubMovie, entry sidHubLinkEntry) string {
	parts := []string{}
	if card.Content != "" {
		parts = append(parts, card.Content)
	}
	if entry.GroupLabel != "" {
		parts = append(parts, "资源类型: "+entry.GroupLabel)
	}
	if entry.Size != "" {
		parts = append(parts, "大小: "+entry.Size)
	}
	if entry.Year != "" {
		parts = append(parts, "更新: "+entry.Year)
	}
	if len(entry.Badges) > 0 {
		parts = append(parts, "标签: "+strings.Join(entry.Badges, " / "))
	}
	return strings.Join(parts, "\n")
}

func mergeSidHubTags(cardTags []string, badges []string) []string {
	result := append([]string(nil), cardTags...)
	seen := map[string]struct{}{}
	for _, tag := range result {
		seen[tag] = struct{}{}
	}

	for _, badge := range badges {
		badge = cleanText(badge)
		if badge == "" {
			continue
		}
		if _, exists := seen[badge]; exists {
			continue
		}
		seen[badge] = struct{}{}
		result = append(result, badge)
	}
	return result
}

func resolveSidHubTargetType(linkType string) string {
	switch linkType {
	case "magnet", "ed2k", "thunder":
		return "download"
	default:
		return "share"
	}
}

func isSeedHubDownloadType(linkType string) bool {
	switch normalizeLinkType(linkType) {
	case "magnet", "ed2k", "thunder":
		return true
	default:
		return false
	}
}

func isShareType(linkType string) bool {
	return resolveSidHubTargetType(linkType) == "share"
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

func resolveSidHubContextLabel(selection *goquery.Selection, doc *goquery.Document) string {
	for current, depth := selection, 0; current != nil && current.Length() > 0 && depth < 6; current, depth = current.Parent(), depth+1 {
		for _, attr := range []string{"data-link", "data-type", "data-tab", "aria-label", "id", "class"} {
			if value, exists := current.Attr(attr); exists {
				if normalized := normalizeSidHubGroupLabel(value); normalized != "" {
					return cleanText(value)
				}
			}
		}
	}

	activeTabLabel := ""
	doc.Find(".router-link-active, .active, .is-active, [aria-selected='true']").EachWithBreak(func(_ int, node *goquery.Selection) bool {
		text := cleanText(node.Text())
		if normalizeSidHubGroupLabel(text) == "" {
			return true
		}
		activeTabLabel = text
		return false
	})
	return activeTabLabel
}

func normalizeSidHubGroupLabel(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch {
	case strings.Contains(normalized, "磁力"), strings.Contains(normalized, "magnet"):
		return "magnet"
	case strings.Contains(normalized, "百度"), strings.Contains(normalized, "baidu"):
		return "baidu"
	case strings.Contains(normalized, "夸克"), strings.Contains(normalized, "quark"):
		return "quark"
	case strings.Contains(normalized, "迅雷"), strings.Contains(normalized, "xunlei"):
		return "xunlei"
	case strings.Contains(normalized, "uc"):
		return "uc"
	case strings.Contains(normalized, "阿里"), strings.Contains(normalized, "aliyun"), strings.Contains(normalized, "alipan"):
		return "aliyun"
	default:
		return ""
	}
}

func inferSidHubLinkTypeFromLinkStart(rawURL string) string {
	parsedURL, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return ""
	}

	query := parsedURL.Query()
	if seedID := strings.TrimSpace(query.Get("seed_id")); seedID != "" {
		return "magnet"
	}

	redirectTarget := strings.TrimSpace(query.Get("redirect_to"))
	if redirectTarget != "" {
		return normalizeSidHubGroupLabel(redirectTarget)
	}

	return ""
}

func resolveSidHubLinkType(selection *goquery.Selection, href string, contextLabel string) (string, string) {
	if linkType := normalizeLinkType(dataLinkValue(selection)); linkType != "" {
		return linkType, "data_link"
	}
	if linkType := determineDirectLinkType(href); linkType != "" {
		return linkType, "direct_url"
	}
	if linkType := inferSidHubLinkTypeFromLinkStart(href); linkType != "" {
		if strings.Contains(strings.ToLower(href), "seed_id=") {
			return linkType, "seed_id"
		}
		return linkType, "redirect_to"
	}
	if linkType := normalizeSidHubGroupLabel(contextLabel); linkType != "" {
		return linkType, "active_tab"
	}
	return "", ""
}

func cleanSidHubGroupLabel(value string) string {
	return cleanText(groupCountRegex.ReplaceAllString(value, ""))
}

func firstNonEmptyAttr(selection *goquery.Selection, attrs ...string) string {
	for _, attr := range attrs {
		if value, exists := selection.Attr(attr); exists && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func isPotentialSidHubResourceURL(rawURL string) bool {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return false
	}

	lowerURL := strings.ToLower(trimmed)
	if strings.HasPrefix(lowerURL, "#") || strings.HasPrefix(lowerURL, "javascript:") {
		return false
	}
	if strings.HasPrefix(lowerURL, "magnet:") || strings.HasPrefix(lowerURL, "ed2k:") || strings.HasPrefix(lowerURL, "thunder:") {
		return true
	}
	if strings.Contains(lowerURL, linkStartPathPrefix) {
		return true
	}
	if strings.HasPrefix(lowerURL, "http://") || strings.HasPrefix(lowerURL, "https://") {
		return determineDirectLinkType(trimmed) != ""
	}
	return false
}

func resourceRowContainer(selection *goquery.Selection) *goquery.Selection {
	row := selection.ParentsFiltered("li,tr,.item,.resource,.download-item,div").First()
	if row.Length() == 0 {
		return selection.Parent()
	}
	return row
}

func resolveSidHubEntryTitle(selection *goquery.Selection, row *goquery.Selection, movieTitle string, badges []string) (string, string) {
	explicitTitle := cleanText(selection.AttrOr("title", ""))
	if isSpecificSidHubEntryTitle(explicitTitle, movieTitle) {
		return explicitTitle, "title_attr"
	}

	linkText := cleanText(selection.Text())
	rowTitle := cleanSidHubEntryRowTitle(row.Text(), linkText, badges)
	if isSpecificSidHubEntryTitle(rowTitle, movieTitle) {
		return rowTitle, "row_text"
	}
	if isSpecificSidHubEntryTitle(linkText, movieTitle) {
		return linkText, "link_text"
	}
	if explicitTitle != "" {
		return explicitTitle, "title_attr"
	}
	if rowTitle != "" {
		return rowTitle, "row_text"
	}
	if linkText != "" {
		return linkText, "link_text"
	}
	return cleanText(movieTitle), "movie_title_fallback"
}

func cleanSidHubEntryRowTitle(rowText string, linkText string, badges []string) string {
	text := cleanText(rowText)
	text = sidHubSizeRegex.ReplaceAllString(text, "")
	text = sidHubYearTextRegex.ReplaceAllString(text, "")
	text = sidHubDateTextRegex.ReplaceAllString(text, "")

	if isLowSignalSidHubEntryTitle(linkText) {
		text = strings.ReplaceAll(text, linkText, "")
	}
	for _, badge := range badges {
		badge = cleanText(badge)
		if badge != "" {
			text = strings.ReplaceAll(text, badge, "")
		}
	}
	for _, noise := range []string{"打开链接", "查看链接", "复制链接", "打开", "查看", "下载", "复制"} {
		text = strings.ReplaceAll(text, noise, "")
	}

	return cleanText(text)
}

func isSpecificSidHubEntryTitle(title string, movieTitle string) bool {
	title = cleanText(title)
	if title == "" || isLowSignalSidHubEntryTitle(title) {
		return false
	}

	trimmedMovieTitle := cleanText(movieTitle)
	if trimmedMovieTitle != "" && strings.Contains(title, trimmedMovieTitle) {
		return true
	}
	return len([]rune(title)) >= 6
}

func isLowSignalSidHubEntryTitle(title string) bool {
	normalized := strings.ToLower(cleanText(title))
	normalized = strings.Trim(normalized, "：:[]【】()（） ")
	if normalized == "" {
		return true
	}
	_, exists := sidHubLowSignalEntryTitles[normalized]
	return exists
}

func extractSidHubSize(text string) string {
	return cleanText(sidHubSizeRegex.FindString(text))
}

func extractSidHubYear(text string) string {
	return cleanText(sidHubYearTextRegex.FindString(text))
}

func extractSidHubBadges(row *goquery.Selection) []string {
	badges := []string{}
	seen := map[string]struct{}{}

	row.Find("span,b,strong,em,.tag,.badge").Each(func(_ int, badge *goquery.Selection) {
		text := cleanText(badge.Text())
		if text == "" ||
			extractSidHubSize(text) != "" ||
			extractSidHubYear(text) != "" ||
			sidHubDateTextRegex.MatchString(text) {
			return
		}
		if len([]rune(text)) > 12 {
			return
		}
		if _, exists := seen[text]; exists {
			return
		}
		seen[text] = struct{}{}
		badges = append(badges, text)
	})

	return badges
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
	if !normalizeSidHubURLQuery(parsedURL) {
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

func normalizeSidHubURLQuery(parsedURL *url.URL) bool {
	if parsedURL.RawQuery == "" {
		return true
	}
	values, err := url.ParseQuery(parsedURL.RawQuery)
	if err != nil {
		return false
	}
	parsedURL.RawQuery = values.Encode()
	return true
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

func limitExpandedSidHubEntries(entries []sidHubLinkEntry) ([]sidHubLinkEntry, bool) {
	if maxExpandedResultsPerMovie <= 0 || len(entries) <= maxExpandedResultsPerMovie {
		return entries, false
	}
	limited := make([]sidHubLinkEntry, maxExpandedResultsPerMovie)
	copy(limited, entries[:maxExpandedResultsPerMovie])
	return limited, true
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
