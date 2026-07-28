package service

import (
	"context"
	"database/sql"
	"errors"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"unisearch/model"
)

func TestReencryptDatabaseSecretsRotatesEveryRow(t *testing.T) {
	db := newMasterKeyRotationTestDB(t)
	oldKey := masterKeyRotationTestKey("a", "-旧")
	newKey := masterKeyRotationTestKey("b", "-新")
	expiredAt := time.Now().Add(-time.Hour)
	seedEncryptedSecrets(t, db, oldKey, []model.Secret{
		{Name: "active", Type: model.SecretTypeCustom, IsActive: true},
		{Name: "inactive", Type: model.SecretTypeCustom, IsActive: false},
		{Name: "expired", Type: model.SecretTypeCustom, IsActive: true, ExpiresAt: &expiredAt},
	})

	result, err := ReencryptDatabaseSecrets(t.Context(), db, oldKey, newKey)
	if err != nil {
		t.Fatalf("重加密失败: %v", err)
	}
	if result.Rotated != 3 {
		t.Fatalf("应轮换 3 条记录，实际为 %d", result.Rotated)
	}
	assertSecretsUseOnlyMasterKey(t, db, newKey, oldKey)
}

func TestReencryptDatabaseSecretsRollsBackOnCorruptedCiphertext(t *testing.T) {
	db := newMasterKeyRotationTestDB(t)
	oldKey := masterKeyRotationTestKey("a", "-旧")
	newKey := masterKeyRotationTestKey("b", "-新")
	seedEncryptedSecrets(t, db, oldKey, []model.Secret{
		{Name: "first", Type: model.SecretTypeCustom, IsActive: true},
		{Name: "second", Type: model.SecretTypeCustom, IsActive: true},
	})
	const corruptedCiphertext = "损坏密文"
	if err := db.Model(&model.Secret{}).Where("name = ?", "second").Update("value", corruptedCiphertext).Error; err != nil {
		t.Fatalf("写入损坏密文失败: %v", err)
	}
	before := loadSecretCiphertexts(t, db)
	secondID := loadSecretIDByName(t, db, "second")

	result, err := ReencryptDatabaseSecrets(t.Context(), db, oldKey, newKey)
	if err == nil {
		t.Fatal("损坏密文必须使轮换失败")
	}
	if result != (MasterKeyRotationResult{}) {
		t.Fatalf("失败结果必须为零值，实际为 %#v", result)
	}
	assertRotationError(t, err, secondID, "解密失败", oldKey, newKey, corruptedCiphertext, "test-value-second")
	after := loadSecretCiphertexts(t, db)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("失败后全部密文必须保持不变")
	}
}

func TestReencryptDatabaseSecretsRejectsInvalidInputs(t *testing.T) {
	validOldKey := masterKeyRotationTestKey("a", "-旧")
	validNewKey := masterKeyRotationTestKey("b", "-新")
	sharedMaterial := strings.Repeat("c", 32)
	tests := []struct {
		name         string
		db           func(t *testing.T) *gorm.DB
		oldKey       string
		newKey       string
		wantCategory string
	}{
		{
			name:         "数据库为 nil",
			db:           func(*testing.T) *gorm.DB { return nil },
			oldKey:       validOldKey,
			newKey:       validNewKey,
			wantCategory: "数据库连接未初始化",
		},
		{
			name:         "旧主密钥不足 32 字节",
			db:           newMasterKeyRotationTestDB,
			oldKey:       strings.Repeat("a", 31),
			newKey:       validNewKey,
			wantCategory: "主密钥长度不能少于 32 字节",
		},
		{
			name:         "新主密钥不足 32 字节",
			db:           newMasterKeyRotationTestDB,
			oldKey:       validOldKey,
			newKey:       strings.Repeat("b", 31),
			wantCategory: "主密钥长度不能少于 32 字节",
		},
		{
			name:         "新旧主密钥完全相同",
			db:           newMasterKeyRotationTestDB,
			oldKey:       validOldKey,
			newKey:       validOldKey,
			wantCategory: "新旧主密钥不能使用相同的 AES-256 密钥材料",
		},
		{
			name:         "新旧主密钥前 32 字节相同",
			db:           newMasterKeyRotationTestDB,
			oldKey:       sharedMaterial + "-旧",
			newKey:       sharedMaterial + "-新",
			wantCategory: "新旧主密钥不能使用相同的 AES-256 密钥材料",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ReencryptDatabaseSecrets(t.Context(), tt.db(t), tt.oldKey, tt.newKey)
			if err == nil || !strings.Contains(err.Error(), tt.wantCategory) {
				t.Fatalf("应返回 %q 错误，实际为 %v", tt.wantCategory, err)
			}
			if result != (MasterKeyRotationResult{}) {
				t.Fatalf("无效输入结果必须为零值，实际为 %#v", result)
			}
			for _, sensitive := range []string{tt.oldKey, tt.newKey} {
				if sensitive != "" && strings.Contains(err.Error(), sensitive) {
					t.Fatal("错误不得包含主密钥材料")
				}
			}
		})
	}
}

func TestReencryptDatabaseSecretsAcceptsEmptyTable(t *testing.T) {
	db := newMasterKeyRotationTestDB(t)
	result, err := ReencryptDatabaseSecrets(
		t.Context(),
		db,
		masterKeyRotationTestKey("a", "-旧"),
		masterKeyRotationTestKey("b", "-新"),
	)
	if err != nil {
		t.Fatalf("空表轮换不应失败: %v", err)
	}
	if result.Rotated != 0 {
		t.Fatalf("空表不应更新记录，实际为 %d", result.Rotated)
	}
}

func TestReencryptDatabaseSecretsRollsBackOnUnexpectedRowsAffected(t *testing.T) {
	db := newMasterKeyRotationTestDB(t)
	oldKey := masterKeyRotationTestKey("a", "-旧")
	newKey := masterKeyRotationTestKey("b", "-新")
	seedEncryptedSecrets(t, db, oldKey, []model.Secret{
		{Name: "first", Type: model.SecretTypeCustom, IsActive: true},
		{Name: "second", Type: model.SecretTypeCustom, IsActive: false},
	})
	before := loadSecretCiphertexts(t, db)
	secondID := loadSecretIDByName(t, db, "second")

	const callbackName = "test:force_master_key_rotation_rows_affected"
	updates := 0
	if err := db.Callback().Update().After("gorm:update").Register(callbackName, func(tx *gorm.DB) {
		if tx.Statement.Schema == nil || tx.Statement.Schema.Table != (model.Secret{}).TableName() {
			return
		}
		updates++
		if updates == 2 {
			tx.RowsAffected = 0
		}
	}); err != nil {
		t.Fatalf("注册更新行数异常回调失败: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Callback().Update().Remove(callbackName)
	})

	result, err := ReencryptDatabaseSecrets(t.Context(), db, oldKey, newKey)
	if err == nil {
		t.Fatal("更新行数异常必须使轮换失败")
	}
	if result != (MasterKeyRotationResult{}) {
		t.Fatalf("更新行数异常结果必须为零值，实际为 %#v", result)
	}
	assertRotationError(t, err, secondID, "更新行数异常", oldKey, newKey, before[secondID], "test-value-second")
	after := loadSecretCiphertexts(t, db)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("更新行数异常后全部密文必须回滚")
	}
}

func TestReencryptDatabaseSecretsRedactsTransactionBoundaryErrors(t *testing.T) {
	sensitiveMarker := "user:password@tcp(database.internal:3306)/unisearch"
	tests := []struct {
		name string
		db   func(t *testing.T, injectedErr error) *gorm.DB
	}{
		{name: "事务开始失败", db: newMasterKeyRotationBeginErrorDB},
		{name: "事务提交失败", db: newMasterKeyRotationCommitErrorDB},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			injectedErr := errors.New("事务边界错误: " + sensitiveMarker)
			db := tt.db(t, injectedErr)
			result, err := ReencryptDatabaseSecrets(
				t.Context(),
				db,
				masterKeyRotationTestKey("a", "-旧"),
				masterKeyRotationTestKey("b", "-新"),
			)
			if err == nil || !strings.Contains(err.Error(), "数据库密钥重加密事务失败") {
				t.Fatalf("事务边界错误必须返回固定类别，实际为 %v", err)
			}
			if strings.Contains(err.Error(), sensitiveMarker) {
				t.Fatal("事务边界错误不得包含底层敏感信息")
			}
			if result != (MasterKeyRotationResult{}) {
				t.Fatalf("事务边界失败结果必须为零值，实际为 %#v", result)
			}
		})
	}
}

type masterKeyRotationBoundaryPool struct {
	gorm.ConnPool
	beginErr  error
	commitErr error
}

func (p *masterKeyRotationBoundaryPool) BeginTx(ctx context.Context, opts *sql.TxOptions) (gorm.ConnPool, error) {
	if p.beginErr != nil {
		return nil, p.beginErr
	}
	beginner, ok := p.ConnPool.(gorm.TxBeginner)
	if !ok {
		return nil, errors.New("测试连接不支持事务")
	}
	tx, err := beginner.BeginTx(ctx, opts)
	if err != nil {
		return nil, err
	}
	return &masterKeyRotationCommitErrorTx{
		ConnPool:  tx,
		committer: tx,
		commitErr: p.commitErr,
	}, nil
}

type masterKeyRotationCommitErrorTx struct {
	gorm.ConnPool
	committer gorm.TxCommitter
	commitErr error
}

func (tx *masterKeyRotationCommitErrorTx) Commit() error {
	return tx.commitErr
}

func (tx *masterKeyRotationCommitErrorTx) Rollback() error {
	return tx.committer.Rollback()
}

func newMasterKeyRotationBeginErrorDB(t *testing.T, injectedErr error) *gorm.DB {
	t.Helper()
	return newMasterKeyRotationBoundaryDB(t, injectedErr, nil)
}

func newMasterKeyRotationCommitErrorDB(t *testing.T, injectedErr error) *gorm.DB {
	t.Helper()
	return newMasterKeyRotationBoundaryDB(t, nil, injectedErr)
}

func newMasterKeyRotationBoundaryDB(t *testing.T, beginErr error, commitErr error) *gorm.DB {
	t.Helper()
	db := newMasterKeyRotationTestDB(t).Session(&gorm.Session{NewDB: true})
	db.Statement.ConnPool = &masterKeyRotationBoundaryPool{
		ConnPool:  db.Statement.ConnPool,
		beginErr:  beginErr,
		commitErr: commitErr,
	}
	return db
}

func newMasterKeyRotationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("打开 SQLite 测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.Secret{}); err != nil {
		t.Fatalf("迁移密钥表失败: %v", err)
	}
	return db
}

func seedEncryptedSecrets(t *testing.T, db *gorm.DB, masterKey string, secrets []model.Secret) {
	t.Helper()
	manager := NewBaseSecretManager(masterKey, 0)
	for index := range secrets {
		value, err := manager.EncryptSecret("test-value-" + secrets[index].Name)
		if err != nil {
			t.Fatalf("加密测试密钥失败: %v", err)
		}
		secrets[index].Value = value
		if err := db.Create(&secrets[index]).Error; err != nil {
			t.Fatalf("写入测试密钥失败: %v", err)
		}
	}
}

func loadSecretCiphertexts(t *testing.T, db *gorm.DB) map[uint]string {
	t.Helper()
	var secrets []model.Secret
	if err := db.Order("id ASC").Find(&secrets).Error; err != nil {
		t.Fatalf("读取测试密文失败: %v", err)
	}
	values := make(map[uint]string, len(secrets))
	for _, secret := range secrets {
		values[secret.ID] = secret.Value
	}
	return values
}

func loadSecretIDByName(t *testing.T, db *gorm.DB, name string) uint {
	t.Helper()
	var secret model.Secret
	if err := db.Select("id").Where("name = ?", name).First(&secret).Error; err != nil {
		t.Fatalf("读取密钥记录 ID 失败: %v", err)
	}
	return secret.ID
}

func assertSecretsUseOnlyMasterKey(t *testing.T, db *gorm.DB, acceptedKey, rejectedKey string) {
	t.Helper()
	accepted := NewBaseSecretManager(acceptedKey, 0)
	rejected := NewBaseSecretManager(rejectedKey, 0)
	var secrets []model.Secret
	if err := db.Order("id ASC").Find(&secrets).Error; err != nil {
		t.Fatalf("读取轮换结果失败: %v", err)
	}
	for _, secret := range secrets {
		plaintext, err := accepted.DecryptSecret(secret.Value)
		if err != nil {
			t.Fatalf("新主密钥不能解密记录 %d: %v", secret.ID, err)
		}
		if plaintext != "test-value-"+secret.Name {
			t.Fatalf("记录 %d 解密后的内容不符", secret.ID)
		}
		if _, err := rejected.DecryptSecret(secret.Value); err == nil {
			t.Fatalf("旧主密钥仍能解密记录 %d", secret.ID)
		}
	}
}

func assertRotationError(t *testing.T, err error, recordID uint, category string, sensitiveValues ...string) {
	t.Helper()
	message := err.Error()
	if !strings.Contains(message, category) || !strings.Contains(message, "密钥记录 "+strconv.FormatUint(uint64(recordID), 10)) {
		t.Fatalf("错误必须包含记录 ID 和类别，实际为 %v", err)
	}
	for _, sensitive := range sensitiveValues {
		if sensitive != "" && strings.Contains(message, sensitive) {
			t.Fatal("错误包含了敏感测试材料")
		}
	}
}

func masterKeyRotationTestKey(character string, suffix string) string {
	return strings.Repeat(character, 32) + suffix
}
