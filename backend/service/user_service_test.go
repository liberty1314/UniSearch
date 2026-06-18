package service

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	"unisearch/model"
	"unisearch/util"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newUserServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.UserLoginDailyStat{}); err != nil {
		t.Fatalf("auto migrate test db: %v", err)
	}
	return db
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
				service := NewUserService(db)
				_, _, err := service.CreateUser("neo", "secret 123", "user", false)
				return err
			},
		},
		{
			name: "重置密码",
			run: func(t *testing.T) error {
				db := newUserServiceTestDB(t)
				service := NewUserService(db)
				user := createUserServiceTestUser(t, db, "reset-user", true, nil)
				return service.ResetPassword(user.ID, "secret 123")
			},
		},
		{
			name: "修改密码",
			run: func(t *testing.T) error {
				db := newUserServiceTestDB(t)
				service := NewUserService(db)
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

	result, err := NewUserService(db).ListUsers(1, 20, "", "")
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

	stats, err := NewUserService(db).GetUserStats()
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

	stats, err := NewUserService(db).GetUserStats()
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
