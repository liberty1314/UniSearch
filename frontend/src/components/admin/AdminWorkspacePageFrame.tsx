import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ADMIN_DENSITY } from '@/components/admin/adminDensity';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/admin/adminDesign';
// 复用导出供后台各视图共享。
export { AdminContentCard, AdminCardLoading, AdminCardEmpty } from './AdminContentCard';
export { AdminStatusFilter } from './AdminStatusFilter';
export { AdminSearchInput } from './AdminSearchInput';
export { AdminSelectField } from './AdminSelectField';
export type { StatusFilterOption } from './AdminStatusFilter';

interface AdminWorkspacePageProps {
  header: React.ReactNode;
  metrics: React.ReactNode;
  filters: React.ReactNode;
  selectionBar?: React.ReactNode;
  content: React.ReactNode;
  drawer?: React.ReactNode;
}

export function AdminWorkspacePageFrame({
  header,
  metrics,
  filters,
  selectionBar,
  content,
  drawer,
}: AdminWorkspacePageProps) {
  return (
    <div className={ADMIN_DENSITY.pageGap}>
      {header}
      {metrics}
      <div className="space-y-4">
        {filters}
        {selectionBar}
        {content}
      </div>
      {drawer}
    </div>
  );
}

interface AdminWorkspaceHeroProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function AdminWorkspaceHero({
  icon,
  title,
  description,
  badge,
  meta,
  actions,
}: AdminWorkspaceHeroProps) {
  return (
    <section className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_PANEL_SURFACE_HOVER_CLASSES, 'overflow-hidden p-5 sm:p-6')}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-toolbar flex h-12 w-12 items-center justify-center rounded-[1.25rem] text-slate-700 dark:text-slate-200">
              {icon}
            </div>
            {badge ? (
              <Badge className="rounded-full bg-sky-100 px-3 py-1 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                {badge}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          {meta ? <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

interface AdminMetricItemProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function AdminMetricGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-3 md:grid-cols-2 xl:gap-4 2xl:grid-cols-4">{children}</section>;
}

export function AdminMetricCard({ label, value, hint }: AdminMetricItemProps) {
  return (
    <div className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_DENSITY.cardPaddingMd)}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function AdminFilterSurface({ children }: { children: React.ReactNode }) {
  return (
    <section className={cn(ADMIN_PANEL_SURFACE_CLASSES, 'p-3 sm:p-3.5')}>
      {children}
    </section>
  );
}

interface AdminFilterToolbarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminFilterToolbar({
  children,
  actions,
  className,
}: AdminFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className={cn('grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-3', className)}>
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

interface AdminFilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminFilterField({
  label,
  children,
  className,
}: AdminFilterFieldProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[1.05rem] border border-slate-200/60 bg-white/55 px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.035)] backdrop-blur-md transition-colors dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.42]',
        'focus-within:border-cyan-300/80 focus-within:bg-white/80 dark:focus-within:border-cyan-300/[0.34] dark:focus-within:bg-slate-950/[0.62]',
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-1 min-w-0">{children}</div>
    </div>
  );
}

interface AdminSelectionBarProps {
  testId: string;
  summary: string;
  actions: React.ReactNode;
  onClear: () => void;
}

export function AdminSelectionBar({
  testId,
  summary,
  actions,
  onClear,
}: AdminSelectionBarProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-3 rounded-[1.35rem] border border-sky-200/70 bg-sky-50/80 p-4 shadow-sm backdrop-blur dark:border-sky-900/40 dark:bg-sky-950/20 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-center gap-3">
        <Badge className="rounded-full bg-sky-600 px-3 py-1 text-white hover:bg-sky-600">
          {summary}
        </Badge>
        <span className="text-sm text-slate-600 dark:text-slate-300">批量操作已激活</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <Button
          type="button"
          variant="adminAction"
          size="sm"
          onClick={onClear}
        >
          清空选择
        </Button>
      </div>
    </div>
  );
}

interface AdminDetailDrawerProps {
  open: boolean;
  title: string;
  description?: string;
  testId: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  widthClassName?: string;
}

export function AdminDetailDrawer({
  open,
  title,
  description,
  testId,
  onClose,
  children,
  footer,
  widthClassName,
}: AdminDetailDrawerProps) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  const drawer = (
    <aside
      data-testid={testId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${testId}-title`}
      className={cn(
        ADMIN_PANEL_SURFACE_CLASSES,
        'fixed bottom-0 right-0 top-20 z-50 flex w-full max-w-full flex-col overflow-hidden rounded-none shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:bottom-5 sm:right-5 sm:top-24 sm:w-[min(92vw,42rem)] sm:rounded-[1.45rem] lg:right-8',
        widthClassName
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 px-5 py-5 dark:border-cyan-300/[0.12]">
        <div className="min-w-0 space-y-1">
          <h2 id={`${testId}-title`} className="truncate text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        <Button
          type="button"
          variant="adminIconAction"
          size="icon"
          onClick={onClose}
          aria-label="关闭详情抽屉"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
      {footer ? <div className="border-t border-slate-200/60 px-5 py-4 dark:border-cyan-300/[0.12]">{footer}</div> : null}
    </aside>
  );

  return createPortal(drawer, document.body);
}
