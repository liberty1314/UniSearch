import React from 'react';
import { cn } from '@/lib/utils';

interface AdminContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
};

/**
 * 玻璃表面内容卡片 — 提取自 Channel/Plugin 视图的重复 inline 样式
 */
export function AdminContentCard({
  children,
  className,
  padding = 'md',
}: AdminContentCardProps) {
  return (
    <section
      className={cn(
        'relative rounded-[1.5rem] border border-white/60 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-900/40 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]',
        'overflow-hidden',
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * 玻璃表面卡片 — 加载状态
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
 * 玻璃表面卡片 — 空状态
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
