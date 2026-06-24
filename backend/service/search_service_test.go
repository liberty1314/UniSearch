package service

import (
	"errors"
	"fmt"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
)

type mockAsyncSearchPlugin struct {
	name             string
	delay            time.Duration
	err              error
	asyncSearchCalls atomic.Int32
	searchCalls      atomic.Int32
}

func (m *mockAsyncSearchPlugin) Name() string {
	return m.name
}

func (m *mockAsyncSearchPlugin) Priority() int {
	return 1
}

func (m *mockAsyncSearchPlugin) AsyncSearch(
	keyword string,
	_ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error),
	_ string,
	_ map[string]interface{},
) ([]model.SearchResult, error) {
	m.asyncSearchCalls.Add(1)
	if m.delay > 0 {
		time.Sleep(m.delay)
	}

	return []model.SearchResult{
		{
			UniqueID: fmt.Sprintf("%s-%s", m.name, keyword),
			Title:    fmt.Sprintf("%s result", m.name),
			Links: []model.Link{
				{
					Type: "mock",
					URL:  "https://example.com/" + m.name,
				},
			},
		},
	}, nil
}

func (m *mockAsyncSearchPlugin) SetMainCacheKey(_ string) {}

func (m *mockAsyncSearchPlugin) SetCurrentKeyword(_ string) {}

func (m *mockAsyncSearchPlugin) SearchWithResult(keyword string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	m.searchCalls.Add(1)
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	if m.err != nil {
		return model.PluginSearchResult{}, m.err
	}
	return model.PluginSearchResult{
		Results: []model.SearchResult{{
			UniqueID: fmt.Sprintf("%s-search-%s", m.name, keyword),
			Title:    fmt.Sprintf("%s search result", m.name),
			Links: []model.Link{
				{
					Type: "mock",
					URL:  "https://example.com/" + m.name,
				},
			},
		}},
		IsFinal: true,
		Source:  m.name,
	}, nil
}

func (m *mockAsyncSearchPlugin) SkipServiceFilter() bool {
	return false
}

func (m *mockAsyncSearchPlugin) AsyncSearchCalls() int32 {
	return m.asyncSearchCalls.Load()
}

func (m *mockAsyncSearchPlugin) SearchCalls() int32 {
	return m.searchCalls.Load()
}

func TestSearchPlugins_LowConcurrencyDoesNotBlock(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        5,
		AsyncMaxBackgroundWorkers: 20,
		PluginTimeout:             80 * time.Millisecond,
		PluginTimeoutSeconds:      1,
		AsyncResponseTimeoutDur:   1 * time.Second,
		AsyncResponseTimeout:      1,
		AsyncMaxBackgroundTasks:   200,
		AsyncPluginEnabled:        true,
		EnabledPlugins:            []string{},
		HTTPReadTimeout:           0,
		HTTPWriteTimeout:          0,
		HTTPIdleTimeout:           0,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	pm := plugin.NewPluginManager()
	for i := 0; i < 60; i++ {
		pm.RegisterPlugin(&mockAsyncSearchPlugin{
			name:  fmt.Sprintf("mock-plugin-%d", i),
			delay: 40 * time.Millisecond,
		})
	}

	service := NewSearchService(pm, nil, nil)

	done := make(chan struct{})
	var (
		results []model.SearchResult
		err     error
	)
	start := time.Now()

	go func() {
		results, _, err = service.searchPlugins("仙逆", nil, true, 5, nil)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("searchPlugins blocked under timeout scenario")
	}

	if err != nil {
		t.Fatalf("searchPlugins returned error: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("searchPlugins should return partial results on timeout")
	}
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Fatalf("searchPlugins returned too slow: %s", elapsed)
	}
}

func TestSearchPluginsReturnsWarningWhenSinglePluginFails(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 2,
		PluginTimeout:             200 * time.Millisecond,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	pm := plugin.NewPluginManager()
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "ok-plugin"})
	pm.RegisterPlugin(&mockAsyncSearchPlugin{name: "failed-plugin", err: errors.New("上游失败")})

	service := NewSearchService(pm, nil, nil)
	results, warnings, err := service.searchPlugins("仙逆", nil, true, 2, nil)
	if err != nil {
		t.Fatalf("searchPlugins returned error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected one successful result, got %d", len(results))
	}
	if len(warnings) != 1 {
		t.Fatalf("expected one warning, got %#v", warnings)
	}
	if warnings[0].Source != "failed-plugin" {
		t.Fatalf("expected failed plugin source, got %#v", warnings[0])
	}
}
