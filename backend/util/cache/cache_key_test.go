package cache

import (
	"crypto/sha256"
	"fmt"
	"testing"
)

func TestGeneratePluginCacheKeyIncludesSchemaVersion(t *testing.T) {
	key := GeneratePluginCacheKey("你的名字", []string{"sidhub", "nyaa"})
	pluginsHash := getPluginsHash([]string{"nyaa", "sidhub"})
	oldHash := sha256.Sum256([]byte("你的名字:" + pluginsHash))
	oldKey := fmt.Sprintf("plugin:search:%x", oldHash)

	if key == oldKey {
		t.Fatal("期望插件搜索缓存键包含结构版本，避免读取旧解析结果缓存")
	}
}

func TestGeneratePluginCacheKeyKeepsPluginOrderStable(t *testing.T) {
	left := GeneratePluginCacheKey("你的名字", []string{"sidhub", "nyaa"})
	right := GeneratePluginCacheKey("你的名字", []string{"nyaa", "sidhub"})

	if left != right {
		t.Fatalf("期望插件顺序不影响缓存键，left=%s right=%s", left, right)
	}
}

func TestGenerateTGCacheKeyIncludesSchemaVersion(t *testing.T) {
	key := GenerateTGCacheKey("你的名字")
	oldHash := sha256.Sum256([]byte("你的名字"))
	oldKey := fmt.Sprintf("tg:search:%x", oldHash)

	if key == oldKey {
		t.Fatal("期望 TG 搜索缓存键包含结构版本，避免读取旧结构缓存")
	}
}
