package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"regexp"
	"sort"
	"strings"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util"
)

// 本文件保留搜索响应构建的编排主流程（Build）、资源对象映射、关键词匹配与
// 资源排序逻辑。文本抽取见 search_title_extract.go，评分排序见 search_scoring.go，
// 分面统计见 search_facets.go（均属同一 package service）。

var (
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

const (
	resourcePublicIDPrefix       = "r_v1_"
	resourcePublicIDDigestLength = 18
)

type searchResponseBuilder struct {
	resourcePublicIDSecret string
}

func newSearchResponseBuilder() *searchResponseBuilder {
	secret := ""
	if config.AppConfig != nil {
		secret = config.AppConfig.ResourcePublicIDSecret
	}
	return newSearchResponseBuilderWithSecret(secret)
}

func newSearchResponseBuilderWithSecret(resourcePublicIDSecret string) *searchResponseBuilder {
	return &searchResponseBuilder{resourcePublicIDSecret: strings.TrimSpace(resourcePublicIDSecret)}
}

func (builder searchResponseBuilder) Build(results []model.SearchResult, request NormalizedSearchRequest) model.SearchResponse {
	orderedResults := append([]model.SearchResult(nil), results...)
	sortResultsByTimeAndKeywords(orderedResults)

	resources := buildResourceObjects(orderedResults, request.Keyword, request.CloudTypes, builder.resourcePublicIDSecret)
	sortResourceObjects(resources, request.Keyword)

	return model.SearchResponse{
		Total:     len(resources),
		Resources: resources,
		Facets:    BuildResourceFacets(resources),
	}
}

func buildResourceObjects(results []model.SearchResult, keyword string, cloudTypes []string, resourcePublicIDSecret string) []model.ResourceObject {
	resources := make([]model.ResourceObject, 0, len(results))
	lowerKeyword := strings.ToLower(strings.TrimSpace(keyword))
	allowedCloudTypes := buildAllowedCloudTypes(cloudTypes)
	tokenCodec, _ := newResourceResolveTokenCodec(resourcePublicIDSecret)

	for _, result := range results {
		linkTitleMap := extractLinkTitlePairs(result.Content)
		if len(linkTitleMap) == 0 && len(result.Links) > 0 && !strings.Contains(result.Content, "\n") {
			backfillLinkTitlesFromInlineContent(linkTitleMap, result)
		}
		if !shouldDisplayResourceResult(result, lowerKeyword, linkTitleMap) {
			continue
		}

		resourceID := resolveResourceID(result, resourcePublicIDSecret)
		resourceLinks := buildResourceLinks(result, resourceID, linkTitleMap, lowerKeyword, allowedCloudTypes, resourcePublicIDSecret, tokenCodec)
		if len(resourceLinks) == 0 && strings.TrimSpace(result.DetailURL) == "" {
			continue
		}
		if len(allowedCloudTypes) > 0 && len(resourceLinks) == 0 {
			continue
		}

		resource := model.ResourceObject{
			ID:           resourceID,
			Title:        resolveResourceTitle(result, linkTitleMap, lowerKeyword),
			Description:  buildResourceDescription(result),
			Source:       buildResourceSource(result),
			MediaType:    strings.TrimSpace(result.MediaType),
			TargetType:   resolveTargetType(result, resourceLinks),
			Links:        resourceLinks,
			Capabilities: resolveResourceCapabilities(result, resourceLinks),
			Actions:      resolveResourceActions(result, resourceLinks),
			Detail:       model.ResourceDetail{Content: result.Content},
			Tags:         append([]string(nil), result.Tags...),
			Images:       append([]string(nil), result.Images...),
			Meta:         buildPublicResourceMeta(result.Meta),
			PublishedAt:  optionalTime(result.Datetime),
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

func buildResourceLinks(result model.SearchResult, resourceID string, linkTitleMap map[string]string, lowerKeyword string, allowedCloudTypes map[string]bool, resourcePublicIDSecret string, tokenCodec *resourceResolveTokenCodec) []model.ResourceLink {
	type candidateLink struct {
		link           model.Link
		title          string
		hasOwnTitle    bool
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
	for index, candidate := range candidates {
		if matchedSpecificTitleCount > 0 && candidate.hasOwnTitle && !candidate.keywordMatched {
			continue
		}
		if matchedSpecificTitleCount > 0 && !candidate.hasOwnTitle {
			continue
		}
		linkType := normalizeLinkType(candidate.link.Type, candidate.link.URL)
		linkID := resolvePublicLinkID(resourcePublicIDSecret, resourceID, candidate.link, index)
		if candidate.link.ResolveTarget != nil && candidate.link.ResolveTarget.Status == "deferred" {
			if tokenCodec == nil {
				continue
			}
			token, err := tokenCodec.Sign(resourceResolveTokenClaims{
				ResourceID: resourceID,
				LinkID:     linkID,
				PluginID:   candidate.link.ResolveTarget.PluginID,
				Provider:   candidate.link.ResolveTarget.Provider,
				SourceURL:  candidate.link.URL,
				MovieID:    candidate.link.ResolveTarget.MovieID,
				EntryIndex: candidate.link.ResolveTarget.EntryIndex,
			})
			if err != nil {
				continue
			}
			expiresAt := tokenCodec.now().Add(resourceResolveTokenLifetime)
			resourceLinks = append(resourceLinks, model.ResourceLink{
				ID:         linkID,
				Type:       linkType,
				AccessMode: "resolve_required",
				Resolution: &model.ResourceLinkResolution{
					Status:    "deferred",
					Token:     token,
					ExpiresAt: &expiresAt,
				},
			})
			continue
		}

		datetime := candidate.link.Datetime
		if datetime.IsZero() {
			datetime = result.Datetime
		}

		scanTransfer := cloneScanTransferInfo(candidate.link.ScanTransfer)
		var resolution *model.ResourceLinkResolution
		if candidate.link.ResolveTarget != nil {
			resolution = &model.ResourceLinkResolution{Status: candidate.link.ResolveTarget.Status}
			if candidate.link.ResolveTarget.PluginID == "sidhub" && scanTransfer != nil {
				scanTransfer.SourcePageURL = ""
				scanTransfer.Refreshable = false
				scanTransfer.RefreshKey = ""
			}
		}

		resourceLinks = append(resourceLinks, model.ResourceLink{
			ID:           linkID,
			Type:         linkType,
			URL:          candidate.link.URL,
			Password:     candidate.link.Password,
			AccessMode:   resolveLinkAccessMode(candidate.link),
			ScanTransfer: scanTransfer,
			Resolution:   resolution,
			Title:        candidate.title,
			WorkTitle:    candidate.link.WorkTitle,
			Datetime:     optionalTime(datetime),
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

func resolveResourceID(result model.SearchResult, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	writeResourcePublicIDField(mac, "resource-public-id")
	writeResourcePublicIDField(mac, "v1")

	sourceType, sourceID := resolveResourcePublicIdentitySource(result)
	writeResourcePublicIDField(mac, sourceType)
	writeResourcePublicIDField(mac, sourceID)

	if internalID := resolveResourceInternalID(result); internalID != "" {
		writeResourcePublicIDField(mac, "internal")
		writeResourcePublicIDField(mac, internalID)
	} else {
		writeResourcePublicIDField(mac, "fallback")
		writeResourcePublicIDField(mac, strings.TrimSpace(result.Title))
		writeResourcePublicIDField(mac, strings.TrimSpace(result.DetailURL))
		for _, link := range result.Links {
			writeResourcePublicIDField(mac, strings.TrimSpace(link.URL))
		}
	}

	digest := mac.Sum(nil)
	return resourcePublicIDPrefix + base64.RawURLEncoding.EncodeToString(digest[:resourcePublicIDDigestLength])
}

func resolveResourcePublicIdentitySource(result model.SearchResult) (string, string) {
	sourceType := strings.TrimSpace(result.SourceType)
	sourceID := strings.TrimSpace(result.SourcePluginID)
	if result.Channel != "" {
		if sourceType == "" {
			sourceType = "tg"
		}
		if sourceID == "" {
			sourceID = strings.TrimSpace(result.Channel)
		}
	}
	if sourceType == "" {
		if sourceID == "" && result.UniqueID != "" && strings.Contains(result.UniqueID, "-") {
			parts := strings.SplitN(result.UniqueID, "-", 2)
			sourceID = parts[0]
		}
		if sourceID != "" {
			sourceType = "plugin"
		} else {
			sourceType = "unknown"
		}
	}
	if sourceID == "" {
		sourceID = strings.TrimSpace(result.SourceName)
	}
	return sourceType, sourceID
}

func resolveResourceInternalID(result model.SearchResult) string {
	if uniqueID := strings.TrimSpace(result.UniqueID); uniqueID != "" {
		return uniqueID
	}
	return strings.TrimSpace(result.MessageID)
}

func writeResourcePublicIDField(mac interface{ Write([]byte) (int, error) }, field string) {
	encodedField := base64.RawURLEncoding.EncodeToString([]byte(field))
	_, _ = mac.Write([]byte(encodedField))
	_, _ = mac.Write([]byte{0})
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
	if len(links) == 0 {
		return []model.ResourceAction{}
	}

	if len(result.Actions) > 0 {
		actions := make([]model.ResourceAction, 0, len(result.Actions))
		for _, action := range result.Actions {
			if action.Type == "open_detail" {
				continue
			}
			actions = append(actions, action)
		}
		return actions
	}

	actions := make([]model.ResourceAction, 0, len(links))
	for _, link := range links {
		payload := map[string]interface{}{
			"url":         link.URL,
			"link_type":   link.Type,
			"title":       link.Title,
			"work_title":  link.WorkTitle,
			"access_mode": link.AccessMode,
		}
		if strings.TrimSpace(link.Password) != "" {
			payload["password"] = link.Password
		}
		if link.ScanTransfer != nil {
			payload["scan_transfer"] = cloneScanTransferInfo(link.ScanTransfer)
		}
		actions = append(actions, model.ResourceAction{
			Key:     "link." + link.Type + ".open",
			Label:   "打开" + link.Type,
			Type:    "open_link",
			Style:   "primary",
			Payload: payload,
		})
	}

	return actions
}

func resolveLinkAccessMode(link model.Link) string {
	if accessMode := strings.TrimSpace(link.AccessMode); accessMode != "" {
		return accessMode
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

func cloneScanTransferInfo(info *model.ScanTransferInfo) *model.ScanTransferInfo {
	if info == nil {
		return nil
	}
	cloned := *info
	return &cloned
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

func buildPublicResourceMeta(meta map[string]interface{}) map[string]interface{} {
	cloned := cloneMeta(meta)
	delete(cloned, "detail_url")
	delete(cloned, "sid_hub_detail_url")
	return cloned
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
		return scanTransferMatchesKeyword(result, lowerKeyword)
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

func scanTransferMatchesKeyword(result model.SearchResult, lowerKeyword string) bool {
	for _, link := range result.Links {
		fields := make([]string, 0, 10)
		appendField := func(value string) {
			normalized := strings.ToLower(cleanTitle(value))
			if normalized != "" {
				fields = append(fields, normalized)
			}
		}
		appendField(link.AccessMode)
		appendScanTransferSearchFields(appendField, link.ScanTransfer)

		for _, field := range fields {
			if strings.Contains(field, lowerKeyword) {
				return true
			}
		}

		keywordTerms := splitKeywordTerms(lowerKeyword)
		if len(keywordTerms) <= 1 {
			continue
		}
		combined := strings.Join(fields, " ")
		matchedAllTerms := true
		for _, term := range keywordTerms {
			if !strings.Contains(combined, term) {
				matchedAllTerms = false
				break
			}
		}
		if matchedAllTerms {
			return true
		}
	}
	return false
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
		appendField(link.Type)
		appendField(link.URL)
		appendField(link.Password)
		appendField(link.AccessMode)
		appendField(link.WorkTitle)
		appendScanTransferSearchFields(appendField, link.ScanTransfer)
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
	for _, link := range resource.Links {
		appendField(link.Type)
		appendField(link.URL)
		appendField(link.Password)
		appendField(link.AccessMode)
		appendField(link.Title)
		appendField(link.WorkTitle)
		appendScanTransferSearchFields(appendField, link.ScanTransfer)
	}

	return fields
}

func appendScanTransferSearchFields(appendField func(string), scanTransfer *model.ScanTransferInfo) {
	if scanTransfer == nil {
		return
	}
	appendField(scanTransfer.Provider)
	appendField(scanTransfer.QRCodeImageURL)
	appendField(scanTransfer.QRCodeValue)
	appendField(scanTransfer.MobileURL)
	appendField(scanTransfer.TransferCode)
	appendField(scanTransfer.Instruction)
	appendField(scanTransfer.SourcePageURL)
	appendField(scanTransfer.ExpiresHint)
	appendField(scanTransfer.RefreshKey)
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
	if resource.PublishedAt != nil {
		return *resource.PublishedAt
	}
	for _, link := range resource.Links {
		if link.Datetime != nil {
			return *link.Datetime
		}
	}
	return time.Time{}
}

func optionalTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	copy := value
	return &copy
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
