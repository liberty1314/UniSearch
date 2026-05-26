package testutil

import (
	"testing"

	"unisearch/plugin"
)

type displayNameProvider interface {
	DisplayName() string
}

func AssertPluginContract(t *testing.T, p plugin.AsyncSearchPlugin) {
	t.Helper()
	if p.Name() == "" {
		t.Fatal("插件名称不能为空")
	}
	if p.Priority() < 0 {
		t.Fatalf("插件优先级不能为负数: %d", p.Priority())
	}
	if provider, ok := p.(displayNameProvider); ok && provider.DisplayName() == "" {
		t.Fatal("插件展示名称不能为空")
	}
}
