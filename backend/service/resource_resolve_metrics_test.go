package service

import (
	"testing"
	"time"
)

func TestResourceResolveMetricsTracksOutcomesCacheAndConcurrency(t *testing.T) {
	metrics := NewResourceResolveMetrics()
	metrics.Begin()
	metrics.Begin()
	metrics.Finish("success", true, 75*time.Millisecond)
	metrics.Finish("upstream_parse_failed", false, 850*time.Millisecond)

	snapshot := metrics.Snapshot()
	if snapshot.Total != 2 || snapshot.Success != 1 || snapshot.CacheHits != 1 {
		t.Fatalf("unexpected counters: %#v", snapshot)
	}
	if snapshot.Active != 0 || snapshot.MaxActive != 2 {
		t.Fatalf("unexpected concurrency metrics: %#v", snapshot)
	}
	if snapshot.OutcomeCounts["success"] != 1 || snapshot.OutcomeCounts["upstream_parse_failed"] != 1 {
		t.Fatalf("unexpected outcomes: %#v", snapshot.OutcomeCounts)
	}
	if snapshot.LatencyBucketsMS["le_100"] != 1 || snapshot.LatencyBucketsMS["le_1000"] != 1 {
		t.Fatalf("unexpected latency buckets: %#v", snapshot.LatencyBucketsMS)
	}

	snapshot.OutcomeCounts["success"] = 99
	if metrics.Snapshot().OutcomeCounts["success"] != 1 {
		t.Fatal("snapshot maps must be defensive copies")
	}
}
