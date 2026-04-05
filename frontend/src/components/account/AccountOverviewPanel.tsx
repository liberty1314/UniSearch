import React from 'react';
import { AlertTriangle, CalendarClock, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AccountProfile } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';

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
      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-7 shadow-[0_20px_48px_rgba(15,23,42,0.05)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_22px_56px_rgba(0,0,0,0.34)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 top-4 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                账号工作台
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300/90">
              统一查看当前账户状态、身份信息和最近登录时间。这里保留关键资料概览，把高频安全操作收束到单独模块中。
            </p>
          </div>

          <Badge variant="info" className="w-fit border border-blue-200/80 bg-blue-100/85 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-cyan-300">
            Account Overview
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, value, Icon, iconGradient, accentClass }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-[1.8rem] border border-white/60 bg-white/72 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_18px_42px_rgba(0,0,0,0.32)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-white/30 blur-3xl dark:bg-white/[0.03]"
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

      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_20px_48px_rgba(0,0,0,0.34)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
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
