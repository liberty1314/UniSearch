package api

import (
	"strings"

	"unisearch/model"
	searchsvc "unisearch/service"
)

// applyResultFilter 应用统一资源过滤器到搜索响应。
func applyResultFilter(response model.SearchResponse, filter *model.FilterConfig, _ string) model.SearchResponse {
	if filter == nil || isResourceFilterEmpty(filter) {
		return response
	}

	includeKeywords := normalizeFilterValues(filter.Include)
	excludeKeywords := normalizeFilterValues(filter.Exclude)
	sourceTypes := normalizeFilterSet(filter.SourceTypes)
	mediaTypes := normalizeFilterSet(filter.MediaTypes)
	targetTypes := normalizeFilterSet(filter.TargetTypes)
	capabilities := normalizeFilterSet(filter.Capabilities)
	actionTypes := normalizeFilterSet(filter.ActionTypes)

	filtered := make([]model.ResourceObject, 0, len(response.Resources))
	for _, resource := range response.Resources {
		if !matchFilter(buildResourceFilterText(resource), includeKeywords, excludeKeywords) {
			continue
		}
		if !matchResourceDimension(sourceTypes, resource.Source.Type, resource.Source.ID, resource.Source.Name) {
			continue
		}
		if !matchResourceDimension(mediaTypes, resource.MediaType) {
			continue
		}
		if !matchResourceDimension(targetTypes, resource.TargetType) {
			continue
		}
		if !matchResourceCapabilities(resource.Capabilities, capabilities) {
			continue
		}
		if !matchResourceActions(resource.Actions, actionTypes) {
			continue
		}
		filtered = append(filtered, resource)
	}

	response.Resources = filtered
	response.Total = len(filtered)
	response.Facets = searchsvc.BuildResourceFacets(filtered)
	return response
}

func isResourceFilterEmpty(filter *model.FilterConfig) bool {
	return len(filter.Include) == 0 &&
		len(filter.Exclude) == 0 &&
		len(filter.SourceTypes) == 0 &&
		len(filter.MediaTypes) == 0 &&
		len(filter.TargetTypes) == 0 &&
		len(filter.Capabilities) == 0 &&
		len(filter.ActionTypes) == 0
}

func normalizeFilterValues(values []string) []string {
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.ToLower(strings.TrimSpace(value))
		if trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}
	return normalized
}

func normalizeFilterSet(values []string) map[string]bool {
	normalized := make(map[string]bool, len(values))
	for _, value := range normalizeFilterValues(values) {
		normalized[value] = true
	}
	return normalized
}

func buildResourceFilterText(resource model.ResourceObject) string {
	parts := []string{
		resource.ID,
		resource.Title,
		resource.Description,
		resource.Source.Type,
		resource.Source.ID,
		resource.Source.Name,
		resource.MediaType,
		resource.TargetType,
		resource.Detail.URL,
		resource.Detail.Content,
	}
	parts = append(parts, resource.Tags...)
	for _, link := range resource.Links {
		parts = append(parts, link.Type, link.URL, link.Title, link.WorkTitle)
	}
	return strings.Join(parts, " ")
}

func matchResourceDimension(allowed map[string]bool, values ...string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, value := range values {
		if allowed[strings.ToLower(strings.TrimSpace(value))] {
			return true
		}
	}
	return false
}

func matchResourceCapabilities(capabilities model.ResourceCapabilities, allowed map[string]bool) bool {
	if len(allowed) == 0 {
		return true
	}

	active := map[string]bool{
		"searchable":          capabilities.Searchable,
		"official_searchable": capabilities.OfficialSearchable,
		"share_searchable":    capabilities.ShareSearchable,
		"downloadable":        capabilities.Downloadable,
		"strmable":            capabilities.Strmable,
	}
	for capability := range allowed {
		if active[capability] {
			return true
		}
	}
	return false
}

func matchResourceActions(actions []model.ResourceAction, allowed map[string]bool) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, action := range actions {
		if allowed[strings.ToLower(strings.TrimSpace(action.Type))] ||
			allowed[strings.ToLower(strings.TrimSpace(action.Key))] {
			return true
		}
	}
	return false
}

// matchFilter 检查文本是否匹配关键词过滤条件。
func matchFilter(text string, includeKeywords, excludeKeywords []string) bool {
	lowerText := strings.ToLower(text)

	for _, kw := range excludeKeywords {
		if strings.Contains(lowerText, kw) {
			return false
		}
	}

	if len(includeKeywords) > 0 {
		for _, kw := range includeKeywords {
			if strings.Contains(lowerText, kw) {
				return true
			}
		}
		return false
	}

	return true
}
