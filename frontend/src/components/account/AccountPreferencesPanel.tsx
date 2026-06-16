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
import type { CloudTypeValue } from '@/types/api';

interface AccountPreferencesPanelProps {
  preferences: AccountPreferences;
  onPreferencesChange: (preferences: AccountPreferences) => void;
  onSave: () => void;
  onOpenSecurity: () => void;
}

const CLOUD_TYPE_OPTIONS: Array<{ value: CloudTypeValue; label: string }> = [
  { value: 'aliyun', label: '阿里云盘' },
  { value: 'quark', label: '夸克网盘' },
  { value: 'baidu', label: '百度网盘' },
];

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

  const toggleCloudType = (cloudType: CloudTypeValue) => {
    const nextCloudTypes = preferences.defaultCloudTypes.includes(cloudType)
      ? preferences.defaultCloudTypes.filter((item) => item !== cloudType)
      : [...preferences.defaultCloudTypes, cloudType];
    updatePreferences({ defaultCloudTypes: nextCloudTypes });
  };

  return (
    <section className="space-y-6">
      <AccountSectionHero eyebrow="PREFERENCES" title="偏好设置" badgeLabel="本地保存" />

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
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
              <div className="grid gap-2 sm:grid-cols-3">
                {CLOUD_TYPE_OPTIONS.map((cloudType) => (
                  <label
                    key={cloudType.value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-slate-200/70 bg-white/55 px-3 text-sm font-medium text-slate-700 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46] dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.defaultCloudTypes.includes(cloudType.value)}
                      onChange={() => toggleCloudType(cloudType.value)}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    {cloudType.label}
                  </label>
                ))}
              </div>
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

          <aside className="glass-panel p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">
              Local Preference
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-white">低频配置</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
              当前偏好仅保存在本机，不保存检索活动，也不会新增数据库活动流水。
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default AccountPreferencesPanel;
