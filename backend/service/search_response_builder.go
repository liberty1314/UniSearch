package service

import (
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"
)

var priorityKeywords = []string{"合集", "系列", "全", "完", "最新", "附", "complete"}

type SearchResponseBuilder interface {
	Build(results []model.SearchResult, request NormalizedSearchRequest) model.SearchResponse
}

type searchResponseBuilder struct{}

func newSearchResponseBuilder() SearchResponseBuilder {
	return searchResponseBuilder{}
}

func (searchResponseBuilder) Build(results []model.SearchResult, request NormalizedSearchRequest) model.SearchResponse {
	orderedResults := append([]model.SearchResult(nil), results...)
	sortResultsByTimeAndKeywords(orderedResults)

	filteredResults := filterResultsForDisplay(orderedResults)
	mergedLinks := mergeResultsByType(orderedResults, request.Keyword, request.CloudTypes)

	response := model.SearchResponse{
		Total:        len(filteredResults),
		Results:      filteredResults,
		MergedByType: mergedLinks,
	}
	if request.ResultType == "merged_by_type" {
		response.Total = countMergedLinks(mergedLinks)
	}

	return filterResponseByType(response, request.ResultType)
}

func countMergedLinks(mergedLinks model.MergedLinks) int {
	total := 0
	for _, links := range mergedLinks {
		total += len(links)
	}
	return total
}

func filterResponseByType(response model.SearchResponse, resultType string) model.SearchResponse {
	switch resultType {
	case "merged_by_type":
		return model.SearchResponse{
			Total:        response.Total,
			MergedByType: response.MergedByType,
			Results:      nil,
		}
	case "all":
		return response
	case "results":
		return model.SearchResponse{
			Total:   response.Total,
			Results: response.Results,
		}
	default:
		return model.SearchResponse{
			Total:        response.Total,
			MergedByType: response.MergedByType,
			Results:      nil,
		}
	}
}

func filterResultsForDisplay(results []model.SearchResult) []model.SearchResult {
	filtered := make([]model.SearchResult, 0, len(results))
	for _, result := range results {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)

		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filtered = append(filtered, result)
		}
	}
	return filtered
}

func sortResultsByTimeAndKeywords(results []model.SearchResult) {
	scores := make([]ResultScore, len(results))

	for i, result := range results {
		source := getResultSource(result)
		scores[i] = ResultScore{
			Result:       result,
			TimeScore:    calculateTimeScore(result.Datetime),
			KeywordScore: getKeywordPriority(result.Title),
			PluginScore:  getPluginLevelScore(source),
		}
		scores[i].TotalScore = scores[i].TimeScore +
			float64(scores[i].KeywordScore) +
			float64(scores[i].PluginScore)
	}

	sort.Slice(scores, func(i, j int) bool {
		return scores[i].TotalScore > scores[j].TotalScore
	})

	for i, score := range scores {
		results[i] = score.Result
	}
}

func getKeywordPriority(title string) int {
	title = strings.ToLower(title)
	for i, keyword := range priorityKeywords {
		if strings.Contains(title, keyword) {
			return (len(priorityKeywords) - i) * 70
		}
	}
	return 0
}

func extractLinkTitlePairs(content string) map[string]string {
	if strings.Contains(content, "\n") {
		return extractLinkTitlePairsWithNewlines(content)
	}
	return extractLinkTitlePairsWithoutNewlines(content)
}

func extractLinkTitlePairsWithNewlines(content string) map[string]string {
	linkTitleMap := make(map[string]string)
	lines := strings.Split(content, "\n")
	linkRegex := regexp.MustCompile(`https?://[^\s"']+`)

	var lastTitle string
	var lastTitleIndex int

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		links := linkRegex.FindAllString(line, -1)
		if len(links) > 0 {
			isStandardLinkLine := isLinkLine(line)
			if isStandardLinkLine && lastTitle != "" {
				for _, link := range links {
					linkTitleMap[link] = lastTitle
				}
			} else if !isStandardLinkLine {
				titleFromLine := extractTitleFromLinkLine(line)
				if titleFromLine != "" {
					for _, link := range links {
						linkTitleMap[link] = titleFromLine
					}
				} else if lastTitle != "" {
					for _, link := range links {
						linkTitleMap[link] = lastTitle
					}
				}
			}
			continue
		}

		if i+1 < len(lines) {
			nextLine := strings.TrimSpace(lines[i+1])
			if isLinkLine(nextLine) || linkRegex.MatchString(nextLine) {
				lastTitle = cleanTitle(line)
				lastTitleIndex = i
			}
			continue
		}

		lastTitle = cleanTitle(line)
		lastTitleIndex = i
	}

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		links := linkRegex.FindAllString(line, -1)
		if len(links) == 0 {
			continue
		}

		for _, link := range links {
			if _, exists := linkTitleMap[link]; exists {
				continue
			}

			nearestTitle := ""
			for j := i - 1; j >= 0; j-- {
				if j == lastTitleIndex || (j+1 < len(lines) &&
					linkRegex.MatchString(lines[j+1]) &&
					!linkRegex.MatchString(lines[j])) {
					candidateTitle := cleanTitle(lines[j])
					if candidateTitle != "" {
						nearestTitle = candidateTitle
						break
					}
				}
			}

			if nearestTitle != "" {
				linkTitleMap[link] = nearestTitle
			}
		}
	}

	return linkTitleMap
}

func extractLinkTitlePairsWithoutNewlines(content string) map[string]string {
	linkTitleMap := make(map[string]string)
	linkRegex := regexp.MustCompile(`https?://pan\.quark\.cn/s/[a-zA-Z0-9]+`)

	links := linkRegex.FindAllString(content, -1)
	if len(links) == 0 {
		return linkTitleMap
	}

	segments := make([]string, len(links)+1)
	lastPos := 0

	for i, link := range links {
		pos := strings.Index(content[lastPos:], link) + lastPos
		if pos > lastPos {
			segments[i] = content[lastPos:pos]
		}
		lastPos = pos + len(link)
	}

	if lastPos < len(content) {
		segments[len(links)] = content[lastPos:]
	}

	for i, link := range links {
		title := extractTitleBeforeLink(segments[i])
		if title != "" {
			linkTitleMap[link] = title
		}
	}

	return linkTitleMap
}

func extractTitleBeforeLink(text string) string {
	text = strings.TrimSpace(text)
	if idx := strings.Index(text, "链接："); idx > 0 {
		return cleanTitle(text[:idx])
	}

	titlePattern := regexp.MustCompile(`([^链地资网\s]+?(?:\([^)]+\))?(?:\s*\d+K)?(?:\s*臻彩)?(?:\s*MAX)?(?:\s*HDR)?(?:\s*更(?:新)?\d+集))$`)
	matches := titlePattern.FindStringSubmatch(text)
	if len(matches) > 1 {
		return cleanTitle(matches[1])
	}

	return cleanTitle(text)
}

func isLinkLine(line string) bool {
	lowerLine := strings.ToLower(line)
	return strings.HasPrefix(lowerLine, "链接：") ||
		strings.HasPrefix(lowerLine, "地址：") ||
		strings.HasPrefix(lowerLine, "资源地址：") ||
		strings.HasPrefix(lowerLine, "网盘：") ||
		strings.HasPrefix(lowerLine, "网盘地址：") ||
		strings.HasPrefix(lowerLine, "链接:")
}

func extractTitleFromLinkLine(line string) string {
	parts := strings.SplitN(line, "：", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") && !isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}

	parts = strings.SplitN(line, ":", 2)
	if len(parts) == 2 && !strings.Contains(parts[0], "http") && !isLinkPrefix(parts[0]) {
		return cleanTitle(parts[0])
	}

	return ""
}

func isLinkPrefix(text string) bool {
	text = strings.ToLower(strings.TrimSpace(text))
	return text == "链接" ||
		text == "地址" ||
		text == "资源地址" ||
		text == "网盘" ||
		text == "网盘地址"
}

func cleanTitle(title string) string {
	title = strings.TrimSpace(title)
	title = strings.TrimPrefix(title, "名称：")
	title = strings.TrimPrefix(title, "标题：")
	title = strings.TrimPrefix(title, "片名：")
	title = strings.TrimPrefix(title, "名称:")
	title = strings.TrimPrefix(title, "标题:")
	title = strings.TrimPrefix(title, "片名:")

	htmlReplacements := map[string]string{
		"<span class='highlight-keyword'>":   "",
		"<span class=\"highlight-keyword\">": "",
		"</span>":                            "",
		"<em>":                               "",
		"</em>":                              "",
		"<b>":                                "",
		"</b>":                               "",
		"<strong>":                           "",
		"</strong>":                          "",
		"<i>":                                "",
		"</i>":                               "",
		"<br>":                               " ",
		"<br/>":                              " ",
		"<p>":                                "",
		"</p>":                               " ",
		"<div>":                              "",
		"</div>":                             " ",
	}

	for tag, replacement := range htmlReplacements {
		title = strings.Replace(title, tag, replacement, -1)
	}

	htmlTagRegex := regexp.MustCompile(`<[^>]+>`)
	title = htmlTagRegex.ReplaceAllString(title, "")

	emojiRegex := regexp.MustCompile(`[\p{So}\p{Sk}]`)
	title = emojiRegex.ReplaceAllString(title, "")

	spaceRegex := regexp.MustCompile(`\s+`)
	title = spaceRegex.ReplaceAllString(title, " ")

	return strings.TrimSpace(title)
}

func mergeResultsByType(results []model.SearchResult, keyword string, cloudTypes []string) model.MergedLinks {
	mergedLinks := make(model.MergedLinks, 10)
	uniqueLinks := make(map[string]model.MergedLink)
	lowerKeyword := strings.ToLower(keyword)

	for _, result := range results {
		linkTitleMap := extractLinkTitlePairs(result.Content)
		if len(linkTitleMap) == 0 && len(result.Links) > 0 && !strings.Contains(result.Content, "\n") {
			content := result.Content
			parts := strings.Split(content, "链接：")
			if len(parts) > 1 && len(result.Links) <= len(parts)-1 {
				titles := make([]string, 0, len(parts))
				titles = append(titles, cleanTitle(parts[0]))

				for i := 1; i < len(parts)-1; i++ {
					part := parts[i]
					linkEnd := -1
					for j, c := range part {
						if c == ' ' || c == '窃' || c == '东' || c == '迎' || c == '千' || c == '我' || c == '恋' || c == '将' || c == '野' {
							linkEnd = j
							break
						}
					}

					if linkEnd > 0 {
						titles = append(titles, cleanTitle(part[linkEnd:]))
					}
				}

				for i, link := range result.Links {
					if i < len(titles) {
						linkTitleMap[link.URL] = titles[i]
					}
				}
			}
		}

		for _, link := range result.Links {
			title := result.Title
			if specificTitle, found := linkTitleMap[link.URL]; found && specificTitle != "" {
				title = specificTitle
			} else {
				for mappedLink, mappedTitle := range linkTitleMap {
					if strings.HasPrefix(mappedLink, link.URL) {
						title = mappedTitle
						break
					}
				}
			}

			skipKeywordFilter := false
			if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
				parts := strings.SplitN(result.UniqueID, "-", 2)
				if len(parts) >= 1 {
					if pluginInstance, exists := plugin.GetPluginByName(parts[0]); exists {
						skipKeywordFilter = pluginInstance.SkipServiceFilter()
					}
				}
			}

			if !skipKeywordFilter && keyword != "" && !strings.Contains(strings.ToLower(title), lowerKeyword) {
				continue
			}

			mergedLink := model.MergedLink{
				URL:      link.URL,
				Password: link.Password,
				Note:     title,
				Datetime: result.Datetime,
				Source:   getResultSource(result),
				Images:   result.Images,
			}

			if existingLink, exists := uniqueLinks[link.URL]; exists {
				if mergedLink.Datetime.After(existingLink.Datetime) {
					uniqueLinks[link.URL] = mergedLink
				}
				continue
			}

			uniqueLinks[link.URL] = mergedLink
		}
	}

	orderedLinks := make([]model.MergedLink, 0, len(uniqueLinks))
	linkTypeMap := make(map[string]string, len(uniqueLinks))
	seenLinks := make(map[string]struct{}, len(uniqueLinks))

	for _, result := range results {
		for _, link := range result.Links {
			mergedLink, exists := uniqueLinks[link.URL]
			if !exists {
				continue
			}
			if _, seen := seenLinks[link.URL]; seen {
				continue
			}

			seenLinks[link.URL] = struct{}{}
			orderedLinks = append(orderedLinks, mergedLink)
			linkTypeMap[link.URL] = util.GetLinkType(link.URL)
		}
	}

	excludedTypes := map[string]bool{
		"pikpak":      true,
		"onedrive":    true,
		"googledrive": true,
		"ed2k":        true,
	}

	for _, mergedLink := range orderedLinks {
		linkType := linkTypeMap[mergedLink.URL]
		if linkType == "" {
			linkType = "unknown"
		}
		if excludedTypes[strings.ToLower(linkType)] {
			continue
		}
		mergedLinks[linkType] = append(mergedLinks[linkType], mergedLink)
	}

	if len(cloudTypes) == 0 {
		return mergedLinks
	}

	filteredLinks := make(model.MergedLinks)
	allowedTypes := make(map[string]bool, len(cloudTypes))
	for _, cloudType := range cloudTypes {
		allowedTypes[strings.ToLower(strings.TrimSpace(cloudType))] = true
	}
	for linkType, links := range mergedLinks {
		if allowedTypes[strings.ToLower(linkType)] {
			filteredLinks[linkType] = links
		}
	}
	return filteredLinks
}

type ResultScore struct {
	Result       model.SearchResult
	TimeScore    float64
	KeywordScore int
	PluginScore  int
	TotalScore   float64
}

var pluginLevelCache sync.Map

func getResultSource(result model.SearchResult) string {
	if result.Channel != "" {
		return "tg:" + result.Channel
	}
	if result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
		parts := strings.SplitN(result.UniqueID, "-", 2)
		if len(parts) >= 1 {
			return "plugin:" + parts[0]
		}
	}
	return "unknown"
}

func getPluginLevelBySource(source string) int {
	if level, ok := pluginLevelCache.Load(source); ok {
		return level.(int)
	}

	parts := strings.Split(source, ":")
	if len(parts) != 2 {
		pluginLevelCache.Store(source, 3)
		return 3
	}
	if parts[0] == "tg" {
		pluginLevelCache.Store(source, 3)
		return 3
	}
	if parts[0] == "plugin" {
		level := getPluginPriorityByName(parts[1])
		pluginLevelCache.Store(source, level)
		return level
	}

	pluginLevelCache.Store(source, 3)
	return 3
}

func getPluginPriorityByName(pluginName string) int {
	for _, p := range plugin.GetRegisteredPlugins() {
		if p.Name() == pluginName {
			return p.Priority()
		}
	}
	return 3
}

func getPluginLevelScore(source string) int {
	switch getPluginLevelBySource(source) {
	case 1:
		return 1000
	case 2:
		return 500
	case 3:
		return 0
	case 4:
		return -200
	default:
		return 0
	}
}

func calculateTimeScore(datetime time.Time) float64 {
	if datetime.IsZero() {
		return 0
	}

	daysDiff := time.Since(datetime).Hours() / 24
	switch {
	case daysDiff <= 1:
		return 500
	case daysDiff <= 3:
		return 400
	case daysDiff <= 7:
		return 300
	case daysDiff <= 30:
		return 200
	case daysDiff <= 90:
		return 100
	case daysDiff <= 365:
		return 50
	default:
		return 20
	}
}
