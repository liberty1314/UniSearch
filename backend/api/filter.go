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
	mediaTypes := normalizeFilterValues(filter.MediaTypes)
	targetTypes := normalizeFilterValues(filter.TargetTypes)
	capabilities := normalizeFilterValues(filter.Capabilities)

	filtered := make([]model.ResourceObject, 0, len(response.Resources))
	for _, resource := range response.Resources {
		if !matchFilter(resource, includeKeywords, excludeKeywords, mediaTypes, targetTypes, capabilities) {
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
		len(filter.MediaTypes) == 0 &&
		len(filter.TargetTypes) == 0 &&
		len(filter.Capabilities) == 0
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

// matchFilter 检查文本是否匹配关键词过滤条件。
func matchFilter(resource model.ResourceObject, includeKeywords, excludeKeywords, mediaTypes, targetTypes, capabilities []string) bool {
	text := buildResourceFilterText(resource)
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

	if !matchAnyStringFilter(strings.ToLower(strings.TrimSpace(resource.MediaType)), mediaTypes) {
		return false
	}
	if !matchAnyStringFilter(strings.ToLower(strings.TrimSpace(resource.TargetType)), targetTypes) {
		return false
	}
	if !matchAnySetFilter(collectResourceCapabilities(resource.Capabilities), capabilities) {
		return false
	}

	return true
}

func matchAnyStringFilter(value string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	if value == "" {
		return false
	}
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}

func matchAnySetFilter(values map[string]struct{}, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, candidate := range allowed {
		if _, exists := values[candidate]; exists {
			return true
		}
	}
	return false
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
