import React from 'react';
import { Fingerprint, LayoutDashboard, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AccountProfile, AccountSection } from '@/components/account/accountTypes';
import { getAccountRoleLabel } from '@/components/account/accountTypes';

interface AccountWorkspaceShellProps {
  activeSection: AccountSection;
  onSectionChange: (section: AccountSection) => void;
  profile: AccountProfile | null;
  cachedUsername?: string;
  isLoadingProfile: boolean;
  children: React.ReactNode;
}

const navItems: Array<{
  id: AccountSection;
  label: string;
  description: string;
  Icon: typeof LayoutDashboard;
}> = [
  {
    id: 'overview',
    label: '账号概览',
    description: '基础资料与安全提示',
    Icon: LayoutDashboard,
  },
  {
    id: 'security',
    label: '修改密码',
    description: '更新登录凭证',
    Icon: ShieldCheck,
  },
];

const AccountWorkspaceShell: React.FC<AccountWorkspaceShellProps> = ({
  activeSection,
  onSectionChange,
  profile,
  cachedUsername,
  isLoadingProfile,
  children,
}) => {
  const username = isLoadingProfile ? '加载中...' : profile?.username || cachedUsername || '—';
  const roleLabel = getAccountRoleLabel(profile?.role);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/45 dark:shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-4 h-28 w-28 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-700/10"
          />

          <div className="relative space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-white shadow-[0_18px_36px_rgba(14,165,233,0.26)] ring-2 ring-white/65">
                <UserRound className="h-8 w-8" strokeWidth={2.2} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  Account
                </p>
                <div>
                  <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{username}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={profile?.is_enabled === false ? 'warning' : 'success'}>
                {profile?.is_enabled === false ? '已停用' : '状态正常'}
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">账户设置与安全入口</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
          <div className="mb-3 flex items-center gap-2 px-2 pt-2">
            <Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              Workspace
            </p>
          </div>

          <nav aria-label="个人中心模块">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {navItems.map(({ id, label, description, Icon }) => {
                const isActive = activeSection === id;

                return (
                  <li key={id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSectionChange(id)}
                      aria-pressed={isActive}
                      className={cn(
                        'h-auto w-full justify-start rounded-[1.4rem] px-4 py-3 text-left',
                        'border border-transparent bg-transparent shadow-none hover:bg-slate-100/80 dark:hover:bg-slate-900/70',
                        isActive &&
                          'border-cyan-200/80 bg-gradient-to-r from-blue-500/12 via-cyan-400/10 to-sky-400/12 text-slate-950 shadow-[0_14px_30px_rgba(14,165,233,0.12)] dark:border-cyan-400/30 dark:bg-cyan-400/[0.08] dark:text-white'
                      )}
                    >
                      <span className="flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300',
                            isActive &&
                              'bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-white shadow-[0_14px_28px_rgba(14,165,233,0.24)] dark:border-cyan-400/20'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            {description}
                          </span>
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
};

export default AccountWorkspaceShell;
