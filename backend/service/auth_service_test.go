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

func TestRegisterPreservesPasswordWhitespace(t *testing.T) {
	newAuthServiceTestDB(t)
	authService := NewAuthService()

	_, err := authService.Register("neo", " secret123 ")
	if err != nil {
		t.Fatalf("expected register to succeed, got %v", err)
	}

	if _, _, _, err := authService.Login("neo", " secret123 "); err != nil {
		t.Fatalf("expected exact password with whitespace to succeed, got %v", err)
	}

	if _, _, _, err := authService.Login("neo", "secret123"); err == nil {
		t.Fatal("expected trimmed password to fail when registered password contains whitespace")
	}
}
