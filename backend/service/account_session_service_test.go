package service

import (
	"errors"
	"testing"
	"time"

	"unisearch/model"

	"gorm.io/gorm"
)

func TestInvalidateUserSessionsIncrementsVersionAndRevokesRefreshTokens(t *testing.T) {
	db := newUserServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "invalidate-session", true, nil)
	if err := db.Model(&user).Update("token_version", 3).Error; err != nil {
		t.Fatalf("设置令牌版本失败: %v", err)
	}
	refreshToken := model.RefreshTokenSession{
		UserID:            user.ID,
		TokenDigest:       DigestRefreshToken("invalidate-session-token"),
		DeviceFingerprint: "device-invalidate-session",
		ExpiresAt:         time.Now().Add(time.Hour),
	}
	if err := db.Create(&refreshToken).Error; err != nil {
		t.Fatalf("创建刷新记录失败: %v", err)
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		return NewAccountSessionService().InvalidateUserSessions(tx, user.ID)
	})
	if err != nil {
		t.Fatalf("失效账户会话失败: %v", err)
	}

	var updatedUser model.User
	if err := db.First(&updatedUser, user.ID).Error; err != nil {
		t.Fatalf("读取用户失败: %v", err)
	}
	if updatedUser.TokenVersion != 4 {
		t.Fatalf("期望令牌版本为 4，实际为 %d", updatedUser.TokenVersion)
	}
	if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
		t.Fatalf("读取刷新记录失败: %v", err)
	}
	if !refreshToken.IsRevoked {
		t.Fatal("期望刷新记录已撤销")
	}
}

func TestInvalidateUserSessionsRollsBackWhenRefreshRevocationFails(t *testing.T) {
	db := newUserServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "rollback-session", true, nil)
	if err := db.Model(&user).Update("token_version", 3).Error; err != nil {
		t.Fatalf("设置令牌版本失败: %v", err)
	}
	refreshToken := model.RefreshTokenSession{
		UserID:            user.ID,
		TokenDigest:       DigestRefreshToken("rollback-session-token"),
		DeviceFingerprint: "device-rollback-session",
		ExpiresAt:         time.Now().Add(time.Hour),
	}
	if err := db.Create(&refreshToken).Error; err != nil {
		t.Fatalf("创建刷新记录失败: %v", err)
	}

	injectedErr := errors.New("注入刷新记录更新失败")
	if err := db.Callback().Update().Before("gorm:update").Register("test:fail_refresh_token_update", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "refresh_token_sessions" {
			tx.AddError(injectedErr)
		}
	}); err != nil {
		t.Fatalf("注册失败回调失败: %v", err)
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		return NewAccountSessionService().InvalidateUserSessions(tx, user.ID)
	})
	if !errors.Is(err, injectedErr) {
		t.Fatalf("期望返回注入错误，实际为 %v", err)
	}

	var updatedUser model.User
	if err := db.First(&updatedUser, user.ID).Error; err != nil {
		t.Fatalf("读取用户失败: %v", err)
	}
	if updatedUser.TokenVersion != 3 {
		t.Fatalf("撤销失败后令牌版本必须回滚为 3，实际为 %d", updatedUser.TokenVersion)
	}
	if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
		t.Fatalf("读取刷新记录失败: %v", err)
	}
	if refreshToken.IsRevoked {
		t.Fatal("撤销失败后刷新记录不得被修改")
	}
}
