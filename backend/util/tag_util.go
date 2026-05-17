package util

import "strings"

// NormalizeTags 清理标签文本，去重并保持原始顺序。
func NormalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(tags))
	normalized := make([]string, 0, len(tags))
	for _, raw := range tags {
		tag := strings.TrimSpace(raw)
		if tag == "" {
			continue
		}

		key := strings.ToLower(tag)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, tag)
	}

	if len(normalized) == 0 {
		return nil
	}

	return normalized
}

// ReplaceTagInList 将标签列表中的目标标签替换为新名称，忽略大小写并保持原始顺序。
func ReplaceTagInList(tags []string, oldName string, newName string) []string {
	if len(tags) == 0 {
		return nil
	}

	oldKey := strings.ToLower(strings.TrimSpace(oldName))
	newTag := strings.TrimSpace(newName)
	if oldKey == "" || newTag == "" {
		return NormalizeTags(tags)
	}

	updated := make([]string, 0, len(tags))
	for _, raw := range tags {
		tag := strings.TrimSpace(raw)
		if strings.ToLower(tag) == oldKey {
			updated = append(updated, newTag)
			continue
		}
		updated = append(updated, tag)
	}
	return NormalizeTags(updated)
}

// RemoveTagFromList 从标签列表中移除目标标签，忽略大小写并保持剩余顺序。
func RemoveTagFromList(tags []string, target string) []string {
	if len(tags) == 0 {
		return nil
	}

	targetKey := strings.ToLower(strings.TrimSpace(target))
	if targetKey == "" {
		return NormalizeTags(tags)
	}

	filtered := make([]string, 0, len(tags))
	for _, raw := range tags {
		tag := strings.TrimSpace(raw)
		if strings.ToLower(tag) == targetKey {
			continue
		}
		filtered = append(filtered, tag)
	}
	return NormalizeTags(filtered)
}
