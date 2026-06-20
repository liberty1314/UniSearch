import {
  readJsonStorage,
  removeStorage,
  writeJsonStorage,
} from '@/lib/safeStorage';
import type { CloudTypeValue, SearchParams } from "@/types/search";

export type AccountThemePreference = 'system' | 'light' | 'dark';
export type AccountResultViewPreference = 'merge' | 'list';

export interface AccountPreferences {
  theme: AccountThemePreference;
  resultView: AccountResultViewPreference;
  defaultCloudTypes: CloudTypeValue[];
}

export type AccountSearchDefaults = Pick<SearchParams, 'cloudTypes' | 'resultType'>;

export const ACCOUNT_PREFERENCES_STORAGE_KEY = 'unisearch_account_preferences';
export const ACCOUNT_SEARCH_DEFAULTS_STORAGE_KEY = 'unisearch_account_search_defaults';
export const SEARCH_RESULTS_VIEW_MODE_KEY = 'unisearch_search_results_view_mode';

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  theme: 'system',
  resultView: 'merge',
  defaultCloudTypes: [],
};

const CLOUD_TYPE_LABEL_TO_VALUE: Record<string, CloudTypeValue> = {
  百度网盘: 'baidu',
  阿里云盘: 'aliyun',
  夸克网盘: 'quark',
  天翼云盘: 'tianyi',
  UC网盘: 'uc',
  移动云盘: 'mobile',
  '115网盘': '115',
  迅雷网盘: 'xunlei',
  '123网盘': '123',
  磁力链接: 'magnet',
  蓝奏云: 'lanzou',
};

const VALID_CLOUD_TYPES = new Set<CloudTypeValue>([
  'baidu',
  'aliyun',
  'quark',
  'tianyi',
  'uc',
  'mobile',
  '115',
  'xunlei',
  '123',
  'magnet',
  'lanzou',
]);

const isAccountThemePreference = (value: unknown): value is AccountThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

const isAccountResultViewPreference = (value: unknown): value is AccountResultViewPreference =>
  value === 'merge' || value === 'list';

const normalizeCloudType = (value: unknown): CloudTypeValue | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (VALID_CLOUD_TYPES.has(value as CloudTypeValue)) {
    return value as CloudTypeValue;
  }

  return CLOUD_TYPE_LABEL_TO_VALUE[value] ?? null;
};

export const normalizeAccountCloudTypes = (values?: unknown[]): CloudTypeValue[] => {
  const normalizedValues = (values ?? [])
    .map(normalizeCloudType)
    .filter((value): value is CloudTypeValue => Boolean(value));
  return Array.from(new Set(normalizedValues));
};

const normalizeAccountPreferences = (value: unknown): AccountPreferences => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_ACCOUNT_PREFERENCES;
  }

  const snapshot = value as Partial<AccountPreferences>;

  return {
    theme: isAccountThemePreference(snapshot.theme)
      ? snapshot.theme
      : DEFAULT_ACCOUNT_PREFERENCES.theme,
    resultView: isAccountResultViewPreference(snapshot.resultView)
      ? snapshot.resultView
      : DEFAULT_ACCOUNT_PREFERENCES.resultView,
    defaultCloudTypes: Array.isArray(snapshot.defaultCloudTypes)
      ? normalizeAccountCloudTypes(snapshot.defaultCloudTypes)
      : DEFAULT_ACCOUNT_PREFERENCES.defaultCloudTypes,
  };
};

export const readAccountPreferences = (): AccountPreferences => {
  const storedValue = readJsonStorage<unknown>(
    ACCOUNT_PREFERENCES_STORAGE_KEY,
    DEFAULT_ACCOUNT_PREFERENCES
  );
  return normalizeAccountPreferences(storedValue);
};

const resolveSystemDarkMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const applyThemePreference = (theme: AccountThemePreference): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const shouldUseDark = theme === 'system' ? resolveSystemDarkMode() : theme === 'dark';
  document.documentElement.classList.toggle('dark', shouldUseDark);

  if (theme === 'system') {
    removeStorage('theme');
    return;
  }

  try {
    localStorage.setItem('theme', theme);
  } catch {
    // 主题偏好应用到当前页面即可，本地存储不可用时不阻断偏好保存。
  }
};

export const writeSearchViewPreference = (resultView: AccountResultViewPreference): void => {
  writeJsonStorage(SEARCH_RESULTS_VIEW_MODE_KEY, resultView === 'list' ? 'list' : 'grid');
};

export const readAccountSearchDefaults = (): AccountSearchDefaults => {
  const preferences = readAccountPreferences();
  return {
    resultType: 'merge',
    cloudTypes: [...preferences.defaultCloudTypes],
  };
};

export const writeAccountSearchDefaults = (preferences: AccountPreferences): void => {
  writeJsonStorage(ACCOUNT_SEARCH_DEFAULTS_STORAGE_KEY, readAccountSearchDefaultsFrom(preferences));
};

const readAccountSearchDefaultsFrom = (preferences: AccountPreferences): AccountSearchDefaults => ({
  resultType: 'merge',
  cloudTypes: [...preferences.defaultCloudTypes],
});

export const applyAccountPreferences = (preferences: AccountPreferences): void => {
  applyThemePreference(preferences.theme);
  writeSearchViewPreference(preferences.resultView);
  writeAccountSearchDefaults(preferences);
};

export const writeAccountPreferences = (preferences: AccountPreferences): void => {
  const normalizedPreferences = normalizeAccountPreferences(preferences);
  writeJsonStorage(ACCOUNT_PREFERENCES_STORAGE_KEY, normalizedPreferences);
  applyAccountPreferences(normalizedPreferences);
};
