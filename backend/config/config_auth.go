package config

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// 本文件集中认证、密钥管理、API Key 与刷新令牌相关的环境变量读取函数。

func getAuthUsernameMinLength() int {
	val := os.Getenv("AUTH_USERNAME_MIN_LENGTH")
	if val == "" {
		return 3
	}
	length, err := strconv.Atoi(val)
	if err != nil || length <= 0 {
		return 3
	}
	return length
}

func getAuthUsernameMaxLength() int {
	val := os.Getenv("AUTH_USERNAME_MAX_LENGTH")
	if val == "" {
		return 32
	}
	length, err := strconv.Atoi(val)
	if err != nil || length <= 0 {
		return 32
	}
	return length
}

func getAuthPasswordMinLength() int {
	val := os.Getenv("AUTH_PASSWORD_MIN_LENGTH")
	if val == "" {
		return 6
	}
	length, err := strconv.Atoi(val)
	if err != nil || length <= 0 {
		return 6
	}
	return length
}

func getAuthPasswordMaxLength() int {
	val := os.Getenv("AUTH_PASSWORD_MAX_LENGTH")
	if val == "" {
		return 64
	}
	length, err := strconv.Atoi(val)
	if err != nil || length <= 0 {
		return 64
	}
	return length
}

// getAuthPasswordComplexityClasses 返回密码复杂度要求：大写/小写/数字/符号中至少满足几类。
// 默认 3 类。取值被限制在 1-4 之间，非法值回退到默认。
func getAuthPasswordComplexityClasses() int {
	val := os.Getenv("AUTH_PASSWORD_COMPLEXITY_CLASSES")
	if val == "" {
		return 3
	}
	classes, err := strconv.Atoi(val)
	if err != nil || classes < 1 || classes > 4 {
		return 3
	}
	return classes
}

// getAuthPasswordBlocklistPath 返回弱密码黑名单文件路径（可选）。
// 文件每行一个弱密码，用于扩展内置黑名单。未配置时仅使用内置列表。
func getAuthPasswordBlocklistPath() string {
	return strings.TrimSpace(os.Getenv("AUTH_PASSWORD_BLOCKLIST_PATH"))
}

func getAppEnv() string {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if value == "" {
		return "development"
	}
	switch value {
	case "development", "test", "production":
		return value
	default:
		println("警告: APP_ENV 值无效，使用 development")
		return "development"
	}
}

func getInitialAdminUsername() string {
	return strings.TrimSpace(os.Getenv("INITIAL_ADMIN_USERNAME"))
}

func getInitialAdminPassword() string {
	return os.Getenv("INITIAL_ADMIN_PASSWORD")
}

type InitialAdminCredentials struct {
	Username                string
	Password                string
	UsingDevelopmentDefault bool
}

// ResolveInitialAdminCredentials 返回首次初始化管理员凭据。
// 生产环境必须显式配置强密码；开发环境允许使用本地默认值但不会在日志中输出明文密码。
func ResolveInitialAdminCredentials() (InitialAdminCredentials, error) {
	cfg := AppConfig
	if cfg == nil {
		return InitialAdminCredentials{}, errors.New("应用配置未初始化")
	}

	username := strings.TrimSpace(cfg.InitialAdminUsername)
	password := cfg.InitialAdminPassword
	usingDefault := false
	if username == "" && password == "" && !cfg.IsProduction() {
		username = "admin"
		password = "admin"
		usingDefault = true
		return InitialAdminCredentials{
			Username:                username,
			Password:                password,
			UsingDevelopmentDefault: true,
		}, nil
	}

	if username == "" {
		return InitialAdminCredentials{}, errors.New("INITIAL_ADMIN_USERNAME 未配置")
	}
	if password == "" {
		return InitialAdminCredentials{}, errors.New("INITIAL_ADMIN_PASSWORD 未配置")
	}
	if err := validateInitialAdminUsername(username, cfg); err != nil {
		return InitialAdminCredentials{}, err
	}
	if err := validateInitialAdminPassword(password, cfg); err != nil {
		return InitialAdminCredentials{}, err
	}

	return InitialAdminCredentials{
		Username:                username,
		Password:                password,
		UsingDevelopmentDefault: usingDefault,
	}, nil
}

func validateInitialAdminUsername(username string, cfg *Config) error {
	minLength := cfg.AuthUsernameMinLength
	if minLength == 0 {
		minLength = 3
	}
	maxLength := cfg.AuthUsernameMaxLength
	if maxLength == 0 {
		maxLength = 32
	}
	if len(username) < minLength || len(username) > maxLength {
		return fmt.Errorf("INITIAL_ADMIN_USERNAME 长度必须在 %d-%d 字符之间", minLength, maxLength)
	}
	for _, char := range username {
		if !(unicode.IsLetter(char) || unicode.IsDigit(char) || char == '_' || char == '-') {
			return errors.New("INITIAL_ADMIN_USERNAME 只能包含字母、数字、下划线和连字符")
		}
	}
	return nil
}

func validateInitialAdminPassword(password string, cfg *Config) error {
	minLength := cfg.AuthPasswordMinLength
	if minLength == 0 {
		minLength = 6
	}
	maxLength := cfg.AuthPasswordMaxLength
	if maxLength == 0 {
		maxLength = 64
	}
	if len(password) < minLength || len(password) > maxLength {
		return fmt.Errorf("INITIAL_ADMIN_PASSWORD 长度必须在 %d-%d 字符之间", minLength, maxLength)
	}
	for _, char := range password {
		if unicode.IsSpace(char) {
			return errors.New("INITIAL_ADMIN_PASSWORD 不能包含空白字符")
		}
	}
	if cfg.IsProduction() && !isStrongInitialAdminPassword(password) {
		return errors.New("INITIAL_ADMIN_PASSWORD 在生产环境必须包含大小写字母、数字和符号，且长度至少 12 位")
	}
	return nil
}

func isStrongInitialAdminPassword(password string) bool {
	if len(password) < 12 {
		return false
	}
	var hasUpper, hasLower, hasDigit, hasSymbol bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSymbol = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSymbol
}

// 从环境变量获取认证开关，如果未设置则默认关闭
func getAuthEnabled() bool {
	enabled := os.Getenv("AUTH_ENABLED")
	return enabled == "true" || enabled == "1"
}

// 从环境变量获取Token有效期（小时），如果未设置则使用默认值
func getAuthTokenExpiry() time.Duration {
	expiryEnv := os.Getenv("AUTH_TOKEN_EXPIRY")
	if expiryEnv == "" {
		return 24 * time.Hour // 默认24小时
	}
	expiry, err := strconv.Atoi(expiryEnv)
	if err != nil || expiry <= 0 {
		return 24 * time.Hour
	}
	return time.Duration(expiry) * time.Hour
}

// 从环境变量获取JWT密钥，如果未设置则生成随机密钥
func getAuthJWTSecret() string {
	secret := os.Getenv("AUTH_JWT_SECRET")
	if secret == "" {
		if getAppEnv() == "production" {
			return ""
		}
		secret = generateEphemeralSecret("jwt")
		println("警告: AUTH_JWT_SECRET 环境变量未设置，开发环境使用临时随机密钥")
	}
	return secret
}

// getResourcePublicIDSecret 返回公开资源 ID 的独立派生密钥。
// 它不得与 JWT 或其他认证密钥复用，以避免资源标识与认证域耦合。
func getResourcePublicIDSecret() string {
	secret := strings.TrimSpace(os.Getenv("RESOURCE_PUBLIC_ID_SECRET"))
	if secret == "" {
		if getAppEnv() == "production" {
			return ""
		}
		secret = generateEphemeralSecret("resource-public-id")
		println("警告: RESOURCE_PUBLIC_ID_SECRET 环境变量未设置，开发环境使用临时随机密钥；重启后资源详情 URL 将失效")
	}
	return secret
}

// 从环境变量获取是否启用 API Key 认证，如果未设置则默认关闭
func getAPIKeyEnabled() bool {
	enabled := os.Getenv("API_KEY_ENABLED")
	return enabled == "true" || enabled == "1"
}

// 从环境变量获取 API Key 默认有效期（小时），如果未设置则使用默认值
func getAPIKeyDefaultTTL() time.Duration {
	ttlEnv := os.Getenv("API_KEY_DEFAULT_TTL")
	if ttlEnv == "" {
		return 720 * time.Hour // 默认 30 天
	}
	ttl, err := strconv.Atoi(ttlEnv)
	if err != nil || ttl <= 0 {
		return 720 * time.Hour
	}
	return time.Duration(ttl) * time.Hour
}

// 从环境变量获取 API Key 存储路径，如果未设置则使用默认路径
func getAPIKeyStorePath() string {
	path := os.Getenv("API_KEY_STORE_PATH")
	if path == "" {
		// 默认在当前目录下创建 api_keys.json 文件
		defaultPath, err := filepath.Abs("./api_keys.json")
		if err != nil {
			return "./api_keys.json"
		}
		return defaultPath
	}
	return path
}

// 从环境变量获取是否启用刷新令牌，如果未设置则默认启用
func getRefreshTokenEnabled() bool {
	enabled := os.Getenv("REFRESH_TOKEN_ENABLED")
	if enabled == "" {
		return true // 默认启用
	}
	return enabled != "false" && enabled != "0"
}

// 从环境变量获取刷新令牌存储类型，如果未设置则默认使用数据库
func getRefreshTokenStorage() string {
	storage := os.Getenv("REFRESH_TOKEN_STORAGE")
	if storage == "" {
		return "database" // 默认使用数据库存储
	}
	// 验证存储类型
	if storage != "file" && storage != "database" {
		println("警告: REFRESH_TOKEN_STORAGE 值无效，使用默认值 database")
		return "database"
	}
	return storage
}

// 从环境变量获取刷新令牌有效期（小时），如果未设置则使用默认值
func getRefreshTokenTTL() time.Duration {
	ttlEnv := os.Getenv("REFRESH_TOKEN_TTL")
	if ttlEnv == "" {
		return 720 * time.Hour // 默认 30 天
	}
	ttl, err := strconv.Atoi(ttlEnv)
	if err != nil || ttl <= 0 {
		return 720 * time.Hour
	}
	return time.Duration(ttl) * time.Hour
}

// 从环境变量获取刷新令牌存储路径，如果未设置则使用默认路径
func getRefreshTokenStorePath() string {
	path := os.Getenv("REFRESH_TOKEN_STORE_PATH")
	if path == "" {
		// 默认在当前目录下创建 refresh_tokens.dat 文件
		defaultPath, err := filepath.Abs("./cache/refresh_tokens.dat")
		if err != nil {
			return "./cache/refresh_tokens.dat"
		}
		return defaultPath
	}
	return path
}

// 从环境变量获取刷新令牌加密密钥，如果未设置则生成随机密钥
func getRefreshTokenEncryptKey() string {
	key := os.Getenv("REFRESH_TOKEN_ENCRYPT_KEY")
	if key == "" {
		if getAppEnv() == "production" {
			return ""
		}
		key = generateEphemeralSecret("refresh")
		println("警告: REFRESH_TOKEN_ENCRYPT_KEY 环境变量未设置，开发环境使用临时随机密钥")
	}
	return key
}

// GetTurnstileSiteKey 返回 Cloudflare Turnstile 站点公钥（sitekey）。
// 该值属于前端渲染所需的公开信息，直接从环境变量读取，不进入 Config 结构体。
func GetTurnstileSiteKey() string {
	return strings.TrimSpace(os.Getenv("TURNSTILE_SITE_KEY"))
}

// GetTurnstileSecretKey 返回 Cloudflare Turnstile 服务端校验密钥。
// 该值属于机密，直接从环境变量读取，不进入 Config 结构体，避免泄漏到日志或响应。
func GetTurnstileSecretKey() string {
	return strings.TrimSpace(os.Getenv("TURNSTILE_SECRET_KEY"))
}

// 从环境变量获取密钥后端类型，如果未设置则默认使用数据库模式
func getSecretBackend() string {
	backend := os.Getenv("SECRET_BACKEND")
	if backend == "" {
		return "database" // 默认使用数据库模式（推荐）
	}
	// 验证后端类型
	if backend != "database" && backend != "environment" {
		println("警告: SECRET_BACKEND 值无效，使用默认值 database")
		return "database"
	}
	return backend
}

// 从环境变量获取主密钥，如果未设置则生成临时密钥
func getSecretMasterKey() string {
	key := os.Getenv("SECRET_MASTER_KEY")
	if key == "" {
		if getAppEnv() == "production" {
			return ""
		}
		key = generateEphemeralSecret("master")
		println("警告: SECRET_MASTER_KEY 环境变量未设置，开发环境使用临时随机密钥")
	}
	return key
}

func generateEphemeralSecret(label string) string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic(fmt.Sprintf("生成%s临时密钥失败: %v", label, err))
	}
	return base64.StdEncoding.EncodeToString(buf)
}
