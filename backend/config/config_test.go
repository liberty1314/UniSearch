package config

import (
	"os"
	"reflect"
	"strings"
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
		"labi", "shandian", "muou", "hunhepan", "pansearch", "susu",
		"thepiratebay", "u3c3", "jutoushe", "nyaa", "aikanzy", "quark4k",
		"quarksoo", "huban", "panwiki", "sidhub",
	}

	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("未设置 ENABLED_PLUGINS 时应使用默认 16 插件，实际为 %#v", got)
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

func TestResolveInitialAdminCredentialsRejectsMissingDevelopmentValues(t *testing.T) {
	oldConfig := AppConfig
	t.Cleanup(func() {
		AppConfig = oldConfig
	})
	AppConfig = &Config{AppEnv: "development"}

	if _, err := ResolveInitialAdminCredentials(); err == nil {
		t.Fatal("开发环境缺少初始管理员配置时也应失败")
	}
}

func TestResolveInitialAdminCredentialsRejectsDefaultAndPlaceholderValues(t *testing.T) {
	testCases := []struct {
		name     string
		username string
		password string
	}{
		{name: "默认管理员用户名", username: "admin", password: "Str0ng!Initial"},
		{name: "大小写默认管理员用户名", username: "AdMiN", password: "Str0ng!Initial"},
		{name: "用户名占位值", username: "PLEASE_SET_INITIAL_ADMIN_USERNAME", password: "Str0ng!Initial"},
		{name: "密码占位值", username: "root-admin", password: "PLEASE_SET_INITIAL_ADMIN_STRONG_PASSWORD"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			oldConfig := AppConfig
			t.Cleanup(func() {
				AppConfig = oldConfig
			})
			AppConfig = &Config{
				AppEnv:                "development",
				InitialAdminUsername:  tc.username,
				InitialAdminPassword:  tc.password,
				AuthUsernameMinLength: 3,
				AuthUsernameMaxLength: 32,
				AuthPasswordMinLength: 6,
				AuthPasswordMaxLength: 64,
			}

			if _, err := ResolveInitialAdminCredentials(); err == nil {
				t.Fatalf("应拒绝默认值或占位值: username=%q password=%q", tc.username, tc.password)
			}
		})
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
	if credentials.Username != "root-admin" || credentials.Password != "Str0ng!Initial" {
		t.Fatalf("生产环境应返回显式管理员凭据，实际为 %#v", credentials)
	}
}

func TestValidateProductionSecurityConfigRejectsMissingOrPlaceholderValues(t *testing.T) {
	newValidConfig := func() *Config {
		return &Config{
			AppEnv:                 "production",
			AllowedOrigins:         []string{"https://search.example.com"},
			AuthJWTSecret:          "jwt-secret-value-with-at-least-32-chars",
			ResourcePublicIDSecret: "resource-public-id-secret-with-32-chars",
			SecretMasterKey:        "master-secret-value-with-32-chars-min",
			DBPassword:             "database-password",
			RedisPassword:          "redis-password",
		}
	}

	testCases := []struct {
		name  string
		apply func(*Config)
	}{
		{name: "JWT 密钥为空", apply: func(cfg *Config) { cfg.AuthJWTSecret = "" }},
		{name: "JWT 密钥为占位值", apply: func(cfg *Config) { cfg.AuthJWTSecret = "PLEASE_SET_AUTH_JWT_SECRET" }},
		{name: "主密钥为空", apply: func(cfg *Config) { cfg.SecretMasterKey = "" }},
		{name: "主密钥为占位值", apply: func(cfg *Config) { cfg.SecretMasterKey = "PLEASE_SET_SECRET_MASTER_KEY" }},
		{name: "数据库密码为空", apply: func(cfg *Config) { cfg.DBPassword = "" }},
		{name: "数据库密码为占位值", apply: func(cfg *Config) { cfg.DBPassword = "PLEASE_SET_DATABASE_PASSWORD" }},
		{name: "Redis 密码为空", apply: func(cfg *Config) { cfg.RedisPassword = "" }},
		{name: "Redis 密码为占位值", apply: func(cfg *Config) { cfg.RedisPassword = "PLEASE_SET_REDIS_PASSWORD" }},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := newValidConfig()
			tc.apply(cfg)
			if err := validateProductionSecurityConfig(cfg); err == nil {
				t.Fatal("生产配置含空值或占位值时应拒绝启动")
			}
		})
	}
}

func TestValidateProductionSecurityConfigValidatesOrigins(t *testing.T) {
	newConfig := func(origin string) *Config {
		return &Config{
			AppEnv:                 "production",
			AllowedOrigins:         []string{origin},
			AuthJWTSecret:          "jwt-secret-value-with-at-least-32-chars",
			ResourcePublicIDSecret: "resource-public-id-secret-with-32-chars",
			SecretMasterKey:        "master-secret-value-with-32-chars-min",
			DBPassword:             "database-password",
			RedisPassword:          "redis-password",
		}
	}

	for _, origin := range []string{"http://search.example.com", "http://localhost.example.com"} {
		t.Run("拒绝_"+origin, func(t *testing.T) {
			if err := validateProductionSecurityConfig(newConfig(origin)); err == nil {
				t.Fatalf("生产环境应拒绝非 loopback HTTP 来源 %q", origin)
			}
		})
	}

	for _, origin := range []string{"https://search.example.com", "http://127.0.0.1:8080", "http://localhost:8080"} {
		t.Run("接受_"+origin, func(t *testing.T) {
			if err := validateProductionSecurityConfig(newConfig(origin)); err != nil {
				t.Fatalf("有效生产来源 %q 不应被拒绝: %v", origin, err)
			}
		})
	}
}

func TestInitWithErrorRejectsMissingProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	if err := os.Unsetenv("AUTH_JWT_SECRET"); err != nil {
		t.Fatalf("清理 AUTH_JWT_SECRET 失败: %v", err)
	}
	if err := os.Unsetenv("SECRET_MASTER_KEY"); err != nil {
		t.Fatalf("清理 SECRET_MASTER_KEY 失败: %v", err)
	}

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境缺少关键密钥时应拒绝初始化")
	}
}

func TestInitWithErrorRejectsMissingOrPlaceholderProductionDataPasswords(t *testing.T) {
	testCases := []struct {
		name  string
		key   string
		value *string
	}{
		{name: "数据库密码缺失", key: "DB_PASSWORD"},
		{name: "Redis 密码缺失", key: "REDIS_PASSWORD"},
		{name: "数据库密码为占位值", key: "DB_PASSWORD", value: stringPointer("PLEASE_SET_DATABASE_PASSWORD")},
		{name: "Redis 密码为占位值", key: "REDIS_PASSWORD", value: stringPointer("PLEASE_SET_REDIS_PASSWORD")},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			preserveProductionSecretEnv(t)
			t.Setenv("APP_ENV", "production")
			t.Setenv("ALLOWED_ORIGINS", "https://search.example.com")
			t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
			t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
			t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")
			if tc.value == nil {
				if err := os.Unsetenv(tc.key); err != nil {
					t.Fatalf("清理 %s 失败: %v", tc.key, err)
				}
			} else {
				t.Setenv(tc.key, *tc.value)
			}

			err := InitWithError()
			if err == nil || !strings.Contains(err.Error(), tc.key) {
				t.Fatalf("生产环境应拒绝无效 %s，实际错误: %v", tc.key, err)
			}
		})
	}
}

func TestInitWithErrorRejectsInvalidAppEnv(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "prodution")

	err := InitWithError()
	if err == nil || !strings.Contains(err.Error(), "APP_ENV") {
		t.Fatalf("无效 APP_ENV 必须阻断启动，实际错误: %v", err)
	}
}

func TestInitWithErrorRejectsPlaceholderProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_JWT_SECRET", "PLEASE_GENERATE_A_STRONG_RANDOM_SECRET_KEY_HERE")
	t.Setenv("SECRET_MASTER_KEY", "strong-secret-master-key-000000001")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境占位符密钥应拒绝初始化")
	}
}

func TestInitWithErrorRejectsDuplicateProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	duplicate := "same-secret-value-with-at-least-32-chars"
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_JWT_SECRET", duplicate)
	t.Setenv("SECRET_MASTER_KEY", duplicate)
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境关键密钥重复时应拒绝初始化")
	}
}

func TestInitWithErrorAcceptsDistinctProductionSecrets(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")

	if err := InitWithError(); err != nil {
		t.Fatalf("生产环境有效密钥应初始化成功: %v", err)
	}
}

func TestInitWithErrorRejectsMissingProductionResourcePublicIDSecret(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	if err := os.Unsetenv("RESOURCE_PUBLIC_ID_SECRET"); err != nil {
		t.Fatalf("清理 RESOURCE_PUBLIC_ID_SECRET 失败: %v", err)
	}

	err := InitWithError()
	if err == nil || !strings.Contains(err.Error(), "RESOURCE_PUBLIC_ID_SECRET") {
		t.Fatalf("生产环境缺少公开资源 ID 密钥应拒绝初始化，实际错误: %v", err)
	}
}

func TestInitWithErrorRejectsResourcePublicIDSecretMatchingJWTSecret(t *testing.T) {
	preserveProductionSecretEnv(t)
	duplicate := "same-resource-public-id-secret-at-least-32-chars"
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", duplicate)
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", duplicate)

	if err := InitWithError(); err == nil {
		t.Fatal("公开资源 ID 密钥与 JWT 密钥相同应拒绝初始化")
	}
}

func TestInitWithErrorRejectsShortProductionResourcePublicIDSecret(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "too-short")

	err := InitWithError()
	if err == nil || !strings.Contains(err.Error(), "RESOURCE_PUBLIC_ID_SECRET") {
		t.Fatalf("生产环境过短公开资源 ID 密钥应拒绝初始化，实际错误: %v", err)
	}
}

func TestInitWithErrorRejectsPlaceholderProductionResourcePublicIDSecret(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://example.com")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "PLEASE_GENERATE_A_STRONG_RESOURCE_PUBLIC_ID_SECRET_HERE")

	err := InitWithError()
	if err == nil || !strings.Contains(err.Error(), "RESOURCE_PUBLIC_ID_SECRET") {
		t.Fatalf("生产环境占位公开资源 ID 密钥应拒绝初始化，实际错误: %v", err)
	}
}

func TestInitWithErrorRejectsMissingProductionAllowedOrigins(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	if err := os.Unsetenv("ALLOWED_ORIGINS"); err != nil {
		t.Fatalf("清理 ALLOWED_ORIGINS 失败: %v", err)
	}
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")

	if err := InitWithError(); err == nil {
		t.Fatal("生产环境缺少 ALLOWED_ORIGINS 时应拒绝初始化")
	}
}

func TestInitWithErrorRejectsWildcardProductionAllowedOrigins(t *testing.T) {
	preserveProductionSecretEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "*")
	t.Setenv("AUTH_JWT_SECRET", "jwt-secret-value-with-at-least-32-chars")
	t.Setenv("SECRET_MASTER_KEY", "master-secret-value-with-32-chars-min")
	t.Setenv("RESOURCE_PUBLIC_ID_SECRET", "resource-public-id-secret-with-32-chars")

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
	if err := os.Unsetenv("SECRET_MASTER_KEY"); err != nil {
		t.Fatalf("清理 SECRET_MASTER_KEY 失败: %v", err)
	}
	if err := os.Unsetenv("RESOURCE_PUBLIC_ID_SECRET"); err != nil {
		t.Fatalf("清理 RESOURCE_PUBLIC_ID_SECRET 失败: %v", err)
	}

	if err := InitWithError(); err != nil {
		t.Fatalf("开发环境缺少密钥时应生成临时随机值: %v", err)
	}
	if AppConfig.AuthJWTSecret == "" || AppConfig.SecretMasterKey == "" || AppConfig.ResourcePublicIDSecret == "" {
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
	preserveEnv(t, "SECRET_MASTER_KEY")
	preserveEnv(t, "RESOURCE_PUBLIC_ID_SECRET")
	preserveEnv(t, "DB_PASSWORD")
	preserveEnv(t, "REDIS_PASSWORD")
	t.Setenv("DB_PASSWORD", "database-password")
	t.Setenv("REDIS_PASSWORD", "redis-password")
}

func stringPointer(value string) *string {
	return &value
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
