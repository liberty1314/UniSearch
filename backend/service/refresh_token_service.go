package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"os"
	"sync"
	"time"

	"gorm.io/gorm"
	"unisearch/model"
)

// StorageType 存储类型
type StorageType string

const (
	StorageTypeFile     StorageType = "file"     // 文件存储
	StorageTypeDatabase StorageType = "database" // 数据库存储
)

// RefreshTokenService 刷新令牌服务
type RefreshTokenService struct {
	storageType StorageType                    // 存储类型
	db          *gorm.DB                       // 数据库连接（数据库模式）
	tokens      map[string]*model.RefreshToken // token -> RefreshToken（文件模式）
	mu          sync.RWMutex                   // 互斥锁（文件模式）
	storePath   string                         // 存储路径（文件模式）
	encryptKey  []byte                         // AES-256 密钥（32字节）
}

// NewRefreshTokenService 创建刷新令牌服务实例
// storageType: 存储类型（file 或 database）
// db: 数据库连接（数据库模式必需）
// storePath: 文件存储路径（文件模式必需）
// encryptKey: 加密密钥
func NewRefreshTokenService(storageType StorageType, db *gorm.DB, storePath string, encryptKey string) (*RefreshTokenService, error) {
	// 确保加密密钥为 32 字节（AES-256）
	key := []byte(encryptKey)
	if len(key) < 32 {
		// 填充到 32 字节
		paddedKey := make([]byte, 32)
		copy(paddedKey, key)
		key = paddedKey
	} else if len(key) > 32 {
		key = key[:32]
	}

	service := &RefreshTokenService{
		storageType: storageType,
		db:          db,
		tokens:      make(map[string]*model.RefreshToken),
		storePath:   storePath,
		encryptKey:  key,
	}

	// 根据存储类型初始化
	if storageType == StorageTypeDatabase {
		if db == nil {
			return nil, errors.New("数据库模式需要提供数据库连接")
		}
		// 数据库模式：启动定期清理
		go service.cleanupExpiredTokensDB()
	} else {
		// 文件模式：加载已有令牌并启动定期清理
		if err := service.load(); err != nil {
			return nil, err
		}
		go service.cleanupExpiredTokens()
	}

	return service, nil
}

// CreateToken 创建新的刷新令牌
func (s *RefreshTokenService) CreateToken(username string, isAdmin bool, deviceFingerprint string, ttl time.Duration) (*model.RefreshToken, error) {
	// 生成令牌字符串
	tokenStr, err := model.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	// 创建令牌对象
	now := time.Now()
	token := &model.RefreshToken{
		Token:             tokenStr,
		Username:          username,
		IsAdmin:           isAdmin,
		DeviceFingerprint: deviceFingerprint,
		CreatedAt:         now,
		ExpiresAt:         now.Add(ttl),
		LastUsedAt:        nil,
		IsRevoked:         false,
	}

	// 根据存储类型保存
	if s.storageType == StorageTypeDatabase {
		// 数据库模式：直接保存到数据库
		if err := s.db.Create(token).Error; err != nil {
			return nil, err
		}
	} else {
		// 文件模式：保存到内存并持久化
		s.mu.Lock()
		s.tokens[tokenStr] = token
		err := s.save()
		s.mu.Unlock()
		if err != nil {
			return nil, err
		}
	}

	return token, nil
}

// ValidateToken 验证刷新令牌
func (s *RefreshTokenService) ValidateToken(tokenStr string, deviceFingerprint string) (*model.RefreshToken, error) {
	var token *model.RefreshToken
	var err error

	// 根据存储类型查询
	if s.storageType == StorageTypeDatabase {
		// 数据库模式：从数据库查询
		token = &model.RefreshToken{}
		err = s.db.Where("token = ?", tokenStr).First(token).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("令牌不存在")
			}
			return nil, err
		}
	} else {
		// 文件模式：从内存查询
		s.mu.RLock()
		var exists bool
		token, exists = s.tokens[tokenStr]
		s.mu.RUnlock()
		if !exists {
			return nil, errors.New("令牌不存在")
		}
	}

	// 检查令牌是否有效
	if !token.IsValid() {
		return nil, errors.New("令牌已失效")
	}

	// 验证设备指纹
	if token.DeviceFingerprint != deviceFingerprint {
		return nil, errors.New("设备指纹不匹配")
	}

	// 更新最后使用时间
	now := time.Now()
	token.LastUsedAt = &now

	// 根据存储类型更新
	if s.storageType == StorageTypeDatabase {
		// 数据库模式：更新数据库
		if err := s.db.Model(token).Update("last_used_at", now).Error; err != nil {
			return nil, err
		}
	} else {
		// 文件模式：持久化
		s.mu.Lock()
		err := s.save()
		s.mu.Unlock()
		if err != nil {
			return nil, err
		}
	}

	return token, nil
}

// RevokeToken 撤销刷新令牌
func (s *RefreshTokenService) RevokeToken(tokenStr string) error {
	if s.storageType == StorageTypeDatabase {
		// 数据库模式：更新数据库
		result := s.db.Model(&model.RefreshToken{}).
			Where("token = ?", tokenStr).
			Update("is_revoked", true)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("令牌不存在")
		}
		return nil
	}

	// 文件模式：更新内存并持久化
	s.mu.Lock()
	defer s.mu.Unlock()

	token, exists := s.tokens[tokenStr]
	if !exists {
		return errors.New("令牌不存在")
	}

	token.IsRevoked = true
	return s.save()
}

// RevokeUserTokens 撤销用户的所有刷新令牌
func (s *RefreshTokenService) RevokeUserTokens(username string) error {
	if s.storageType == StorageTypeDatabase {
		// 数据库模式：批量更新
		return s.db.Model(&model.RefreshToken{}).
			Where("username = ?", username).
			Update("is_revoked", true).Error
	}

	// 文件模式：遍历更新
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, token := range s.tokens {
		if token.Username == username {
			token.IsRevoked = true
		}
	}

	return s.save()
}

// cleanupExpiredTokens 定期清理过期令牌（文件模式）
func (s *RefreshTokenService) cleanupExpiredTokens() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		s.mu.Lock()
		for tokenStr, token := range s.tokens {
			if token.IsExpired() || token.IsRevoked {
				delete(s.tokens, tokenStr)
			}
		}
		_ = s.save()
		s.mu.Unlock()
	}
}

// cleanupExpiredTokensDB 定期清理过期令牌（数据库模式）
func (s *RefreshTokenService) cleanupExpiredTokensDB() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		// 删除过期或已撤销的令牌
		s.db.Where("expires_at < ? OR is_revoked = ?", time.Now(), true).
			Delete(&model.RefreshToken{})
	}
}

// save 持久化令牌到磁盘（加密存储）- 仅文件模式
func (s *RefreshTokenService) save() error {
	// 序列化
	data, err := json.Marshal(s.tokens)
	if err != nil {
		return err
	}

	// 加密
	encryptedData, err := s.encrypt(data)
	if err != nil {
		return err
	}

	// 写入文件
	return os.WriteFile(s.storePath, encryptedData, 0600)
}

// load 从磁盘加载令牌（解密）- 仅文件模式
func (s *RefreshTokenService) load() error {
	// 检查文件是否存在
	if _, err := os.Stat(s.storePath); os.IsNotExist(err) {
		return nil // 文件不存在，跳过加载
	}

	// 读取文件
	encryptedData, err := os.ReadFile(s.storePath)
	if err != nil {
		return err
	}

	// 解密
	data, err := s.decrypt(encryptedData)
	if err != nil {
		return err
	}

	// 反序列化
	return json.Unmarshal(data, &s.tokens)
}

// encrypt 使用 AES-256-GCM 加密数据
func (s *RefreshTokenService) encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// 生成随机 nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// 加密并附加 nonce
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// decrypt 使用 AES-256-GCM 解密数据
func (s *RefreshTokenService) decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("密文太短")
	}

	// 提取 nonce 和密文
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// 解密
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// EncryptForClient 为客户端加密刷新令牌（Base64编码）
func (s *RefreshTokenService) EncryptForClient(token string) (string, error) {
	encrypted, err := s.encrypt([]byte(token))
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

// DecryptFromClient 解密客户端发送的刷新令牌
func (s *RefreshTokenService) DecryptFromClient(encryptedToken string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedToken)
	if err != nil {
		return "", err
	}

	plaintext, err := s.decrypt(ciphertext)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
