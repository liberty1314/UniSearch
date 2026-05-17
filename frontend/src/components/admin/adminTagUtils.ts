import type { AdminTagOption } from '@/types/api';

const compareTagName = (left: string, right: string): number =>
  left.localeCompare(right, 'zh-CN', { sensitivity: 'base' });

export const normalizeTagName = (value: string): string => value.trim();

export const mergeAdminTagOptions = (
  options: AdminTagOption[],
  tagNames: string[],
  scope: AdminTagOption['scope']
): AdminTagOption[] => {
  const merged = new Map<string, AdminTagOption>();

  options.forEach((option) => {
    const normalized = normalizeTagName(option.name).toLowerCase();
    if (!normalized) {
      return;
    }
    merged.set(normalized, option);
  });

  tagNames.forEach((name) => {
    const normalizedName = normalizeTagName(name);
    const normalizedKey = normalizedName.toLowerCase();
    if (!normalizedKey || merged.has(normalizedKey)) {
      return;
    }
    merged.set(normalizedKey, {
      id: -1,
      name: normalizedName,
      scope,
    });
  });

  return Array.from(merged.values()).sort((left, right) => compareTagName(left.name, right.name));
};

export const normalizeSingleTagSelection = (selected: string[]): string[] => {
  const firstTag = selected
    .map((item) => normalizeTagName(item))
    .find((item) => item.length > 0);

  return firstTag ? [firstTag] : [];
};

export const toggleTagSelection = (selected: string[], nextName: string): string[] => {
  const normalized = normalizeTagName(nextName);
  if (!normalized) {
    return selected;
  }

  const exists = selected.some((item) => item.toLowerCase() === normalized.toLowerCase());
  if (exists) {
    return [];
  }
  return [normalized];
};

export const replaceTagName = (selected: string[], oldName: string, nextName: string): string[] => {
  const oldKey = normalizeTagName(oldName).toLowerCase();
  const normalizedNext = normalizeTagName(nextName);
  if (!oldKey || !normalizedNext) {
    return selected;
  }

  return Array.from(
    selected.reduce((accumulator, item) => {
      const nextItem = item.trim().toLowerCase() === oldKey ? normalizedNext : normalizeTagName(item);
      if (!nextItem) {
        return accumulator;
      }
      const mapKey = nextItem.toLowerCase();
      if (!accumulator.has(mapKey)) {
        accumulator.set(mapKey, nextItem);
      }
      return accumulator;
    }, new Map<string, string>())
  ).map(([, value]) => value);
};

export const removeTagName = (selected: string[], targetName: string): string[] => {
  const targetKey = normalizeTagName(targetName).toLowerCase();
  if (!targetKey) {
    return selected;
  }
  return selected.filter((item) => normalizeTagName(item).toLowerCase() !== targetKey);
};

export const replaceTagOption = (
  options: AdminTagOption[],
  updated: AdminTagOption
): AdminTagOption[] => options.map((option) => (option.id === updated.id ? updated : option));

export const removeTagOption = (
  options: AdminTagOption[],
  targetId: number
): AdminTagOption[] => options.filter((option) => option.id !== targetId);

export const matchesAnyTagFilter = (entityTags: string[] | undefined, selectedFilters: string[]): boolean => {
  if (selectedFilters.length === 0) {
    return true;
  }

  const tags = new Set((entityTags || []).map((item) => normalizeTagName(item).toLowerCase()).filter(Boolean));
  return selectedFilters.some((item) => tags.has(normalizeTagName(item).toLowerCase()));
};
