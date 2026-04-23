import React from 'react';
import { AlertTriangle, ArrowRight, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
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
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">身份说明</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
          {getIdentitySummary(profile, isLoadingProfile)}
        </p>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">活跃状态</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
          {getActivitySummary(profile, isLoadingProfile)}
        </p>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">快捷动作</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
          快速进入密码更新流程，保持当前账号的基础访问凭证处于最新状态。
        </p>
        <div className="mt-5">
          <Button
            type="button"
            onClick={onOpenSecurity}
            className="h-11 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.24)] hover:bg-[#0077ED]"
          >
            立即修改密码
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">安全提示</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
          建议定期更新密码，不在公共设备保存登录态，并避免在多个平台重复使用相同密码。
        </p>
      </div>
    </div>
  );
};

export default AccountOverviewShowcase;
