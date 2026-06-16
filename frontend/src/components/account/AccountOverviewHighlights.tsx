import React from 'react';
import { CalendarClock, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';

interface AccountOverviewHighlightsProps {
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

const AccountOverviewHighlights: React.FC<AccountOverviewHighlightsProps> = ({
  profile,
  cachedUsername,
  isLoadingProfile,
}) => {
  const monthlyLoginDayCount = profile?.monthly_login_day_count ?? profile?.monthly_login_days?.length ?? 0;
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
      label: '账号状态',
      value: getAccountRoleLabel(profile?.role),
      Icon: ShieldCheck,
      iconClass: 'text-emerald-500/80 dark:text-emerald-400/80',
      accentClass: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-300',
    },
    {
      key: 'monthly_login_days',
      label: '本月活跃',
      value: isLoadingProfile ? '加载中...' : `已登录 ${monthlyLoginDayCount} 天`,
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, value, Icon, iconClass, accentClass }) => (
        <div
          key={key}
          className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-5 sm:p-6`}
        >
          <div className="relative flex flex-col justify-between h-full space-y-6">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-[14px] border-[0.5px] border-white/80 bg-gradient-to-b from-white/80 to-white/40 shadow-[inset_0_1px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-cyan-300/[0.14] dark:from-slate-950/[0.78] dark:to-slate-950/[0.48] dark:shadow-[inset_0_1px_4px_rgba(148,163,184,0.06),0_8px_20px_rgba(2,6,23,0.24)] transition-transform duration-500 group-hover:scale-110 ${iconClass}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">
                {label}
              </p>
              <p
                className={`text-[17px] font-semibold tracking-tight leading-6 text-slate-800 transition-colors duration-300 dark:text-white ${accentClass}`}
              >
                {value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccountOverviewHighlights;
