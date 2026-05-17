import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';
// Re-exports for shared components used across views
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
    <div className="space-y-6">
      {header}
      {metrics}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {filters}
          {selectionBar}
          {content}
        </div>
        {drawer}
      </div>
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
    <section className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_PANEL_SURFACE_HOVER_CLASSES, 'overflow-hidden p-6 sm:p-7')}>
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
  return <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{children}</section>;
}

export function AdminMetricCard({ label, value, hint }: AdminMetricItemProps) {
  return (
    <div className={cn(ADMIN_PANEL_SURFACE_CLASSES, 'p-5')}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function AdminFilterSurface({ children }: { children: React.ReactNode }) {
  return (
    <section className={cn(ADMIN_PANEL_SURFACE_CLASSES, 'p-4 sm:p-5')}>
      {children}
    </section>
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
          variant="ghost"
          size="sm"
          onClick={onClear}
          className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'h-9 rounded-full px-3')}
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
}

export function AdminDetailDrawer({
  open,
  title,
  description,
  testId,
  onClose,
  children,
  footer,
  emptyTitle,
  emptyDescription,
}: AdminDetailDrawerProps) {
  return (
    <aside
      data-testid={open ? testId : undefined}
      className={cn(
        ADMIN_PANEL_SURFACE_CLASSES,
        'sticky top-6 hidden h-fit min-h-[480px] overflow-hidden xl:flex xl:flex-col',
        !open && 'justify-center'
      )}
    >
      {open ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 px-5 py-5 dark:border-white/10">
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
              {description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="关闭详情抽屉"
              className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'h-9 w-9 rounded-full')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-slate-200/60 px-5 py-4 dark:border-white/10">{footer}</div> : null}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="glass-toolbar flex h-14 w-14 items-center justify-center rounded-[1.35rem] text-slate-500 dark:text-slate-300">
            <X className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-800 dark:text-slate-100">{emptyTitle}</p>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{emptyDescription}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
