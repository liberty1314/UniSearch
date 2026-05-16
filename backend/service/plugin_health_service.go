package service

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unisearch/model"

	"gorm.io/gorm"
)

// PluginHealthService 插件健康状态服务
type PluginHealthService struct {
	db *gorm.DB
}

// NewPluginHealthService 创建插件健康状态服务
func NewPluginHealthService(db *gorm.DB) *PluginHealthService {
	return &PluginHealthService{db: db}
}

func normalizePluginName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// RecordResult 记录插件最近一次测试结果
func (s *PluginHealthService) RecordResult(pluginName string, healthy bool, errMsg string, source string) error {
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return fmt.Errorf("插件名称不能为空")
	}

	if source == "" {
		source = "manual_test"
	}

	var status model.PluginHealthStatus
	err := s.db.Where("plugin_name = ?", normalizedName).First(&status).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("查询插件健康状态失败: %w", err)
		}

		status = model.PluginHealthStatus{
			PluginName: normalizedName,
		}
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
		return fmt.Errorf("保存插件健康状态失败: %w", err)
	}
	return nil
}

// GetStatusMap 批量获取插件健康状态，返回值仅包含有测试记录的插件
func (s *PluginHealthService) GetStatusMap(pluginNames []string) (map[string]bool, error) {
	normalizedToOriginal := make(map[string]string, len(pluginNames))
	normalizedNames := make([]string, 0, len(pluginNames))

	for _, name := range pluginNames {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		normalized := normalizePluginName(trimmed)
		if _, exists := normalizedToOriginal[normalized]; exists {
			continue
		}
		normalizedToOriginal[normalized] = trimmed
		normalizedNames = append(normalizedNames, normalized)
	}

	result := make(map[string]bool)
	if len(normalizedNames) == 0 {
		return result, nil
	}

	var statuses []model.PluginHealthStatus
	if err := s.db.Where("plugin_name IN ?", normalizedNames).Find(&statuses).Error; err != nil {
		return nil, fmt.Errorf("批量查询插件健康状态失败: %w", err)
	}

	for _, item := range statuses {
		if original, ok := normalizedToOriginal[item.PluginName]; ok {
			result[original] = item.IsHealthy
		}
	}

	return result, nil
}

// GetSnapshotMap 批量获取插件健康快照，返回值仅包含有测试记录的插件。
func (s *PluginHealthService) GetSnapshotMap(pluginNames []string) (map[string]model.PluginHealthSnapshot, error) {
	normalizedToOriginal := make(map[string]string, len(pluginNames))
	normalizedNames := make([]string, 0, len(pluginNames))

	for _, name := range pluginNames {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		normalized := normalizePluginName(trimmed)
		if _, exists := normalizedToOriginal[normalized]; exists {
			continue
		}
		normalizedToOriginal[normalized] = trimmed
		normalizedNames = append(normalizedNames, normalized)
	}

	result := make(map[string]model.PluginHealthSnapshot)
	if len(normalizedNames) == 0 {
		return result, nil
	}

	var statuses []model.PluginHealthStatus
	if err := s.db.Where("plugin_name IN ?", normalizedNames).Find(&statuses).Error; err != nil {
		return nil, fmt.Errorf("批量查询插件健康快照失败: %w", err)
	}

	for _, item := range statuses {
		if original, ok := normalizedToOriginal[item.PluginName]; ok {
			result[original] = model.PluginHealthSnapshot{
				IsHealthy:     item.IsHealthy,
				LastCheckedAt: item.LastCheckedAt,
				LastError:     item.LastError,
				CheckSource:   item.CheckSource,
			}
		}
	}

	return result, nil
}

// ClearStatus 清理单个插件健康状态
func (s *PluginHealthService) ClearStatus(pluginName string) error {
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return nil
	}
	if err := s.db.Where("plugin_name = ?", normalizedName).Delete(&model.PluginHealthStatus{}).Error; err != nil {
		return fmt.Errorf("清理插件健康状态失败: %w", err)
	}
	return nil
}

// ClearAllStatuses 批量清理插件健康状态
func (s *PluginHealthService) ClearAllStatuses(pluginNames []string) error {
	normalizedNames := make([]string, 0, len(pluginNames))
	seen := make(map[string]struct{}, len(pluginNames))
	for _, name := range pluginNames {
		normalized := normalizePluginName(name)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		normalizedNames = append(normalizedNames, normalized)
	}
	if len(normalizedNames) == 0 {
		return nil
	}
	if err := s.db.Where("plugin_name IN ?", normalizedNames).Delete(&model.PluginHealthStatus{}).Error; err != nil {
		return fmt.Errorf("批量清理插件健康状态失败: %w", err)
	}
	return nil
}
