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
	ttlHours := int(ttl.Hours())
	apiKey := &model.APIKey{
		Key:         key,
		CreatedAt:   now,
		FirstUsedAt: nil, // 初始为 nil，表示未使用
		ExpiresAt:   now.Add(ttl), // 临时设置，实际会在首次使用时重新计算
		TTLHours:    ttlHours,
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
// 如果是首次使用，会自动激活密钥并从当前时间开始计算有效期
func (s *APIKeyService) ValidateKey(key string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 检查密钥是否存在
	apiKey, exists := s.keys[key]
	if !exists {
		return false, nil
	}
	
	// 检查密钥是否有效
	if !apiKey.IsValid() {
		return false, nil
	}
	
	// 如果是首次使用，激活密钥
	if apiKey.ActivateIfNeeded() {
		// 持久化到文件
		if err := s.save(); err != nil {
			return false, fmt.Errorf("保存密钥失败: %w", err)
		}
	}
	
	return true, nil
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

// UpdateKeyExpiry 更新API密钥的过期时间
// key: 要更新的密钥
// newExpiresAt: 新的过期时间（如果不为nil）
// extendHours: 延长的小时数（如果大于0）
// 注意：newExpiresAt 和 extendHours 至少要提供一个
func (s *APIKeyService) UpdateKeyExpiry(key string, newExpiresAt *time.Time, extendHours int) (*model.APIKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	// 检查密钥是否存在
	apiKey, exists := s.keys[key]
	if !exists {
		return nil, errors.New("密钥不存在")
	}
	
	// 验证参数：至少要提供一个更新方式
	if newExpiresAt == nil && extendHours <= 0 {
		return nil, errors.New("必须提供 newExpiresAt 或 extendHours")
	}
	
	// 更新过期时间
	if newExpiresAt != nil {
		apiKey.ExpiresAt = *newExpiresAt
	} else if extendHours > 0 {
		apiKey.ExpiresAt = apiKey.ExpiresAt.Add(time.Duration(extendHours) * time.Hour)
	}
	
	// 持久化到文件
	if err := s.save(); err != nil {
		return nil, fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return apiKey, nil
}

// BatchExtendKeysResult 批量延长操作的单项结果
type BatchExtendKeysResult struct {
	Key          string     `json:"key"`
	Success      bool       `json:"success"`
	Error        string     `json:"error,omitempty"`
	NewExpiresAt *time.Time `json:"new_expires_at,omitempty"`
}

// BatchExtendKeys 批量延长API密钥的有效期
// keys: 要延长的密钥列表
// extendHours: 延长的小时数
// 返回每个密钥的操作结果
func (s *APIKeyService) BatchExtendKeys(keys []string, extendHours int) ([]BatchExtendKeysResult, error) {
	if extendHours <= 0 {
		return nil, errors.New("延长小时数必须大于0")
	}
	
	// 加锁保护整个操作
	s.mu.Lock()
	defer s.mu.Unlock()
	
	results := make([]BatchExtendKeysResult, len(keys))
	
	// 顺序处理每个密钥（不使用并发，避免竞争条件）
	for i, key := range keys {
		result := BatchExtendKeysResult{
			Key: key,
		}
		
		// 检查密钥是否存在
		apiKey, exists := s.keys[key]
		if !exists {
			result.Success = false
			result.Error = "密钥不存在"
			results[i] = result
			continue
		}
		
		// 延长过期时间
		apiKey.ExpiresAt = apiKey.ExpiresAt.Add(time.Duration(extendHours) * time.Hour)
		result.Success = true
		result.NewExpiresAt = &apiKey.ExpiresAt
		results[i] = result
	}
	
	// 持久化到文件
	if err := s.save(); err != nil {
		return nil, fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return results, nil
}

// BatchGenerateKeysResult 批量生成操作的结果
type BatchGenerateKeysResult struct {
	SuccessCount int               `json:"success_count"`
	FailedCount  int               `json:"failed_count"`
	Keys         []*model.APIKey   `json:"keys"`
}

// BatchGenerateKeys 批量生成API密钥
// count: 生成数量（1-100）
// ttl: 密钥有效期
// descriptionPrefix: 描述前缀（可选）
// 使用并发处理提高性能，限制并发数为10
func (s *APIKeyService) BatchGenerateKeys(count int, ttl time.Duration, descriptionPrefix string) (*BatchGenerateKeysResult, error) {
	// 验证参数
	if count < 1 || count > 100 {
		return nil, errors.New("生成数量必须在1-100之间")
	}
	
	s.mu.Lock()
	defer s.mu.Unlock()
	
	result := &BatchGenerateKeysResult{
		Keys: make([]*model.APIKey, count),
	}
	
	// 使用并发处理，限制并发数为10
	const maxConcurrency = 10
	semaphore := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex // 保护 result 的并发访问
	
	// 生成密钥
	for i := 0; i < count; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			
			// 获取信号量
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			// 使用 crypto/rand 生成 20 字节随机数
			randomBytes := make([]byte, 20)
			if _, err := rand.Read(randomBytes); err != nil {
				mu.Lock()
				result.FailedCount++
				mu.Unlock()
				return
			}
			
			// 转换为 40 位十六进制字符串并添加 sk- 前缀
			key := "sk-" + hex.EncodeToString(randomBytes)
			
			// 生成描述
			description := descriptionPrefix
			if description != "" {
				description = fmt.Sprintf("%s%d", descriptionPrefix, index+1)
			}
			
			// 创建 API Key 对象
			now := time.Now()
			ttlHours := int(ttl.Hours())
			apiKey := &model.APIKey{
				Key:         key,
				CreatedAt:   now,
				FirstUsedAt: nil, // 初始为 nil，表示未使用
				ExpiresAt:   now.Add(ttl), // 临时设置，实际会在首次使用时重新计算
				TTLHours:    ttlHours,
				IsEnabled:   true,
				Description: description,
			}
			
			// 存储到内存映射（需要加锁）
			mu.Lock()
			s.keys[key] = apiKey
			result.Keys[index] = apiKey
			result.SuccessCount++
			mu.Unlock()
		}(i)
	}
	
	// 等待所有 goroutine 完成
	wg.Wait()
	
	// 持久化到文件
	if err := s.save(); err != nil {
		// 如果保存失败，回滚内存操作
		for _, key := range result.Keys {
			if key != nil {
				delete(s.keys, key.Key)
			}
		}
		return nil, fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return result, nil
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

// BatchDeleteKeysResult 批量删除操作的单项结果
type BatchDeleteKeysResult struct {
	Key     string `json:"key"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// BatchDeleteKeys 批量删除API密钥
// keys: 要删除的密钥列表
// 返回每个密钥的操作结果
func (s *APIKeyService) BatchDeleteKeys(keys []string) ([]BatchDeleteKeysResult, error) {
	if len(keys) == 0 {
		return nil, errors.New("密钥列表不能为空")
	}
	
	// 加锁保护整个操作
	s.mu.Lock()
	defer s.mu.Unlock()
	
	results := make([]BatchDeleteKeysResult, len(keys))
	
	// 顺序处理每个密钥（不使用并发，避免竞争条件）
	for i, key := range keys {
		result := BatchDeleteKeysResult{
			Key: key,
		}
		
		// 检查密钥是否存在
		_, exists := s.keys[key]
		if !exists {
			result.Success = false
			result.Error = "密钥不存在"
			results[i] = result
			continue
		}
		
		// 从内存中删除
		delete(s.keys, key)
		result.Success = true
		results[i] = result
	}
	
	// 持久化到文件
	if err := s.save(); err != nil {
		return nil, fmt.Errorf("保存密钥失败: %w", err)
	}
	
	return results, nil
}
