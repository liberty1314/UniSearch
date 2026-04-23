import React from 'react';
import type { AccountProfile } from '@/components/account/accountTypes';
import AccountOverviewHighlights from '@/components/account/AccountOverviewHighlights';
import AccountOverviewShowcase from '@/components/account/AccountOverviewShowcase';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';

interface AccountOverviewPanelProps {
  profile: AccountProfile | null;
  cachedUsername?: string;
  isLoadingProfile: boolean;
  onOpenSecurity: () => void;
}

const AccountOverviewPanel: React.FC<AccountOverviewPanelProps> = ({
  profile,
  cachedUsername,
  isLoadingProfile,
  onOpenSecurity,
}) => {
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

      <AccountOverviewHighlights
        profile={profile}
        cachedUsername={cachedUsername}
        isLoadingProfile={isLoadingProfile}
      />
      <AccountOverviewShowcase
        profile={profile}
        isLoadingProfile={isLoadingProfile}
        onOpenSecurity={onOpenSecurity}
      />
    </section>
  );
};

export default AccountOverviewPanel;
