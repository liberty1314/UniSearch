package cache

import (
	"crypto/sha256"
	"fmt"
	"testing"
)

func TestGeneratePluginCacheKeyIncludesSchemaVersion(t *testing.T) {
	key := GeneratePluginCacheKey("你的名字", []string{"sidhub", "nyaa"}, nil)
	pluginsHash := getPluginsHash([]string{"nyaa", "sidhub"})
	oldHash := sha256.Sum256([]byte("你的名字:" + pluginsHash + ":default"))
	oldKey := fmt.Sprintf("plugin:search:%x", oldHash)

	if key == oldKey {
		t.Fatal("期望插件搜索缓存键包含结构版本，避免读取旧解析结果缓存")
	}
}

func TestGeneratePluginCacheKeyInvalidatesV2SearchResultCache(t *testing.T) {
	pluginsHash := getPluginsHash([]string{"sidhub"})
	v2Hash := sha256.Sum256([]byte("v2:铁拳教育:" + pluginsHash + ":default"))
	v2Key := fmt.Sprintf("plugin:search:%x", v2Hash)

	key := GeneratePluginCacheKey("铁拳教育", []string{"sidhub"}, nil)
	if key == v2Key {
		t.Fatal("期望扫码转存解析修复后插件搜索缓存键避开 v2 旧结果")
	}
}

func TestGeneratePluginCacheKeyKeepsPluginOrderStable(t *testing.T) {
	left := GeneratePluginCacheKey("你的名字", []string{"sidhub", "nyaa"}, nil)
	right := GeneratePluginCacheKey("你的名字", []string{"nyaa", "sidhub"}, nil)

	if left != right {
		t.Fatalf("期望插件顺序不影响缓存键，left=%s right=%s", left, right)
	}
}

func TestGenerateTGCacheKeyIncludesSchemaVersion(t *testing.T) {
	key := GenerateTGCacheKey("你的名字", []string{"a", "b"})
	oldHash := sha256.Sum256([]byte("你的名字"))
	oldKey := fmt.Sprintf("tg:search:%x", oldHash)

	if key == oldKey {
		t.Fatal("期望 TG 搜索缓存键包含结构版本，避免读取旧结构缓存")
	}
}

func TestGenerateTGCacheKeyIncludesChannelsAndKeepsOrderStable(t *testing.T) {
	left := GenerateTGCacheKey("你的名字", []string{"动漫", "电影"})
	right := GenerateTGCacheKey("你的名字", []string{"电影", "动漫"})
	other := GenerateTGCacheKey("你的名字", []string{"电视剧"})

	if left != right {
		t.Fatalf("期望频道顺序不影响 TG 缓存键，left=%s right=%s", left, right)
	}

	if left == other {
		t.Fatal("期望不同频道集合生成不同 TG 缓存键")
	}
}

func TestGeneratePluginCacheKeyIncludesWhitelistedExtOnly(t *testing.T) {
	left := GeneratePluginCacheKey("你的名字", []string{"sidhub"}, map[string]interface{}{
		"sidhub_base_url": "https://a.example.com",
		"debug":           "true",
	})
	right := GeneratePluginCacheKey("你的名字", []string{"sidhub"}, map[string]interface{}{
		"sidhub_base_url": "https://a.example.com",
	})
	other := GeneratePluginCacheKey("你的名字", []string{"sidhub"}, map[string]interface{}{
		"sidhub_base_url": "https://b.example.com",
	})

	if left != right {
		t.Fatalf("期望无关 ext 字段不影响插件缓存键，left=%s right=%s", left, right)
	}

	if left == other {
		t.Fatal("期望白名单 ext 字段变化时插件缓存键变化")
	}
}
