import React from 'react';
import { AlertTriangle, CalendarClock, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';
import AccountSectionHero from '@/components/account/AccountSectionHero';

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
      iconGradient: 'from-blue-500 via-sky-500 to-cyan-400',
      accentClass: 'group-hover:text-blue-500',
    },
    {
      key: 'role',
      label: '角色',
      value: getAccountRoleLabel(profile?.role),
      Icon: ShieldCheck,
      iconGradient: 'from-emerald-500 via-teal-500 to-green-400',
      accentClass: 'group-hover:text-emerald-500',
    },
    {
      key: 'last_login_at',
      label: '最近登录',
      value: isLoadingProfile ? '加载中...' : formatDate(profile?.last_login_at),
      Icon: Clock3,
      iconGradient: 'from-amber-500 via-orange-500 to-yellow-400',
      accentClass: 'group-hover:text-amber-500',
    },
    {
      key: 'created_at',
      label: '创建时间',
      value: isLoadingProfile ? '加载中...' : formatDate(profile?.created_at),
      Icon: CalendarClock,
      iconGradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      accentClass: 'group-hover:text-cyan-500',
    },
  ] as const;

  return (
    <section className="space-y-6">
      <AccountSectionHero
        eyebrow="Workspace"
        title="账号工作台"
        badgeLabel="ACCOUNT OVERVIEW"
        accentClassName="bg-cyan-200/25 dark:bg-cyan-700/10"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, value, Icon, iconGradient, accentClass }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-[1.8rem] border border-white/40 bg-white/20 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_64px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:bg-white/30 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_20px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-white/40 blur-3xl transition-transform duration-500 group-hover:scale-110 dark:bg-white/[0.05]"
            />
            <div className="relative space-y-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-gradient-to-br ${iconGradient} text-white shadow-[0_14px_30px_rgba(14,165,233,0.18)]`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                <p className={`text-base font-semibold leading-6 text-slate-950 transition-colors dark:text-white ${accentClass}`}>
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow] duration-500 hover:bg-white/30 hover:shadow-[0_20px_64px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_20px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] group sm:p-7">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">安全提示</h3>
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300/90">
              建议定期更新密码，不在公共设备保存登录态，并避免在多个平台重复使用相同密码。修改密码后，旧凭证应立即失效。
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
              密码建议长度 8 位以上
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
              完成修改后建议重新登录已授权设备
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountOverviewPanel;
