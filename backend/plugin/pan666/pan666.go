package pan666

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	linkparser "unisearch/plugin/parser"
	"unisearch/util/json"
)

const (
	pluginName      = "pan666"
	defaultPriority = 3
	baseURL         = "https://pan666.net/api/discussions"
	pageSize        = 50
	maxPages        = 2
	requestTimeout  = 10 * time.Second
)

// Pan666AsyncPlugin pan666 网盘搜索插件。
type Pan666AsyncPlugin struct {
	*plugin.BaseAsyncPlugin
}

func init() {
	plugin.RegisterGlobalPlugin(NewPan666AsyncPlugin())
}

// NewPan666AsyncPlugin 创建 pan666 插件实例。
func NewPan666AsyncPlugin() *Pan666AsyncPlugin {
	basePlugin := plugin.NewBaseAsyncPlugin(pluginName, defaultPriority)
	basePlugin.SetManifest(model.PluginManifest{
		ID:              "search.pan666",
		Name:            "Pan666",
		Version:         "1.0.0",
		Category:        "search",
		Description:     "基于 pan666 论坛 API 的网盘资源搜索插件。",
		CoreVersion:     ">=1.0.0 <2.0.0",
		ContractVersion: "1.0",
		Capabilities:    []string{"resource.search"},
		Permissions:     []string{"network"},
		Resource: model.ResourceDescriptor{
			SourceLabel:         "Pan666",
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

	return &Pan666AsyncPlugin{BaseAsyncPlugin: basePlugin}
}

// Search 执行搜索并返回结果。
func (p *Pan666AsyncPlugin) Search(keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, ext)
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// SearchWithResult 执行搜索并返回带状态的结果。
func (p *Pan666AsyncPlugin) SearchWithResult(keyword string, ext map[string]interface{}) (model.PluginSearchResult, error) {
	return p.AsyncSearchWithResult(keyword, p.doSearch, p.MainCacheKey, ext)
}

func (p *Pan666AsyncPlugin) doSearch(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
	var (
		wg       sync.WaitGroup
		mu       sync.Mutex
		results  []model.SearchResult
		firstErr error
	)

	for page := 0; page < maxPages; page++ {
		page := page
		wg.Add(1)
		go func() {
			defer wg.Done()
			items, err := p.fetchPage(client, keyword, page*pageSize)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				if firstErr == nil {
					firstErr = err
				}
				return
			}
			results = append(results, items...)
		}()
	}
	wg.Wait()

	if firstErr != nil && len(results) == 0 {
		return nil, firstErr
	}

	return plugin.FilterResultsByKeyword(p.deduplicateResults(results), keyword), nil
}

func (p *Pan666AsyncPlugin) fetchPage(client *http.Client, keyword string, offset int) ([]model.SearchResult, error) {
	apiURL := fmt.Sprintf("%s?filter[q]=%s&include=mostRelevantPost&page[offset]=%d&page[limit]=%d",
		baseURL, url.QueryEscape(keyword), offset, pageSize)

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[%s] 创建请求失败: %w", p.Name(), err)
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Referer", "https://pan666.net/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] 请求失败: %w", p.Name(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("[%s] API 返回状态码: %d", p.Name(), resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("[%s] 读取响应失败: %w", p.Name(), err)
	}

	var apiResp pan666Response
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("[%s] 解析响应失败: %w", p.Name(), err)
	}

	return p.convertResponse(apiResp), nil
}

func (p *Pan666AsyncPlugin) convertResponse(apiResp pan666Response) []model.SearchResult {
	postMap := make(map[string]pan666Included, len(apiResp.Included))
	for _, post := range apiResp.Included {
		postMap[post.ID] = post
	}

	results := make([]model.SearchResult, 0, len(apiResp.Data))
	for _, discussion := range apiResp.Data {
		postID := discussion.Relationships.MostRelevantPost.Data.ID
		post, exists := postMap[postID]
		if !exists {
			continue
		}

		links := linksFromText(cleanHTML(post.Attributes.ContentHTML))
		if len(links) == 0 {
			continue
		}

		results = append(results, model.SearchResult{
			UniqueID: fmt.Sprintf("%s-%s", p.Name(), discussion.ID),
			Title:    strings.TrimSpace(discussion.Attributes.Title),
			Content:  strings.TrimSpace(cleanHTML(post.Attributes.ContentHTML)),
			Datetime: parseTime(discussion.Attributes.CreatedAt),
			Links:    links,
		})
	}
	return results
}

func (p *Pan666AsyncPlugin) deduplicateResults(results []model.SearchResult) []model.SearchResult {
	seen := make(map[string]struct{}, len(results))
	unique := make([]model.SearchResult, 0, len(results))
	for _, result := range results {
		if _, exists := seen[result.UniqueID]; exists {
			continue
		}
		seen[result.UniqueID] = struct{}{}
		unique = append(unique, result)
	}
	sort.SliceStable(unique, func(i, j int) bool {
		return unique[i].Datetime.After(unique[j].Datetime)
	})
	return unique
}

func linksFromText(text string) []model.Link {
	parsedLinks := linkparser.ExtractLinks(text)
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

func cleanHTML(html string) string {
	replacements := map[string]string{
		"<br>":    "\n",
		"<br/>":   "\n",
		"<br />":  "\n",
		"&amp;":   "&",
		"&lt;":    "<",
		"&gt;":    ">",
		"&quot;":  "\"",
		"&apos;":  "'",
		"&#39;":   "'",
		"&nbsp;":  " ",
		"</p>":    "\n",
		"</div>":  "\n",
		"</span>": "\n",
	}
	result := html
	for old, replacement := range replacements {
		result = strings.ReplaceAll(result, old, replacement)
	}

	inTag := false
	var builder strings.Builder
	for _, r := range result {
		switch r {
		case '<':
			inTag = true
		case '>':
			inTag = false
		default:
			if !inTag {
				builder.WriteRune(r)
			}
		}
	}

	lines := strings.Split(builder.String(), "\n")
	cleaned := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleaned = append(cleaned, line)
		}
	}
	return strings.Join(cleaned, "\n")
}

func parseTime(value string) time.Time {
	if parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value)); err == nil {
		return parsed
	}
	return time.Time{}
}

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

type pan666Response struct {
	Data     []pan666Discussion `json:"data"`
	Included []pan666Included   `json:"included"`
}

type pan666Discussion struct {
	ID         string `json:"id"`
	Attributes struct {
		Title     string `json:"title"`
		CreatedAt string `json:"createdAt"`
	} `json:"attributes"`
	Relationships struct {
		MostRelevantPost struct {
			Data struct {
				ID string `json:"id"`
			} `json:"data"`
		} `json:"mostRelevantPost"`
	} `json:"relationships"`
}

type pan666Included struct {
	ID         string `json:"id"`
	Attributes struct {
		ContentHTML string `json:"contentHtml"`
	} `json:"attributes"`
}
