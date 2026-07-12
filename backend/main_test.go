package main

import (
	"testing"

	"unisearch/database"
	"unisearch/plugin"
)

func TestUnavailableUpstreamPluginsAreNotRegistered(t *testing.T) {
	for _, name := range database.RemovedPluginNames() {
		if _, exists := plugin.GetPluginByName(name); exists {
			t.Fatalf("已下线插件 %q 不应被应用注册", name)
		}
	}
}
