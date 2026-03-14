import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BLUE_CYAN_HOVER_TEXT } from '@/lib/brandTheme';
import type { AuthTransitionState } from './authRouteMotion';

export interface AuthEntryLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  state?: AuthTransitionState;
  className?: string;
}

export interface AuthEntryLinksRowProps {
  children: React.ReactNode;
  prefixText?: string;
  className?: string;
}

export const AuthEntryLink: React.FC<AuthEntryLinkProps> = ({
  to,
  label,
  icon: Icon,
  state,
  className,
}) => {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        `inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 ${BLUE_CYAN_HOVER_TEXT} hover:underline underline-offset-4 transition-colors duration-200`,
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
};

export const AuthEntryLinksRow: React.FC<AuthEntryLinksRowProps> = ({
  children,
  prefixText,
  className,
}) => {
  return (
    <div className={cn('mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2', className)}>
      {prefixText ? (
        <span className="text-sm text-gray-500 dark:text-slate-400">{prefixText}</span>
      ) : null}
      {children}
    </div>
  );
};
