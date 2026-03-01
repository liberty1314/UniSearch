package service

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unisearch/model"

	"gorm.io/gorm"
)

// TGChannelHealthSnapshot TG 频道健康状态快照（用于接口响应与聚合）
type TGChannelHealthSnapshot struct {
	IsHealthy     bool
	LastCheckedAt time.Time
	LastError     string
	CheckSource   string
}

// TGChannelHealthService TG 频道健康状态服务
type TGChannelHealthService struct {
	db *gorm.DB
}

// NewTGChannelHealthService 创建 TG 频道健康状态服务
func NewTGChannelHealthService(db *gorm.DB) *TGChannelHealthService {
	return &TGChannelHealthService{db: db}
}

func normalizeChannelName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// RecordResult 记录频道最近一次测试结果
func (s *TGChannelHealthService) RecordResult(channelName string, healthy bool, errMsg string, source string) error {
	normalizedName := normalizeChannelName(channelName)
	if normalizedName == "" {
		return fmt.Errorf("频道名称不能为空")
	}

	if source == "" {
		source = "manual_test"
	}

	var status model.TGChannelHealthStatus
	err := s.db.Where("channel_name = ?", normalizedName).First(&status).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("查询频道健康状态失败: %w", err)
		}
		status = model.TGChannelHealthStatus{ChannelName: normalizedName}
	}

	status.IsHealthy = healthy
	status.LastCheckedAt = time.Now()
	status.CheckSource = source
	if healthy {
		status.LastError = ""
	} else {
		status.LastError = strings.TrimSpace(errMsg)
	}

	if err := s.db.Save(&status).Error; err != nil {
		return fmt.Errorf("保存频道健康状态失败: %w", err)
	}
	return nil
}

// GetStatusMap 批量获取频道健康状态，返回值仅包含有测试记录的频道
func (s *TGChannelHealthService) GetStatusMap(channelNames []string) (map[string]TGChannelHealthSnapshot, error) {
	normalizedToOriginal := make(map[string]string, len(channelNames))
	normalizedNames := make([]string, 0, len(channelNames))

	for _, name := range channelNames {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		normalized := normalizeChannelName(trimmed)
		if _, exists := normalizedToOriginal[normalized]; exists {
			continue
		}
		normalizedToOriginal[normalized] = trimmed
		normalizedNames = append(normalizedNames, normalized)
	}

	result := make(map[string]TGChannelHealthSnapshot)
	if len(normalizedNames) == 0 {
		return result, nil
	}

	var statuses []model.TGChannelHealthStatus
	if err := s.db.Where("channel_name IN ?", normalizedNames).Find(&statuses).Error; err != nil {
		return nil, fmt.Errorf("批量查询频道健康状态失败: %w", err)
	}

	for _, item := range statuses {
		original, ok := normalizedToOriginal[item.ChannelName]
		if !ok {
			continue
		}
		result[original] = TGChannelHealthSnapshot{
			IsHealthy:     item.IsHealthy,
			LastCheckedAt: item.LastCheckedAt,
			LastError:     item.LastError,
			CheckSource:   item.CheckSource,
		}
	}

	return result, nil
}

// ClearStatus 清理单个频道健康状态
func (s *TGChannelHealthService) ClearStatus(channelName string) error {
	normalizedName := normalizeChannelName(channelName)
	if normalizedName == "" {
		return nil
	}

	if err := s.db.Where("channel_name = ?", normalizedName).Delete(&model.TGChannelHealthStatus{}).Error; err != nil {
		return fmt.Errorf("清理频道健康状态失败: %w", err)
	}
	return nil
}

// ClearStatusesNotIn 清理不在指定列表中的健康状态记录（防止孤儿记录累积）
func (s *TGChannelHealthService) ClearStatusesNotIn(channelNames []string) error {
	normalizedNames := make([]string, 0, len(channelNames))
	seen := make(map[string]struct{}, len(channelNames))
	for _, name := range channelNames {
		normalized := normalizeChannelName(name)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		normalizedNames = append(normalizedNames, normalized)
	}

	query := s.db
	if len(normalizedNames) > 0 {
		query = query.Where("channel_name NOT IN ?", normalizedNames)
	}

	if err := query.Delete(&model.TGChannelHealthStatus{}).Error; err != nil {
		return fmt.Errorf("清理孤儿频道健康状态失败: %w", err)
	}
	return nil
}
