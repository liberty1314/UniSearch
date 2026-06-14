package config

import (
	"os"
	"reflect"
	"testing"
)

func TestGetDefaultChannelsUsesFallbackWhenEnvMissing(t *testing.T) {
	preserveEnv(t, "CHANNELS")
	if err := os.Unsetenv("CHANNELS"); err != nil {
		t.Fatalf("清理 CHANNELS 失败: %v", err)
	}

	got := getDefaultChannels()
	expected := []string{"tgsearchers4"}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("未设置 CHANNELS 时应回退到默认频道，实际为 %#v", got)
	}
}

func TestGetDefaultChannelsDeduplicatesAndTrims(t *testing.T) {
	t.Setenv("CHANNELS", " tg-a, tg-b ,, tg-a , tg-c ")

	got := getDefaultChannels()
	expected := []string{"tg-a", "tg-b", "tg-c"}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("CHANNELS 应去重并清理空白，实际为 %#v", got)
	}
}

func TestGetEnabledPluginsUsesDefaultListWhenEnvMissing(t *testing.T) {
	preserveEnv(t, "ENABLED_PLUGINS")
	if err := os.Unsetenv("ENABLED_PLUGINS"); err != nil {
		t.Fatalf("清理 ENABLED_PLUGINS 失败: %v", err)
	}

	got := getEnabledPlugins()
	expected := []string{
		"labi", "shandian", "muou", "wanou", "hunhepan", "pansearch",
		"panta", "susu", "thepiratebay", "ouge", "erxiao", "clmao",
		"u3c3", "javdb", "jutoushe", "nyaa", "xinjuc", "aikanzy",
		"quark4k", "quarksoo", "huban", "panwiki", "panyq", "sidhub",
	}

	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("未设置 ENABLED_PLUGINS 时应使用默认 24 插件，实际为 %#v", got)
	}
}

func TestGetEnabledPluginsKeepsExplicitEmptyList(t *testing.T) {
	t.Setenv("ENABLED_PLUGINS", "")

	got := getEnabledPlugins()
	if got == nil {
		t.Fatalf("显式空 ENABLED_PLUGINS 应返回空切片，而不是 nil")
	}
	if len(got) != 0 {
		t.Fatalf("显式空 ENABLED_PLUGINS 不应启用插件，实际为 %#v", got)
	}
}

func TestGetEnabledPluginsParsesConfiguredList(t *testing.T) {
	t.Setenv("ENABLED_PLUGINS", " aikanzy, pansearch ,, sidhub , pansearch ")

	got := getEnabledPlugins()
	expected := []string{"aikanzy", "pansearch", "sidhub"}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("应解析并清理配置的插件列表，实际为 %#v", got)
	}
}

func TestDefaultEnabledPluginsReturnsCopy(t *testing.T) {
	first := DefaultEnabledPlugins()
	first[0] = "changed"

	second := DefaultEnabledPlugins()
	if second[0] == "changed" {
		t.Fatalf("默认插件清单应返回副本，避免调用方修改全局默认值")
	}
}

func TestGetDefaultConcurrencyDoesNotNeedPluginCountEnv(t *testing.T) {
	preserveEnv(t, "CONCURRENCY")
	preserveEnv(t, "CHANNELS")
	preserveEnv(t, "ENABLED_PLUGINS")
	preserveEnv(t, "PLUGIN_COUNT")
	if err := os.Unsetenv("CONCURRENCY"); err != nil {
		t.Fatalf("清理 CONCURRENCY 失败: %v", err)
	}
	if err := os.Setenv("CHANNELS", "tg-a,tg-b"); err != nil {
		t.Fatalf("设置 CHANNELS 失败: %v", err)
	}
	if err := os.Setenv("ENABLED_PLUGINS", "pansearch,sidhub,huban"); err != nil {
		t.Fatalf("设置 ENABLED_PLUGINS 失败: %v", err)
	}
	if err := os.Setenv("PLUGIN_COUNT", "999"); err != nil {
		t.Fatalf("设置 PLUGIN_COUNT 失败: %v", err)
	}

	got := getDefaultConcurrency()
	expected := 15 // 2 个频道 + 3 个插件 + 10
	if got != expected {
		t.Fatalf("默认并发应根据真实初始化配置推导，期望 %d，实际 %d", expected, got)
	}
}

func preserveEnv(t *testing.T, key string) {
	t.Helper()
	value, exists := os.LookupEnv(key)
	t.Cleanup(func() {
		if exists {
			if err := os.Setenv(key, value); err != nil {
				t.Fatalf("恢复环境变量 %s 失败: %v", key, err)
			}
			return
		}
		if err := os.Unsetenv(key); err != nil {
			t.Fatalf("恢复环境变量 %s 失败: %v", key, err)
		}
	})
}
