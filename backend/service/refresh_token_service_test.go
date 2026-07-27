package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestDigestRefreshTokenUsesSHA256Hex(t *testing.T) {
	raw := "fixed-refresh-token"
	want := sha256.Sum256([]byte(raw))
	if got := DigestRefreshToken(raw); got != hex.EncodeToString(want[:]) {
		t.Fatalf("摘要不符合预期: %s", got)
	}
}

func newRefreshTokenServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开刷新会话测试数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.RefreshTokenSession{}); err != nil {
		t.Fatalf("迁移刷新会话测试表失败: %v", err)
	}
	return db
}

func TestRefreshTokenService_IssueStoresOnlyDigest(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}

	issued, err := refreshService.Issue(t.Context(), 7, "device-issue", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}
	if issued.RawToken == "" || issued.Session == nil {
		t.Fatalf("签发结果不完整: %#v", issued)
	}

	var sessions []model.RefreshTokenSession
	if err := db.Find(&sessions).Error; err != nil {
		t.Fatalf("查询刷新会话失败: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("期望一条刷新会话，实际为 %d", len(sessions))
	}
	session := sessions[0]
	if session.TokenDigest != DigestRefreshToken(issued.RawToken) || len(session.TokenDigest) != 64 {
		t.Fatalf("数据库摘要不符合预期: %q", session.TokenDigest)
	}
	for _, value := range []string{session.TokenDigest, session.DeviceFingerprint} {
		if value == issued.RawToken {
			t.Fatal("数据库字符串字段不得保存原始刷新令牌")
		}
	}
}

func TestRefreshTokenService_ValidateCoversInvalidStates(t *testing.T) {
	testCases := []struct {
		name        string
		mutate      func(*model.RefreshTokenSession)
		fingerprint string
		wantErr     error
	}{
		{name: "正常验证", fingerprint: "device-validate"},
		{name: "设备指纹错误", fingerprint: "other-device", wantErr: ErrRefreshTokenInvalid},
		{name: "会话过期", fingerprint: "device-validate", mutate: func(session *model.RefreshTokenSession) {
			session.ExpiresAt = time.Now().Add(-time.Minute)
		}, wantErr: ErrRefreshTokenInvalid},
		{name: "会话已撤销", fingerprint: "device-validate", mutate: func(session *model.RefreshTokenSession) {
			session.IsRevoked = true
		}, wantErr: ErrRefreshTokenInvalid},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			db := newRefreshTokenServiceTestDB(t)
			refreshService, err := NewRefreshTokenService(db)
			if err != nil {
				t.Fatalf("创建刷新会话服务失败: %v", err)
			}
			issued, err := refreshService.Issue(t.Context(), 8, "device-validate", time.Hour)
			if err != nil {
				t.Fatalf("签发刷新令牌失败: %v", err)
			}
			if tc.mutate != nil {
				var session model.RefreshTokenSession
				if err := db.First(&session, issued.Session.ID).Error; err != nil {
					t.Fatalf("查询刷新会话失败: %v", err)
				}
				tc.mutate(&session)
				if err := db.Save(&session).Error; err != nil {
					t.Fatalf("修改刷新会话夹具失败: %v", err)
				}
			}

			session, err := refreshService.Validate(t.Context(), issued.RawToken, tc.fingerprint)
			if tc.wantErr == nil {
				if err != nil || session == nil {
					t.Fatalf("验证刷新令牌失败: session=%#v err=%v", session, err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("期望错误 %v，实际为 %v", tc.wantErr, err)
			}
		})
	}

	db := newRefreshTokenServiceTestDB(t)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), "unknown-refresh-token", "device"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("未知令牌应返回统一错误，实际为 %v", err)
	}
}

func TestRefreshTokenService_RevokeAndRevokeUserSessions(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	first, err := refreshService.Issue(t.Context(), 9, "device-first", time.Hour)
	if err != nil {
		t.Fatalf("签发第一条刷新令牌失败: %v", err)
	}
	second, err := refreshService.Issue(t.Context(), 9, "device-second", time.Hour)
	if err != nil {
		t.Fatalf("签发第二条刷新令牌失败: %v", err)
	}
	other, err := refreshService.Issue(t.Context(), 10, "device-other", time.Hour)
	if err != nil {
		t.Fatalf("签发其他用户刷新令牌失败: %v", err)
	}

	if err := refreshService.Revoke(t.Context(), first.RawToken); err != nil {
		t.Fatalf("撤销刷新令牌失败: %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), first.RawToken, "device-first"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("已撤销令牌应无效，实际为 %v", err)
	}
	if err := refreshService.RevokeUserSessions(t.Context(), 9); err != nil {
		t.Fatalf("撤销用户会话失败: %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), second.RawToken, "device-second"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("用户刷新会话应全部失效，实际为 %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), other.RawToken, "device-other"); err != nil {
		t.Fatalf("其他用户会话不应受影响: %v", err)
	}
	if err := refreshService.Revoke(t.Context(), "unknown-refresh-token"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("撤销未知令牌应返回统一错误，实际为 %v", err)
	}
}

func TestRefreshTokenService_ValidateDatabaseErrorDoesNotLeakToken(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	raw := "database-error-refresh-token"
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}

	_, err = refreshService.Validate(t.Context(), raw, "device")
	if err == nil || errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("数据库错误不得伪装成无效令牌: %v", err)
	}
	if strings.Contains(err.Error(), raw) || strings.Contains(err.Error(), DigestRefreshToken(raw)) {
		t.Fatalf("数据库错误不得泄露令牌或摘要: %v", err)
	}
}

func TestRefreshTokenService_RotateUsesSingleUseSession(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "rotate-user", true, nil)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	issued, err := refreshService.Issue(t.Context(), user.ID, "device-rotate", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}

	rotation, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-rotate", time.Hour)
	if err != nil {
		t.Fatalf("轮转刷新令牌失败: %v", err)
	}
	if rotation.RawToken == "" || rotation.RawToken == issued.RawToken {
		t.Fatalf("轮转必须返回新的原始令牌: %#v", rotation)
	}
	if rotation.State.ID != user.ID || rotation.State.Username != user.Username || !rotation.State.IsEnabled {
		t.Fatalf("轮转账户状态不符合预期: %#v", rotation.State)
	}
	if _, err := refreshService.Validate(t.Context(), issued.RawToken, "device-rotate"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("旧令牌轮转后必须失效: %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), rotation.RawToken, "device-rotate"); err != nil {
		t.Fatalf("新令牌应有效: %v", err)
	}
}

func TestRefreshTokenService_RotateReuseRevokesAllUserSessions(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "reuse-user", true, nil)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	issued, err := refreshService.Issue(t.Context(), user.ID, "device-reuse", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}
	rotation, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-reuse", time.Hour)
	if err != nil {
		t.Fatalf("首次轮转失败: %v", err)
	}

	if _, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-reuse", time.Hour); !errors.Is(err, ErrRefreshTokenReuse) {
		t.Fatalf("旧令牌重放应返回重放错误: %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), rotation.RawToken, "device-reuse"); !errors.Is(err, ErrRefreshTokenInvalid) {
		t.Fatalf("重放后用户全部刷新会话必须失效: %v", err)
	}
}

func TestRefreshTokenService_RotateRejectsDisabledAndDeletedUsers(t *testing.T) {
	testCases := []struct {
		name   string
		mutate func(*testing.T, *gorm.DB, *model.User)
	}{
		{name: "禁用账户", mutate: func(t *testing.T, db *gorm.DB, user *model.User) {
			if err := db.Model(user).Update("is_enabled", false).Error; err != nil {
				t.Fatalf("禁用用户失败: %v", err)
			}
		}},
		{name: "软删除账户", mutate: func(t *testing.T, db *gorm.DB, user *model.User) {
			if err := db.Delete(user).Error; err != nil {
				t.Fatalf("删除用户失败: %v", err)
			}
		}},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			db := newRefreshTokenServiceTestDB(t)
			user := createUserServiceTestUser(t, db, "invalid-rotate-user", true, nil)
			refreshService, err := NewRefreshTokenService(db)
			if err != nil {
				t.Fatalf("创建刷新会话服务失败: %v", err)
			}
			issued, err := refreshService.Issue(t.Context(), user.ID, "device-invalid", time.Hour)
			if err != nil {
				t.Fatalf("签发刷新令牌失败: %v", err)
			}
			tc.mutate(t, db, &user)

			if _, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-invalid", time.Hour); !errors.Is(err, ErrRefreshTokenInvalid) {
				t.Fatalf("无效账户应拒绝轮转: %v", err)
			}
			var count int64
			if err := db.Model(&model.RefreshTokenSession{}).Where("user_id = ?", user.ID).Count(&count).Error; err != nil {
				t.Fatalf("统计刷新会话失败: %v", err)
			}
			if count != 1 {
				t.Fatalf("拒绝轮转时不得创建新会话，实际为 %d", count)
			}
		})
	}
}

func TestRefreshTokenService_RotateRollsBackWhenNewSessionCreationFails(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "rollback-rotate", true, nil)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	issued, err := refreshService.Issue(t.Context(), user.ID, "device-rollback", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}

	injectedErr := errors.New("注入新刷新会话创建失败")
	if err := db.Callback().Create().Before("gorm:create").Register("test:fail_rotated_session_create", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "refresh_token_sessions" {
			tx.AddError(injectedErr)
		}
	}); err != nil {
		t.Fatalf("注册创建失败回调失败: %v", err)
	}

	if _, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-rollback", time.Hour); !errors.Is(err, injectedErr) {
		t.Fatalf("期望返回注入错误，实际为 %v", err)
	}
	if _, err := refreshService.Validate(t.Context(), issued.RawToken, "device-rollback"); err != nil {
		t.Fatalf("轮转失败后旧会话必须保持有效: %v", err)
	}
}

func TestRefreshTokenService_RotateConcurrentRequestsOnlyOneSucceeds(t *testing.T) {
	db := newRefreshTokenServiceTestDB(t)
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxOpenConns(1)
	}
	user := createUserServiceTestUser(t, db, "concurrent-rotate", true, nil)
	refreshService, err := NewRefreshTokenService(db)
	if err != nil {
		t.Fatalf("创建刷新会话服务失败: %v", err)
	}
	issued, err := refreshService.Issue(t.Context(), user.ID, "device-concurrent", time.Hour)
	if err != nil {
		t.Fatalf("签发刷新令牌失败: %v", err)
	}

	type rotateResult struct {
		rotation *RefreshRotation
		err      error
	}
	results := make(chan rotateResult, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rotation, err := refreshService.Rotate(t.Context(), issued.RawToken, "device-concurrent", time.Hour)
			results <- rotateResult{rotation: rotation, err: err}
		}()
	}
	wg.Wait()
	close(results)

	successCount := 0
	failureCount := 0
	for result := range results {
		if result.err == nil && result.rotation != nil {
			successCount++
			continue
		}
		if errors.Is(result.err, ErrRefreshTokenReuse) || errors.Is(result.err, ErrRefreshTokenInvalid) {
			failureCount++
			continue
		}
		t.Fatalf("并发轮转返回意外结果: %#v", result)
	}
	if successCount != 1 || failureCount != 1 {
		t.Fatalf("并发轮转应一成一败，成功=%d 失败=%d", successCount, failureCount)
	}
}
