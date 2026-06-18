import React from 'react';
import { Eye, EyeOff, KeyRound, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_PADDED_CLASSES } from './panelStyles';

interface ExternalServicesSettingsPanelProps {
  tmdbReadAccessToken: string;
  tmdbCurrentTokenPreview: string;
  isSavingTMDB: boolean;
  isTMDBTokenVisible: boolean;
  hasTMDBDraft: boolean;
  onTMDBTokenVisibleChange: (visible: boolean) => void;
  onTMDBDraftChange: (hasDraft: boolean) => void;
  onTMDBReadAccessTokenChange: (value: string) => void;
  onSaveTMDBConfig: () => void;
}

export const ExternalServicesSettingsPanel: React.FC<ExternalServicesSettingsPanelProps> = ({
  tmdbReadAccessToken,
  tmdbCurrentTokenPreview,
  isSavingTMDB,
  isTMDBTokenVisible,
  hasTMDBDraft,
  onTMDBTokenVisibleChange,
  onTMDBDraftChange,
  onTMDBReadAccessTokenChange,
  onSaveTMDBConfig,
}) => (
  <div className="space-y-3">
    <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>外部服务</h2>
    <div className={SETTINGS_PANEL_PADDED_CLASSES}>
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <Label className="text-base font-semibold text-slate-900 dark:text-white">
              TMDB Read Access Token
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              用于访问 TMDB 数据接口，请填写 Read Access Token。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              containerClassName="flex-1"
              id="tmdb-read-access-token"
              type={isTMDBTokenVisible ? 'text' : 'password'}
              value={hasTMDBDraft ? tmdbReadAccessToken : tmdbCurrentTokenPreview}
              onChange={(event) => {
                onTMDBDraftChange(true);
                onTMDBReadAccessTokenChange(event.target.value);
              }}
              placeholder="请输入 TMDB Read Access Token"
              disabled={isSavingTMDB}
              className="h-11 bg-white/80 text-[15px] focus-visible:ring-amber-500 dark:border-slate-700 dark:bg-slate-800/80"
              endAdornment={
                <button
                  type="button"
                  onClick={() => onTMDBTokenVisibleChange(!isTMDBTokenVisible)}
                  aria-label={isTMDBTokenVisible ? '隐藏 TMDB 令牌' : '查看 TMDB 令牌'}
                  className="text-slate-400 transition hover:text-slate-600 dark:text-slate-300 dark:hover:text-cyan-200"
                  disabled={!tmdbReadAccessToken && !tmdbCurrentTokenPreview}
                >
                  {isTMDBTokenVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <Button
              onClick={onSaveTMDBConfig}
              aria-label={isSavingTMDB ? '保存 TMDB 令牌中' : '保存 TMDB 令牌'}
              disabled={isSavingTMDB || tmdbReadAccessToken.trim() === ''}
              className={cn(
                'h-11 w-11 rounded-xl bg-amber-500 text-slate-950 shadow-[0_8px_16px_rgba(245,158,11,0.18)] transition-all hover:bg-amber-600',
              )}
            >
              {isSavingTMDB ? (
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

