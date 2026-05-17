package service

import (
	"fmt"
	"hash/fnv"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"unisearch/model"
	"unisearch/plugin"
	"unisearch/util"
)

var (
	priorityKeywords      = []string{"合集", "系列", "全", "完", "最新", "附", "complete"}
	linkTitleLineRegex    = regexp.MustCompile(`https?://[^\s"']+`)
	quarkContentLinkRegex = regexp.MustCompile(`https?://pan\.quark\.cn/s/[a-zA-Z0-9]+`)
	titleSuffixRegex      = regexp.MustCompile(`([^链地资网\s]+?(?:\([^)]+\))?(?:\s*\d+K)?(?:\s*臻彩)?(?:\s*MAX)?(?:\s*HDR)?(?:\s*更(?:新)?\d+集))$`)
	htmlTagRegex          = regexp.MustCompile(`<[^>]+>`)
	emojiRegex            = regexp.MustCompile(`[\p{So}\p{Sk}]`)
	spaceRegex            = regexp.MustCompile(`\s+`)
	titleHTMLReplacer     = strings.NewReplacer(
		"<span class='highlight-keyword'>", "",
		"<span class=\"highlight-keyword\">", "",
		"</span>", "",
		"<em>", "",
		"</em>", "",
		"<b>", "",
		"</b>", "",
		"<strong>", "",
		"</strong>", "",
		"<i>", "",
		"</i>", "",
		"<br>", " ",
		"<br/>", " ",
		"<p>", "",
		"</p>", " ",
		"<div>", "",
		"</div>", " ",
	)
	excludedMergedLinkTypes = map[string]bool{
		"pikpak":      true,
		"onedrive":    true,
		"googledrive": true,
		"ed2k":        true,
	}
)

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

	resources := buildResourceObjects(orderedResults, request.Keyword, request.CloudTypes)
	sortResourceObjects(resources, request.Keyword)

	return model.SearchResponse{
		Total:     len(resources),
		Resources: resources,
		Facets:    BuildResourceFacets(resources),
	}
}

func buildResourceObjects(results []model.SearchResult, keyword string, cloudTypes []string) []model.ResourceObject {
	resources := make([]model.ResourceObject, 0, len(results))
	lowerKeyword := strings.ToLower(strings.TrimSpace(keyword))
	allowedCloudTypes := buildAllowedCloudTypes(cloudTypes)

	for _, result := range results {
		linkTitleMap := extractLinkTitlePairs(result.Content)
		if len(linkTitleMap) == 0 && len(result.Links) > 0 && !strings.Contains(result.Content, "\n") {
			backfillLinkTitlesFromInlineContent(linkTitleMap, result)
		}
		if !shouldDisplayResourceResult(result, lowerKeyword, linkTitleMap) {
			continue
		}

		resourceLinks := buildResourceLinks(result, linkTitleMap, lowerKeyword, allowedCloudTypes)
		if len(resourceLinks) == 0 && strings.TrimSpace(result.DetailURL) == "" {
			continue
		}
		if len(allowedCloudTypes) > 0 && len(resourceLinks) == 0 {
			continue
		}

		resource := model.ResourceObject{
			ID:           resolveResourceID(result),
			Title:        resolveResourceTitle(result, linkTitleMap, lowerKeyword),
			Description:  buildResourceDescription(result),
			Source:       buildResourceSource(result),
			MediaType:    strings.TrimSpace(result.MediaType),
			TargetType:   resolveTargetType(result, resourceLinks),
			Links:        resourceLinks,
			Capabilities: resolveResourceCapabilities(result, resourceLinks),
			Actions:      resolveResourceActions(result, resourceLinks),
			Detail: model.ResourceDetail{
				URL:       strings.TrimSpace(result.DetailURL),
				Content:   result.Content,
				MessageID: result.MessageID,
				UniqueID:  result.UniqueID,
			},
			Tags:        append([]string(nil), result.Tags...),
			Images:      append([]string(nil), result.Images...),
			Meta:        cloneMeta(result.Meta),
			PublishedAt: result.Datetime,
		}
		resources = append(resources, resource)
	}

	return resources
}

func shouldDisplayResourceResult(result model.SearchResult, lowerKeyword string, linkTitleMap map[string]string) bool {
	if len(result.Links) == 0 && strings.TrimSpace(result.DetailURL) == "" {
		return false
	}
	if lowerKeyword == "" {
		return true
	}
	return resourceMatchesKeyword(result, lowerKeyword, linkTitleMap)
}

func buildResourceLinks(result model.SearchResult, linkTitleMap map[string]string, lowerKeyword string, allowedCloudTypes map[string]bool) []model.ResourceLink {
	type candidateLink struct {
		link          model.Link
		title         string
		hasOwnTitle   bool
		keywordMatched bool
	}

	candidates := make([]candidateLink, 0, len(result.Links))
	matchedSpecificTitleCount := 0

	for _, link := range result.Links {
		linkType := normalizeLinkType(link.Type, link.URL)
		if len(allowedCloudTypes) > 0 && !allowedCloudTypes[linkType] {
			continue
		}

		title := strings.TrimSpace(link.WorkTitle)
		hasOwnTitle := title != ""
		if title == "" {
			title = resolveMergedLinkTitle(result, link.URL, linkTitleMap)
		}
		if !hasOwnTitle && resolveSpecificLinkTitle(link.URL, linkTitleMap) != "" {
			hasOwnTitle = true
		}
		matched := lowerKeyword == "" || isHighPrecisionTitleMatch(title, lowerKeyword)
		if lowerKeyword != "" && hasOwnTitle && matched {
			matchedSpecificTitleCount++
		}

		candidates = append(candidates, candidateLink{
			link:           link,
			title:          title,
			hasOwnTitle:    hasOwnTitle,
			keywordMatched: matched,
		})
	}

	resourceLinks := make([]model.ResourceLink, 0, len(candidates))
	for _, candidate := range candidates {
		if matchedSpecificTitleCount > 0 && candidate.hasOwnTitle && !candidate.keywordMatched {
			continue
		}
		if matchedSpecificTitleCount > 0 && !candidate.hasOwnTitle {
			continue
		}
		linkType := normalizeLinkType(candidate.link.Type, candidate.link.URL)

		datetime := candidate.link.Datetime
		if datetime.IsZero() {
			datetime = result.Datetime
		}

		resourceLinks = append(resourceLinks, model.ResourceLink{
			Type:      linkType,
			URL:       candidate.link.URL,
			Password:  candidate.link.Password,
			Title:     candidate.title,
			WorkTitle: candidate.link.WorkTitle,
			Datetime:  datetime,
		})
	}

	return resourceLinks
}

func normalizeLinkType(explicitType string, url string) string {
	linkType := strings.ToLower(strings.TrimSpace(explicitType))
	if linkType == "" {
		linkType = strings.ToLower(strings.TrimSpace(util.GetLinkType(url)))
	}
	if linkType == "" {
		return "unknown"
	}
	return linkType
}

func resolveResourceID(result model.SearchResult) string {
	if strings.TrimSpace(result.UniqueID) != "" {
		return strings.TrimSpace(result.UniqueID)
	}
	if strings.TrimSpace(result.MessageID) != "" {
		return strings.TrimSpace(result.MessageID)
	}

	hash := fnv.New32a()
	_, _ = hash.Write([]byte(result.Title))
	_, _ = hash.Write([]byte(result.DetailURL))
	for _, link := range result.Links {
		_, _ = hash.Write([]byte(link.URL))
	}
	return fmt.Sprintf("resource-%08x", hash.Sum32())
}

func resolveResourceTitle(result model.SearchResult, linkTitleMap map[string]string, lowerKeyword string) string {
	title := cleanTitle(result.Title)
	if title != "" && !isLowSignalResourceTitle(title) {
		return title
	}

	if fallbackTitle := resolvePreferredLinkTitle(result, linkTitleMap, lowerKeyword); fallbackTitle != "" {
		return fallbackTitle
	}
	if title != "" {
		return title
	}
	if strings.TrimSpace(result.DetailURL) != "" {
		return result.DetailURL
	}
	return "未命名资源"
}

func buildResourceDescription(result model.SearchResult) string {
	content := cleanTitle(result.Content)
	if content == "" {
		return ""
	}
	if len([]rune(content)) <= 180 {
		return content
	}
	runes := []rune(content)
	return string(runes[:180]) + "..."
}

func buildResourceSource(result model.SearchResult) model.ResourceSource {
	sourceType := strings.TrimSpace(result.SourceType)
	sourceID := strings.TrimSpace(result.SourcePluginID)
	sourceName := strings.TrimSpace(result.SourceName)

	if result.Channel != "" {
		if sourceType == "" {
			sourceType = "tg"
		}
		if sourceID == "" {
			sourceID = result.Channel
		}
		if sourceName == "" {
			sourceName = result.Channel
		}
		return model.ResourceSource{
			Type:    sourceType,
			ID:      sourceID,
			Name:    sourceName,
			Channel: result.Channel,
		}
	}

	if sourceID == "" && result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
		parts := strings.SplitN(result.UniqueID, "-", 2)
		sourceID = parts[0]
	}
	if sourceType == "" {
		if sourceID != "" {
			sourceType = "plugin"
		} else {
			sourceType = "unknown"
		}
	}
	if sourceName == "" {
		sourceName = sourceID
	}

	return model.ResourceSource{
		Type:     sourceType,
		ID:       sourceID,
		Name:     sourceName,
		PluginID: sourceID,
	}
}

func resolveTargetType(result model.SearchResult, links []model.ResourceLink) string {
	if strings.TrimSpace(result.TargetType) != "" {
		return strings.TrimSpace(result.TargetType)
	}
	for _, link := range links {
		if link.Type == "magnet" || link.Type == "ed2k" {
			return "download"
		}
	}
	if len(links) > 0 {
		return "share"
	}
	if strings.TrimSpace(result.DetailURL) != "" {
		return "detail"
	}
	return ""
}

func resolveResourceCapabilities(result model.SearchResult, links []model.ResourceLink) model.ResourceCapabilities {
	capabilities := result.Capabilities
	if capabilities.Searchable || capabilities.OfficialSearchable ||
		capabilities.ShareSearchable || capabilities.Downloadable || capabilities.Strmable {
		return capabilities
	}

	capabilities.Searchable = true
	if len(links) > 0 {
		capabilities.ShareSearchable = true
		capabilities.Downloadable = true
	}
	return capabilities
}

func resolveResourceActions(result model.SearchResult, links []model.ResourceLink) []model.ResourceAction {
	if len(result.Actions) > 0 {
		actions := make([]model.ResourceAction, len(result.Actions))
		copy(actions, result.Actions)
		return actions
	}

	actions := make([]model.ResourceAction, 0, len(links)+1)
	for _, link := range links {
		payload := map[string]interface{}{
			"url":        link.URL,
			"link_type":  link.Type,
			"title":      link.Title,
			"work_title": link.WorkTitle,
		}
		if strings.TrimSpace(link.Password) != "" {
			payload["password"] = link.Password
		}
		actions = append(actions, model.ResourceAction{
			Key:     "link." + link.Type + ".open",
			Label:   "打开" + link.Type,
			Type:    "open_link",
			Style:   "primary",
			Payload: payload,
		})
	}

	if len(actions) == 0 && strings.TrimSpace(result.DetailURL) != "" {
		actions = append(actions, model.ResourceAction{
			Key:   "detail.open",
			Label: "打开详情",
			Type:  "open_detail",
			Payload: map[string]interface{}{
				"url": result.DetailURL,
			},
		})
	}

	return actions
}

func cloneMeta(meta map[string]interface{}) map[string]interface{} {
	if meta == nil {
		return nil
	}
	cloned := make(map[string]interface{}, len(meta))
	for key, value := range meta {
		cloned[key] = value
	}
	return cloned
}

// BuildResourceFacets 基于当前资源列表重算统一筛选计数。
func BuildResourceFacets(resources []model.ResourceObject) model.ResourceFacets {
	facets := model.ResourceFacets{
		CloudTypes:   make(map[string]int),
		SourceTypes:  make(map[string]int),
		MediaTypes:   make(map[string]int),
		TargetTypes:  make(map[string]int),
		Capabilities: make(map[string]int),
		ActionTypes:  make(map[string]int),
	}

	for _, resource := range resources {
		incrementFacet(facets.SourceTypes, resource.Source.Type)
		incrementFacet(facets.MediaTypes, resource.MediaType)
		incrementFacet(facets.TargetTypes, resource.TargetType)
		for linkType := range collectResourceLinkTypes(resource) {
			incrementFacet(facets.CloudTypes, linkType)
		}
		for capability := range collectResourceCapabilities(resource.Capabilities) {
			incrementFacet(facets.Capabilities, capability)
		}
		for actionType := range collectResourceActionTypes(resource.Actions) {
			incrementFacet(facets.ActionTypes, actionType)
		}
	}

	return facets
}

func incrementFacet(facet map[string]int, key string) {
	normalized := strings.ToLower(strings.TrimSpace(key))
	if normalized == "" {
		return
	}
	facet[normalized]++
}

func collectResourceLinkTypes(resource model.ResourceObject) map[string]struct{} {
	types := make(map[string]struct{}, len(resource.Links))
	for _, link := range resource.Links {
		normalized := strings.ToLower(strings.TrimSpace(link.Type))
		if normalized != "" {
			types[normalized] = struct{}{}
		}
	}
	return types
}

func collectResourceCapabilities(capabilities model.ResourceCapabilities) map[string]struct{} {
	result := make(map[string]struct{}, 5)
	if capabilities.Searchable {
		result["searchable"] = struct{}{}
	}
	if capabilities.OfficialSearchable {
		result["official_searchable"] = struct{}{}
	}
	if capabilities.ShareSearchable {
		result["share_searchable"] = struct{}{}
	}
	if capabilities.Downloadable {
		result["downloadable"] = struct{}{}
	}
	if capabilities.Strmable {
		result["strmable"] = struct{}{}
	}
	return result
}

func collectResourceActionTypes(actions []model.ResourceAction) map[string]struct{} {
	types := make(map[string]struct{}, len(actions))
	for _, action := range actions {
		normalized := strings.ToLower(strings.TrimSpace(action.Type))
		if normalized != "" {
			types[normalized] = struct{}{}
		}
	}
	return types
}

func buildResponseArtifacts(results []model.SearchResult, keyword string, cloudTypes []string) ([]model.SearchResult, model.MergedLinks) {
	filteredResults := make([]model.SearchResult, 0, len(results))
	mergedLinks := make(model.MergedLinks, 10)
	uniqueLinks := make(map[string]model.MergedLink)
	orderedLinks := make([]model.MergedLink, 0, len(results))
	seenOrderedLinks := make(map[string]struct{}, len(results))
	linkTypeMap := make(map[string]string, len(results))
	lowerKeyword := strings.ToLower(keyword)
	allowedCloudTypes := buildAllowedCloudTypes(cloudTypes)

	for _, result := range results {
		source := getResultSource(result)
		pluginLevel := getPluginLevelBySource(source)
		if !result.Datetime.IsZero() || getKeywordPriority(result.Title) > 0 || pluginLevel <= 2 {
			filteredResults = append(filteredResults, result)
		}

		linkTitleMap := extractLinkTitlePairs(result.Content)
		if len(linkTitleMap) == 0 && len(result.Links) > 0 && !strings.Contains(result.Content, "\n") {
			backfillLinkTitlesFromInlineContent(linkTitleMap, result)
		}

		skipKeywordFilter := shouldSkipKeywordFilter(result)
		for _, link := range result.Links {
			title := resolveMergedLinkTitle(result, link.URL, linkTitleMap)
			if !skipKeywordFilter && lowerKeyword != "" && !strings.Contains(strings.ToLower(title), lowerKeyword) {
				continue
			}

			mergedLink := model.MergedLink{
				URL:      link.URL,
				Password: link.Password,
				Note:     title,
				Datetime: result.Datetime,
				Source:   source,
				Images:   result.Images,
			}

			if existingLink, exists := uniqueLinks[link.URL]; exists {
				if mergedLink.Datetime.After(existingLink.Datetime) {
					uniqueLinks[link.URL] = mergedLink
				}
			} else {
				uniqueLinks[link.URL] = mergedLink
			}

			if _, seen := seenOrderedLinks[link.URL]; !seen {
				seenOrderedLinks[link.URL] = struct{}{}
				orderedLinks = append(orderedLinks, mergedLink)
				linkTypeMap[link.URL] = util.GetLinkType(link.URL)
			}
		}
	}

	for _, mergedLink := range orderedLinks {
		currentLink, exists := uniqueLinks[mergedLink.URL]
		if !exists {
			continue
		}

		linkType := strings.ToLower(strings.TrimSpace(linkTypeMap[mergedLink.URL]))
		if linkType == "" {
			linkType = "unknown"
		}
		if excludedMergedLinkTypes[linkType] {
			continue
		}
		if len(allowedCloudTypes) > 0 && !allowedCloudTypes[linkType] {
			continue
		}

		mergedLinks[linkType] = append(mergedLinks[linkType], currentLink)
	}

	return filteredResults, mergedLinks
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

	var lastTitle string
	var lastTitleIndex int

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		links := linkTitleLineRegex.FindAllString(line, -1)
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
			if isLinkLine(nextLine) || linkTitleLineRegex.MatchString(nextLine) {
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

		links := linkTitleLineRegex.FindAllString(line, -1)
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
					linkTitleLineRegex.MatchString(lines[j+1]) &&
					!linkTitleLineRegex.MatchString(lines[j])) {
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

	links := quarkContentLinkRegex.FindAllString(content, -1)
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

	matches := titleSuffixRegex.FindStringSubmatch(text)
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

	title = titleHTMLReplacer.Replace(title)
	title = htmlTagRegex.ReplaceAllString(title, "")
	title = emojiRegex.ReplaceAllString(title, "")
	title = spaceRegex.ReplaceAllString(title, " ")

	return strings.TrimSpace(title)
}

func resourceMatchesKeyword(result model.SearchResult, lowerKeyword string, linkTitleMap map[string]string) bool {
	if lowerKeyword == "" {
		return true
	}

	titleCandidates := collectTitleCandidates(result, linkTitleMap)
	if len(titleCandidates) > 0 {
		for _, title := range titleCandidates {
			if isHighPrecisionTitleMatch(title, lowerKeyword) {
				return true
			}
		}
		return false
	}

	fields := collectSearchableFields(result, linkTitleMap)
	for _, field := range fields {
		if strings.Contains(field, lowerKeyword) {
			return true
		}
	}

	keywordTerms := splitKeywordTerms(lowerKeyword)
	if len(keywordTerms) <= 1 {
		return false
	}

	combined := strings.Join(fields, " ")
	for _, term := range keywordTerms {
		if !strings.Contains(combined, term) {
			return false
		}
	}

	return true
}

func collectSearchableFields(result model.SearchResult, linkTitleMap map[string]string) []string {
	fields := make([]string, 0, 4+len(result.Links)+len(linkTitleMap))

	appendField := func(value string) {
		normalized := strings.ToLower(cleanTitle(value))
		if normalized != "" {
			fields = append(fields, normalized)
		}
	}

	appendField(result.Title)
	appendField(result.Content)
	appendField(result.DetailURL)

	for _, link := range result.Links {
		appendField(link.WorkTitle)
	}
	for _, title := range linkTitleMap {
		appendField(title)
	}

	return fields
}

func collectTitleCandidates(result model.SearchResult, linkTitleMap map[string]string) []string {
	candidates := make([]string, 0, 1+len(result.Links)+len(linkTitleMap))

	if title := cleanTitle(result.Title); title != "" && !isLowSignalResourceTitle(title) {
		candidates = append(candidates, title)
	}
	for _, link := range result.Links {
		if title := cleanTitle(link.WorkTitle); title != "" {
			candidates = append(candidates, title)
		}
	}
	for _, title := range linkTitleMap {
		if cleaned := cleanTitle(title); cleaned != "" {
			candidates = append(candidates, cleaned)
		}
	}

	return candidates
}

func collectResourceSearchableFields(resource model.ResourceObject) []string {
	fields := make([]string, 0, 4+len(resource.Links))

	appendField := func(value string) {
		normalized := strings.ToLower(cleanTitle(value))
		if normalized != "" {
			fields = append(fields, normalized)
		}
	}

	appendField(resource.Title)
	appendField(resource.Description)
	appendField(resource.Detail.Content)
	appendField(resource.Detail.URL)

	for _, link := range resource.Links {
		appendField(link.Title)
		appendField(link.WorkTitle)
	}

	return fields
}

func splitKeywordTerms(lowerKeyword string) []string {
	replacer := strings.NewReplacer(
		"与", " ",
		"和", " ",
		"及", " ",
		"、", " ",
		"，", " ",
		",", " ",
		"；", " ",
		";", " ",
		"|", " ",
		"/", " ",
		"\\", " ",
	)
	normalized := spaceRegex.ReplaceAllString(replacer.Replace(lowerKeyword), " ")
	parts := strings.Fields(normalized)
	terms := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		terms = append(terms, part)
	}
	return terms
}

func normalizeMatchText(value string) string {
	lower := strings.ToLower(cleanTitle(value))
	replacer := strings.NewReplacer(
		"《", "",
		"》", "",
		"【", "",
		"】", "",
		"[", "",
		"]", "",
		"（", "",
		"）", "",
		"(", "",
		")", "",
		"：", "",
		":", "",
		"·", "",
		"-", "",
		"_", "",
		" ", "",
	)
	return replacer.Replace(lower)
}

func isHighPrecisionTitleMatch(title string, lowerKeyword string) bool {
	title = strings.TrimSpace(title)
	if title == "" || lowerKeyword == "" {
		return false
	}

	normalizedTitle := normalizeMatchText(title)
	normalizedKeyword := normalizeMatchText(lowerKeyword)
	if normalizedKeyword != "" && strings.Contains(normalizedTitle, normalizedKeyword) {
		return true
	}

	keywordTerms := splitKeywordTerms(lowerKeyword)
	if len(keywordTerms) == 0 {
		return false
	}
	for _, term := range keywordTerms {
		if !strings.Contains(strings.ToLower(title), term) {
			return false
		}
	}
	return true
}

func resolvePreferredLinkTitle(result model.SearchResult, linkTitleMap map[string]string, lowerKeyword string) string {
	candidates := make([]string, 0, len(result.Links)+len(linkTitleMap))
	for _, link := range result.Links {
		if title := cleanTitle(link.WorkTitle); title != "" {
			candidates = append(candidates, title)
		}
	}
	for _, title := range linkTitleMap {
		if cleaned := cleanTitle(title); cleaned != "" {
			candidates = append(candidates, cleaned)
		}
	}

	lowerTerms := splitKeywordTerms(lowerKeyword)
	for _, candidate := range candidates {
		candidateLower := strings.ToLower(candidate)
		if lowerKeyword != "" && strings.Contains(candidateLower, lowerKeyword) {
			return candidate
		}
		if len(lowerTerms) > 1 {
			allMatched := true
			for _, term := range lowerTerms {
				if !strings.Contains(candidateLower, term) {
					allMatched = false
					break
				}
			}
			if allMatched {
				return candidate
			}
		}
	}

	if len(candidates) > 0 {
		return candidates[0]
	}
	return ""
}

func resolveResourceMatchRank(resource model.ResourceObject, lowerKeyword string) int {
	if lowerKeyword == "" {
		return 3
	}

	title := strings.ToLower(cleanTitle(resource.Title))
	if title != "" && strings.Contains(title, lowerKeyword) {
		return 0
	}

	fields := collectResourceSearchableFields(resource)
	for _, field := range fields {
		if strings.Contains(field, lowerKeyword) {
			return 1
		}
	}

	keywordTerms := splitKeywordTerms(lowerKeyword)
	if len(keywordTerms) <= 1 {
		return 4
	}

	if title != "" {
		allMatchedInTitle := true
		for _, term := range keywordTerms {
			if !strings.Contains(title, term) {
				allMatchedInTitle = false
				break
			}
		}
		if allMatchedInTitle {
			return 2
		}
	}

	combined := strings.Join(fields, " ")
	for _, term := range keywordTerms {
		if !strings.Contains(combined, term) {
			return 4
		}
	}

	return 3
}

func resolveResourcePublishedAt(resource model.ResourceObject) time.Time {
	if !resource.PublishedAt.IsZero() {
		return resource.PublishedAt
	}
	for _, link := range resource.Links {
		if !link.Datetime.IsZero() {
			return link.Datetime
		}
	}
	return time.Time{}
}

func sortResourceObjects(resources []model.ResourceObject, keyword string) {
	lowerKeyword := strings.ToLower(strings.TrimSpace(keyword))
	sort.SliceStable(resources, func(i, j int) bool {
		leftRank := resolveResourceMatchRank(resources[i], lowerKeyword)
		rightRank := resolveResourceMatchRank(resources[j], lowerKeyword)
		if leftRank != rightRank {
			return leftRank < rightRank
		}

		leftTime := resolveResourcePublishedAt(resources[i])
		rightTime := resolveResourcePublishedAt(resources[j])
		if !leftTime.Equal(rightTime) {
			return leftTime.After(rightTime)
		}

		return strings.Compare(resources[i].ID, resources[j].ID) < 0
	})
}

func isLowSignalResourceTitle(title string) bool {
	title = strings.TrimSpace(title)
	if title == "" {
		return true
	}
	if strings.HasPrefix(title, "#") {
		return true
	}

	switch title {
	case "电影", "电视剧", "动漫", "综艺", "资源", "网盘":
		return true
	default:
		return false
	}
}

func mergeResultsByType(results []model.SearchResult, keyword string, cloudTypes []string) model.MergedLinks {
	_, mergedLinks := buildResponseArtifacts(results, keyword, cloudTypes)
	return mergedLinks
}

type ResultScore struct {
	Result       model.SearchResult
	TimeScore    float64
	KeywordScore int
	PluginScore  int
	TotalScore   float64
}

var pluginLevelCache sync.Map
var pluginMetadataCache = struct {
	mu           sync.RWMutex
	priorities   map[string]int
	skipFilters  map[string]bool
	registrySize int
}{}

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
	priorities, _ := getPluginMetadata()
	if priority, exists := priorities[pluginName]; exists {
		return priority
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

func getPluginMetadata() (map[string]int, map[string]bool) {
	plugins := plugin.GetRegisteredPlugins()

	pluginMetadataCache.mu.RLock()
	if pluginMetadataCache.priorities != nil && pluginMetadataCache.registrySize == len(plugins) {
		priorities := pluginMetadataCache.priorities
		skipFilters := pluginMetadataCache.skipFilters
		pluginMetadataCache.mu.RUnlock()
		return priorities, skipFilters
	}
	pluginMetadataCache.mu.RUnlock()

	priorities := make(map[string]int, len(plugins))
	skipFilters := make(map[string]bool, len(plugins))
	for _, registeredPlugin := range plugins {
		priorities[registeredPlugin.Name()] = registeredPlugin.Priority()
		skipFilters[registeredPlugin.Name()] = registeredPlugin.SkipServiceFilter()
	}

	pluginMetadataCache.mu.Lock()
	pluginMetadataCache.priorities = priorities
	pluginMetadataCache.skipFilters = skipFilters
	pluginMetadataCache.registrySize = len(plugins)
	pluginMetadataCache.mu.Unlock()

	return priorities, skipFilters
}

func shouldSkipKeywordFilter(result model.SearchResult) bool {
	if result.UniqueID == "" || !strings.Contains(result.UniqueID, "-") {
		return false
	}

	parts := strings.SplitN(result.UniqueID, "-", 2)
	if len(parts) == 0 {
		return false
	}

	_, skipFilters := getPluginMetadata()
	return skipFilters[parts[0]]
}

func resolveMergedLinkTitle(result model.SearchResult, linkURL string, linkTitleMap map[string]string) string {
	if specificTitle := resolveSpecificLinkTitle(linkURL, linkTitleMap); specificTitle != "" {
		return specificTitle
	}
	return result.Title
}

func resolveSpecificLinkTitle(linkURL string, linkTitleMap map[string]string) string {
	if specificTitle, found := linkTitleMap[linkURL]; found && specificTitle != "" {
		return specificTitle
	}
	for mappedLink, mappedTitle := range linkTitleMap {
		if strings.HasPrefix(mappedLink, linkURL) && mappedTitle != "" {
			return mappedTitle
		}
	}
	return ""
}

func backfillLinkTitlesFromInlineContent(linkTitleMap map[string]string, result model.SearchResult) {
	content := result.Content
	parts := strings.Split(content, "链接：")
	if len(parts) <= 1 || len(result.Links) > len(parts)-1 {
		return
	}

	titles := make([]string, 0, len(parts))
	titles = append(titles, cleanTitle(parts[0]))

	for i := 1; i < len(parts)-1; i++ {
		part := parts[i]
		linkEnd := strings.IndexAny(part, " 窃东迎千我恋将野")
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

func buildAllowedCloudTypes(cloudTypes []string) map[string]bool {
	if len(cloudTypes) == 0 {
		return nil
	}

	allowed := make(map[string]bool, len(cloudTypes))
	for _, cloudType := range cloudTypes {
		allowed[strings.ToLower(strings.TrimSpace(cloudType))] = true
	}
	return allowed
}
