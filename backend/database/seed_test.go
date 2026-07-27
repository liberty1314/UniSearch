package database

import (
	"testing"
	"unisearch/config"
	"unisearch/model"
	"unisearch/util"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSeedDefaultAdminRejectsMissingProductionCredentials(t *testing.T) {
	setupSeedTestDB(t)
	setSeedTestConfig(t, &config.Config{AppEnv: "production"})

	if err := SeedDefaultAdmin(); err == nil {
		t.Fatal("生产环境缺少初始管理员配置时应拒绝创建")
	}

	var count int64
	if err := DB.Model(&model.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		t.Fatalf("查询管理员数量失败: %v", err)
	}
	if count != 0 {
		t.Fatalf("生产环境缺少配置时不应创建管理员，实际数量为 %d", count)
	}
}

func TestSeedDefaultAdminCreatesExplicitProductionAdmin(t *testing.T) {
	setupSeedTestDB(t)
	setSeedTestConfig(t, &config.Config{
		AppEnv:                "production",
		InitialAdminUsername:  "root-admin",
		InitialAdminPassword:  "Str0ng!Initial",
		AuthUsernameMinLength: 3,
		AuthUsernameMaxLength: 32,
		AuthPasswordMinLength: 6,
		AuthPasswordMaxLength: 64,
	})

	if err := SeedDefaultAdmin(); err != nil {
		t.Fatalf("生产环境显式管理员配置应创建成功: %v", err)
	}

	var admin model.User
	if err := DB.Where("role = ?", "admin").First(&admin).Error; err != nil {
		t.Fatalf("查询管理员失败: %v", err)
	}
	if admin.Username != "root-admin" {
		t.Fatalf("期望创建显式管理员 root-admin，实际为 %q", admin.Username)
	}
	if !util.ComparePassword(admin.PasswordHash, "Str0ng!Initial") {
		t.Fatal("管理员密码哈希应匹配显式初始密码")
	}
}

func TestSeedDefaultAdminRejectsMissingDevelopmentCredentials(t *testing.T) {
	setupSeedTestDB(t)
	setSeedTestConfig(t, &config.Config{AppEnv: "development"})

	if err := SeedDefaultAdmin(); err == nil {
		t.Fatal("开发环境缺少初始管理员配置时也应拒绝创建")
	}

	var count int64
	if err := DB.Model(&model.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		t.Fatalf("查询管理员数量失败: %v", err)
	}
	if count != 0 {
		t.Fatalf("缺少配置时不应创建管理员，实际数量为 %d", count)
	}
}

func TestSeedDefaultAdminSkipsCredentialsWhenAdminExists(t *testing.T) {
	setupSeedTestDB(t)
	setSeedTestConfig(t, &config.Config{AppEnv: "development"})

	admin := model.User{
		Username:     "existing-admin",
		PasswordHash: "hash",
		Role:         "admin",
		IsEnabled:    true,
	}
	if err := DB.Create(&admin).Error; err != nil {
		t.Fatalf("创建现有管理员失败: %v", err)
	}

	if err := SeedDefaultAdmin(); err != nil {
		t.Fatalf("已有管理员时应跳过初始凭据解析: %v", err)
	}

	var count int64
	if err := DB.Model(&model.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		t.Fatalf("查询管理员数量失败: %v", err)
	}
	if count != 1 {
		t.Fatalf("已有管理员时不应重复创建，实际数量为 %d", count)
	}
}

func setupSeedTestDB(t *testing.T) {
	t.Helper()

	oldDB := DB
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开测试数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("迁移用户表失败: %v", err)
	}
	DB = db

	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
		DB = oldDB
	})
}

func setSeedTestConfig(t *testing.T, cfg *config.Config) {
	t.Helper()

	oldConfig := config.AppConfig
	if cfg.AuthUsernameMinLength == 0 {
		cfg.AuthUsernameMinLength = 3
	}
	if cfg.AuthUsernameMaxLength == 0 {
		cfg.AuthUsernameMaxLength = 32
	}
	if cfg.AuthPasswordMinLength == 0 {
		cfg.AuthPasswordMinLength = 6
	}
	if cfg.AuthPasswordMaxLength == 0 {
		cfg.AuthPasswordMaxLength = 64
	}
	config.AppConfig = cfg

	t.Cleanup(func() {
		config.AppConfig = oldConfig
	})
}
