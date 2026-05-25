package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"sync"
	"time"

	"unisearch/model"
)

const (
	SecretNameJWTSecret         = "jwt_secret"
	SecretNameRefreshTokenKey   = "refresh_token_key"
	SecretNameTMDBReadAccessKey = "tmdb_read_access_token"
)

// SecretBackendType 密钥后端类型
type SecretBackendType string

const (
	SecretBackendDatabase    SecretBackendType = "database"    // 数据库存储
	SecretBackendEnvironment SecretBackendType = "environment" // 环境变量
)

// SecretManager 密钥管理器接口
type SecretManager interface {
	// GetSecret 获取密钥
	GetSecret(name string) (string, error)

	// SetSecret 设置密钥
	SetSecret(name string, value string, secretType model.SecretType, description string) error

	// RotateSecret 轮换密钥（创建新版本）
	RotateSecret(name string, newValue string) error

	// DeleteSecret 删除密钥
	DeleteSecret(name string) error

	// ListSecrets 列出所有密钥（不包含密钥值）
	ListSecrets() ([]model.Secret, error)
}

// SecretCache 密钥缓存
type SecretCache struct {
	value     string
	expiresAt time.Time
}

// BaseSecretManager 基础密钥管理器（提供通用功能）
type BaseSecretManager struct {
	masterKey []byte                  // 主密钥（用于加密存储的密钥）
	cache     map[string]*SecretCache // 内存缓存
	cacheMu   sync.RWMutex            // 缓存锁
	cacheTTL  time.Duration           // 缓存过期时间
}

// NewBaseSecretManager 创建基础密钥管理器
func NewBaseSecretManager(masterKey string, cacheTTL time.Duration) *BaseSecretManager {
	// 确保主密钥为 32 字节（AES-256）
	key := []byte(masterKey)
	if len(key) < 32 {
		paddedKey := make([]byte, 32)
		copy(paddedKey, key)
		key = paddedKey
	} else if len(key) > 32 {
		key = key[:32]
	}

	return &BaseSecretManager{
		masterKey: key,
		cache:     make(map[string]*SecretCache),
		cacheTTL:  cacheTTL,
	}
}

// EncryptSecret 加密密钥值
func (m *BaseSecretManager) EncryptSecret(plaintext string) (string, error) {
	block, err := aes.NewCipher(m.masterKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// 生成随机 nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// 加密并附加 nonce
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptSecret 解密密钥值
func (m *BaseSecretManager) DecryptSecret(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(m.masterKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("密文太短")
	}

	// 提取 nonce 和密文
	nonce, cipherData := data[:nonceSize], data[nonceSize:]

	// 解密
	plaintext, err := gcm.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// GetFromCache 从缓存获取密钥
func (m *BaseSecretManager) GetFromCache(name string) (string, bool) {
	m.cacheMu.RLock()
	defer m.cacheMu.RUnlock()

	cached, exists := m.cache[name]
	if !exists {
		return "", false
	}

	// 检查是否过期
	if time.Now().After(cached.expiresAt) {
		return "", false
	}

	return cached.value, true
}

// SetToCache 设置密钥到缓存
func (m *BaseSecretManager) SetToCache(name string, value string) {
	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	m.cache[name] = &SecretCache{
		value:     value,
		expiresAt: time.Now().Add(m.cacheTTL),
	}
}

// ClearCache 清除缓存
func (m *BaseSecretManager) ClearCache(name string) {
	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	delete(m.cache, name)
}

// ClearAllCache 清除所有缓存
func (m *BaseSecretManager) ClearAllCache() {
	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	m.cache = make(map[string]*SecretCache)
}

// 全局密钥管理服务实例
var globalSecretManager SecretManager

// SetGlobalSecretManager 设置全局密钥管理服务
func SetGlobalSecretManager(manager SecretManager) {
	globalSecretManager = manager
}

// GetGlobalSecretManager 获取全局密钥管理服务
func GetGlobalSecretManager() SecretManager {
	return globalSecretManager
}

// GetJWTSecret 获取 JWT 签名密钥（便捷方法）
func GetJWTSecret() (string, error) {
	if globalSecretManager == nil {
		return "", errors.New("密钥管理服务未初始化")
	}
	return globalSecretManager.GetSecret(SecretNameJWTSecret)
}

// GetRefreshTokenKey 获取刷新令牌加密密钥（便捷方法）
func GetRefreshTokenKey() (string, error) {
	if globalSecretManager == nil {
		return "", errors.New("密钥管理服务未初始化")
	}
	return globalSecretManager.GetSecret(SecretNameRefreshTokenKey)
}

// GetTMDBReadAccessToken 获取 TMDB 读取访问令牌（便捷方法）
func GetTMDBReadAccessToken() (string, error) {
	if globalSecretManager == nil {
		return "", errors.New("密钥管理服务未初始化")
	}
	return globalSecretManager.GetSecret(SecretNameTMDBReadAccessKey)
}
