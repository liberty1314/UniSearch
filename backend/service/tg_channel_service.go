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

// MigrateFromEnv 将环境变量中的频道迁移到数据库（首次启动时调用）
func (s *TGChannelService) MigrateFromEnv() error {
	// 检查数据库中是否已有频道记录
	var count int64
	s.db.Model(&model.TGChannel{}).Count(&count)
	if count > 0 {
		log.Printf("  - tg_channels 表已有 %d 条记录，跳过环境变量迁移", count)
		return nil
	}

	// 从环境变量获取频道列表
	channels := config.AppConfig.DefaultChannels
	if len(channels) == 0 {
		log.Println("  - 环境变量 CHANNELS 未设置，跳过迁移")
		return nil
	}

	// 批量创建
	for i, name := range channels {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		channel := &model.TGChannel{
			Name:      name,
			IsEnabled: true,
			SortOrder: i,
		}
		if err := s.db.Create(channel).Error; err != nil {
			log.Printf("  ⚠️  迁移频道 '%s' 失败: %v", name, err)
			continue
		}
	}

	log.Printf("✓ 成功将 %d 个频道从环境变量迁移到数据库", len(channels))
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
