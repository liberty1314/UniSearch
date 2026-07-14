import React from 'react';
import { FileSearch, Layers3, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MAX_SEARCH_FIRST_PAGE_MAX_PER_SOURCE,
  MIN_SEARCH_FIRST_PAGE_MAX_PER_SOURCE,
} from '@/lib/searchSourceDiversity';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import type { RuntimeSettingsResponse } from '@/services/systemSettingsService';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_CLASSES } from './panelStyles';

interface SearchExperienceSettingsPanelProps {
  enableResourceDetailPage: boolean;
  enableResourceSourceBadges: boolean;
  enableSearchSourceDiversity: boolean;
  searchFirstPageMaxPerSource: number;
  runtimeSettings: RuntimeSettingsResponse;
  isSaving: SavingState;
  isSavingRuntime: boolean;
  onToggleResourceDetailPage: (checked: boolean) => void;
  onToggleResourceSourceBadges: (checked: boolean) => void;
  onEnableSearchSourceDiversityChange: (checked: boolean) => void;
  onSearchFirstPageMaxPerSourceChange: (value: number) => void;
  onSaveSearchSourceDiversitySettings: () => void;
  onUpdateRuntimeField: <K extends keyof RuntimeSettingsResponse>(
    field: K,
    value: RuntimeSettingsResponse[K],
  ) => void;
  onSaveRuntimeSettings: () => void;
}

export const SearchExperienceSettingsPanel: React.FC<SearchExperienceSettingsPanelProps> = ({
  enableResourceDetailPage,
  enableResourceSourceBadges,
  enableSearchSourceDiversity,
  searchFirstPageMaxPerSource,
  runtimeSettings,
  isSaving,
  isSavingRuntime,
  onToggleResourceDetailPage,
  onToggleResourceSourceBadges,
  onEnableSearchSourceDiversityChange,
  onSearchFirstPageMaxPerSourceChange,
  onSaveSearchSourceDiversitySettings,
  onUpdateRuntimeField,
  onSaveRuntimeSettings,
}) => (
  <div className="space-y-3">
    <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>搜索体验</h2>
    <div className={SETTINGS_PANEL_CLASSES}>
      <div className="flex items-center justify-between p-5 transition-colors hover:bg-slate-50/50 sm:px-6 dark:hover:bg-cyan-400/[0.06]">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-cyan-100 p-2 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <Label
              className="cursor-pointer text-base font-semibold text-slate-900 dark:text-white"
              onClick={() => onToggleResourceDetailPage(!enableResourceDetailPage)}
            >
              显示资源详情页
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              控制搜索结果中的“详情”入口以及独立资源详情页是否对前台展示
            </p>
          </div>
        </div>
        <AppleSwitch
          checked={enableResourceDetailPage}
          onCheckedChange={onToggleResourceDetailPage}
          disabled={isSaving === 'resource_detail'}
        />
      </div>
      <div className="border-t border-slate-200/70 p-5 sm:px-6 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <Label className="text-base font-semibold text-slate-900 dark:text-white">
                首屏来源配额
              </Label>
              <p className="mt-1 text-sm text-slate-500">
                限制首屏单个来源占比，来源不足时自动补满结果
              </p>
            </div>
          </div>
          <AppleSwitch
            aria-label="启用首屏来源配额"
            checked={enableSearchSourceDiversity}
            onCheckedChange={onEnableSearchSourceDiversityChange}
            disabled={isSaving === 'source_diversity'}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <div className="w-full space-y-2 sm:w-48">
            <Label htmlFor="search-first-page-max-per-source">首屏单来源上限</Label>
            <Input
              id="search-first-page-max-per-source"
              aria-label="首屏单来源上限"
              type="number"
              min={MIN_SEARCH_FIRST_PAGE_MAX_PER_SOURCE}
              max={MAX_SEARCH_FIRST_PAGE_MAX_PER_SOURCE}
              step={1}
              value={searchFirstPageMaxPerSource}
              disabled={isSaving === 'source_diversity'}
              onChange={(event) => onSearchFirstPageMaxPerSourceChange(Number(event.target.value))}
            />
          </div>
          <Button
            onClick={onSaveSearchSourceDiversitySettings}
            disabled={isSaving === 'source_diversity'}
          >
            {isSaving === 'source_diversity' ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存来源配额
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200/70 p-5 transition-colors hover:bg-slate-50/50 sm:px-6 dark:border-slate-800 dark:hover:bg-cyan-400/[0.06]">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <Label
              className="cursor-pointer text-base font-semibold text-slate-900 dark:text-white"
              onClick={() => onToggleResourceSourceBadges(!enableResourceSourceBadges)}
            >
              显示结果来源标签
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              控制搜索结果卡片是否展示插件名或频道名
            </p>
          </div>
        </div>
        <AppleSwitch
          aria-label="显示结果来源标签"
          checked={enableResourceSourceBadges}
          onCheckedChange={onToggleResourceSourceBadges}
          disabled={isSaving === 'source_badges'}
        />
      </div>
      <div className="flex items-center justify-between border-t border-slate-200/70 p-5 transition-colors hover:bg-slate-50/50 sm:px-6 dark:border-slate-800 dark:hover:bg-cyan-400/[0.06]">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <Label className="text-base font-semibold text-slate-900 dark:text-white">
              启用渐进式搜索
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              开启后搜索页会按来源逐批展示结果
            </p>
          </div>
        </div>
        <AppleSwitch
          aria-label="启用渐进式搜索"
          checked={runtimeSettings.progressive_search_enabled}
          onCheckedChange={(checked) => onUpdateRuntimeField('progressive_search_enabled', checked)}
          disabled={isSavingRuntime}
        />
      </div>
      <div className="flex justify-end border-t border-slate-200/70 p-5 sm:px-6 dark:border-slate-800">
        <Button onClick={onSaveRuntimeSettings} disabled={isSavingRuntime}>
          {isSavingRuntime ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存搜索体验配置
        </Button>
      </div>
    </div>
  </div>
);
