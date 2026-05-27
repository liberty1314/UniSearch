import React from 'react';
import { ADMIN_DENSITY } from '@/components/admin/adminDensity';
import { ADMIN_PANEL_SURFACE_CLASSES } from '@/components/admin/adminDesign';
import { CompactSurface } from '@/components/ui/CompactSurface';
import { cn } from '@/lib/utils';

interface AdminContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: ADMIN_DENSITY.cardPaddingSm,
  md: ADMIN_DENSITY.cardPaddingMd,
  lg: ADMIN_DENSITY.cardPaddingLg,
};

/**
 * 后台内容卡片：复用紧凑表面，避免在各业务视图继续散写玻璃面板。
 */
export function AdminContentCard({
  children,
  className,
  padding = 'md',
}: AdminContentCardProps) {
  return (
    <CompactSurface
      as="section"
      density="compact"
      className={cn(
        ADMIN_PANEL_SURFACE_CLASSES,
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </CompactSurface>
  );
}

/**
 * 后台内容卡片加载态。
 */
export function AdminCardLoading({
  icon,
  text = '加载中...',
}: {
  icon?: React.ReactNode;
  text?: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2">
      {icon}
      {text && <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>}
    </div>
  );
}

/**
 * 后台内容卡片空状态。
 */
export function AdminCardEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
      {icon}
      <div className="space-y-1">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
