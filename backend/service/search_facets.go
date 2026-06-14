package service

import (
	"strings"

	"unisearch/model"
)

// 本文件负责基于资源列表重算统一筛选（facets）计数。

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
