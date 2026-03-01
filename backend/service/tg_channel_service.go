package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"unisearch/config"
	"unisearch/model"

	"gorm.io/gorm"
)

// TGChannelService Telegram 频道管理服务
type TGChannelService struct {
	db *gorm.DB
}

// NewTGChannelService 创建 TG 频道服务实例
func NewTGChannelService(db *gorm.DB) *TGChannelService {
	return &TGChannelService{db: db}
}

// GetAllChannels 获取所有频道（包括禁用的），按 sort_order 排序
func (s *TGChannelService) GetAllChannels() ([]model.TGChannel, error) {
	var channels []model.TGChannel
	err := s.db.Order("sort_order ASC, id ASC").Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("获取频道列表失败: %w", err)
	}
	return channels, nil
}

// GetChannelByID 按 ID 获取单个频道
func (s *TGChannelService) GetChannelByID(id uint) (*model.TGChannel, error) {
	var channel model.TGChannel
	if err := s.db.First(&channel, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("频道不存在 (ID: %d)", id)
		}
		return nil, fmt.Errorf("查询频道失败: %w", err)
	}
	return &channel, nil
}

// GetEnabledChannels 获取已启用的频道名称列表，按 sort_order 排序
func (s *TGChannelService) GetEnabledChannels() ([]string, error) {
	var channels []model.TGChannel
	err := s.db.Where("is_enabled = ?", true).Order("sort_order ASC, id ASC").Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("获取启用频道列表失败: %w", err)
	}

	// 如果数据库中没有频道记录，回退到环境变量配置
	if len(channels) == 0 {
		return config.AppConfig.DefaultChannels, nil
	}

	names := make([]string, 0, len(channels))
	for _, ch := range channels {
		names = append(names, ch.Name)
	}
	return names, nil
}

// GetEnabledChannelModels 获取已启用的频道模型列表
func (s *TGChannelService) GetEnabledChannelModels() ([]model.TGChannel, error) {
	var channels []model.TGChannel
	err := s.db.Where("is_enabled = ?", true).Order("sort_order ASC, id ASC").Find(&channels).Error
	if err != nil {
		return nil, fmt.Errorf("获取启用频道列表失败: %w", err)
	}
	return channels, nil
}

// AddChannel 添加新频道
func (s *TGChannelService) AddChannel(name string) (*model.TGChannel, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("频道名称不能为空")
	}

	// 检查是否已存在
	var existing model.TGChannel
	err := s.db.Where("name = ?", name).First(&existing).Error
	if err == nil {
		return nil, fmt.Errorf("频道 '%s' 已存在", name)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("检查频道是否存在失败: %w", err)
	}

	// 获取当前最大排序值
	var maxOrder int
	s.db.Model(&model.TGChannel{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)

	channel := &model.TGChannel{
		Name:      name,
		IsEnabled: true,
		SortOrder: maxOrder + 1,
	}

	if err := s.db.Create(channel).Error; err != nil {
		return nil, fmt.Errorf("添加频道失败: %w", err)
	}

	// 更新运行时配置
	s.syncToConfig()

	return channel, nil
}

// UpdateChannel 更新频道信息
func (s *TGChannelService) UpdateChannel(id uint, name *string, isEnabled *bool, sortOrder *int) (*model.TGChannel, error) {
	var channel model.TGChannel
	if err := s.db.First(&channel, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("频道不存在 (ID: %d)", id)
		}
		return nil, fmt.Errorf("查询频道失败: %w", err)
	}

	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed == "" {
			return nil, fmt.Errorf("频道名称不能为空")
		}
		// 检查名称是否与其他频道冲突
		var existing model.TGChannel
		err := s.db.Where("name = ? AND id != ?", trimmed, id).First(&existing).Error
		if err == nil {
			return nil, fmt.Errorf("频道名 '%s' 已被使用", trimmed)
		}
		channel.Name = trimmed
	}

	if isEnabled != nil {
		channel.IsEnabled = *isEnabled
	}

	if sortOrder != nil {
		channel.SortOrder = *sortOrder
	}

	if err := s.db.Save(&channel).Error; err != nil {
		return nil, fmt.Errorf("更新频道失败: %w", err)
	}

	// 更新运行时配置
	s.syncToConfig()

	return &channel, nil
}

// DeleteChannel 删除频道
func (s *TGChannelService) DeleteChannel(id uint) error {
	result := s.db.Delete(&model.TGChannel{}, id)
	if result.Error != nil {
		return fmt.Errorf("删除频道失败: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("频道不存在 (ID: %d)", id)
	}

	// 更新运行时配置
	s.syncToConfig()

	return nil
}

// BatchUpdateChannels 批量更新频道列表（全量替换）
func (s *TGChannelService) BatchUpdateChannels(channels []model.TGChannel) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 删除所有现有频道
		if err := tx.Where("1 = 1").Delete(&model.TGChannel{}).Error; err != nil {
			return fmt.Errorf("清空频道列表失败: %w", err)
		}

		// 批量插入新频道
		for i := range channels {
			channels[i].ID = 0 // 重置 ID，让数据库自增
			channels[i].SortOrder = i
		}

		if len(channels) > 0 {
			if err := tx.Create(&channels).Error; err != nil {
				return fmt.Errorf("批量创建频道失败: %w", err)
			}
		}

		return nil
	})
}

// TestChannel 测试频道是否可访问
func (s *TGChannelService) TestChannel(name string) (bool, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return false, fmt.Errorf("频道名称不能为空")
	}

	url := "https://t.me/s/" + name

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false, fmt.Errorf("创建请求失败: %w", err)
	}

	// 禁止自动跟随重定向，不存在的频道会返回 302
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 只有直接返回 200 才表示频道真正可访问
	// 302 等重定向状态码表示频道不存在或不可访问
	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("频道返回状态码: %d", resp.StatusCode)
	}

	return true, nil
}

// MigrateFromEnv 将环境变量中的频道补齐到数据库
// 只追加缺失频道，不覆盖已有频道配置
func (s *TGChannelService) MigrateFromEnv() error {
	channels := config.AppConfig.DefaultChannels
	if len(channels) == 0 {
		log.Println("  - 环境变量 CHANNELS 未设置，跳过迁移")
		return nil
	}

	// 加载数据库中现有频道名
	var existing []model.TGChannel
	if err := s.db.Select("name").Find(&existing).Error; err != nil {
		return fmt.Errorf("查询现有频道失败: %w", err)
	}
	existingSet := make(map[string]struct{}, len(existing))
	for _, ch := range existing {
		trimmed := strings.TrimSpace(ch.Name)
		if trimmed != "" {
			existingSet[trimmed] = struct{}{}
		}
	}

	// 获取当前最大排序值，新增频道在末尾追加
	maxOrder := -1
	if err := s.db.Model(&model.TGChannel{}).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxOrder).Error; err != nil {
		return fmt.Errorf("查询频道最大排序失败: %w", err)
	}

	seenInEnv := make(map[string]struct{}, len(channels))
	inserted := 0
	skipped := 0
	failed := 0

	for _, name := range channels {
		name = strings.TrimSpace(name)
		if name == "" {
			skipped++
			continue
		}
		if _, exists := seenInEnv[name]; exists {
			skipped++
			continue
		}
		seenInEnv[name] = struct{}{}

		if _, exists := existingSet[name]; exists {
			skipped++
			continue
		}

		maxOrder++
		channel := &model.TGChannel{
			Name:      name,
			IsEnabled: true,
			SortOrder: maxOrder,
		}
		if err := s.db.Create(channel).Error; err != nil {
			log.Printf("  ⚠️  迁移频道 '%s' 失败: %v", name, err)
			failed++
			continue
		}
		existingSet[name] = struct{}{}
		inserted++
	}

	log.Printf("✓ TG 频道补齐完成：新增 %d 个，跳过 %d 个，失败 %d 个（env总数 %d）", inserted, skipped, failed, len(channels))
	return nil
}

// syncToConfig 将数据库中的启用频道同步到运行时配置
func (s *TGChannelService) syncToConfig() {
	channels, err := s.GetEnabledChannels()
	if err != nil {
		log.Printf("⚠️  同步频道配置失败: %v", err)
		return
	}
	config.UpdateChannels(channels)
}

// SyncToConfig 公开方法：将数据库中的启用频道同步到运行时配置
func (s *TGChannelService) SyncToConfig() {
	s.syncToConfig()
}
