package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"pansou/model"
	"sync"
	"time"
)

// APIKeyService API密钥管理服务
type APIKeyService struct {
	storePath string                  // 存储文件路径
	keys      map[string]*model.APIKey // 密钥映射表
	mu        sync.RWMutex             // 读写锁
}

// NewAPIKeyService 创建API密钥服务实例
func NewAPIKeyService(storePath string) (*APIKeyService, error) {
	service := &APIKeyService{
		storePath: storePath,
		keys:      make(map[string]*model.APIKey),
	}
	
	// 从文件加载现有密钥
	if err := service.load(); err != nil {
		return nil, fmt.Errorf("加载密钥失败: %w", err)
	}
	
	return service, nil
}

// GenerateKey 生成新的API密钥
// ttl: 密钥有效期
// description: 密钥描述信息
func (s *APIKeyService) GenerateKey(ttl time.Duration, description string) (*model.APIKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 使用 crypto/rand 生成 20 字节随机数
	randomBytes := make([]byte, 20)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, fmt.Errorf("生成随机数失败: %w", err)
	}
	
	// 转换为 40 位十六进制字符串并添加 sk- 前缀
	key := "sk-" + hex.EncodeToString(randomBytes)
	
	// 创建 API Key 对象
	now := time.Now()
	apiKey := &model.APIKey{
		Key:         key,
		CreatedAt:   now,
		ExpiresAt:   now.Add(ttl),
		IsEnabled:   true,
		Description: description,
	}
	
	// 存储到内存映射
	s.keys[key] = apiKey
	
	// 持久化到文件
	if err := s.save(); err != nil {
		// 如果保存失败，回滚内存操作
		delete(s.keys, key)
		return nil, fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return apiKey, nil
}

// ValidateKey 验证API密钥
// 检查密钥是否存在、已启用且未过期
func (s *APIKeyService) ValidateKey(key string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	// 检查密钥是否存在
	apiKey, exists := s.keys[key]
	if !exists {
		return false, nil
	}
	
	// 使用 APIKey 的 IsValid 方法检查是否有效（已启用且未过期）
	return apiKey.IsValid(), nil
}

// RevokeKey 撤销API密钥
// 从存储中删除指定密钥
func (s *APIKeyService) RevokeKey(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 检查密钥是否存在
	if _, exists := s.keys[key]; !exists {
		return errors.New("密钥不存在")
	}
	
	// 从内存中删除
	delete(s.keys, key)
	
	// 持久化到文件
	if err := s.save(); err != nil {
		return fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return nil
}

// ListKeys 列出所有API密钥
func (s *APIKeyService) ListKeys() ([]*model.APIKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	// 将 map 转换为切片
	keys := make([]*model.APIKey, 0, len(s.keys))
	for _, key := range s.keys {
		keys = append(keys, key)
	}
	
	return keys, nil
}

// GetKey 获取指定密钥信息
func (s *APIKeyService) GetKey(key string) (*model.APIKey, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	apiKey, exists := s.keys[key]
	if !exists {
		return nil, errors.New("密钥不存在")
	}
	
	return apiKey, nil
}

// load 从文件加载密钥数据
func (s *APIKeyService) load() error {
	// 检查文件是否存在
	if _, err := os.Stat(s.storePath); os.IsNotExist(err) {
		// 文件不存在，创建空数组
		s.keys = make(map[string]*model.APIKey)
		return nil
	}
	
	// 读取文件内容
	data, err := os.ReadFile(s.storePath)
	if err != nil {
		return fmt.Errorf("读取文件失败: %w", err)
	}
	
	// 如果文件为空，初始化为空 map
	if len(data) == 0 {
		s.keys = make(map[string]*model.APIKey)
		return nil
	}
	
	// 解析 JSON 数组
	var keyList []*model.APIKey
	if err := json.Unmarshal(data, &keyList); err != nil {
		return fmt.Errorf("解析JSON失败: %w", err)
	}
	
	// 转换为 map
	s.keys = make(map[string]*model.APIKey)
	for _, key := range keyList {
		s.keys[key.Key] = key
	}
	
	return nil
}

// save 保存密钥数据到文件
// 注意：调用此方法前必须已经持有写锁
func (s *APIKeyService) save() error {
	// 将 map 转换为切片
	keyList := make([]*model.APIKey, 0, len(s.keys))
	for _, key := range s.keys {
		keyList = append(keyList, key)
	}
	
	// 序列化为 JSON
	data, err := json.MarshalIndent(keyList, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化JSON失败: %w", err)
	}
	
	// 写入文件
	if err := os.WriteFile(s.storePath, data, 0600); err != nil {
		return fmt.Errorf("写入文件失败: %w", err)
	}
	
	return nil
}
