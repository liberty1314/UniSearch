package service

import (
	"testing"

	"unisearch/config"
)

func TestCalculatePluginWorkerCountUsesConfigFallbackAndPluginLimit(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DefaultConcurrency:        3,
		AsyncMaxBackgroundWorkers: 10,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	workers := calculatePluginWorkerCount(0, 4)
	if workers != 4 {
		t.Fatalf("expected plugin count to cap worker count at 4, got %d", workers)
	}
}

func TestCalculatePluginWorkerCountPrefersLargerBackgroundPool(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{
		DefaultConcurrency:        2,
		AsyncMaxBackgroundWorkers: 6,
	}
	defer func() {
		config.AppConfig = oldConfig
	}()

	workers := calculatePluginWorkerCount(2, 12)
	if workers != 6 {
		t.Fatalf("expected background worker limit to win with 6 workers, got %d", workers)
	}
}
