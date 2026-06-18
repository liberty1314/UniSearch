import React from 'react';
import { Bell, Cloud, Palette, Rows3 } from 'lucide-react';
import AccountSectionHero from '@/components/account/AccountSectionHero';
import type {
  AccountPreferences,
  AccountResultViewPreference,
  AccountThemePreference,
} from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Button } from '@/components/ui/button';
import CloudTypeChipGroup from '@/components/CloudTypeChipGroup';

interface AccountPreferencesPanelProps {
  preferences: AccountPreferences;
  onPreferencesChange: (preferences: AccountPreferences) => void;
  onSave: () => void;
  onOpenSecurity: () => void;
}

const AccountPreferencesPanel: React.FC<AccountPreferencesPanelProps> = ({
  preferences,
  onPreferencesChange,
  onSave,
  onOpenSecurity,
}) => {
  const updatePreferences = (nextPreferences: Partial<AccountPreferences>) => {
    onPreferencesChange({
      ...preferences,
      ...nextPreferences,
    });
  };

  return (
    <section className="space-y-6">
      <AccountSectionHero eyebrow="PREFERENCES" title="偏好设置" badgeLabel="本地保存" />

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white">主题偏好</h3>
            </div>
            <SegmentedControl<AccountThemePreference>
              ariaLabel="主题偏好"
              value={preferences.theme}
              onChange={(theme) => updatePreferences({ theme })}
              options={[
                { value: 'system', label: '跟随系统' },
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
              ]}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Rows3 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white">默认结果视图</h3>
            </div>
            <SegmentedControl<AccountResultViewPreference>
              ariaLabel="默认结果视图"
              value={preferences.resultView}
              onChange={(resultView) => updatePreferences({ resultView })}
              options={[
                { value: 'merge', label: '聚合视图' },
                { value: 'list', label: '列表视图' },
              ]}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-[17px] font-semibold text-slate-800 dark:text-white">
              <Cloud className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              默认云盘筛选
            </legend>
            <CloudTypeChipGroup
              selected={preferences.defaultCloudTypes}
              onChange={(nextCloudTypes) => updatePreferences({ defaultCloudTypes: nextCloudTypes })}
              layout="flex-left"
              data-testid="preferences-cloud-chips"
            />
          </fieldset>

          <div className="flex flex-col gap-3 rounded-[1rem] border border-slate-200/70 bg-white/55 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46] sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white">公告提醒</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">保留系统公告提醒，避免错过重要变更。</p>
            </div>
            <AppleSwitch
              checked={preferences.announcementReminder}
              onCheckedChange={(announcementReminder) => updatePreferences({ announcementReminder })}
              aria-label="公告提醒"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-[8px]" onClick={onOpenSecurity}>
              立即修改密码
            </Button>
            <Button type="button" className="h-11 rounded-[8px] bg-[#0071e3] px-6 text-white" onClick={onSave}>
              保存偏好
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountPreferencesPanel;
