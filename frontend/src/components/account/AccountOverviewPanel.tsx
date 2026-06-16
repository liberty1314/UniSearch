import React from 'react';
import type { AccountProfile } from '@/components/account/accountTypes';
import AccountOverviewHighlights from '@/components/account/AccountOverviewHighlights';
import AccountOverviewShowcase from '@/components/account/AccountOverviewShowcase';
import AccountSectionHero from '@/components/account/AccountSectionHero';

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
      <AccountSectionHero eyebrow="ACCOUNT OVERVIEW" title="账号总览" badgeLabel="资料概览" />

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
