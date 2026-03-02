package service

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/plugin"
)

type mockAsyncSearchPlugin struct {
	name  string
	delay time.Duration
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

func (m *mockAsyncSearchPlugin) Search(keyword string, _ map[string]interface{}) ([]model.SearchResult, error) {
	return []model.SearchResult{
		{
			UniqueID: fmt.Sprintf("%s-search-%s", m.name, keyword),
			Title:    fmt.Sprintf("%s search result", m.name),
			Links: []model.Link{
				{
					Type: "mock",
					URL:  "https://example.com/" + m.name,
				},
			},
		},
	}, nil
}

func (m *mockAsyncSearchPlugin) SkipServiceFilter() bool {
	return false
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
		results, err = service.searchPlugins("仙逆", nil, true, 5, nil)
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
