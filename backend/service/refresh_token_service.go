package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"unisearch/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	// ErrRefreshTokenInvalid 统一表示未知、过期、撤销或设备不匹配的刷新令牌。
	ErrRefreshTokenInvalid = errors.New("刷新令牌无效")
	// ErrRefreshTokenReuse 表示已撤销但未过期的刷新令牌被再次用于轮转。
	ErrRefreshTokenReuse = errors.New("刷新令牌重放：已吊销该用户全部会话")
)

// IssuedRefreshToken 包含仅返回给调用方的原始令牌和持久化会话。
type IssuedRefreshToken struct {
	RawToken string                     `json:"-"`
	Session  *model.RefreshTokenSession `json:"session"`
}

// RefreshRotation 表示一次成功轮转后的新原始令牌和当前账户状态。
type RefreshRotation struct {
	RawToken string        `json:"-"`
	State    UserAuthState `json:"state"`
}

// RefreshTokenService 只使用数据库摘要保存刷新会话。
type RefreshTokenService struct {
	db *gorm.DB
}

// NewRefreshTokenService 创建数据库刷新会话服务。
func NewRefreshTokenService(db *gorm.DB) (*RefreshTokenService, error) {
	if db == nil {
		return nil, errors.New("刷新会话服务需要数据库连接")
	}
	return &RefreshTokenService{db: db}, nil
}

// DigestRefreshToken 返回原始刷新令牌的 SHA-256 小写十六进制摘要。
func DigestRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func generateRefreshToken() (string, error) {
	data := make([]byte, 32)
	if _, err := rand.Read(data); err != nil {
		return "", fmt.Errorf("生成刷新令牌失败: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

// Issue 签发刷新令牌，数据库只保存摘要。
func (s *RefreshTokenService) Issue(ctx context.Context, userID uint, fingerprint string, ttl time.Duration) (*IssuedRefreshToken, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("刷新会话数据库未初始化")
	}
	return s.issueWithDB(ctx, s.db, userID, fingerprint, ttl)
}

func (s *RefreshTokenService) issueWithDB(ctx context.Context, db *gorm.DB, userID uint, fingerprint string, ttl time.Duration) (*IssuedRefreshToken, error) {
	fingerprint = strings.TrimSpace(fingerprint)
	if db == nil || userID == 0 || fingerprint == "" || ttl <= 0 {
		return nil, ErrRefreshTokenInvalid
	}

	raw, err := generateRefreshToken()
	if err != nil {
		return nil, err
	}
	now := time.Now()
	session := &model.RefreshTokenSession{
		UserID:            userID,
		TokenDigest:       DigestRefreshToken(raw),
		DeviceFingerprint: fingerprint,
		ExpiresAt:         now.Add(ttl),
		IsRevoked:         false,
	}
	if err := db.WithContext(ctx).Create(session).Error; err != nil {
		return nil, fmt.Errorf("创建刷新会话失败: %w", err)
	}
	return &IssuedRefreshToken{RawToken: raw, Session: session}, nil
}

// Validate 验证刷新令牌摘要、有效期和设备指纹。
func (s *RefreshTokenService) Validate(ctx context.Context, raw string, fingerprint string) (*model.RefreshTokenSession, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("刷新会话数据库未初始化")
	}
	raw = strings.TrimSpace(raw)
	fingerprint = strings.TrimSpace(fingerprint)
	if raw == "" || fingerprint == "" {
		return nil, ErrRefreshTokenInvalid
	}

	var session model.RefreshTokenSession
	if err := s.db.WithContext(ctx).
		Where("token_digest = ?", DigestRefreshToken(raw)).
		First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRefreshTokenInvalid
		}
		return nil, fmt.Errorf("查询刷新会话失败: %w", err)
	}
	if session.IsRevoked || !time.Now().Before(session.ExpiresAt) || session.DeviceFingerprint != fingerprint {
		return nil, ErrRefreshTokenInvalid
	}

	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&session).Update("last_used_at", now).Error; err != nil {
		return nil, fmt.Errorf("更新刷新会话失败: %w", err)
	}
	session.LastUsedAt = &now
	return &session, nil
}

// Revoke 撤销单个刷新令牌。
func (s *RefreshTokenService) Revoke(ctx context.Context, raw string) error {
	if s == nil || s.db == nil {
		return errors.New("刷新会话数据库未初始化")
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ErrRefreshTokenInvalid
	}

	result := s.db.WithContext(ctx).Model(&model.RefreshTokenSession{}).
		Where("token_digest = ?", DigestRefreshToken(raw)).
		Update("is_revoked", true)
	if result.Error != nil {
		return fmt.Errorf("撤销刷新会话失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRefreshTokenInvalid
	}
	return nil
}

// RevokeUserSessions 撤销用户的全部刷新会话。
func (s *RefreshTokenService) RevokeUserSessions(ctx context.Context, userID uint) error {
	if s == nil || s.db == nil {
		return errors.New("刷新会话数据库未初始化")
	}
	if userID == 0 {
		return ErrRefreshTokenInvalid
	}
	if err := s.db.WithContext(ctx).Model(&model.RefreshTokenSession{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Update("is_revoked", true).Error; err != nil {
		return fmt.Errorf("撤销用户刷新会话失败: %w", err)
	}
	return nil
}

// Rotate 原子撤销旧会话并签发新会话，保证原始令牌只能成功使用一次。
func (s *RefreshTokenService) Rotate(ctx context.Context, raw string, fingerprint string, ttl time.Duration) (*RefreshRotation, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("刷新会话数据库未初始化")
	}
	raw = strings.TrimSpace(raw)
	fingerprint = strings.TrimSpace(fingerprint)
	if raw == "" || fingerprint == "" || ttl <= 0 {
		return nil, ErrRefreshTokenInvalid
	}

	var rotation *RefreshRotation
	reuseDetected := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var old model.RefreshTokenSession
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("token_digest = ?", DigestRefreshToken(raw)).
			First(&old).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRefreshTokenInvalid
			}
			return fmt.Errorf("查询刷新会话失败: %w", err)
		}

		now := time.Now()
		if old.IsRevoked && now.Before(old.ExpiresAt) {
			if err := tx.Model(&model.RefreshTokenSession{}).
				Where("user_id = ?", old.UserID).
				Update("is_revoked", true).Error; err != nil {
				return fmt.Errorf("撤销重放用户会话失败: %w", err)
			}
			reuseDetected = true
			return nil
		}
		if old.IsRevoked || !now.Before(old.ExpiresAt) || old.DeviceFingerprint != fingerprint {
			return ErrRefreshTokenInvalid
		}

		state, err := loadUserAuthState(ctx, tx, old.UserID)
		if errors.Is(err, gorm.ErrRecordNotFound) || state == nil || (err == nil && !state.IsEnabled) {
			return ErrRefreshTokenInvalid
		}
		if err != nil {
			return err
		}

		updateResult := tx.Model(&model.RefreshTokenSession{}).
			Where("id = ? AND is_revoked = ?", old.ID, false).
			Updates(map[string]interface{}{
				"is_revoked":   true,
				"last_used_at": now,
			})
		if updateResult.Error != nil {
			return fmt.Errorf("撤销旧刷新会话失败: %w", updateResult.Error)
		}
		if updateResult.RowsAffected != 1 {
			if err := tx.Model(&model.RefreshTokenSession{}).
				Where("user_id = ?", old.UserID).
				Update("is_revoked", true).Error; err != nil {
				return fmt.Errorf("撤销并发重放用户会话失败: %w", err)
			}
			reuseDetected = true
			return nil
		}

		issued, err := s.issueWithDB(ctx, tx, old.UserID, fingerprint, ttl)
		if err != nil {
			return err
		}
		rotation = &RefreshRotation{RawToken: issued.RawToken, State: *state}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if reuseDetected {
		return nil, ErrRefreshTokenReuse
	}
	return rotation, nil
}
