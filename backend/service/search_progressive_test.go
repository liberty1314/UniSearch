package service

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
)

type progressiveTestPlugin struct {
	name  string
	delay time.Duration
	err   error
}

func (p *progressiveTestPlugin) Name() string  { return p.name }
func (p *progressiveTestPlugin) Priority() int { return 1 }
func (p *progressiveTestPlugin) AsyncSearch(_ string, _ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error), _ string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return nil, nil
}
func (p *progressiveTestPlugin) SetMainCacheKey(_ string)   {}
func (p *progressiveTestPlugin) SetCurrentKeyword(_ string) {}
func (p *progressiveTestPlugin) SkipServiceFilter() bool    { return false }
func (p *progressiveTestPlugin) Search(keyword string, _ map[string]interface{}) ([]model.SearchResult, error) {
	if p.delay > 0 {
		time.Sleep(p.delay)
	}
	if p.err != nil {
		return nil, p.err
	}
	return []model.SearchResult{{
		UniqueID: fmt.Sprintf("%s-%s", p.name, keyword),
		Title:    keyword + " " + p.name + " result",
		Links: []model.Link{{
			Type: "mock",
			URL:  "https://example.com/" + p.name,
		}},
	}}, nil
}

func TestSearchProgressiveEmitsStartedBatchAndComplete(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             time.Second,
		EnabledPlugins:            []string{},
	}
	defer func() { config.AppConfig = oldConfig }()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&progressiveTestPlugin{name: "fast-plugin"})
	pm.RegisterPlugin(&progressiveTestPlugin{name: "slow-plugin", delay: 20 * time.Millisecond})

	searchService := NewSearchService(pm, nil, nil)
	events := make([]model.SearchProgressiveEvent, 0, 4)
	err := searchService.SearchProgressive(context.Background(), model.SearchRequest{
		Keyword:      "仙逆",
		SourceType:   "plugin",
		ForceRefresh: true,
	}, func(event model.SearchProgressiveEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("progressive search returned error: %v", err)
	}

	if len(events) < 4 {
		t.Fatalf("expected at least started + 2 batches + complete, got %#v", events)
	}
	if events[0].Type != "started" || events[0].TotalSources != 2 {
		t.Fatalf("unexpected started event: %#v", events[0])
	}
	if events[len(events)-1].Type != "complete" || events[len(events)-1].Response == nil {
		t.Fatalf("expected final complete event with response, got %#v", events[len(events)-1])
	}
	if events[len(events)-1].Response.Total != 2 {
		t.Fatalf("expected complete response total 2, got %d", events[len(events)-1].Response.Total)
	}
}

func TestSearchProgressiveEmitsTimeoutWarning(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        1,
		AsyncMaxBackgroundWorkers: 1,
		PluginTimeout:             20 * time.Millisecond,
		EnabledPlugins:            []string{},
	}
	defer func() { config.AppConfig = oldConfig }()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&progressiveTestPlugin{name: "timeout-plugin", delay: 200 * time.Millisecond})

	searchService := NewSearchService(pm, nil, nil)
	events := make([]model.SearchProgressiveEvent, 0, 4)
	err := searchService.SearchProgressive(context.Background(), model.SearchRequest{
		Keyword:      "仙逆",
		SourceType:   "plugin",
		ForceRefresh: true,
	}, func(event model.SearchProgressiveEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("progressive search returned error: %v", err)
	}

	foundWarning := false
	for _, event := range events {
		if event.Type == "warning" && len(event.Warnings) > 0 {
			foundWarning = true
		}
	}
	if !foundWarning {
		t.Fatalf("expected timeout warning event, got %#v", events)
	}
	if searchService.ObservabilitySnapshot().TimeoutCount == 0 {
		t.Fatal("expected timeout to be recorded in observability snapshot")
	}
}
