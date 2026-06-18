import React from 'react';
import { AlertTriangle, ArrowRight, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import {
  ACCOUNT_ACTION_ICON_CLASSES,
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
  ACCOUNT_PRIMARY_ACTION_BUTTON_CLASSES,
} from '@/components/account/accountDesign';
import { Button } from '@/components/ui/button';

interface AccountOverviewShowcaseProps {
  profile: AccountProfile | null;
  isLoadingProfile: boolean;
  onOpenSecurity: () => void;
}

const getActivitySummary = (profile: AccountProfile | null, isLoadingProfile: boolean) => {
  if (isLoadingProfile) {
    return '正在同步最近活跃状态...';
  }

  if (profile?.last_login_at) {
    return '最近一次登录记录正常，可继续在这里管理账号安全设置。';
  }

  return '暂无最近登录记录，建议定期检查账号凭证状态。';
};

const getIdentitySummary = (profile: AccountProfile | null, isLoadingProfile: boolean) => {
  if (isLoadingProfile) {
    return '正在识别当前账号角色与可见信息。';
  }

  return `当前角色为${getAccountRoleLabel(profile?.role)}，可查看基础资料并修改登录密码。`;
};

const AccountOverviewShowcase: React.FC<AccountOverviewShowcaseProps> = ({
  profile,
  isLoadingProfile,
  onOpenSecurity,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 mb-4 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </div>
        <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight">身份说明</h3>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {getIdentitySummary(profile, isLoadingProfile)}
        </p>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-amber-50 dark:bg-amber-500/10 mb-4 shadow-sm">
          <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
        </div>
        <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight">活跃状态</h3>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {getActivitySummary(profile, isLoadingProfile)}
        </p>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7 sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6`}>
        <div className="flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-blue-50 dark:bg-blue-500/10 mb-4 shadow-sm">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight">快捷动作</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl">
            快速进入密码更新流程，保持当前账号的基础访问凭证处于最新状态。
          </p>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={onOpenSecurity}
            className={ACCOUNT_PRIMARY_ACTION_BUTTON_CLASSES}
          >
            立即修改密码
            <ArrowRight className={ACCOUNT_ACTION_ICON_CLASSES} strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7 sm:col-span-2`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-rose-50 dark:bg-rose-500/10 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight mt-1 sm:mt-1.5">安全提示</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              建议定期更新密码，不在公共设备保存登录态，并避免在多个平台重复使用相同密码。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountOverviewShowcase;
