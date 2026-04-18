import React from 'react';
import { Fingerprint, LayoutDashboard, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';
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
        <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6`}>

          <div className="relative space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200">
                <UserRound className="h-8 w-8" strokeWidth={2} />
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

        <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-3`}>
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
                        'border border-transparent bg-transparent shadow-none hover:bg-slate-100/50 dark:hover:bg-slate-900/40',
                        isActive &&
                        'border-[0.5px] border-slate-200/50 bg-white/40 text-slate-900 shadow-[0_8px_20px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-white'
                      )}
                    >
                      <span className="flex w-full items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-[0.5px] border-slate-200/50 bg-white/40 text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300',
                            isActive &&
                            'bg-slate-900 border-[0.5px] border-slate-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:bg-white dark:border-white/20 dark:text-slate-900'
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
