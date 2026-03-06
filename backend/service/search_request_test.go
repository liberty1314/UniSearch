package service

import (
	"testing"

	"unisearch/config"
)

func TestSearchRequestNormalizerNormalize(t *testing.T) {
	oldConfig := config.AppConfig
	config.AppConfig = &config.Config{DefaultConcurrency: 7}
	defer func() {
		config.AppConfig = oldConfig
	}()

	normalized := newSearchRequestNormalizer().Normalize(
		"  仙逆  ",
		[]string{"chan-a"},
		0,
		true,
		"all",
		"",
		[]string{"", " weibo ", "kkmao"},
		[]string{"quark"},
		nil,
	)

	if normalized.SourceType != "all" {
		t.Fatalf("expected source type all, got %s", normalized.SourceType)
	}
	if normalized.Concurrency != 7 {
		t.Fatalf("expected default concurrency 7, got %d", normalized.Concurrency)
	}
	if len(normalized.Plugins) != 2 {
		t.Fatalf("expected 2 sanitized plugins, got %d", len(normalized.Plugins))
	}
	if normalized.Ext == nil {
		t.Fatal("expected ext map to be initialized")
	}
}
