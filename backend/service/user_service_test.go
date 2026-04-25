package service

import (
	"fmt"
	"reflect"
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

func createUserServiceTestUser(t *testing.T, db *gorm.DB, username string, enabled bool, lastLoginAt *time.Time) model.User {
	t.Helper()

	passwordHash, err := util.HashPassword("password123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	user := model.User{
		Username:     username,
		PasswordHash: passwordHash,
		Role:         "user",
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
