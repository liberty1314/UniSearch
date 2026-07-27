package service

import (
	"errors"
	"os"
	"time"

	"unisearch/model"
)

// EnvironmentSecretManager 环境变量密钥管理器
// 用于向后兼容，从环境变量读取密钥
type EnvironmentSecretManager struct {
	*BaseSecretManager
	envMapping map[string]string // 密钥名称到环境变量名的映射
}

// NewEnvironmentSecretManager 创建环境变量密钥管理器
func NewEnvironmentSecretManager() *EnvironmentSecretManager {
	return &EnvironmentSecretManager{
		BaseSecretManager: NewBaseSecretManager("dummy-key", 1*time.Hour), // 环境变量不需要加密
		envMapping: map[string]string{
			SecretNameJWTSecret:         "AUTH_JWT_SECRET",
			"api_key_master":            "API_KEY_MASTER_SECRET",
			SecretNameTMDBReadAccessKey: "TMDB_READ_ACCESS_TOKEN",
		},
	}
}

// GetSecret 从环境变量获取密钥
func (m *EnvironmentSecretManager) GetSecret(name string) (string, error) {
	// 先从缓存获取
	if value, found := m.GetFromCache(name); found {
		return value, nil
	}

	// 获取环境变量名
	envName, exists := m.envMapping[name]
	if !exists {
		// 如果没有映射，直接使用密钥名作为环境变量名
		envName = name
	}

	// 从环境变量读取
	value := os.Getenv(envName)
	if value == "" {
		return "", errors.New("环境变量未设置: " + envName)
	}

	// 存入缓存
	m.SetToCache(name, value)

	return value, nil
}

// SetSecret 环境变量模式不支持设置密钥
func (m *EnvironmentSecretManager) SetSecret(name string, value string, secretType model.SecretType, description string) error {
	return errors.New("环境变量模式不支持设置密钥")
}

// RotateSecret 环境变量模式不支持轮换密钥
func (m *EnvironmentSecretManager) RotateSecret(name string, newValue string) error {
	return errors.New("环境变量模式不支持轮换密钥")
}

// DeleteSecret 环境变量模式不支持删除密钥
func (m *EnvironmentSecretManager) DeleteSecret(name string) error {
	return errors.New("环境变量模式不支持删除密钥")
}

// ListSecrets 环境变量模式不支持列出密钥
func (m *EnvironmentSecretManager) ListSecrets() ([]model.Secret, error) {
	return nil, errors.New("环境变量模式不支持列出密钥")
}
