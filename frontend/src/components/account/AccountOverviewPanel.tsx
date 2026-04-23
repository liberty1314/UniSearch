import React from 'react';
import { AlertTriangle, CalendarClock, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';

interface AccountOverviewPanelProps {
  profile: AccountProfile | null;
  cachedUsername?: string;
  isLoadingProfile: boolean;
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return '暂无记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无记录';
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AccountOverviewPanel: React.FC<AccountOverviewPanelProps> = ({
  profile,
  cachedUsername,
  isLoadingProfile,
}) => {
  const cards = [
    {
      key: 'username',
      label: '用户名',
      value: isLoadingProfile ? '加载中...' : profile?.username || cachedUsername || '—',
      Icon: UserRound,
      iconClass: 'text-indigo-500/80 dark:text-indigo-400/80',
      accentClass: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-300',
    },
    {
      key: 'role',
      label: '角色',
      value: getAccountRoleLabel(profile?.role),
      Icon: ShieldCheck,
      iconClass: 'text-emerald-500/80 dark:text-emerald-400/80',
      accentClass: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-300',
    },
    {
      key: 'last_login_at',
      label: '最近登录',
      value: isLoadingProfile ? '加载中...' : formatDate(profile?.last_login_at),
      Icon: Clock3,
      iconClass: 'text-amber-500/80 dark:text-amber-400/80',
      accentClass: 'group-hover:text-amber-600 dark:group-hover:text-amber-300',
    },
    {
      key: 'created_at',
      label: '创建时间',
      value: isLoadingProfile ? '加载中...' : formatDate(profile?.created_at),
      Icon: CalendarClock,
      iconClass: 'text-cyan-500/80 dark:text-cyan-400/80',
      accentClass: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-300',
    },
  ] as const;

  return (
    <section className="space-y-6">
      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="relative flex flex-col gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
            ACCOUNT OVERVIEW
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">
            账号总览
          </h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            集中查看账号身份、权限角色与最近活跃情况。
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, value, Icon, iconClass, accentClass }) => (
          <div
            key={key}
            className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-5 hover:-translate-y-1`}
          >
            <div className="relative space-y-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-[1.2rem] border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 ${iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                <p className={`text-base font-semibold leading-6 text-slate-800 transition-colors dark:text-white ${accentClass}`}>
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">安全提示</h3>
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300/90">
              建议定期更新密码，不在公共设备保存登录态，并避免在多个平台重复使用相同密码。
            </p>
          </div>

          {/* <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="rounded-xl border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40">
              密码建议长度 8 位以上
            </div>
            <div className="rounded-xl border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40">
              完成修改后建议重新登录已授权设备
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default AccountOverviewPanel;
