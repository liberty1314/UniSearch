package service

import (
	"errors"
	"fmt"
	"time"

	"unisearch/database"
	"unisearch/model"
	"unisearch/util"

	"gorm.io/gorm"
)

// APIKeyService API密钥管理服务（基于 MySQL 数据库）
type APIKeyService struct {
	db *gorm.DB // 数据库连接
}

// NewAPIKeyService 创建API密钥服务实例
// 使用全局数据库连接
func NewAPIKeyService() *APIKeyService {
	return &APIKeyService{
		db: database.GetDB(),
	}
}

// GenerateAPIKey 生成新的API密钥（管理员功能）
// ttlHours: 密钥有效期（小时，0表示永不过期）
// dailyLimit: 每日搜索次数限制（0表示不限制）
// description: 密钥描述信息
// 返回: 生成的 API Key 对象
// 验证需求：7.4-7.10
func (s *APIKeyService) GenerateAPIKey(ttlHours int, dailyLimit int, description string) (*model.APIKey, error) {
	// 生成唯一的 API Key
	key := util.GenerateAPIKey()

	// 检查 Key 是否已存在（理论上不应该发生，但为了安全起见）
	var existingKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&existingKey).Error; err == nil {
		// Key 已存在，重新生成
		return s.GenerateAPIKey(ttlHours, dailyLimit, description)
	}

	// 创建 API Key 对象
	now := time.Now()
	var expiresAt *time.Time
	if ttlHours > 0 {
		expTime := now.Add(time.Duration(ttlHours) * time.Hour)
		expiresAt = &expTime
	}

	apiKey := &model.APIKey{
		Key:              key,
		UserID:           nil, // 初始为 NULL，表示未绑定
		CreatedAt:        now,
		FirstUsedAt:      nil,       // 初始为 nil，表示未使用
		ExpiresAt:        expiresAt, // 如果TTL>0则设置过期时间，否则为nil表示永不过期
		TTLHours:         ttlHours,
		IsEnabled:        true,
		Description:      description,
		DailySearchLimit: dailyLimit,
		TodaySearchCount: 0,
		LastSearchDate:   "",
	}

	// 保存到数据库
	if err := s.db.Create(apiKey).Error; err != nil {
		return nil, fmt.Errorf("创建 API Key 失败: %w", err)
	}

	return apiKey, nil
}

// BindAPIKey 绑定 API Key 到用户
// userID: 用户 ID
// key: 要绑定的 API Key
// 验证需求：6.4-6.7
func (s *APIKeyService) BindAPIKey(userID uint, key string) error {
	// 查询 API Key
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("API Key 不存在")
		}
		return fmt.Errorf("查询 API Key 失败: %w", err)
	}

	// 检查 API Key 是否已被绑定
	if apiKey.UserID != nil {
		return errors.New("API Key 已被绑定")
	}

	// 更新 user_id 字段
	apiKey.UserID = &userID
	if err := s.db.Save(&apiKey).Error; err != nil {
		return fmt.Errorf("绑定 API Key 失败: %w", err)
	}

	return nil
}

// GetUserAPIKey 获取用户绑定的 API Key
// userID: 用户 ID
// 返回: 用户绑定的 API Key，如果未绑定则返回错误
// 验证需求：8.3-8.5
func (s *APIKeyService) GetUserAPIKey(userID uint) (*model.APIKey, error) {
	var apiKey model.APIKey
	if err := s.db.Where("user_id = ?", userID).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("未绑定 API Key")
		}
		return nil, fmt.Errorf("查询用户 API Key 失败: %w", err)
	}

	return &apiKey, nil
}

// ValidateAPIKey 验证 API Key 有效性
// key: 要验证的 API Key
// 返回: API Key 对象（如果有效），否则返回错误
// 验证需求：9.5
func (s *APIKeyService) ValidateAPIKey(key string) (*model.APIKey, error) {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("API Key 不存在")
		}
		return nil, fmt.Errorf("查询 API Key 失败: %w", err)
	}

	// 检查 API Key 是否有效（is_enabled=true 且未过期）
	if !apiKey.IsValid() {
		return nil, errors.New("API Key 无效或已过期")
	}

	return &apiKey, nil
}

// UpdateAPIKeyUsage 更新 API Key 使用统计
// key: API Key
// 更新 first_used_at（如果是首次使用）、today_search_count、last_search_date
// 验证需求：9.6, 9.7
func (s *APIKeyService) UpdateAPIKeyUsage(key string) error {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		return fmt.Errorf("查询 API Key 失败: %w", err)
	}

	// 如果是首次使用，更新 first_used_at
	if apiKey.FirstUsedAt == nil {
		now := time.Now()
		apiKey.FirstUsedAt = &now
	}

	// 检查并重置每日计数
	if err := s.CheckAndResetDailyCount(&apiKey); err != nil {
		return err
	}

	// 增加搜索计数
	if !apiKey.IncrementSearchCount() {
		return errors.New("今日搜索次数已达上限")
	}

	// 保存到数据库
	if err := s.db.Save(&apiKey).Error; err != nil {
		return fmt.Errorf("更新 API Key 使用统计失败: %w", err)
	}

	return nil
}

// CheckAndResetDailyCount 检查并重置每日搜索计数
// apiKey: API Key 对象
// 如果 last_search_date 不是今天，则重置 today_search_count 为 0
// 验证需求：9.9
func (s *APIKeyService) CheckAndResetDailyCount(apiKey *model.APIKey) error {
	today := time.Now().Format("2006-01-02")

	// 如果是新的一天，重置计数
	if apiKey.LastSearchDate != today {
		apiKey.LastSearchDate = today
		apiKey.TodaySearchCount = 0
	}

	return nil
}

// ListAPIKeys 列出所有 API Keys（管理员功能，支持分页）
// page: 页码（从 1 开始）
// pageSize: 每页数量
// 返回: API Key 列表和总数
// 验证需求：管理员接口
func (s *APIKeyService) ListAPIKeys(page, pageSize int) ([]model.APIKey, int64, error) {
	var keys []model.APIKey
	var total int64

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 查询总数
	if err := s.db.Model(&model.APIKey{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("查询 API Key 总数失败: %w", err)
	}

	// 查询分页数据
	if err := s.db.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, 0, fmt.Errorf("查询 API Key 列表失败: %w", err)
	}

	return keys, total, nil
}

// DeleteAPIKey 删除 API Key（管理员功能）
// id: API Key ID
// 验证需求：管理员接口
func (s *APIKeyService) DeleteAPIKey(id uint) error {
	// 软删除
	if err := s.db.Delete(&model.APIKey{}, id).Error; err != nil {
		return fmt.Errorf("删除 API Key 失败: %w", err)
	}

	return nil
}

// UpdateAPIKeyStatus 更新 API Key 状态（管理员功能）
// id: API Key ID
// isEnabled: 是否启用
// 验证需求：管理员接口
func (s *APIKeyService) UpdateAPIKeyStatus(id uint, isEnabled bool) error {
	// 更新 is_enabled 字段
	if err := s.db.Model(&model.APIKey{}).Where("id = ?", id).Update("is_enabled", isEnabled).Error; err != nil {
		return fmt.Errorf("更新 API Key 状态失败: %w", err)
	}

	return nil
}

// ============================================================================
// 以下是为了兼容旧代码而保留的方法
// ============================================================================

// ValidateKey 验证API密钥（兼容旧接口）
// 检查密钥是否存在、已启用且未过期
// 如果是首次使用，会自动激活密钥并从当前时间开始计算有效期
func (s *APIKeyService) ValidateKey(key string) (bool, error) {
	apiKey, err := s.ValidateAPIKey(key)
	if err != nil {
		return false, nil
	}

	// 如果是首次使用，激活密钥
	if apiKey.FirstUsedAt == nil {
		now := time.Now()
		apiKey.FirstUsedAt = &now

		// 保存到数据库
		if err := s.db.Save(apiKey).Error; err != nil {
			return false, fmt.Errorf("保存密钥失败: %w", err)
		}
	}

	return true, nil
}

// GetKey 获取指定密钥信息（兼容旧接口）
func (s *APIKeyService) GetKey(key string) (*model.APIKey, error) {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("密钥不存在")
		}
		return nil, fmt.Errorf("查询 API Key 失败: %w", err)
	}

	return &apiKey, nil
}

// IncrementSearchCount 增加搜索计数（兼容旧接口）
// 返回是否成功（如果超过限制则返回false）
func (s *APIKeyService) IncrementSearchCount(key string) (bool, error) {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		return false, errors.New("密钥不存在")
	}

	// 检查并重置每日计数
	if err := s.CheckAndResetDailyCount(&apiKey); err != nil {
		return false, err
	}

	// 增加搜索计数
	if !apiKey.IncrementSearchCount() {
		return false, nil
	}

	// 保存到数据库
	if err := s.db.Save(&apiKey).Error; err != nil {
		return false, fmt.Errorf("保存密钥失败: %w", err)
	}

	return true, nil
}

// GetRemainingSearches 获取剩余搜索次数（兼容旧接口）
func (s *APIKeyService) GetRemainingSearches(key string) (int, error) {
	apiKey, err := s.GetKey(key)
	if err != nil {
		return 0, err
	}

	return apiKey.GetRemainingSearches(), nil
}

// CanSearch 检查是否可以搜索（兼容旧接口）
func (s *APIKeyService) CanSearch(key string) (bool, error) {
	apiKey, err := s.GetKey(key)
	if err != nil {
		return false, err
	}

	return apiKey.CanSearch(), nil
}

// ============================================================================
// 以下是为了兼容旧的 admin_handler.go 而添加的方法
// ============================================================================

// ListKeys 列出所有密钥（兼容旧接口）
func (s *APIKeyService) ListKeys() ([]model.APIKey, error) {
	var keys []model.APIKey
	if err := s.db.Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, fmt.Errorf("查询 API Key 列表失败: %w", err)
	}
	return keys, nil
}

// GenerateKey 生成新密钥（兼容旧接口）
func (s *APIKeyService) GenerateKey(ttlHours int, description string, dailyLimit int) (*model.APIKey, error) {
	return s.GenerateAPIKey(ttlHours, dailyLimit, description)
}

// RevokeKey 撤销（删除）密钥（兼容旧接口）
func (s *APIKeyService) RevokeKey(key string) error {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("密钥不存在")
		}
		return fmt.Errorf("查询 API Key 失败: %w", err)
	}
	
	// 软删除
	if err := s.db.Delete(&apiKey).Error; err != nil {
		return fmt.Errorf("删除 API Key 失败: %w", err)
	}
	
	return nil
}

// UpdateKeyExpiry 更新密钥过期时间（兼容旧接口）
func (s *APIKeyService) UpdateKeyExpiry(key string, expiresAt *time.Time, extendHours int, dailyLimit int) (*model.APIKey, error) {
	var apiKey model.APIKey
	if err := s.db.Where("api_key = ?", key).First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("密钥不存在")
		}
		return nil, fmt.Errorf("查询 API Key 失败: %w", err)
	}
	
	// 更新过期时间
	if expiresAt != nil {
		apiKey.ExpiresAt = expiresAt
	} else if extendHours > 0 {
		// 如果提供了延长小时数
		now := time.Now()
		if apiKey.ExpiresAt != nil && apiKey.ExpiresAt.After(now) {
			// 如果当前有过期时间且未过期，在原基础上延长
			newExpiry := apiKey.ExpiresAt.Add(time.Duration(extendHours) * time.Hour)
			apiKey.ExpiresAt = &newExpiry
		} else {
			// 否则从现在开始计算
			newExpiry := now.Add(time.Duration(extendHours) * time.Hour)
			apiKey.ExpiresAt = &newExpiry
		}
		apiKey.TTLHours = extendHours
	}
	
	// 更新每日限额
	if dailyLimit >= 0 {
		apiKey.DailySearchLimit = dailyLimit
	}
	
	// 保存到数据库
	if err := s.db.Save(&apiKey).Error; err != nil {
		return nil, fmt.Errorf("更新 API Key 失败: %w", err)
	}
	
	return &apiKey, nil
}

// BatchExtendKeysResult 批量延长结果
type BatchExtendKeysResult struct {
	Success []string `json:"success"`
	Failed  []string `json:"failed"`
}

// BatchExtendKeys 批量延长密钥有效期（兼容旧接口）
func (s *APIKeyService) BatchExtendKeys(keys []string, extendHours int) (*BatchExtendKeysResult, error) {
	result := &BatchExtendKeysResult{
		Success: []string{},
		Failed:  []string{},
	}
	
	for _, key := range keys {
		_, err := s.UpdateKeyExpiry(key, nil, extendHours, -1)
		if err != nil {
			result.Failed = append(result.Failed, key)
		} else {
			result.Success = append(result.Success, key)
		}
	}
	
	return result, nil
}

// BatchGenerateKeysResult 批量生成结果
type BatchGenerateKeysResult struct {
	Keys  []model.APIKey `json:"keys"`
	Count int            `json:"count"`
}

// BatchGenerateKeys 批量生成密钥（兼容旧接口）
func (s *APIKeyService) BatchGenerateKeys(count int, ttlHours int, descriptionPrefix string, dailyLimit int) (*BatchGenerateKeysResult, error) {
	result := &BatchGenerateKeysResult{
		Keys:  []model.APIKey{},
		Count: 0,
	}
	
	for i := 0; i < count; i++ {
		description := fmt.Sprintf("%s-%d", descriptionPrefix, i+1)
		apiKey, err := s.GenerateAPIKey(ttlHours, dailyLimit, description)
		if err != nil {
			return nil, fmt.Errorf("生成第 %d 个密钥失败: %w", i+1, err)
		}
		result.Keys = append(result.Keys, *apiKey)
		result.Count++
	}
	
	return result, nil
}

// BatchDeleteKeysResult 批量删除结果
type BatchDeleteKeysResult struct {
	Success []string `json:"success"`
	Failed  []string `json:"failed"`
}

// BatchDeleteKeys 批量删除密钥（兼容旧接口）
func (s *APIKeyService) BatchDeleteKeys(keys []string) (*BatchDeleteKeysResult, error) {
	result := &BatchDeleteKeysResult{
		Success: []string{},
		Failed:  []string{},
	}
	
	for _, key := range keys {
		err := s.RevokeKey(key)
		if err != nil {
			result.Failed = append(result.Failed, key)
		} else {
			result.Success = append(result.Success, key)
		}
	}
	
	return result, nil
}

// UpdateAPIKey 更新 API Key 信息
// apiKey: 要更新的 API Key 对象
// 用于更新 user_id、expires_at 等字段
func (s *APIKeyService) UpdateAPIKey(apiKey *model.APIKey) error {
	if err := s.db.Save(apiKey).Error; err != nil {
		return fmt.Errorf("更新 API Key 失败: %w", err)
	}
	return nil
}

