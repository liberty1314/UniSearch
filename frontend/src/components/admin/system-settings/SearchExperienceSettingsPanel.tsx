import React from 'react';
import { FileSearch, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import type { RuntimeSettingsResponse } from '@/services/systemSettingsService';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_CLASSES } from './panelStyles';

interface SearchExperienceSettingsPanelProps {
  enableResourceDetailPage: boolean;
  enableResourceSourceBadges: boolean;
  runtimeSettings: RuntimeSettingsResponse;
  isSaving: SavingState;
  isSavingRuntime: boolean;
  onToggleResourceDetailPage: (checked: boolean) => void;
  onToggleResourceSourceBadges: (checked: boolean) => void;
  onUpdateRuntimeField: <K extends keyof RuntimeSettingsResponse>(
    field: K,
    value: RuntimeSettingsResponse[K],
  ) => void;
  onSaveRuntimeSettings: () => void;
}

export const SearchExperienceSettingsPanel: React.FC<SearchExperienceSettingsPanelProps> = ({
  enableResourceDetailPage,
  enableResourceSourceBadges,
  runtimeSettings,
  isSaving,
  isSavingRuntime,
  onToggleResourceDetailPage,
  onToggleResourceSourceBadges,
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
