package service

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"unisearch/config"
	"unisearch/model"
	"unisearch/util"

	"gorm.io/gorm"
)

// AdminTagService 管理后台插件/频道独立标签词库。
type AdminTagService struct {
	db *gorm.DB
}

// NewAdminTagService 创建标签词库服务实例。
func NewAdminTagService(db *gorm.DB) *AdminTagService {
	return &AdminTagService{db: db}
}

// NormalizeAdminTagScope 统一标签词库 scope 的合法值。
func NormalizeAdminTagScope(scope string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(scope)) {
	case model.AdminTagScopePlugin:
		return model.AdminTagScopePlugin, nil
	case model.AdminTagScopeChannel:
		return model.AdminTagScopeChannel, nil
	default:
		return "", fmt.Errorf("不支持的标签作用域: %s", scope)
	}
}

func normalizeAdminTagName(name string) (display string, normalized string, err error) {
	display = strings.TrimSpace(name)
	if display == "" {
		return "", "", errors.New("标签名称不能为空")
	}
	return display, strings.ToLower(display), nil
}

// ListTags 获取指定 scope 的标签词库。
func (s *AdminTagService) ListTags(scope string) ([]model.AdminTag, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("标签词库服务未初始化")
	}

	normalizedScope, err := NormalizeAdminTagScope(scope)
	if err != nil {
		return nil, err
	}

	var tags []model.AdminTag
	if err := s.db.Where("scope = ?", normalizedScope).Order("name ASC, id ASC").Find(&tags).Error; err != nil {
		return nil, fmt.Errorf("获取标签词库失败: %w", err)
	}
	return tags, nil
}

// CreateTag 创建单个标签；若同 scope 已存在，则直接返回既有条目。
func (s *AdminTagService) CreateTag(scope string, name string) (*model.AdminTag, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("标签词库服务未初始化")
	}

	normalizedScope, err := NormalizeAdminTagScope(scope)
	if err != nil {
		return nil, err
	}
	displayName, normalizedName, err := normalizeAdminTagName(name)
	if err != nil {
		return nil, err
	}

	tag := model.AdminTag{
		Scope:          normalizedScope,
		Name:           displayName,
		NormalizedName: normalizedName,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		var existing model.AdminTag
		queryErr := tx.Where("scope = ? AND normalized_name = ?", normalizedScope, normalizedName).First(&existing).Error
		if queryErr == nil {
			tag = existing
			return nil
		}
		if !errors.Is(queryErr, gorm.ErrRecordNotFound) {
			return queryErr
		}
		if createErr := tx.Create(&tag).Error; createErr != nil {
			return createErr
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("创建标签失败: %w", err)
	}
	return &tag, nil
}

// UpdateTag 更新词库标签，并同步更新对应 scope 下实体上的标签引用。
func (s *AdminTagService) UpdateTag(id uint, name string) (*model.AdminTag, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("标签词库服务未初始化")
	}
	if id == 0 {
		return nil, errors.New("标签 ID 无效")
	}

	displayName, normalizedName, err := normalizeAdminTagName(name)
	if err != nil {
		return nil, err
	}

	var existing model.AdminTag
	if err := s.db.First(&existing, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("标签不存在")
		}
		return nil, fmt.Errorf("获取标签失败: %w", err)
	}
	if _, err := NormalizeAdminTagScope(existing.Scope); err != nil {
		return nil, err
	}

	switch existing.Scope {
	case model.AdminTagScopeChannel:
		updated, err := s.updateChannelTag(existing, displayName, normalizedName)
		if err != nil {
			return nil, err
		}
		return updated, nil
	case model.AdminTagScopePlugin:
		updated, err := s.updatePluginTag(existing, displayName, normalizedName)
		if err != nil {
			return nil, err
		}
		return updated, nil
	default:
		return nil, fmt.Errorf("不支持的标签作用域: %s", existing.Scope)
	}
}

// DeleteTag 删除词库标签，并同步移除对应 scope 下实体上的标签引用。
func (s *AdminTagService) DeleteTag(id uint) error {
	if s == nil || s.db == nil {
		return errors.New("标签词库服务未初始化")
	}
	if id == 0 {
		return errors.New("标签 ID 无效")
	}

	var existing model.AdminTag
	if err := s.db.First(&existing, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("标签不存在")
		}
		return fmt.Errorf("获取标签失败: %w", err)
	}
	if _, err := NormalizeAdminTagScope(existing.Scope); err != nil {
		return err
	}

	switch existing.Scope {
	case model.AdminTagScopeChannel:
		return s.deleteChannelTag(existing)
	case model.AdminTagScopePlugin:
		return s.deletePluginTag(existing)
	default:
		return fmt.Errorf("不支持的标签作用域: %s", existing.Scope)
	}
}

// EnsureTags 确保指定标签集合在对应 scope 词库中存在。
func (s *AdminTagService) EnsureTags(scope string, names []string) error {
	if s == nil || s.db == nil {
		return errors.New("标签词库服务未初始化")
	}

	normalizedScope, err := NormalizeAdminTagScope(scope)
	if err != nil {
		return err
	}

	normalizedNames := util.NormalizeTags(names)
	if len(normalizedNames) == 0 {
		return nil
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, name := range normalizedNames {
			displayName, normalizedName, nameErr := normalizeAdminTagName(name)
			if nameErr != nil {
				return nameErr
			}

			var existing model.AdminTag
			queryErr := tx.Where("scope = ? AND normalized_name = ?", normalizedScope, normalizedName).First(&existing).Error
			if queryErr == nil {
				continue
			}
			if !errors.Is(queryErr, gorm.ErrRecordNotFound) {
				return queryErr
			}
			if createErr := tx.Create(&model.AdminTag{
				Scope:          normalizedScope,
				Name:           displayName,
				NormalizedName: normalizedName,
			}).Error; createErr != nil {
				return createErr
			}
		}
		return nil
	})
}

// MergeTagOptions 将词库标签与实体已有标签合并，避免历史数据在空词库场景下丢失候选项。
func MergeTagOptions(existing []model.AdminTag, scope string, entityTags []string) []model.AdminTag {
	normalizedScope, err := NormalizeAdminTagScope(scope)
	if err != nil {
		return existing
	}

	merged := make([]model.AdminTag, 0, len(existing)+len(entityTags))
	seen := make(map[string]struct{}, len(existing)+len(entityTags))
	for _, tag := range existing {
		key := strings.ToLower(strings.TrimSpace(tag.Name))
		if key == "" {
			continue
		}
		seen[key] = struct{}{}
		merged = append(merged, tag)
	}

	for _, name := range util.NormalizeTags(entityTags) {
		key := strings.ToLower(name)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		merged = append(merged, model.AdminTag{
			Scope:          normalizedScope,
			Name:           name,
			NormalizedName: key,
		})
	}

	sort.SliceStable(merged, func(i, j int) bool {
		return strings.ToLower(merged[i].Name) < strings.ToLower(merged[j].Name)
	})
	return merged
}

func (s *AdminTagService) updateChannelTag(existing model.AdminTag, displayName string, normalizedName string) (*model.AdminTag, error) {
	oldName := existing.Name
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var conflict model.AdminTag
		err := tx.Where("scope = ? AND normalized_name = ? AND id <> ?", existing.Scope, normalizedName, existing.ID).First(&conflict).Error
		if err == nil {
			return errors.New("同一词库中已存在同名标签")
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		existing.Name = displayName
		existing.NormalizedName = normalizedName
		if err := tx.Save(&existing).Error; err != nil {
			return err
		}

		var channels []model.TGChannel
		if err := tx.Find(&channels).Error; err != nil {
			return err
		}
		for _, channel := range channels {
			nextTags := util.ReplaceTagInList(channel.Tags, oldName, displayName)
			if !sameTags(channel.Tags, nextTags) {
				channel.Tags = nextTags
				if err := tx.Save(&channel).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return nil, fmt.Errorf("更新标签失败: %w", err)
	}

	return &existing, nil
}

func (s *AdminTagService) deleteChannelTag(existing model.AdminTag) error {
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var channels []model.TGChannel
		if err := tx.Find(&channels).Error; err != nil {
			return err
		}
		for _, channel := range channels {
			nextTags := util.RemoveTagFromList(channel.Tags, existing.Name)
			if !sameTags(channel.Tags, nextTags) {
				channel.Tags = nextTags
				if err := tx.Save(&channel).Error; err != nil {
					return err
				}
			}
		}
		return tx.Delete(&model.AdminTag{}, existing.ID).Error
	}); err != nil {
		return fmt.Errorf("删除标签失败: %w", err)
	}
	return nil
}

func (s *AdminTagService) updatePluginTag(existing model.AdminTag, displayName string, normalizedName string) (*model.AdminTag, error) {
	customPlugins := config.GetCustomPluginsConfig()
	snapshot := customPlugins.GetPlugins()
	updatedPlugins := make([]config.CustomPlugin, len(snapshot))
	copy(updatedPlugins, snapshot)
	for index := range updatedPlugins {
		updatedPlugins[index].Tags = util.ReplaceTagInList(updatedPlugins[index].Tags, existing.Name, displayName)
	}

	if err := customPlugins.SetPlugins(updatedPlugins); err != nil {
		return nil, fmt.Errorf("更新插件标签失败: %w", err)
	}

	oldName := existing.Name
	oldNormalizedName := existing.NormalizedName
	existing.Name = displayName
	existing.NormalizedName = normalizedName

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var conflict model.AdminTag
		err := tx.Where("scope = ? AND normalized_name = ? AND id <> ?", existing.Scope, normalizedName, existing.ID).First(&conflict).Error
		if err == nil {
			return errors.New("同一词库中已存在同名标签")
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return tx.Save(&existing).Error
	}); err != nil {
		existing.Name = oldName
		existing.NormalizedName = oldNormalizedName
		_ = customPlugins.SetPlugins(snapshot)
		return nil, fmt.Errorf("更新标签失败: %w", err)
	}

	return &existing, nil
}

func (s *AdminTagService) deletePluginTag(existing model.AdminTag) error {
	customPlugins := config.GetCustomPluginsConfig()
	snapshot := customPlugins.GetPlugins()
	updatedPlugins := make([]config.CustomPlugin, len(snapshot))
	copy(updatedPlugins, snapshot)
	for index := range updatedPlugins {
		updatedPlugins[index].Tags = util.RemoveTagFromList(updatedPlugins[index].Tags, existing.Name)
	}

	if err := customPlugins.SetPlugins(updatedPlugins); err != nil {
		return fmt.Errorf("删除插件标签失败: %w", err)
	}

	if err := s.db.Delete(&model.AdminTag{}, existing.ID).Error; err != nil {
		_ = customPlugins.SetPlugins(snapshot)
		return fmt.Errorf("删除标签失败: %w", err)
	}
	return nil
}

func sameTags(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}
