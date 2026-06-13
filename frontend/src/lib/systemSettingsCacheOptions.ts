import type {
  CacheSettingOption,
  CacheSettingOptionCatalog,
  CacheSettingsResponse,
} from '@/services/systemSettingsService';

export const DEFAULT_CACHE_SETTING_OPTIONS: CacheSettingOptionCatalog = {
  search_cache_ttl_seconds: [
    { value: '1800', label: '30 分钟' },
    { value: '3600', label: '1 小时（默认）' },
    { value: '7200', label: '2 小时' },
    { value: '21600', label: '6 小时' },
    { value: '43200', label: '12 小时' },
    { value: '86400', label: '24 小时' },
  ],
  cache_write_queue_size: [
    { value: '64', label: '64' },
    { value: '128', label: '128' },
    { value: '256', label: '256（默认）' },
    { value: '512', label: '512' },
    { value: '1024', label: '1024' },
    { value: '2048', label: '2048' },
  ],
  cache_write_workers: [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '4', label: '4（默认）' },
    { value: '8', label: '8' },
    { value: '16', label: '16' },
  ],
  hot_ranking_preload_time: [
    { value: '00:00', label: '00:00（默认）' },
    { value: '00:30', label: '00:30' },
    { value: '01:00', label: '01:00' },
    { value: '02:00', label: '02:00' },
    { value: '06:00', label: '06:00' },
    { value: '12:00', label: '12:00' },
  ],
  hot_ranking_preload_limit: [
    { value: '20', label: '20 条' },
    { value: '30', label: '30 条' },
    { value: '50', label: '50 条（默认）' },
    { value: '80', label: '80 条' },
    { value: '100', label: '100 条' },
  ],
  hot_ranking_cache_ttl_seconds: [
    { value: '3600', label: '1 小时' },
    { value: '21600', label: '6 小时' },
    { value: '43200', label: '12 小时' },
    { value: '86400', label: '24 小时（默认）' },
    { value: '172800', label: '48 小时' },
  ],
  hot_ranking_preload_concurrency: [
    { value: '1', label: '1' },
    { value: '2', label: '2（默认）' },
    { value: '4', label: '4' },
    { value: '8', label: '8' },
    { value: '16', label: '16' },
  ],
  hot_ranking_preload_timeout_seconds: [
    { value: '10', label: '10 秒' },
    { value: '20', label: '20 秒' },
    { value: '30', label: '30 秒（默认）' },
    { value: '45', label: '45 秒' },
    { value: '60', label: '60 秒' },
    { value: '120', label: '120 秒' },
  ],
};

export const DEFAULT_CACHE_SETTINGS: CacheSettingsResponse = {
  cache_enabled: true,
  search_cache_ttl_seconds: 3600,
  cache_write_queue_size: 256,
  cache_write_workers: 4,
  hot_ranking_cache_enabled: true,
  hot_ranking_preload_enabled: true,
  hot_ranking_preload_time: '00:00',
  hot_ranking_preload_limit: 50,
  hot_ranking_cache_ttl_seconds: 86400,
  hot_ranking_preload_concurrency: 2,
  hot_ranking_preload_timeout_seconds: 30,
  config_source: 'database',
  cache_setting_options: DEFAULT_CACHE_SETTING_OPTIONS,
  redis_connected: false,
};

const hasOptionValue = (
  options: readonly CacheSettingOption[],
  value: string,
): boolean => options.some((option) => option.value === value);

const normalizeNumberOption = (
  value: number,
  options: readonly CacheSettingOption[],
  fallbackValue: number,
): number => {
  const nextValue = String(value);
  return hasOptionValue(options, nextValue) ? Number(nextValue) : fallbackValue;
};

const normalizeStringOption = (
  value: string,
  options: readonly CacheSettingOption[],
  fallbackValue: string,
): string => (hasOptionValue(options, value) ? value : fallbackValue);

export const resolveCacheSettingOptions = (
  settings?: Pick<CacheSettingsResponse, 'cache_setting_options'>,
): CacheSettingOptionCatalog => settings?.cache_setting_options ?? DEFAULT_CACHE_SETTING_OPTIONS;

export const normalizeCacheSettings = (
  settings: CacheSettingsResponse,
): CacheSettingsResponse => {
  const cacheSettingOptions = resolveCacheSettingOptions(settings);

  return {
    ...DEFAULT_CACHE_SETTINGS,
    ...settings,
    cache_setting_options: cacheSettingOptions,
    search_cache_ttl_seconds: normalizeNumberOption(
      settings.search_cache_ttl_seconds,
      cacheSettingOptions.search_cache_ttl_seconds,
      DEFAULT_CACHE_SETTINGS.search_cache_ttl_seconds,
    ),
    cache_write_queue_size: normalizeNumberOption(
      settings.cache_write_queue_size,
      cacheSettingOptions.cache_write_queue_size,
      DEFAULT_CACHE_SETTINGS.cache_write_queue_size,
    ),
    cache_write_workers: normalizeNumberOption(
      settings.cache_write_workers,
      cacheSettingOptions.cache_write_workers,
      DEFAULT_CACHE_SETTINGS.cache_write_workers,
    ),
    hot_ranking_preload_time: normalizeStringOption(
      settings.hot_ranking_preload_time,
      cacheSettingOptions.hot_ranking_preload_time,
      DEFAULT_CACHE_SETTINGS.hot_ranking_preload_time,
    ),
    hot_ranking_preload_limit: normalizeNumberOption(
      settings.hot_ranking_preload_limit,
      cacheSettingOptions.hot_ranking_preload_limit,
      DEFAULT_CACHE_SETTINGS.hot_ranking_preload_limit,
    ),
    hot_ranking_cache_ttl_seconds: normalizeNumberOption(
      settings.hot_ranking_cache_ttl_seconds,
      cacheSettingOptions.hot_ranking_cache_ttl_seconds,
      DEFAULT_CACHE_SETTINGS.hot_ranking_cache_ttl_seconds,
    ),
    hot_ranking_preload_concurrency: normalizeNumberOption(
      settings.hot_ranking_preload_concurrency,
      cacheSettingOptions.hot_ranking_preload_concurrency,
      DEFAULT_CACHE_SETTINGS.hot_ranking_preload_concurrency,
    ),
    hot_ranking_preload_timeout_seconds: normalizeNumberOption(
      settings.hot_ranking_preload_timeout_seconds,
      cacheSettingOptions.hot_ranking_preload_timeout_seconds,
      DEFAULT_CACHE_SETTINGS.hot_ranking_preload_timeout_seconds,
    ),
  };
};
