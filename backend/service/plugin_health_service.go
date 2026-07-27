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

func isTimeoutHealthResult(source string, errMsg string) bool {
	normalizedSource := strings.ToLower(strings.TrimSpace(source))
	normalizedMessage := strings.ToLower(strings.TrimSpace(errMsg))
	return normalizedSource == "timeout" ||
		strings.Contains(normalizedMessage, "timeout") ||
		strings.Contains(normalizedMessage, "超时")
}

// RecordResult 记录插件最近一次测试结果
func (s *PluginHealthService) RecordResult(pluginName string, healthy bool, errMsg string, source string) error {
	if s == nil || s.db == nil {
		return nil
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return fmt.Errorf("插件名称不能为空")
	}

	if source == "" {
		source = "manual_test"
	}
	checkedAt := time.Now()

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
	status.LastCheckedAt = checkedAt
	status.CheckSource = source
	status.TotalChecks++
	if isTimeoutHealthResult(source, errMsg) {
		status.TimeoutCount++
	}
	if status.TotalChecks > 0 {
		status.TimeoutRate = float64(status.TimeoutCount) / float64(status.TotalChecks)
	}
	if healthy {
		status.LastError = ""
		status.ConsecutiveFailures = 0
		status.LastSuccessAt = &checkedAt
	} else {
		status.LastError = strings.TrimSpace(errMsg)
		status.ConsecutiveFailures++
		status.LastFailureAt = &checkedAt
	}
	if strings.TrimSpace(status.CircuitState) == "" {
		status.CircuitState = "closed"
	}

	if err := s.db.Save(&status).Error; err != nil {
		return fmt.Errorf("保存插件健康状态失败: %w", err)
	}
	return nil
}

// GetStatus 获取单个插件健康状态，未测试过的插件返回 nil。
func (s *PluginHealthService) GetStatus(pluginName string) (*model.PluginHealthStatus, error) {
	if s == nil || s.db == nil {
		return nil, nil
	}
	normalizedName := normalizePluginName(pluginName)
	if normalizedName == "" {
		return nil, nil
	}

	var status model.PluginHealthStatus
	if err := s.db.Where("plugin_name = ?", normalizedName).First(&status).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("查询插件健康状态失败: %w", err)
	}

	return &status, nil
}

// GetStatusMap 批量获取插件健康状态，返回值仅包含有测试记录的插件
func (s *PluginHealthService) GetStatusMap(pluginNames []string) (map[string]bool, error) {
	result := make(map[string]bool)
	if s == nil || s.db == nil || len(pluginNames) == 0 {
		return result, nil
	}
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
	result := make(map[string]model.PluginHealthSnapshot)
	if s == nil || s.db == nil || len(pluginNames) == 0 {
		return result, nil
	}
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
				IsHealthy:            item.IsHealthy,
				LastCheckedAt:        item.LastCheckedAt,
				LastError:            item.LastError,
				CheckSource:          item.CheckSource,
				CircuitState:         item.CircuitState,
				CircuitCooldownUntil: item.CircuitCooldownUntil,
			}
		}
	}

	return result, nil
}

// ClearStatus 清理单个插件健康状态
func (s *PluginHealthService) ClearStatus(pluginName string) error {
	if s == nil || s.db == nil {
		return nil
	}
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
	if s == nil || s.db == nil {
		return nil
	}
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
