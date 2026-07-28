package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"flag"
	"log"
	"strings"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"

	"unisearch/model"
	"unisearch/service"
)

func TestRunRejectsInvalidConfirmationAndEnvironment(t *testing.T) {
	oldKey := rotateMasterKeyTestValue("旧主密钥")
	newKey := rotateMasterKeyTestValue("新主密钥")
	tests := []struct {
		name       string
		args       []string
		env        map[string]string
		rotateErr  error
		wantError  string
		wantRotate bool
	}{
		{
			name:      "缺少确认参数",
			env:       map[string]string{"SECRET_MASTER_KEY": oldKey, "NEW_SECRET_MASTER_KEY": newKey},
			wantError: "必须显式确认数据库主密钥轮换",
		},
		{
			name:      "确认参数错误",
			args:      []string{"-confirm=wrong"},
			env:       map[string]string{"SECRET_MASTER_KEY": oldKey, "NEW_SECRET_MASTER_KEY": newKey},
			wantError: "必须显式确认数据库主密钥轮换",
		},
		{
			name:      "缺少旧主密钥",
			args:      []string{"-confirm=rotate-database-master-key"},
			env:       map[string]string{"NEW_SECRET_MASTER_KEY": newKey},
			wantError: "缺少 SECRET_MASTER_KEY",
		},
		{
			name:      "缺少新主密钥",
			args:      []string{"-confirm=rotate-database-master-key"},
			env:       map[string]string{"SECRET_MASTER_KEY": oldKey},
			wantError: "缺少 NEW_SECRET_MASTER_KEY",
		},
		{
			name:       "新旧主密钥相同",
			args:       []string{"-confirm=rotate-database-master-key"},
			env:        map[string]string{"SECRET_MASTER_KEY": oldKey, "NEW_SECRET_MASTER_KEY": oldKey},
			rotateErr:  errors.New("新旧主密钥不能使用相同的 AES-256 密钥材料"),
			wantError:  "新旧主密钥不能使用相同的 AES-256 密钥材料",
			wantRotate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var stdout strings.Builder
			rotateCalls := 0
			err := run(
				tt.args,
				mapGetenv(tt.env),
				&stdout,
				func(context.Context, string, string) (service.MasterKeyRotationResult, error) {
					rotateCalls++
					return service.MasterKeyRotationResult{}, tt.rotateErr
				},
			)
			if err == nil || !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("应返回 %q 错误，实际为 %v", tt.wantError, err)
			}
			wantCalls := 0
			if tt.wantRotate {
				wantCalls = 1
			}
			if rotateCalls != wantCalls {
				t.Fatalf("轮换函数调用次数应为 %d，实际为 %d", wantCalls, rotateCalls)
			}
			if stdout.Len() != 0 {
				t.Fatalf("失败时不得输出成功信息，实际为 %q", stdout.String())
			}
			assertRotateMasterKeyOutputRedacted(t, err.Error(), oldKey, newKey)
		})
	}
}

func TestRunPrintsOnlyRotatedCount(t *testing.T) {
	oldKey := rotateMasterKeyTestValue("旧主密钥")
	newKey := rotateMasterKeyTestValue("新主密钥")
	var stdout strings.Builder

	err := run(
		[]string{"-confirm=rotate-database-master-key"},
		mapGetenv(map[string]string{
			"SECRET_MASTER_KEY":     oldKey,
			"NEW_SECRET_MASTER_KEY": newKey,
		}),
		&stdout,
		func(ctx context.Context, actualOldKey string, actualNewKey string) (service.MasterKeyRotationResult, error) {
			if ctx == nil {
				t.Fatal("轮换上下文不能为空")
			}
			if actualOldKey != oldKey || actualNewKey != newKey {
				t.Fatal("轮换函数收到的主密钥不符合预期")
			}
			return service.MasterKeyRotationResult{Rotated: 7}, nil
		},
	)
	if err != nil {
		t.Fatalf("轮换命令失败: %v", err)
	}
	if stdout.String() != "主密钥重加密完成，已更新 7 条密钥记录\n" {
		t.Fatalf("成功输出不符合契约: %q", stdout.String())
	}
	assertRotateMasterKeyOutputRedacted(t, stdout.String(), oldKey, newKey)
}

func TestRunReturnsSafeRotationError(t *testing.T) {
	oldKey := rotateMasterKeyTestValue("旧主密钥")
	newKey := rotateMasterKeyTestValue("新主密钥")
	ciphertext := rotateMasterKeyTestValue("测试密文")
	var stdout strings.Builder

	err := run(
		[]string{"-confirm=rotate-database-master-key"},
		mapGetenv(map[string]string{
			"SECRET_MASTER_KEY":     oldKey,
			"NEW_SECRET_MASTER_KEY": newKey,
		}),
		&stdout,
		func(context.Context, string, string) (service.MasterKeyRotationResult, error) {
			return service.MasterKeyRotationResult{}, errors.New("密钥记录 2 解密失败")
		},
	)
	if err == nil || !strings.Contains(err.Error(), "密钥记录 2 解密失败") {
		t.Fatalf("应返回脱敏轮换错误，实际为 %v", err)
	}
	if stdout.Len() != 0 {
		t.Fatalf("失败时不得输出成功信息，实际为 %q", stdout.String())
	}
	assertRotateMasterKeyOutputRedacted(t, err.Error(), oldKey, newKey, ciphertext)
}

func TestRunHelpDoesNotRotate(t *testing.T) {
	var stdout strings.Builder
	rotateCalls := 0
	err := run(
		[]string{"-help"},
		mapGetenv(nil),
		&stdout,
		func(context.Context, string, string) (service.MasterKeyRotationResult, error) {
			rotateCalls++
			return service.MasterKeyRotationResult{}, nil
		},
	)
	if !errors.Is(err, flag.ErrHelp) {
		t.Fatalf("-help 应返回 flag.ErrHelp，实际为 %v", err)
	}
	if rotateCalls != 0 {
		t.Fatal("帮助参数不得执行轮换")
	}
}

func TestSilentMasterKeyRotationSessionDoesNotLogCiphertextSQL(t *testing.T) {
	var logOutput strings.Builder
	dbLogger := gormLogger.New(
		log.New(&logOutput, "", 0),
		gormLogger.Config{LogLevel: gormLogger.Info, Colorful: false},
	)
	db, err := gorm.Open(
		sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"),
		&gorm.Config{Logger: dbLogger},
	)
	if err != nil {
		t.Fatalf("打开轮换日志测试数据库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.Secret{}); err != nil {
		t.Fatalf("迁移轮换日志测试表失败: %v", err)
	}

	oldKey := rotateMasterKeyTestValue("日志测试旧主密钥")
	newKey := rotateMasterKeyTestValue("日志测试新主密钥")
	plaintext := rotateMasterKeyTestValue("日志测试明文")
	oldManager := service.NewBaseSecretManager(oldKey, 0)
	ciphertext, err := oldManager.EncryptSecret(plaintext)
	if err != nil {
		t.Fatalf("加密轮换日志测试密钥失败: %v", err)
	}
	if err := db.Create(&model.Secret{
		Name:     "rotation-log-test",
		Type:     model.SecretTypeCustom,
		Value:    ciphertext,
		IsActive: true,
	}).Error; err != nil {
		t.Fatalf("写入轮换日志测试密钥失败: %v", err)
	}

	logOutput.Reset()
	result, err := service.ReencryptDatabaseSecrets(
		t.Context(),
		silentMasterKeyRotationSession(db),
		oldKey,
		newKey,
	)
	if err != nil {
		t.Fatalf("轮换日志测试失败: %v", err)
	}
	if result.Rotated != 1 {
		t.Fatalf("应轮换 1 条日志测试密钥，实际为 %d", result.Rotated)
	}
	if logOutput.Len() != 0 {
		t.Fatal("轮换专用数据库会话不得输出包含密文的 SQL 日志")
	}

	if err := db.Exec("SELECT 1").Error; err != nil {
		t.Fatalf("验证原始数据库日志器失败: %v", err)
	}
	if !strings.Contains(logOutput.String(), "SELECT 1") {
		t.Fatal("轮换专用静默会话不得修改原始数据库日志器")
	}
}

func mapGetenv(values map[string]string) func(string) string {
	return func(name string) string {
		return values[name]
	}
}

func rotateMasterKeyTestValue(label string) string {
	digest := sha256.Sum256([]byte(label))
	return hex.EncodeToString(digest[:])
}

func assertRotateMasterKeyOutputRedacted(t *testing.T, output string, sensitiveValues ...string) {
	t.Helper()
	for _, value := range sensitiveValues {
		if value != "" && strings.Contains(output, value) {
			t.Fatal("命令输出包含敏感测试材料")
		}
	}
}
