package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"unisearch/model"
)

// MasterKeyRotationResult 描述数据库密钥记录的重加密数量。
type MasterKeyRotationResult struct {
	Rotated int
}

type masterKeyRotationOperationError struct {
	message string
}

func (e *masterKeyRotationOperationError) Error() string {
	return e.message
}

func newMasterKeyRotationOperationError(format string, args ...any) error {
	return &masterKeyRotationOperationError{message: fmt.Sprintf(format, args...)}
}

// ReencryptDatabaseSecrets 在单个事务中使用新主密钥重加密全部数据库密钥记录。
func ReencryptDatabaseSecrets(
	ctx context.Context,
	db *gorm.DB,
	oldMasterKey string,
	newMasterKey string,
) (MasterKeyRotationResult, error) {
	var result MasterKeyRotationResult
	if db == nil {
		return result, errors.New("数据库连接未初始化")
	}
	oldKeyMaterial := []byte(oldMasterKey)
	newKeyMaterial := []byte(newMasterKey)
	if len(oldKeyMaterial) < 32 || len(newKeyMaterial) < 32 {
		return result, errors.New("主密钥长度不能少于 32 字节")
	}
	if bytes.Equal(oldKeyMaterial[:32], newKeyMaterial[:32]) {
		return result, errors.New("新旧主密钥不能使用相同的 AES-256 密钥材料")
	}

	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var secrets []model.Secret
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Order("id ASC").Find(&secrets).Error; err != nil {
			return newMasterKeyRotationOperationError("锁定数据库密钥失败")
		}

		oldManager := NewBaseSecretManager(oldMasterKey, 0)
		newManager := NewBaseSecretManager(newMasterKey, 0)
		for _, secret := range secrets {
			plaintext, err := oldManager.DecryptSecret(secret.Value)
			if err != nil {
				return newMasterKeyRotationOperationError("密钥记录 %d 解密失败", secret.ID)
			}
			encrypted, err := newManager.EncryptSecret(plaintext)
			if err != nil {
				return newMasterKeyRotationOperationError("密钥记录 %d 重加密失败", secret.ID)
			}
			update := tx.Model(&model.Secret{}).Where("id = ?", secret.ID).Update("value", encrypted)
			if update.Error != nil {
				return newMasterKeyRotationOperationError("密钥记录 %d 更新失败", secret.ID)
			}
			if update.RowsAffected != 1 {
				return newMasterKeyRotationOperationError("密钥记录 %d 更新行数异常: %d", secret.ID, update.RowsAffected)
			}
			result.Rotated++
		}
		return nil
	})
	if err != nil {
		var operationError *masterKeyRotationOperationError
		if errors.As(err, &operationError) {
			return MasterKeyRotationResult{}, operationError
		}
		return MasterKeyRotationResult{}, errors.New("数据库密钥重加密事务失败")
	}
	return result, nil
}
