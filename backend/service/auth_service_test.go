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

	oldDB := database.GetDB()
	oldConfig := config.AppConfig
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
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
		database.SetDB(oldDB)
		config.AppConfig = oldConfig
	})

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

func TestRegisterRejectsLowComplexityPassword(t *testing.T) {
	newAuthServiceTestDB(t)
	authService := NewAuthService()

	// 仅小写+数字（2 类），低于默认要求的 3 类。
	if _, err := authService.Register("neo", "abcdefg1"); err == nil {
		t.Fatal("expected register to reject low-complexity password")
	}
}

func TestRegisterRejectsWeakBlocklistedPassword(t *testing.T) {
	newAuthServiceTestDB(t)
	authService := NewAuthService()

	// 命中内置弱口令黑名单。
	if _, err := authService.Register("neo", "Password1"); err == nil {
		t.Fatal("expected register to reject blocklisted weak password")
	}
}

func TestRegisterAcceptsStrongPassword(t *testing.T) {
	newAuthServiceTestDB(t)
	authService := NewAuthService()

	// 3 类（大小写+数字+符号），未命中黑名单。
	if _, err := authService.Register("neo", "Str0ng!Pass"); err != nil {
		t.Fatalf("expected register to accept strong password, got %v", err)
	}
}

func TestCreateDefaultAdminRejectsMissingProductionCredentials(t *testing.T) {
	db := newAuthServiceTestDB(t)
	config.AppConfig.AppEnv = "production"
	config.AppConfig.InitialAdminUsername = ""
	config.AppConfig.InitialAdminPassword = ""

	authService := &AuthService{db: db}
	if err := authService.CreateDefaultAdmin(); err == nil {
		t.Fatal("生产环境缺少初始管理员配置时应拒绝创建")
	}

	var count int64
	if err := db.Model(&model.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		t.Fatalf("查询管理员数量失败: %v", err)
	}
	if count != 0 {
		t.Fatalf("生产环境缺少配置时不应创建管理员，实际数量为 %d", count)
	}
}

func TestCreateDefaultAdminCreatesExplicitProductionAdmin(t *testing.T) {
	db := newAuthServiceTestDB(t)
	config.AppConfig.AppEnv = "production"
	config.AppConfig.InitialAdminUsername = "root-admin"
	config.AppConfig.InitialAdminPassword = "Str0ng!Initial"

	authService := &AuthService{db: db}
	if err := authService.CreateDefaultAdmin(); err != nil {
		t.Fatalf("生产环境显式管理员配置应创建成功: %v", err)
	}

	var admin model.User
	if err := db.Where("role = ?", "admin").First(&admin).Error; err != nil {
		t.Fatalf("查询管理员失败: %v", err)
	}
	if admin.Username != "root-admin" {
		t.Fatalf("期望创建显式管理员 root-admin，实际为 %q", admin.Username)
	}
}
