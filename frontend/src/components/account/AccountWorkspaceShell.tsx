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
  Icon: typeof LayoutDashboard;
}> = [
    {
      id: 'overview',
      label: '账号概览',
      Icon: LayoutDashboard,
    },
    {
      id: 'security',
      label: '修改密码',
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
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow] duration-500 hover:bg-white/30 hover:shadow-[0_20px_64px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_20px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] group">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-4 h-28 w-28 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-700/10 transition-transform duration-500 group-hover:scale-110"
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

            {/* <div className="flex items-center gap-2">
              <Badge variant={profile?.is_enabled === false ? 'warning' : 'success'}>
                {profile?.is_enabled === false ? '已停用' : '状态正常'}
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">账户设置与安全入口</span>
            </div> */}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/20 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow] duration-500 hover:bg-white/30 hover:shadow-[0_20px_64px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_20px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] group">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
          <div className="mb-3 flex items-center gap-2 px-2 pt-2">
            <Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              Workspace
            </p>
          </div>

          <nav aria-label="个人中心模块">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {navItems.map(({ id, label, Icon }) => {
                const isActive = activeSection === id;

                return (
                  <li key={id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSectionChange(id)}
                      aria-pressed={isActive}
                      className={cn(
                        'h-auto w-full justify-start rounded-[1.4rem] px-4 py-4 text-left',
                        'border border-transparent bg-transparent shadow-none hover:bg-slate-100/80 dark:hover:bg-slate-900/70',
                        isActive &&
                        'border-cyan-200/80 bg-gradient-to-r from-blue-500/12 via-cyan-400/10 to-sky-400/12 text-slate-950 shadow-[0_14px_30px_rgba(14,165,233,0.12)] dark:border-cyan-400/30 dark:bg-cyan-400/[0.08] dark:text-white'
                      )}
                    >
                      <span className="flex w-full items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300',
                            isActive &&
                            'bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-white shadow-[0_14px_28px_rgba(14,165,233,0.24)] dark:border-cyan-400/20'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 pb-0.5">
                          <span
                            className={cn(
                              'block text-[15px] font-semibold leading-tight tracking-tight transition-colors duration-300',
                              isActive
                                ? 'text-slate-950 dark:text-white'
                                : 'text-slate-700 dark:text-slate-200'
                            )}
                          >
                            {label}
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
