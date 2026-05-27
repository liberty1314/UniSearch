import * as React from 'react';
import { cn } from '@/lib/utils';

type CompactSurfaceDensity = 'compact' | 'comfortable';
type CompactSurfaceTone = 'neutral' | 'active' | 'danger';

interface CompactSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  density?: CompactSurfaceDensity;
  tone?: CompactSurfaceTone;
}

const densityClassMap: Record<CompactSurfaceDensity, string> = {
  compact: 'rounded-[1.1rem] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]',
  comfortable: 'rounded-[1.35rem] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]',
};

const toneClassMap: Record<CompactSurfaceTone, string> = {
  neutral:
    'border-slate-200/70 bg-white/72 text-slate-900 dark:border-white/10 dark:bg-slate-950/42 dark:text-slate-100',
  active:
    'border-cyan-200/70 bg-cyan-50/70 text-slate-900 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-slate-100',
  danger:
    'border-red-200/70 bg-red-50/70 text-slate-900 dark:border-red-300/20 dark:bg-red-400/10 dark:text-slate-100',
};

export const CompactSurface = React.forwardRef<HTMLElement, CompactSurfaceProps>(
  (
    {
      as,
      density = 'compact',
      tone = 'neutral',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Component = as || 'div';

    return (
      <Component
        ref={ref}
        data-compact-surface="true"
        className={cn(
          'relative overflow-hidden border backdrop-blur-xl transition-colors duration-200',
          densityClassMap[density],
          toneClassMap[tone],
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

CompactSurface.displayName = 'CompactSurface';
