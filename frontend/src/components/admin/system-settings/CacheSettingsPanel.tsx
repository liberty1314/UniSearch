import React from 'react';
import { Database, Flame, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AdminSelectField } from '@/components/admin/AdminSelectField';
import { Button } from '@/components/ui/button';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import type { CacheSettingsResponse } from '@/services/systemSettingsService';
import { resolveCacheSettingOptions } from '@/lib/systemSettingsCacheOptions';
import { cn } from '@/lib/utils';
import {
  CACHE_SELECT_TRIGGER_CLASSES,
  SETTINGS_GROUP_TITLE_CLASSES,
  SETTINGS_PANEL_PADDED_CLASSES,
} from './panelStyles';

interface CacheSettingsPanelProps {
  cacheSettings: CacheSettingsResponse;
  isSavingCache: boolean;
  isTriggeringHotPreload: boolean;
  isClearingHotCache: boolean;
  onUpdateCacheField: <K extends keyof CacheSettingsResponse>(
    field: K,
    value: CacheSettingsResponse[K],
  ) => void;
  onSaveCacheSettings: () => void;
  onTriggerHotRankingPreload: () => void;
  onClearHotRankingCacheClick: () => void;
}

const formatCacheTime = (value?: string): string => {
  if (!value) return '暂无时间';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => part.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const CacheSettingsPanel: React.FC<CacheSettingsPanelProps> = ({
  cacheSettings,
  isSavingCache,
  isTriggeringHotPreload,
  isClearingHotCache,
  onUpdateCacheField,
  onSaveCacheSettings,
  onTriggerHotRankingPreload,
  onClearHotRankingCacheClick,
}) => {
  const cacheSettingOptions = React.useMemo(
    () => resolveCacheSettingOptions(cacheSettings),
    [cacheSettings],
  );

  return (
    <div className="space-y-3">
      <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>缓存与预热</h2>
      <div className={SETTINGS_PANEL_PADDED_CLASSES}>
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <Label className="text-base font-semibold text-slate-900 dark:text-white">
                Redis 缓存策略
              </Label>
              <p className="mt-1 text-sm text-slate-500">
                搜索缓存默认 1 小时，热门榜单默认每天 00:00 预热 50 条并缓存 24 小时。当前 Redis 状态：
                <span
                  className={cn(
                    'ml-1 font-medium',
                    cacheSettings.redis_connected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {cacheSettings.redis_connected ? '已连接' : '未连接'}
                </span>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                    启用搜索缓存
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">控制搜索结果写入 Redis</p>
                </div>
                <AppleSwitch
                  checked={cacheSettings.cache_enabled}
                  onCheckedChange={(checked) => onUpdateCacheField('cache_enabled', checked)}
                  disabled={isSavingCache}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                    启用热门榜单缓存
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">控制热门榜单读取和预热缓存</p>
                </div>
                <AppleSwitch
                  checked={cacheSettings.hot_ranking_cache_enabled}
                  onCheckedChange={(checked) => onUpdateCacheField('hot_ranking_cache_enabled', checked)}
                  disabled={isSavingCache}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                    启用热门榜单预热
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">每天按配置时间自动刷新榜单缓存</p>
                </div>
                <AppleSwitch
                  checked={cacheSettings.hot_ranking_preload_enabled}
                  onCheckedChange={(checked) => onUpdateCacheField('hot_ranking_preload_enabled', checked)}
                  disabled={isSavingCache}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>搜索缓存 TTL（秒）</Label>
                <AdminSelectField
                  value={String(cacheSettings.search_cache_ttl_seconds)}
                  options={cacheSettingOptions.search_cache_ttl_seconds}
                  onChange={(value) => onUpdateCacheField('search_cache_ttl_seconds', Number(value))}
                  ariaLabel="搜索缓存 TTL（秒）"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>写队列长度</Label>
                <AdminSelectField
                  value={String(cacheSettings.cache_write_queue_size)}
                  options={cacheSettingOptions.cache_write_queue_size}
                  onChange={(value) => onUpdateCacheField('cache_write_queue_size', Number(value))}
                  ariaLabel="写队列长度"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>写入 Worker 数</Label>
                <AdminSelectField
                  value={String(cacheSettings.cache_write_workers)}
                  options={cacheSettingOptions.cache_write_workers}
                  onChange={(value) => onUpdateCacheField('cache_write_workers', Number(value))}
                  ariaLabel="写入 Worker 数"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>预热时间（HH:mm）</Label>
                <AdminSelectField
                  value={cacheSettings.hot_ranking_preload_time}
                  options={cacheSettingOptions.hot_ranking_preload_time}
                  onChange={(value) => onUpdateCacheField('hot_ranking_preload_time', value)}
                  ariaLabel="预热时间（HH:mm）"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>预热条数</Label>
                <AdminSelectField
                  value={String(cacheSettings.hot_ranking_preload_limit)}
                  options={cacheSettingOptions.hot_ranking_preload_limit}
                  onChange={(value) => onUpdateCacheField('hot_ranking_preload_limit', Number(value))}
                  ariaLabel="预热条数"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>热门榜单 TTL（秒）</Label>
                <AdminSelectField
                  value={String(cacheSettings.hot_ranking_cache_ttl_seconds)}
                  options={cacheSettingOptions.hot_ranking_cache_ttl_seconds}
                  onChange={(value) => onUpdateCacheField('hot_ranking_cache_ttl_seconds', Number(value))}
                  ariaLabel="热门榜单 TTL（秒）"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>预热并发</Label>
                <AdminSelectField
                  value={String(cacheSettings.hot_ranking_preload_concurrency)}
                  options={cacheSettingOptions.hot_ranking_preload_concurrency}
                  onChange={(value) => onUpdateCacheField('hot_ranking_preload_concurrency', Number(value))}
                  ariaLabel="预热并发"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
              <div className="space-y-2">
                <Label>预热超时（秒）</Label>
                <AdminSelectField
                  value={String(cacheSettings.hot_ranking_preload_timeout_seconds)}
                  options={cacheSettingOptions.hot_ranking_preload_timeout_seconds}
                  onChange={(value) => onUpdateCacheField('hot_ranking_preload_timeout_seconds', Number(value))}
                  ariaLabel="预热超时（秒）"
                  triggerClassName={CACHE_SELECT_TRIGGER_CLASSES}
                  disabled={isSavingCache}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={onSaveCacheSettings} disabled={isSavingCache}>
                {isSavingCache ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存缓存配置
              </Button>
              <Button
                variant="secondary"
                onClick={onTriggerHotRankingPreload}
                disabled={isTriggeringHotPreload}
              >
                {isTriggeringHotPreload ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="mr-2 h-4 w-4" />
                )}
                立即预热热门榜单
              </Button>
              <Button
                variant="destructive"
                onClick={onClearHotRankingCacheClick}
                disabled={isClearingHotCache}
              >
                {isClearingHotCache ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                清理热门榜单缓存
              </Button>
            </div>

            {(cacheSettings.last_preload_result ||
              cacheSettings.last_preload_at ||
              cacheSettings.last_preload_status) && (
              <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                {cacheSettings.last_preload_status === 'cleared' ? (
                  <p>缓存已被清理，清理时间：{formatCacheTime(cacheSettings.last_preload_at)}</p>
                ) : (
                  <>
                    <p>最近预热：{formatCacheTime(cacheSettings.last_preload_at)}</p>
                    {cacheSettings.last_preload_result && (
                      <p className="mt-1">
                        任务 {cacheSettings.last_preload_result.total}，成功{' '}
                        {cacheSettings.last_preload_result.success}，失败{' '}
                        {cacheSettings.last_preload_result.failed}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

