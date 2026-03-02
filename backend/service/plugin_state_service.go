package service

import (
	"strings"
	"sync"
	"unisearch/model"

	"gorm.io/gorm"
)

type PluginStateService struct {
	db          *gorm.DB
	migrateErr  error
	migrateOnce sync.Once
}

func NewPluginStateService(db *gorm.DB) *PluginStateService {
	return &PluginStateService{db: db}
}

func (s *PluginStateService) ensureMigrated() error {
	if s == nil || s.db == nil {
		return nil
	}
	s.migrateOnce.Do(func() {
		s.migrateErr = s.db.AutoMigrate(&model.PluginState{})
	})
	return s.migrateErr
}

func normalizePluginStateName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

func normalizePluginType(pluginType string) string {
	normalized := strings.ToLower(strings.TrimSpace(pluginType))
	if normalized != "custom" {
		return "builtin"
	}
	return "custom"
}

// GetStatusMap 批量获取插件启用状态，仅返回有配置记录的插件
func (s *PluginStateService) GetStatusMap(pluginNames []string) (map[string]bool, error) {
	result := make(map[string]bool)
	if s == nil || s.db == nil || len(pluginNames) == 0 {
		return result, nil
	}
	if err := s.ensureMigrated(); err != nil {
		return nil, err
	}

	normalizedToOriginal := make(map[string]string, len(pluginNames))
	normalizedNames := make([]string, 0, len(pluginNames))
	for _, name := range pluginNames {
		normalized := normalizePluginStateName(name)
		if normalized == "" {
			continue
		}
		if _, exists := normalizedToOriginal[normalized]; exists {
			continue
		}
		normalizedToOriginal[normalized] = name
		normalizedNames = append(normalizedNames, normalized)
	}

	if len(normalizedNames) == 0 {
		return result, nil
	}

	var states []model.PluginState
	if err := s.db.Where("plugin_name IN ?", normalizedNames).Find(&states).Error; err != nil {
		return nil, err
	}

	for _, state := range states {
		original, ok := normalizedToOriginal[state.PluginName]
		if !ok {
			continue
		}
		result[original] = state.IsEnabled
	}

	return result, nil
}

// SetStatus 设置插件启用状态（upsert）
func (s *PluginStateService) SetStatus(pluginName, pluginType string, isEnabled bool) error {
	if s == nil || s.db == nil {
		return nil
	}
	if err := s.ensureMigrated(); err != nil {
		return err
	}

	normalizedName := normalizePluginStateName(pluginName)
	if normalizedName == "" {
		return nil
	}

	normalizedType := normalizePluginType(pluginType)

	var state model.PluginState
	err := s.db.Where("plugin_name = ?", normalizedName).First(&state).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		state = model.PluginState{
			PluginName: normalizedName,
			PluginType: normalizedType,
			IsEnabled:  isEnabled,
		}
		return s.db.Create(&state).Error
	}

	state.PluginType = normalizedType
	state.IsEnabled = isEnabled
	return s.db.Save(&state).Error
}

// DeleteStatus 删除插件状态
func (s *PluginStateService) DeleteStatus(pluginName string) error {
	if s == nil || s.db == nil {
		return nil
	}
	if err := s.ensureMigrated(); err != nil {
		return err
	}

	normalizedName := normalizePluginStateName(pluginName)
	if normalizedName == "" {
		return nil
	}

	return s.db.Where("plugin_name = ?", normalizedName).Delete(&model.PluginState{}).Error
}
