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

func TestResolveInitialAdminCredentialsAllowsDevelopmentDefault(t *testing.T) {
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	AppConfig = &Config{AppEnv: "development"}

	credentials, err := ResolveInitialAdminCredentials()
	if err != nil {
		t.Fatalf("开发环境默认管理员凭据不应失败: %v", err)
	}
	if credentials.Username != "admin" || credentials.Password != "admin" || !credentials.UsingDevelopmentDefault {
		t.Fatalf("开发环境应返回默认管理员凭据标记，实际为 %#v", credentials)
	}
}

func TestResolveInitialAdminCredentialsRequiresProductionValues(t *testing.T) {
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	AppConfig = &Config{AppEnv: "production"}

	if _, err := ResolveInitialAdminCredentials(); err == nil {
		t.Fatal("生产环境缺少初始管理员配置时应失败")
	}
}

func TestResolveInitialAdminCredentialsRejectsWeakProductionPassword(t *testing.T) {
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	AppConfig = &Config{
		AppEnv:                "production",
		InitialAdminUsername:  "root-admin",
		InitialAdminPassword:  "weakpass",
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
	}

	if _, err := ResolveInitialAdminCredentials(); err == nil {
		t.Fatal("生产环境弱初始管理员密码应失败")
	}
}

func TestResolveInitialAdminCredentialsAcceptsStrongProductionPassword(t *testing.T) {
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	AppConfig = &Config{
		AppEnv:                "production",
		InitialAdminUsername:  "root-admin",
		InitialAdminPassword:  "Str0ng!Initial",
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
	}

	credentials, err := ResolveInitialAdminCredentials()
	if err != nil {
		t.Fatalf("生产环境强初始管理员密码不应失败: %v", err)
	}
	if credentials.Username != "root-admin" || credentials.Password != "Str0ng!Initial" || credentials.UsingDevelopmentDefault {
		t.Fatalf("生产环境应返回显式管理员凭据，实际为 %#v", credentials)
	}
}

func TestInitWithErrorRejectsMissingProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	if err := os.Unsetenv("AUTH_JWT_SECRET"); err != nil {
		t.Fatalf("清理 AUTH_JWT_SECRET 失败: %v", err)
	}
	if err := os.Unsetenv("REFRESH_TOKEN_ENCRYPT_KEY"); err != nil {
		t.Fatalf("清理 REFRESH_TOKEN_ENCRYPT_KEY 失败: %v", err)
	}
	if err := os.Unsetenv("SECRET_MASTER_KEY"); err != nil {
		t.Fatalf("清理 SECRET_MASTER_KEY 失败: %v", err)
	}

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境缺少关键密钥时应拒绝初始化")
	}
}

func TestInitWithErrorRejectsPlaceholderProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_JWT_SECRET", "PLEASE_GENERATE_A_STRONG_RANDOM_SECRET_KEY_HERE")
	t.Setenv("REFRESH_TOKEN_ENCRYPT_KEY", "strong-refresh-token-secret-000001")
	t.Setenv("SECRET_MASTER_KEY", "strong-secret-master-key-000000001")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境占位符密钥应拒绝初始化")
	}
}

func TestInitWithErrorRejectsDuplicateProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	duplicate := "same-secret-value-with-at-least-32-chars"
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_JWT_SECRET", duplicate)
	t.Setenv("REFRESH_TOKEN_ENCRYPT_KEY", duplicate)
	t.Setenv("SECRET_MASTER_KEY", "different-secret-master-key-00000001")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境关键密钥重复时应拒绝初始化")
	}
}

func TestInitWithErrorAcceptsDistinctProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("REFRESH_TOKEN_ENCRYPT_KEY", "refresh-secret-value-with-32-chars-min")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")

	if err := InitWithError(); err != nil {
		t.Fatalf("生产环境有效密钥应初始化成功: %v", err)
	}
}

func TestInitWithErrorRejectsMissingProductionAllowedOrigins(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	if err := os.Unsetenv("ALLOWED_ORIGINS"); err != nil {
		t.Fatalf("清理 ALLOWED_ORIGINS 失败: %v", err)
	}
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("REFRESH_TOKEN_ENCRYPT_KEY", "refresh-secret-value-with-32-chars-min")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境缺少 ALLOWED_ORIGINS 时应拒绝初始化")
	}
}

func TestInitWithErrorRejectsWildcardProductionAllowedOrigins(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "*")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("REFRESH_TOKEN_ENCRYPT_KEY", "refresh-secret-value-with-32-chars-min")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境 ALLOWED_ORIGINS 使用通配符时应拒绝初始化")
	}
}

func TestInitWithErrorGeneratesDevelopmentSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "development")
	if err := os.Unsetenv("AUTH_JWT_SECRET"); err != nil {
		t.Fatalf("清理 AUTH_JWT_SECRET 失败: %v", err)
	}
	if err := os.Unsetenv("REFRESH_TOKEN_ENCRYPT_KEY"); err != nil {
		t.Fatalf("清理 REFRESH_TOKEN_ENCRYPT_KEY 失败: %v", err)
	}
	if err := os.Unsetenv("SECRET_MASTER_KEY"); err != nil {
		t.Fatalf("清理 SECRET_MASTER_KEY 失败: %v", err)
	}

	if err := InitWithError(); err != nil {
		t.Fatalf("开发环境缺少密钥时应生成临时随机值: %v", err)
	}
	if AppConfig.AuthJWTSecret == "" || AppConfig.RefreshTokenEncryptKey == "" || AppConfig.SecretMasterKey == "" {
		t.Fatalf("开发环境应生成临时随机密钥，实际配置为 %#v", AppConfig)
	}
}

func preserveProductionSecretEnv(t *testing.T) {
	t.Helper()
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	preserveEnv(t, "APP_ENV")
	preserveEnv(t, "ALLOWED_ORIGINS")
	preserveEnv(t, "AUTH_JWT_SECRET")
	preserveEnv(t, "REFRESH_TOKEN_ENCRYPT_KEY")
	preserveEnv(t, "SECRET_MASTER_KEY")
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
