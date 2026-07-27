package service

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	"unisearch/config"
	"unisearch/model"
	"unisearch/util"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newUserServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	config.AppConfig = &config.Config{
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
	}

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.UserLoginDailyStat{}, &model.RefreshTokenSession{}); err != nil {
		t.Fatalf("auto migrate test db: %v", err)
	}
	return db
}

func TestUserAuthorizationChangesInvalidateSessions(t *testing.T) {
	testCases := []struct {
		name string
		run  func(service *UserService, user model.User) error
	}{
		{
			name: "修改角色",
			run: func(service *UserService, user model.User) error {
				_, err := service.UpdateUser(user.ID, user.Username, "admin", 999)
				return err
			},
		},
		{
			name: "删除用户",
			run: func(service *UserService, user model.User) error {
				return service.DeleteUser(user.ID, 999)
			},
		},
		{
			name: "重置密码",
			run: func(service *UserService, user model.User) error {
				return service.ResetPassword(user.ID, "Str0ng-Reset-Pw!")
			},
		},
		{
			name: "修改密码",
			run: func(service *UserService, user model.User) error {
				return service.ChangePassword(user.ID, "password123", "Str0ng-Change-Pw!")
			},
		},
		{
			name: "禁用用户",
			run: func(service *UserService, user model.User) error {
				return service.SetUserStatus(user.ID, false, 999)
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			db := newUserServiceTestDB(t)
			user := createUserServiceTestUser(t, db, "session-user", true, nil)
			refreshToken := model.RefreshTokenSession{
				UserID:            user.ID,
				TokenDigest:       DigestRefreshToken("session-token-" + strings.ReplaceAll(tc.name, " ", "-")),
				DeviceFingerprint: "device-session",
				ExpiresAt:         time.Now().Add(time.Hour),
			}
			if err := db.Create(&refreshToken).Error; err != nil {
				t.Fatalf("创建刷新记录失败: %v", err)
			}

			if err := tc.run(NewUserService(db, NewAccountSessionService()), user); err != nil {
				t.Fatalf("执行账户变更失败: %v", err)
			}

			var updatedUser model.User
			if err := db.Unscoped().First(&updatedUser, user.ID).Error; err != nil {
				t.Fatalf("读取变更后用户失败: %v", err)
			}
			if updatedUser.TokenVersion != user.TokenVersion+1 {
				t.Fatalf("期望令牌版本递增，实际为 %d", updatedUser.TokenVersion)
			}
			if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
				t.Fatalf("读取刷新记录失败: %v", err)
			}
			if !refreshToken.IsRevoked {
				t.Fatal("期望刷新记录已撤销")
			}
		})
	}
}

func TestReenabledUserInvalidatesPreviousSessions(t *testing.T) {
	db := newUserServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "reenabled-session", true, nil)
	refreshToken := model.RefreshTokenSession{
		UserID:            user.ID,
		TokenDigest:       DigestRefreshToken("reenabled-session-token"),
		DeviceFingerprint: "device-reenabled",
		ExpiresAt:         time.Now().Add(time.Hour),
	}
	if err := db.Create(&refreshToken).Error; err != nil {
		t.Fatalf("创建刷新记录失败: %v", err)
	}

	userService := NewUserService(db, NewAccountSessionService())
	if err := userService.SetUserStatus(user.ID, false, 999); err != nil {
		t.Fatalf("禁用用户失败: %v", err)
	}
	if err := db.Model(&refreshToken).Update("is_revoked", false).Error; err != nil {
		t.Fatalf("创建启用前会话夹具失败: %v", err)
	}
	if err := userService.SetUserStatus(user.ID, true, 999); err != nil {
		t.Fatalf("启用用户失败: %v", err)
	}

	var updatedUser model.User
	if err := db.First(&updatedUser, user.ID).Error; err != nil {
		t.Fatalf("读取用户失败: %v", err)
	}
	if updatedUser.TokenVersion != user.TokenVersion+2 {
		t.Fatalf("期望禁用和启用各递增一次版本，实际为 %d", updatedUser.TokenVersion)
	}
	if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
		t.Fatalf("读取刷新记录失败: %v", err)
	}
	if !refreshToken.IsRevoked {
		t.Fatal("重新启用时必须撤销此前会话")
	}
}

func TestRestoredUserInvalidatesDeletedAccountSessions(t *testing.T) {
	db := newUserServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "restored-session", true, nil)
	refreshToken := model.RefreshTokenSession{
		UserID:            user.ID,
		TokenDigest:       DigestRefreshToken("restored-session-token"),
		DeviceFingerprint: "device-restored",
		ExpiresAt:         time.Now().Add(time.Hour),
	}
	if err := db.Create(&refreshToken).Error; err != nil {
		t.Fatalf("创建刷新记录失败: %v", err)
	}

	userService := NewUserService(db, NewAccountSessionService())
	if err := userService.DeleteUser(user.ID, 999); err != nil {
		t.Fatalf("删除用户失败: %v", err)
	}
	if err := db.Model(&refreshToken).Update("is_revoked", false).Error; err != nil {
		t.Fatalf("创建恢复前会话夹具失败: %v", err)
	}
	restored, wasRestored, err := userService.CreateUser(user.Username, "Str0ng-Restore-Pw!", "user", true)
	if err != nil {
		t.Fatalf("恢复用户失败: %v", err)
	}
	if !wasRestored {
		t.Fatal("期望恢复软删除用户")
	}
	if restored.TokenVersion != user.TokenVersion+2 {
		t.Fatalf("期望删除和恢复各递增一次版本，实际为 %d", restored.TokenVersion)
	}
	if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
		t.Fatalf("读取刷新记录失败: %v", err)
	}
	if !refreshToken.IsRevoked {
		t.Fatal("恢复用户时必须撤销删除期间的旧会话")
	}
}

func TestBatchRoleChangeInvalidatesSessions(t *testing.T) {
	db := newUserServiceTestDB(t)
	first := createUserServiceTestUser(t, db, "batch-session-a", true, nil)
	second := createUserServiceTestUser(t, db, "batch-session-b", true, nil)
	for _, user := range []model.User{first, second} {
		refreshToken := model.RefreshTokenSession{
			UserID:            user.ID,
			TokenDigest:       DigestRefreshToken(fmt.Sprintf("batch-session-token-%d", user.ID)),
			DeviceFingerprint: "device-batch-session",
			ExpiresAt:         time.Now().Add(time.Hour),
		}
		if err := db.Create(&refreshToken).Error; err != nil {
			t.Fatalf("创建刷新记录失败: %v", err)
		}
	}

	result, err := NewUserService(db, NewAccountSessionService()).BatchUpdateRole([]uint{first.ID, second.ID}, "admin", 999)
	if err != nil {
		t.Fatalf("批量修改角色失败: %v", err)
	}
	if result.SuccessCount != 2 {
		t.Fatalf("期望两个用户更新成功，实际为 %#v", result)
	}

	for _, user := range []model.User{first, second} {
		var updatedUser model.User
		if err := db.First(&updatedUser, user.ID).Error; err != nil {
			t.Fatalf("读取用户失败: %v", err)
		}
		if updatedUser.TokenVersion != user.TokenVersion+1 {
			t.Fatalf("用户 %d 的令牌版本未递增: %d", user.ID, updatedUser.TokenVersion)
		}
		var activeRefreshTokens int64
		if err := db.Model(&model.RefreshTokenSession{}).
			Where("user_id = ? AND is_revoked = ?", user.ID, false).
			Count(&activeRefreshTokens).Error; err != nil {
			t.Fatalf("统计刷新记录失败: %v", err)
		}
		if activeRefreshTokens != 0 {
			t.Fatalf("用户 %d 仍有 %d 条未撤销刷新记录", user.ID, activeRefreshTokens)
		}
	}
}

func TestBatchDeleteInvalidatesSessions(t *testing.T) {
	db := newUserServiceTestDB(t)
	first := createUserServiceTestUser(t, db, "batch-delete-a", true, nil)
	second := createUserServiceTestUser(t, db, "batch-delete-b", true, nil)
	for _, user := range []model.User{first, second} {
		refreshToken := model.RefreshTokenSession{
			UserID:            user.ID,
			TokenDigest:       DigestRefreshToken(fmt.Sprintf("batch-delete-token-%d", user.ID)),
			DeviceFingerprint: "device-batch-delete",
			ExpiresAt:         time.Now().Add(time.Hour),
		}
		if err := db.Create(&refreshToken).Error; err != nil {
			t.Fatalf("创建刷新记录失败: %v", err)
		}
	}

	result, err := NewUserService(db, NewAccountSessionService()).BatchDeleteUsers([]uint{first.ID, second.ID}, 999)
	if err != nil {
		t.Fatalf("批量删除失败: %v", err)
	}
	if result.SuccessCount != 2 {
		t.Fatalf("期望两个用户删除成功，实际为 %#v", result)
	}

	for _, user := range []model.User{first, second} {
		var updatedUser model.User
		if err := db.Unscoped().First(&updatedUser, user.ID).Error; err != nil {
			t.Fatalf("读取已删除用户失败: %v", err)
		}
		if updatedUser.TokenVersion != user.TokenVersion+1 {
			t.Fatalf("用户 %d 的令牌版本未递增: %d", user.ID, updatedUser.TokenVersion)
		}
		var activeRefreshTokens int64
		if err := db.Model(&model.RefreshTokenSession{}).
			Where("user_id = ? AND is_revoked = ?", user.ID, false).
			Count(&activeRefreshTokens).Error; err != nil {
			t.Fatalf("统计刷新记录失败: %v", err)
		}
		if activeRefreshTokens != 0 {
			t.Fatalf("用户 %d 仍有 %d 条未撤销刷新记录", user.ID, activeRefreshTokens)
		}
	}
}

func TestUpdateUserRollsBackWhenSessionInvalidationFails(t *testing.T) {
	db := newUserServiceTestDB(t)
	user := createUserServiceTestUser(t, db, "rollback-update", true, nil)
	refreshToken := model.RefreshTokenSession{
		UserID:            user.ID,
		TokenDigest:       DigestRefreshToken("rollback-update-token"),
		DeviceFingerprint: "device-rollback-update",
		ExpiresAt:         time.Now().Add(time.Hour),
	}
	if err := db.Create(&refreshToken).Error; err != nil {
		t.Fatalf("创建刷新记录失败: %v", err)
	}

	injectedErr := errors.New("注入刷新记录撤销失败")
	if err := db.Callback().Update().Before("gorm:update").Register("test:fail_user_session_revocation", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "refresh_token_sessions" {
			tx.AddError(injectedErr)
		}
	}); err != nil {
		t.Fatalf("注册失败回调失败: %v", err)
	}

	_, err := NewUserService(db, NewAccountSessionService()).UpdateUser(user.ID, user.Username, "admin", 999)
	if !errors.Is(err, injectedErr) {
		t.Fatalf("期望返回注入错误，实际为 %v", err)
	}

	var updatedUser model.User
	if err := db.First(&updatedUser, user.ID).Error; err != nil {
		t.Fatalf("读取用户失败: %v", err)
	}
	if updatedUser.Role != "user" {
		t.Fatalf("撤销失败后角色必须回滚为 user，实际为 %s", updatedUser.Role)
	}
	if updatedUser.TokenVersion != user.TokenVersion {
		t.Fatalf("撤销失败后令牌版本必须保持为 %d，实际为 %d", user.TokenVersion, updatedUser.TokenVersion)
	}
	if err := db.First(&refreshToken, refreshToken.ID).Error; err != nil {
		t.Fatalf("读取刷新记录失败: %v", err)
	}
	if refreshToken.IsRevoked {
		t.Fatal("撤销失败后刷新记录不得被修改")
	}
}

func TestUserServiceRejectsWhitespaceInNewPasswords(t *testing.T) {
	cases := []struct {
		name string
		run  func(t *testing.T) error
	}{
		{
			name: "创建用户",
			run: func(t *testing.T) error {
				db := newUserServiceTestDB(t)
				service := NewUserService(db, NewAccountSessionService())
				_, _, err := service.CreateUser("neo", "secret 123", "user", false)
				return err
			},
		},
		{
			name: "重置密码",
			run: func(t *testing.T) error {
				db := newUserServiceTestDB(t)
				service := NewUserService(db, NewAccountSessionService())
				user := createUserServiceTestUser(t, db, "reset-user", true, nil)
				return service.ResetPassword(user.ID, "secret 123")
			},
		},
		{
			name: "修改密码",
			run: func(t *testing.T) error {
				db := newUserServiceTestDB(t)
				service := NewUserService(db, NewAccountSessionService())
				user := createUserServiceTestUser(t, db, "change-user", true, nil)
				return service.ChangePassword(user.ID, "password123", "secret 123")
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.run(t)
			if err == nil {
				t.Fatal("expected password whitespace to be rejected")
			}
			if !strings.Contains(err.Error(), "密码不能包含空格") {
				t.Fatalf("expected whitespace validation message, got %v", err)
			}
		})
	}
}

func createUserServiceTestUser(t *testing.T, db *gorm.DB, username string, enabled bool, lastLoginAt *time.Time) model.User {
	t.Helper()
	return createUserServiceTestUserWithRole(t, db, username, "user", enabled, lastLoginAt)
}

func createUserServiceTestUserWithRole(t *testing.T, db *gorm.DB, username string, role string, enabled bool, lastLoginAt *time.Time) model.User {
	t.Helper()

	passwordHash, err := util.HashPassword("password123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	user := model.User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         role,
		IsEnabled:    enabled,
		LastLoginAt:  lastLoginAt,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	if !enabled {
		if err := db.Model(&user).Update("is_enabled", false).Error; err != nil {
			t.Fatalf("disable user: %v", err)
		}
		user.IsEnabled = false
	}
	return user
}

func TestListUsersReturnsMonthlyLoginDaysAndDisabledUsersLast(t *testing.T) {
	db := newUserServiceTestDB(t)
	now := time.Now()
	enabledLogin := now.Add(-2 * time.Hour)
	disabledLogin := now.Add(2 * time.Hour)

	disabledUser := createUserServiceTestUser(t, db, "disabled-user", false, &disabledLogin)
	enabledUser := createUserServiceTestUser(t, db, "enabled-user", true, &enabledLogin)
	neverLoginUser := createUserServiceTestUser(t, db, "never-login", true, nil)

	monthDay := time.Date(now.Year(), now.Month(), 7, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
	if err := db.Create(&model.UserLoginDailyStat{
		UserID:     enabledUser.ID,
		LoginDate:  monthDay,
		LoginCount: 3,
	}).Error; err != nil {
		t.Fatalf("create daily stat: %v", err)
	}

	result, err := NewUserService(db, NewAccountSessionService()).ListUsers(1, 20, "", "")
	if err != nil {
		t.Fatalf("list users: %v", err)
	}

	gotOrder := []uint{result.Users[0].ID, result.Users[1].ID, result.Users[2].ID}
	wantOrder := []uint{enabledUser.ID, neverLoginUser.ID, disabledUser.ID}
	if !reflect.DeepEqual(gotOrder, wantOrder) {
		t.Fatalf("expected enabled users first and disabled last, got %v want %v", gotOrder, wantOrder)
	}

	if !reflect.DeepEqual(result.MonthlyLoginDays[enabledUser.ID], []string{monthDay}) {
		t.Fatalf("expected enabled user monthly days, got %#v", result.MonthlyLoginDays[enabledUser.ID])
	}
	if result.MonthlyLoginDayCounts[enabledUser.ID] != 1 {
		t.Fatalf("expected enabled user monthly day count to be 1, got %d", result.MonthlyLoginDayCounts[enabledUser.ID])
	}
	if len(result.MonthlyLoginDays[neverLoginUser.ID]) != 0 {
		t.Fatalf("expected empty monthly days for never login user, got %#v", result.MonthlyLoginDays[neverLoginUser.ID])
	}
}

func TestGetUserStatsReturnsActivityAndSilenceSummary(t *testing.T) {
	db := newUserServiceTestDB(t)
	now := time.Now()
	sixDaysAgo := now.AddDate(0, 0, -6).Format("2006-01-02")
	eightDaysAgo := now.AddDate(0, 0, -8).Format("2006-01-02")
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	recentLogin := now.AddDate(0, 0, -1)
	silentLogin := now.AddDate(0, 0, -31)
	previousMonthCreatedAt := monthStart.AddDate(0, 0, -1)

	weekUser := createUserServiceTestUser(t, db, "week-user", true, &recentLogin)
	silentUser := createUserServiceTestUser(t, db, "silent-user", true, &silentLogin)
	createUserServiceTestUser(t, db, "never-login-stats", true, nil)
	oldUser := createUserServiceTestUser(t, db, "old-user", true, &recentLogin)
	if err := db.Model(&oldUser).Update("created_at", previousMonthCreatedAt).Error; err != nil {
		t.Fatalf("move old user created_at: %v", err)
	}
	adminUser := createUserServiceTestUserWithRole(t, db, "admin-stats", "admin", true, &recentLogin)
	deletedUser := createUserServiceTestUser(t, db, "deleted-user", true, &recentLogin)
	if err := db.Delete(&deletedUser).Error; err != nil {
		t.Fatalf("soft delete user: %v", err)
	}

	statsRows := []model.UserLoginDailyStat{
		{UserID: weekUser.ID, LoginDate: sixDaysAgo, LoginCount: 1},
		{UserID: oldUser.ID, LoginDate: sixDaysAgo, LoginCount: 1},
		{UserID: silentUser.ID, LoginDate: eightDaysAgo, LoginCount: 1},
		{UserID: adminUser.ID, LoginDate: sixDaysAgo, LoginCount: 1},
		{UserID: deletedUser.ID, LoginDate: sixDaysAgo, LoginCount: 1},
	}
	if err := db.Create(&statsRows).Error; err != nil {
		t.Fatalf("create login stats: %v", err)
	}

	stats, err := NewUserService(db, NewAccountSessionService()).GetUserStats()
	if err != nil {
		t.Fatalf("get user stats: %v", err)
	}

	if stats.TotalUsers != 4 {
		t.Fatalf("expected total users to exclude admins and soft deleted rows, got %d", stats.TotalUsers)
	}
	if stats.MonthNewUsers != 3 {
		t.Fatalf("expected month new users to exclude admins and previous-month users, got %d", stats.MonthNewUsers)
	}
	if stats.SevenDayActiveUsers != 2 {
		t.Fatalf("expected seven day active users to exclude admins and soft deleted rows, got %d", stats.SevenDayActiveUsers)
	}
	if stats.Inactive30DayUsers != 2 {
		t.Fatalf("expected silent and never-login users to be inactive, got %d", stats.Inactive30DayUsers)
	}
}

func TestGetUserStatsReturnsZeroWithoutUsers(t *testing.T) {
	db := newUserServiceTestDB(t)

	stats, err := NewUserService(db, NewAccountSessionService()).GetUserStats()
	if err != nil {
		t.Fatalf("get empty user stats: %v", err)
	}

	if stats.TotalUsers != 0 ||
		stats.MonthNewUsers != 0 ||
		stats.SevenDayActiveUsers != 0 ||
		stats.Inactive30DayUsers != 0 {
		t.Fatalf("expected all stats to be zero, got %#v", stats)
	}
}
