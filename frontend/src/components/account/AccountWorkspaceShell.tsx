import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AccountHeroBanner from '@/components/account/AccountHeroBanner';
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
    <div className="space-y-6">
      <AccountHeroBanner
        profile={profile}
        cachedUsername={cachedUsername}
        isLoadingProfile={isLoadingProfile}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-3`}>
            <div className="mb-3 flex items-center gap-2 px-2 pt-2">
              <Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                Workspace
              </p>
            </div>
            <div className="mb-4 space-y-2 px-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
                账号工作台
              </h2>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                {isLoadingProfile ? '正在同步账号资料...' : `${username} · ${roleLabel}`}
              </p>
            </div>

            <nav aria-label="个人中心模块">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {navItems.map(({ id, label, Icon }) => {
                  const isActive = activeSection === id;

                  return (
                    <li key={id} className="relative z-0">
                      {isActive ? (
                        <motion.div 
                          layoutId="activeAccountNavBg"
                          className="absolute inset-0 z-0 rounded-[1.4rem] border-[0.5px] border-white/60 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06),0_1px_3px_rgb(0,0,0,0.02)] dark:border-white/10 dark:bg-slate-800/80" 
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onSectionChange(id)}
                        aria-pressed={isActive}
                        className={cn(
                          'relative z-10 h-auto w-full justify-start rounded-[1.4rem] border border-transparent bg-transparent px-4 py-4 text-left shadow-none transition-colors duration-300',
                          !isActive && 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        )}
                      >
                        <span className="flex w-full items-center gap-3">
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                            {isActive ? (
                              <motion.div 
                                layoutId="activeAccountNavIconBg"
                                className="absolute inset-0 z-0 rounded-[14px] bg-white shadow-[0_4px_16px_rgba(37,99,235,0.15)] ring-[0.5px] ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10 dark:shadow-[0_4px_16px_rgba(96,165,250,0.2)]" 
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            ) : (
                              <div className="absolute inset-0 z-0 rounded-[14px] border-[0.5px] border-white/60 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40" />
                            )}
                            <Icon
                              className={cn(
                                'relative z-10 h-4 w-4 transition-colors duration-300',
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                              )}
                            />
                          </span>
                          <span className="relative z-10 min-w-0 pb-0.5">
                            <span
                              className={cn(
                                'block text-[15px] font-semibold leading-tight tracking-tight transition-colors duration-300',
                                isActive
                                  ? 'text-blue-600 dark:text-blue-400'
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
    </div>
  );
};

export default AccountWorkspaceShell;
