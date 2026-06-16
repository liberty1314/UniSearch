package service

import (
	"fmt"
	"testing"
	"time"
	"unisearch/config"
	"unisearch/database"
	"unisearch/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newAuthServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.UserLoginDailyStat{}); err != nil {
		t.Fatalf("auto migrate auth tables: %v", err)
	}

	database.SetDB(db)
	config.AppConfig = &config.Config{
		AuthJWTSecret:         "test-secret",
		AuthTokenExpiry:       time.Hour,
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
	}

	return db
}

func TestRegisterRejectsPasswordWhitespace(t *testing.T) {
	newAuthServiceTestDB(t)
	authService := NewAuthService()

	passwords := []string{
		" secret123",
		"secret 123",
		"secret123 ",
		"secret\t123",
		"secret　123",
	}

	for index, password := range passwords {
		t.Run(password, func(t *testing.T) {
			_, err := authService.Register(fmt.Sprintf("neo%d", index), password)
			if err == nil {
				t.Fatal("expected register to reject password whitespace")
			}
			if err.Error() != "密码不能包含空格" {
				t.Fatalf("expected whitespace validation message, got %v", err)
			}
		})
	}
}
