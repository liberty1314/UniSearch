package service

import (
	"strings"

	"unisearch/config"
)

type NormalizedSearchRequest struct {
	Keyword      string
	Channels     []string
	Concurrency  int
	ForceRefresh bool
	ResultType   string
	SourceType   string
	Plugins      []string
	CloudTypes   []string
	Ext          map[string]interface{}
}

type SearchRequestNormalizer interface {
	Normalize(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) NormalizedSearchRequest
}

type searchRequestNormalizer struct{}

func newSearchRequestNormalizer() SearchRequestNormalizer {
	return searchRequestNormalizer{}
}

func (searchRequestNormalizer) Normalize(keyword string, channels []string, concurrency int, forceRefresh bool, resultType string, sourceType string, plugins []string, cloudTypes []string, ext map[string]interface{}) NormalizedSearchRequest {
	if ext == nil {
		ext = make(map[string]interface{})
	}

	if sourceType == "" {
		sourceType = "all"
	}

	if concurrency <= 0 && config.AppConfig != nil {
		concurrency = config.AppConfig.DefaultConcurrency
	}

	return NormalizedSearchRequest{
		Keyword:      strings.TrimSpace(keyword),
		Channels:     channels,
		Concurrency:  concurrency,
		ForceRefresh: forceRefresh,
		ResultType:   resultType,
		SourceType:   sourceType,
		Plugins:      sanitizePluginNames(plugins),
		CloudTypes:   cloudTypes,
		Ext:          ext,
	}
}

func sanitizePluginNames(plugins []string) []string {
	if len(plugins) == 0 {
		return nil
	}

	sanitized := make([]string, 0, len(plugins))
	for _, pluginName := range plugins {
		trimmed := strings.TrimSpace(pluginName)
		if trimmed == "" {
			continue
		}

		sanitized = append(sanitized, trimmed)
	}

	if len(sanitized) == 0 {
		return nil
	}

	return sanitized
}
