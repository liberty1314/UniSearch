import React from 'react';
import { FileSearch } from 'lucide-react';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_CLASSES } from './panelStyles';

interface SearchExperienceSettingsPanelProps {
  enableResourceDetailPage: boolean;
  isSaving: SavingState;
  onToggleResourceDetailPage: (checked: boolean) => void;
}

export const SearchExperienceSettingsPanel: React.FC<SearchExperienceSettingsPanelProps> = ({
  enableResourceDetailPage,
  isSaving,
  onToggleResourceDetailPage,
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
    </div>
  </div>
);

