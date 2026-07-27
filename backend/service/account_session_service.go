package service

import (
	"errors"
	"fmt"

	"unisearch/model"

	"gorm.io/gorm"
)

// AccountSessionService 统一协调账户访问令牌版本和刷新会话失效。
type AccountSessionService struct{}

// NewAccountSessionService 创建账户会话服务实例。
func NewAccountSessionService() *AccountSessionService {
	return &AccountSessionService{}
}

// InvalidateUserSessions 在调用方事务内失效用户的全部现有会话。
func (s *AccountSessionService) InvalidateUserSessions(tx *gorm.DB, userID uint) error {
	if tx == nil || userID == 0 {
		return errors.New("会话失效参数无效")
	}

	result := tx.Unscoped().Model(&model.User{}).
		Where("id = ?", userID).
		UpdateColumn("token_version", gorm.Expr("token_version + ?", 1))
	if result.Error != nil {
		return fmt.Errorf("递增令牌版本失败: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}

	if err := tx.Model(&model.RefreshTokenSession{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Update("is_revoked", true).Error; err != nil {
		return fmt.Errorf("撤销刷新会话失败: %w", err)
	}

	return nil
}
