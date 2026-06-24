package service

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"unisearch/model"

	"gorm.io/gorm"
)

const PluginRuntimeConfigExtKey = "plugin_runtime_config"

type PluginRuntimeConfigService struct {
	db          *gorm.DB
	migrateErr  error
	migrateOnce sync.Once
}

func NewPluginRuntimeConfigService(db *gorm.DB) *PluginRuntimeConfigService {
	return &PluginRuntimeConfigService{db: db}
}

func (s *PluginRuntimeConfigService) ensureMigrated() error {
	if s == nil || s.db == nil {
		return nil
	}
	s.migrateOnce.Do(func() {
		s.migrateErr = s.db.AutoMigrate(&model.PluginRuntimeConfig{})
	})
	return s.migrateErr
}

func normalizePluginRuntimeConfigName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

func (s *PluginRuntimeConfigService) GetConfig(pluginName string, manifest model.PluginManifest) (map[string]interface{}, error) {
	defaults, err := normalizePluginRuntimeConfig(manifest.ConfigSchema, nil)
	if err != nil {
		return nil, err
	}
	if s == nil || s.db == nil {
		return defaults, nil
	}
	if err := s.ensureMigrated(); err != nil {
		return nil, err
	}

	normalizedName := normalizePluginRuntimeConfigName(pluginName)
	if normalizedName == "" {
		return defaults, nil
	}

	var record model.PluginRuntimeConfig
	err = s.db.Where("plugin_name = ?", normalizedName).First(&record).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return defaults, nil
		}
		return nil, err
	}

	var saved map[string]interface{}
	if err := json.Unmarshal([]byte(record.ConfigJSON), &saved); err != nil {
		return defaults, nil
	}
	return normalizePluginRuntimeConfig(manifest.ConfigSchema, saved)
}

func (s *PluginRuntimeConfigService) SaveConfig(pluginName string, manifest model.PluginManifest, config map[string]interface{}) (map[string]interface{}, error) {
	normalized, err := normalizePluginRuntimeConfig(manifest.ConfigSchema, config)
	if err != nil {
		return nil, err
	}
	if s == nil || s.db == nil {
		return normalized, nil
	}
	if err := s.ensureMigrated(); err != nil {
		return nil, err
	}

	normalizedName := normalizePluginRuntimeConfigName(pluginName)
	if normalizedName == "" {
		return nil, fmt.Errorf("插件名称不能为空")
	}

	payload, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}

	var record model.PluginRuntimeConfig
	err = s.db.Where("plugin_name = ?", normalizedName).First(&record).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
		record = model.PluginRuntimeConfig{
			PluginName: normalizedName,
			ConfigJSON: string(payload),
		}
		return normalized, s.db.Create(&record).Error
	}

	record.ConfigJSON = string(payload)
	return normalized, s.db.Save(&record).Error
}

func (s *PluginRuntimeConfigService) GetConfigMap(pluginManifests map[string]model.PluginManifest) (map[string]map[string]interface{}, error) {
	result := make(map[string]map[string]interface{}, len(pluginManifests))
	for pluginName, manifest := range pluginManifests {
		config, err := s.GetConfig(pluginName, manifest)
		if err != nil {
			return nil, err
		}
		result[pluginName] = config
	}
	return result, nil
}

func normalizePluginRuntimeConfig(schema []model.PluginConfigField, input map[string]interface{}) (map[string]interface{}, error) {
	result := make(map[string]interface{}, len(schema))
	for _, field := range schema {
		key := strings.TrimSpace(field.Key)
		if key == "" {
			continue
		}

		value, exists := input[key]
		if !exists {
			value = field.Default
		}

		switch strings.ToLower(strings.TrimSpace(field.Type)) {
		case "number":
			numberValue, err := normalizeRuntimeNumber(value)
			if err != nil {
				return nil, fmt.Errorf("%s 必须是数字", field.Label)
			}
			result[key] = numberValue
		default:
			if value != nil {
				result[key] = value
			}
		}
	}
	return result, nil
}

func normalizeRuntimeNumber(value interface{}) (float64, error) {
	switch typed := value.(type) {
	case nil:
		return 0, nil
	case float64:
		return typed, nil
	case float32:
		return float64(typed), nil
	case int:
		return float64(typed), nil
	case int64:
		return float64(typed), nil
	case int32:
		return float64(typed), nil
	case json.Number:
		return typed.Float64()
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, nil
		}
		return strconv.ParseFloat(trimmed, 64)
	default:
		return 0, fmt.Errorf("不支持的数字类型 %T", value)
	}
}
