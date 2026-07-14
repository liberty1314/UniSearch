package service

import (
	"sync"
	"time"
)

type ResourceResolveMetrics struct {
	Total            uint64            `json:"total"`
	Success          uint64            `json:"success"`
	CacheHits        uint64            `json:"cache_hits"`
	Active           int               `json:"active"`
	MaxActive        int               `json:"max_active"`
	OutcomeCounts    map[string]uint64 `json:"outcome_counts"`
	LatencyBucketsMS map[string]uint64 `json:"latency_buckets_ms"`
}

type ResourceResolveMetricsCollector struct {
	mu      sync.Mutex
	metrics ResourceResolveMetrics
}

func NewResourceResolveMetrics() *ResourceResolveMetricsCollector {
	return &ResourceResolveMetricsCollector{metrics: ResourceResolveMetrics{
		OutcomeCounts:    make(map[string]uint64),
		LatencyBucketsMS: make(map[string]uint64),
	}}
}

func (collector *ResourceResolveMetricsCollector) Begin() {
	if collector == nil {
		return
	}
	collector.mu.Lock()
	defer collector.mu.Unlock()
	collector.metrics.Total++
	collector.metrics.Active++
	if collector.metrics.Active > collector.metrics.MaxActive {
		collector.metrics.MaxActive = collector.metrics.Active
	}
}

func (collector *ResourceResolveMetricsCollector) Finish(outcome string, cacheHit bool, latency time.Duration) {
	if collector == nil {
		return
	}
	collector.mu.Lock()
	defer collector.mu.Unlock()
	if collector.metrics.Active > 0 {
		collector.metrics.Active--
	}
	collector.metrics.OutcomeCounts[outcome]++
	if outcome == "success" {
		collector.metrics.Success++
	}
	if cacheHit {
		collector.metrics.CacheHits++
	}
	collector.metrics.LatencyBucketsMS[resourceResolveLatencyBucket(latency)]++
}

func (collector *ResourceResolveMetricsCollector) Snapshot() ResourceResolveMetrics {
	if collector == nil {
		return ResourceResolveMetrics{OutcomeCounts: map[string]uint64{}, LatencyBucketsMS: map[string]uint64{}}
	}
	collector.mu.Lock()
	defer collector.mu.Unlock()
	snapshot := collector.metrics
	snapshot.OutcomeCounts = cloneUint64Map(collector.metrics.OutcomeCounts)
	snapshot.LatencyBucketsMS = cloneUint64Map(collector.metrics.LatencyBucketsMS)
	return snapshot
}

func resourceResolveLatencyBucket(latency time.Duration) string {
	milliseconds := latency.Milliseconds()
	switch {
	case milliseconds <= 100:
		return "le_100"
	case milliseconds <= 500:
		return "le_500"
	case milliseconds <= 1000:
		return "le_1000"
	case milliseconds <= 3000:
		return "le_3000"
	case milliseconds <= 10000:
		return "le_10000"
	default:
		return "gt_10000"
	}
}

func cloneUint64Map(source map[string]uint64) map[string]uint64 {
	cloned := make(map[string]uint64, len(source))
	for key, value := range source {
		cloned[key] = value
	}
	return cloned
}
