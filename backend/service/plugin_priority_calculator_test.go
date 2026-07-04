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

func TestPluginPriorityCalculatorUsesStableDefaultForUnknownPlugin(t *testing.T) {
	calculator := NewPluginPriorityCalculator(nil, nil)
	ranked := calculator.RankPlugins([]plugin.AsyncSearchPlugin{&mockAsyncSearchPlugin{name: "unknown"}}, nil)

	if len(ranked) != 1 {
		t.Fatalf("期望一个排序结果，实际为 %d", len(ranked))
	}
	if ranked[0].Tier != PluginTierMedium || ranked[0].Score != 50 {
		t.Fatalf("无历史数据插件应使用稳定默认值，实际为 %#v", ranked[0])
	}
}

func TestPluginPriorityCalculatorRanksCriticalFastSlowAndDegraded(t *testing.T) {
	healthService := newPluginHealthTestService(t)
	collector, _ := newPluginMetricsTestCollector(t)
	now := time.Date(2026, 7, 4, 22, 30, 0, 0, time.UTC)

	collector.RecordEvent(PluginMetricEvent{
		PluginName: "fast-plugin",
		Keyword:    "测试",
		Duration:   100 * time.Millisecond,
		Success:    true,
		OccurredAt: now,
	})
	collector.RecordEvent(PluginMetricEvent{
		PluginName: "slow-plugin",
		Keyword:    "测试",
		Duration:   6 * time.Second,
		Success:    true,
		OccurredAt: now,
	})
	for i := 0; i < 3; i++ {
		if err := healthService.RecordResult("degraded-plugin", false, "上游失败", "search_failure"); err != nil {
			t.Fatalf("记录降级插件失败: %v", err)
		}
	}

	plugins := []plugin.AsyncSearchPlugin{
		&mockAsyncSearchPlugin{name: "slow-plugin"},
		&mockAsyncSearchPlugin{name: "medium-plugin"},
		&mockAsyncSearchPlugin{name: "degraded-plugin"},
		&mockAsyncSearchPlugin{name: "fast-plugin"},
		&mockAsyncSearchPlugin{name: "explicit-plugin"},
	}

	ranked := NewPluginPriorityCalculator(healthService, collector).RankPlugins(plugins, []string{"explicit-plugin"})
	got := make([]string, 0, len(ranked))
	tiers := make(map[string]PluginPriorityTier, len(ranked))
	for _, item := range ranked {
		got = append(got, item.Name)
		tiers[item.Name] = item.Tier
	}

	want := []string{"explicit-plugin", "fast-plugin", "medium-plugin", "slow-plugin", "degraded-plugin"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("排序结果不正确，want=%v got=%v", want, got)
	}
	if tiers["explicit-plugin"] != PluginTierCritical ||
		tiers["fast-plugin"] != PluginTierFast ||
		tiers["medium-plugin"] != PluginTierMedium ||
		tiers["slow-plugin"] != PluginTierSlow ||
		tiers["degraded-plugin"] != PluginTierDegraded {
		t.Fatalf("分级结果不正确: %#v", tiers)
	}
}

func TestPluginPriorityCalculatorTreatsHighPriorityPluginAsCritical(t *testing.T) {
	plugins := []plugin.AsyncSearchPlugin{
		&priorityProbePlugin{name: "normal", priority: 3},
		&priorityProbePlugin{name: "core", priority: 0},
	}

	ranked := NewPluginPriorityCalculator(nil, nil).RankPlugins(plugins, nil)
	if ranked[0].Name != "core" || ranked[0].Tier != PluginTierCritical {
		t.Fatalf("高优先级插件应进入 Critical，实际为 %#v", ranked)
	}
}

func TestPluginTierScheduleDelay(t *testing.T) {
	if pluginTierScheduleDelay(PluginTierFast) != 0 {
		t.Fatal("Fast 插件不应延迟调度")
	}
	if pluginTierScheduleDelay(PluginTierSlow) <= 0 {
		t.Fatal("Slow 插件应延迟调度")
	}
	if pluginTierScheduleDelay(PluginTierDegraded) <= pluginTierScheduleDelay(PluginTierSlow) {
		t.Fatal("Degraded 插件延迟应高于 Slow")
	}
}

func TestSearchProgressivePrioritizesFastPluginBeforeSlowPlugin(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		CacheEnabled:              false,
		DefaultConcurrency:        1,
		AsyncMaxBackgroundWorkers: 1,
		PluginTimeout:             time.Second,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	collector, _ := newPluginMetricsTestCollector(t)
	now := time.Date(2026, 7, 4, 22, 45, 0, 0, time.UTC)
	collector.RecordEvent(PluginMetricEvent{
		PluginName: "fast-progressive",
		Keyword:    "测试",
		Duration:   100 * time.Millisecond,
		Success:    true,
		OccurredAt: now,
	})
	collector.RecordEvent(PluginMetricEvent{
		PluginName: "slow-progressive",
		Keyword:    "测试",
		Duration:   6 * time.Second,
		Success:    true,
		OccurredAt: now,
	})

	manager := plugin.NewPluginManager()
	manager.RegisterPlugin(&mockAsyncSearchPlugin{name: "slow-progressive"})
	manager.RegisterPlugin(&mockAsyncSearchPlugin{name: "fast-progressive"})
	searchService := NewSearchService(manager, nil, nil)
	searchService.SetPluginMetricsCollector(collector)

	batchSources := make([]string, 0)
	err := searchService.SearchProgressive(context.Background(), model.SearchRequest{
		Keyword:     "测试",
		SourceType:  "plugin",
		Concurrency: 1,
	}, func(event model.SearchProgressiveEvent) error {
		if event.Type == "batch" && event.Source != "" {
			batchSources = append(batchSources, event.Source)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("渐进式搜索失败: %v", err)
	}
	if len(batchSources) < 2 {
		t.Fatalf("期望至少两个插件批次，实际为 %v", batchSources)
	}
	if batchSources[0] != "fast-progressive" {
		t.Fatalf("快速插件应优先返回，实际批次顺序为 %v", batchSources)
	}
}

type priorityProbePlugin struct {
	name     string
	priority int
}

func (p *priorityProbePlugin) Name() string {
	return p.name
}

func (p *priorityProbePlugin) Priority() int {
	return p.priority
}

func (p *priorityProbePlugin) AsyncSearch(keyword string, _ func(*http.Client, string, map[string]interface{}) ([]model.SearchResult, error), _ string, _ map[string]interface{}) ([]model.SearchResult, error) {
	result, err := p.SearchWithResult(keyword, nil)
	if err != nil {
		return nil, err
	}
	return result.GetResults(), nil
}

func (p *priorityProbePlugin) SetMainCacheKey(_ string) {}

func (p *priorityProbePlugin) SetCurrentKeyword(_ string) {}

func (p *priorityProbePlugin) SearchWithResult(keyword string, _ map[string]interface{}) (model.PluginSearchResult, error) {
	return model.PluginSearchResult{
		Results: []model.SearchResult{{
			UniqueID: p.name + "-" + keyword,
			Title:    p.name,
			Links: []model.Link{{
				Type: "mock",
				URL:  "https://example.com/" + p.name,
			}},
		}},
		IsFinal: true,
		Source:  p.name,
	}, nil
}

func (p *priorityProbePlugin) SkipServiceFilter() bool {
	return false
}
