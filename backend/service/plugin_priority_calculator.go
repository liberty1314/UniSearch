package service

import (
	"sort"
	"strings"
	"time"

	"unisearch/plugin"
)

type PluginPriorityTier string

const (
	PluginTierCritical PluginPriorityTier = "critical"
	PluginTierFast     PluginPriorityTier = "fast"
	PluginTierMedium   PluginPriorityTier = "medium"
	PluginTierSlow     PluginPriorityTier = "slow"
	PluginTierDegraded PluginPriorityTier = "degraded"
)

type PluginPriorityInfo struct {
	Plugin              plugin.AsyncSearchPlugin
	Name                string
	Tier                PluginPriorityTier
	Score               float64
	AvgResponseMS       int64
	SuccessRate         float64
	TimeoutRate         float64
	ConsecutiveFailures int
	Explicit            bool
}

// PluginPriorityCalculator 根据健康状态和性能指标计算插件调度顺序。
type PluginPriorityCalculator struct {
	pluginHealth  *PluginHealthService
	pluginMetrics *PluginMetricsCollector
}

func NewPluginPriorityCalculator(pluginHealth *PluginHealthService, pluginMetrics *PluginMetricsCollector) *PluginPriorityCalculator {
	return &PluginPriorityCalculator{
		pluginHealth:  pluginHealth,
		pluginMetrics: pluginMetrics,
	}
}

func (c *PluginPriorityCalculator) RankPlugins(plugins []plugin.AsyncSearchPlugin, requestedPlugins []string) []PluginPriorityInfo {
	if len(plugins) == 0 {
		return nil
	}
	explicitNames := buildExplicitPluginNameSet(requestedPlugins)
	metrics := c.metricsByPluginName()

	items := make([]PluginPriorityInfo, 0, len(plugins))
	for _, currentPlugin := range plugins {
		if currentPlugin == nil {
			continue
		}
		name := currentPlugin.Name()
		normalizedName := normalizePluginName(name)
		metric, hasMetric := metrics[normalizedName]
		item := PluginPriorityInfo{
			Plugin:        currentPlugin,
			Name:          name,
			Tier:          PluginTierMedium,
			Score:         50,
			SuccessRate:   0.8,
			TimeoutRate:   0,
			Explicit:      explicitNames[normalizedName],
			AvgResponseMS: 0,
		}
		if hasMetric && metric.RequestCount > 0 {
			item.AvgResponseMS = metric.AvgResponseMS
			item.SuccessRate = metric.SuccessRate
			item.TimeoutRate = metric.TimeoutRate
		}
		if c.pluginHealth != nil {
			if status, err := c.pluginHealth.GetStatus(name); err == nil && status != nil {
				item.TimeoutRate = status.TimeoutRate
				item.ConsecutiveFailures = status.ConsecutiveFailures
				if normalizeCircuitState(status.CircuitState) == CircuitStateOpen {
					item.Tier = PluginTierDegraded
				}
			}
		}
		item.Score = calculatePluginPriorityScore(item, hasMetric)
		item.Tier = resolvePluginPriorityTier(currentPlugin, item, hasMetric)
		items = append(items, item)
	}

	sort.SliceStable(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if tierRank(left.Tier) != tierRank(right.Tier) {
			return tierRank(left.Tier) < tierRank(right.Tier)
		}
		if left.Score != right.Score {
			return left.Score > right.Score
		}
		if left.Plugin.Priority() != right.Plugin.Priority() {
			return left.Plugin.Priority() < right.Plugin.Priority()
		}
		return strings.ToLower(left.Name) < strings.ToLower(right.Name)
	})
	return items
}

func (c *PluginPriorityCalculator) SortPlugins(plugins []plugin.AsyncSearchPlugin, requestedPlugins []string) []plugin.AsyncSearchPlugin {
	ranked := c.RankPlugins(plugins, requestedPlugins)
	result := make([]plugin.AsyncSearchPlugin, 0, len(ranked))
	for _, item := range ranked {
		result = append(result, item.Plugin)
	}
	return result
}

func (c *PluginPriorityCalculator) metricsByPluginName() map[string]pluginMetricSummary {
	result := make(map[string]pluginMetricSummary)
	if c == nil || c.pluginMetrics == nil {
		return result
	}
	for _, item := range c.pluginMetrics.RealtimeSnapshot().Items {
		result[normalizePluginName(item.PluginName)] = pluginMetricSummary{
			RequestCount:  item.RequestCount,
			AvgResponseMS: item.AvgResponseMS,
			SuccessRate:   item.SuccessRate,
			TimeoutRate:   item.TimeoutRate,
		}
	}
	if len(result) > 0 {
		return result
	}
	metrics, err := c.pluginMetrics.ListMetrics(PluginMetricsQuery{Limit: 200})
	if err != nil {
		return result
	}
	for _, metric := range metrics {
		name := normalizePluginName(metric.PluginName)
		if name == "" {
			continue
		}
		if _, exists := result[name]; exists {
			continue
		}
		summary := pluginMetricSummary{
			RequestCount:  metric.RequestCount,
			AvgResponseMS: metric.AvgResponseMS,
		}
		if metric.RequestCount > 0 {
			summary.SuccessRate = float64(metric.SuccessCount) / float64(metric.RequestCount)
			summary.TimeoutRate = float64(metric.TimeoutCount) / float64(metric.RequestCount)
		}
		result[name] = summary
	}
	return result
}

type pluginMetricSummary struct {
	RequestCount  int
	AvgResponseMS int64
	SuccessRate   float64
	TimeoutRate   float64
}

func calculatePluginPriorityScore(item PluginPriorityInfo, hasMetric bool) float64 {
	if !hasMetric && item.ConsecutiveFailures == 0 && item.TimeoutRate == 0 {
		return 50
	}
	healthWeight := (1 - clamp01(item.TimeoutRate)) * 40
	avgSeconds := float64(item.AvgResponseMS) / 1000
	performanceWeight := 30.0
	if item.AvgResponseMS > 0 {
		performanceWeight = (1 / (1 + avgSeconds/10)) * 30
	}
	successWeight := clamp01(item.SuccessRate) * 20
	stabilityWeight := (1 / (1 + float64(item.ConsecutiveFailures))) * 10
	return healthWeight + performanceWeight + successWeight + stabilityWeight
}

func resolvePluginPriorityTier(currentPlugin plugin.AsyncSearchPlugin, item PluginPriorityInfo, hasMetric bool) PluginPriorityTier {
	if item.Explicit || currentPlugin.Priority() <= 0 {
		return PluginTierCritical
	}
	if item.Tier == PluginTierDegraded || item.TimeoutRate > 0.7 || item.ConsecutiveFailures >= 3 {
		return PluginTierDegraded
	}
	if hasMetric && item.AvgResponseMS > 0 && item.AvgResponseMS < 2000 && item.TimeoutRate < 0.1 && item.SuccessRate >= 0.8 {
		return PluginTierFast
	}
	if item.AvgResponseMS > 5000 || item.TimeoutRate > 0.3 || item.ConsecutiveFailures > 0 {
		return PluginTierSlow
	}
	return PluginTierMedium
}

func tierRank(tier PluginPriorityTier) int {
	switch tier {
	case PluginTierCritical:
		return 0
	case PluginTierFast:
		return 1
	case PluginTierMedium:
		return 2
	case PluginTierSlow:
		return 3
	case PluginTierDegraded:
		return 4
	default:
		return 2
	}
}

func pluginTierScheduleDelay(tier PluginPriorityTier) time.Duration {
	switch tier {
	case PluginTierSlow:
		return 200 * time.Millisecond
	case PluginTierDegraded:
		return 500 * time.Millisecond
	default:
		return 0
	}
}

func buildExplicitPluginNameSet(pluginNames []string) map[string]bool {
	result := make(map[string]bool, len(pluginNames))
	for _, name := range pluginNames {
		normalizedName := normalizePluginName(name)
		if normalizedName != "" {
			result[normalizedName] = true
		}
	}
	return result
}

func clamp01(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 1 {
		return 1
	}
	return value
}
