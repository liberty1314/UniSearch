package service

import (
"errors"
"time"

"gorm.io/gorm"
"unisearch/model"
)

// DatabaseSecretManager 数据库密钥管理器
type DatabaseSecretManager struct {
	*BaseSecretManager
	db *gorm.DB
}

// NewDatabaseSecretManager 创建数据库密钥管理器
func NewDatabaseSecretManager(db *gorm.DB, masterKey string) *DatabaseSecretManager {
	return &DatabaseSecretManager{
		BaseSecretManager: NewBaseSecretManager(masterKey, 5*time.Minute),
		db:                db,
	}
}

// GetSecret 获取密钥
func (m *DatabaseSecretManager) GetSecret(name string) (string, error) {
	if value, found := m.GetFromCache(name); found {
		return value, nil
	}

	var secret model.Secret
	err := m.db.Where("name = ? AND is_active = ?", name, true).
		Order("version DESC").
		First(&secret).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("密钥不存在")
		}
		return "", err
	}

	if !secret.IsValid() {
		return "", errors.New("密钥已失效")
	}

	value, err := m.DecryptSecret(secret.Value)
	if err != nil {
		return "", err
	}

	m.SetToCache(name, value)
	return value, nil
}

// SetSecret 设置密钥
func (m *DatabaseSecretManager) SetSecret(name string, value string, secretType model.SecretType, description string) error {
	encryptedValue, err := m.EncryptSecret(value)
	if err != nil {
		return err
	}

	var existingSecret model.Secret
	err = m.db.Where("name = ?", name).First(&existingSecret).Error

	if err == nil {
		m.db.Model(&existingSecret).Update("is_active", false)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	secret := &model.Secret{
		Name:        name,
		Type:        secretType,
		Value:       encryptedValue,
		Version:     existingSecret.Version + 1,
		IsActive:    true,
		Description: description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := m.db.Create(secret).Error; err != nil {
		return err
	}

	m.ClearCache(name)
	return nil
}

// RotateSecret 轮换密钥
func (m *DatabaseSecretManager) RotateSecret(name string, newValue string) error {
	var currentSecret model.Secret
	err := m.db.Where("name = ? AND is_active = ?", name, true).
		Order("version DESC").
		First(&currentSecret).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("密钥不存在")
		}
		return err
	}

	m.db.Model(&currentSecret).Update("is_active", false)

	encryptedValue, err := m.EncryptSecret(newValue)
	if err != nil {
		return err
	}

	newSecret := &model.Secret{
		Name:        name,
		Type:        currentSecret.Type,
		Value:       encryptedValue,
		Version:     currentSecret.Version + 1,
		IsActive:    true,
		Description: currentSecret.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := m.db.Create(newSecret).Error; err != nil {
		return err
	}

	m.ClearCache(name)
	return nil
}

// DeleteSecret 删除密钥
func (m *DatabaseSecretManager) DeleteSecret(name string) error {
	result := m.db.Model(&model.Secret{}).
		Where("name = ?", name).
		Update("is_active", false)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("密钥不存在")
	}

	m.ClearCache(name)
	return nil
}

// ListSecrets 列出所有密钥
func (m *DatabaseSecretManager) ListSecrets() ([]model.Secret, error) {
	var secrets []model.Secret
	err := m.db.Where("is_active = ?", true).
		Group("name").
		Order("version DESC").
		Find(&secrets).Error

	if err != nil {
		return nil, err
	}

	return secrets, nil
}
