import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ACCOUNT_PANEL_BADGE_CLASSES,
  ACCOUNT_PANEL_EYEBROW_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_TITLE_CLASSES,
} from './accountDesign';

interface AccountSectionHeroProps {
  eyebrow: string;
  title: string;
  badgeLabel: string;
  accentClassName?: string;
}

const AccountSectionHero: React.FC<AccountSectionHeroProps> = ({
  eyebrow,
  title,
  badgeLabel,
  accentClassName,
}) => {
  return (
    <div
      className={cn(
        ACCOUNT_PANEL_SURFACE_CLASSES,
        ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
        'px-6 py-7 sm:px-8 sm:py-8'
      )}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-14 top-4 h-36 w-36 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-110',
          accentClassName ?? 'bg-cyan-200/25 dark:bg-cyan-700/10'
        )}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className={ACCOUNT_PANEL_EYEBROW_CLASSES}>{eyebrow}</p>
            <h2 className={ACCOUNT_PANEL_TITLE_CLASSES}>{title}</h2>
          </div>
        </div>

        <Badge variant="info" className={ACCOUNT_PANEL_BADGE_CLASSES}>
          {badgeLabel}
        </Badge>
      </div>
    </div>
  );
};

export default AccountSectionHero;
