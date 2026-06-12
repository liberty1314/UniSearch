import React from 'react';
import { Sparkles, UserRound } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';

interface AccountHeroBannerProps {
  profile: AccountProfile | null;
  cachedUsername?: string;
  isLoadingProfile: boolean;
}

const formatStatus = (profile: AccountProfile | null, isLoadingProfile: boolean) => {
  if (isLoadingProfile) {
    return '正在同步当前账号状态';
  }

  if (profile?.last_login_at) {
    return '最近登录正常，可继续管理账号信息与密码设置。';
  }

  return '已准备好查看账号信息与安全设置。';
};

const AccountHeroBanner: React.FC<AccountHeroBannerProps> = ({
  profile,
  cachedUsername,
  isLoadingProfile,
}) => {
  const username = isLoadingProfile ? '加载中...' : profile?.username || cachedUsername || '—';
  const roleLabel = getAccountRoleLabel(profile?.role);
  const statusText = formatStatus(profile, isLoadingProfile);
  const roleSummary = isLoadingProfile ? '正在识别身份标签' : `当前身份：${roleLabel}`;
  const loginSummary = isLoadingProfile
    ? '最近登录：加载中...'
    : profile?.last_login_at
      ? '最近登录：状态正常'
      : '最近登录：暂无记录';

  return (
    <section
      className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} overflow-hidden px-6 py-7 sm:px-8 sm:py-8`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] border-[0.5px] border-slate-200/50 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_18px_44px_rgba(37,99,235,0.28)]">
            <UserRound className="h-8 w-8" strokeWidth={2} />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">
                Account Workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white sm:text-4xl">
                欢迎回来，{username}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300/90">
                {statusText}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border-[0.5px] border-slate-200/60 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46] dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5" />
                {roleLabel}
              </span>
              <span className="inline-flex items-center rounded-full border-[0.5px] border-slate-200/60 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46] dark:text-slate-200">
                个人中心
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
          <div className="glass-panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">
              身份标签
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">{roleSummary}</p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">
              状态摘要
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">{loginSummary}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountHeroBanner;
