import React from 'react';
import { Globe, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import { resolvePublicSiteUrl } from '@/lib/publicSiteConfig';
import { cn } from '@/lib/utils';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_PADDED_CLASSES } from './panelStyles';

interface SiteDisplaySettingsPanelProps {
  publicSiteUrl: string;
  isSaving: SavingState;
  onPublicSiteUrlChange: (value: string) => void;
  onSaveDisplayConfig: () => void;
}

export const SiteDisplaySettingsPanel: React.FC<SiteDisplaySettingsPanelProps> = ({
  publicSiteUrl,
  isSaving,
  onPublicSiteUrlChange,
  onSaveDisplayConfig,
}) => (
  <div className="space-y-3">
    <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>站点展示</h2>
    <div className={SETTINGS_PANEL_PADDED_CLASSES}>
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <Label className="text-base font-semibold text-slate-900 dark:text-white">
              公开站点 URL
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              此地址将用于邮件通知、全局分享以及系统级的重定向链接
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="public-site-url"
              value={publicSiteUrl}
              onChange={(event) => onPublicSiteUrlChange(event.target.value)}
              placeholder={resolvePublicSiteUrl()}
              disabled={isSaving === 'display'}
              className="h-11 flex-1 rounded-xl border-slate-200/80 bg-white/80 text-[15px] focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80"
            />
            <Button
              onClick={onSaveDisplayConfig}
              aria-label={isSaving === 'display' ? '保存公开站点 URL 中' : '保存公开站点 URL'}
              disabled={isSaving === 'display' || publicSiteUrl === ''}
              className={cn(
                'h-11 w-11 rounded-xl bg-blue-600 text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] transition-all hover:bg-blue-700',
              )}
            >
              {isSaving === 'display' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

