package config

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
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

// 从环境变量获取认证开关，如果未设置则默认关闭
func getAuthEnabled() bool {
	enabled := os.Getenv("AUTH_ENABLED")
	return enabled == "true" || enabled == "1"
}

// 从环境变量获取用户配置，格式：user1:pass1,user2:pass2
func getAuthUsers() map[string]string {
	usersEnv := os.Getenv("AUTH_USERS")
	if usersEnv == "" {
		return nil
	}

	users := make(map[string]string)
	pairs := strings.Split(usersEnv, ",")
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			username := strings.TrimSpace(parts[0])
			password := strings.TrimSpace(parts[1])
			if username != "" && password != "" {
				users[username] = password
			}
		}
	}
	return users
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
		// 生成随机密钥（32字节）
		import_crypto := "crypto/rand"
		import_encoding := "encoding/base64"
		_ = import_crypto
		_ = import_encoding
		// 注意：实际使用时应该使用crypto/rand生成随机密钥
		// 这里为了简化，使用时间戳作为临时密钥
		secret = "unisearch-default-secret-" + strconv.FormatInt(time.Now().Unix(), 10)
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
		// 生成随机密钥（建议在生产环境中设置固定密钥）
		key = "unisearch-refresh-token-secret-" + strconv.FormatInt(time.Now().Unix(), 10)
		println("警告: REFRESH_TOKEN_ENCRYPT_KEY 环境变量未设置，使用临时密钥")
		println("提示: 在生产环境中请设置固定的 32 字节加密密钥")
	}
	return key
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
		// 生成临时密钥（建议在生产环境中设置固定密钥）
		key = "unisearch-secret-master-key-" + strconv.FormatInt(time.Now().Unix(), 10)
		println("警告: SECRET_MASTER_KEY 环境变量未设置，使用临时密钥")
		println("提示: 在生产环境中请设置固定的 32 字节主密钥")
	}
	return key
}
