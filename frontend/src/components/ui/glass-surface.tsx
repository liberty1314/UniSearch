import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassSurfaceFrostVariants: Record<'panel' | 'toolbar' | 'search' | 'popover', string> = {
  panel:
    'bg-gradient-to-br from-white/62 via-white/24 to-cyan-100/18 dark:from-[#0f1a2b]/76 dark:via-[#08111f]/52 dark:to-[#020617]/84',
  toolbar:
    'bg-gradient-to-br from-white/56 via-white/16 to-cyan-100/12 dark:from-[#0f1726]/74 dark:via-[#091220]/48 dark:to-[#020617]/82',
  search: '',
  popover: '',
};

const glassSurfaceVariants = cva(
  [
    'relative isolate overflow-hidden',
    'border ring-1',
    'backdrop-blur-2xl backdrop-saturate-150',
    'transition-all duration-300',
  ],
  {
    variants: {
      variant: {
        panel:
          'rounded-3xl bg-white/80 border-slate-200/80 ring-white/70 shadow-[0_24px_56px_rgba(15,23,42,0.08)] dark:bg-[#060d18]/82 dark:border-cyan-400/12 dark:ring-[rgba(165,243,252,0.06)] dark:shadow-[0_34px_80px_rgba(2,6,23,0.52),inset_0_1px_0_rgba(148,163,184,0.16),inset_0_-24px_48px_rgba(8,47,73,0.18)]',
        toolbar:
          'rounded-2xl bg-white/48 border-slate-200/80 ring-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:bg-[#060d18]/84 dark:border-cyan-400/12 dark:ring-[rgba(165,243,252,0.06)] dark:shadow-[0_26px_64px_rgba(2,6,23,0.44),inset_0_1px_0_rgba(148,163,184,0.14),inset_0_-18px_36px_rgba(8,47,73,0.14)]',
        search:
          'rounded-[1.75rem] bg-white/82 border-slate-200/85 ring-white/75 shadow-[0_22px_52px_rgba(15,23,42,0.08)] dark:bg-[#07101b]/86 dark:border-cyan-400/14 dark:ring-[rgba(165,243,252,0.08)] dark:shadow-[0_30px_74px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(148,163,184,0.16),inset_0_-24px_42px_rgba(8,47,73,0.2)]',
        popover:
          'rounded-[22px] bg-white/78 border-slate-200/75 ring-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.12)] dark:bg-[#07101d]/92 dark:border-cyan-400/14 dark:ring-[rgba(165,243,252,0.08)] dark:shadow-[0_34px_84px_rgba(2,6,23,0.62),inset_0_1px_0_rgba(148,163,184,0.14),inset_0_-20px_38px_rgba(8,47,73,0.18)]',
      },
      interactive: {
        true: 'hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(14,165,233,0.14)] dark:hover:border-cyan-300/18 dark:hover:shadow-[0_36px_78px_rgba(8,145,178,0.24),inset_0_1px_0_rgba(186,230,253,0.18)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'panel',
      interactive: false,
    },
  }
);

type GlassSurfaceOwnProps = VariantProps<typeof glassSurfaceVariants> & {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  contentProps?: React.HTMLAttributes<HTMLDivElement>;
  frostOverlayClassName?: string;
};

interface GlassSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'className'>,
    GlassSurfaceOwnProps {
  [key: string]: any;
}

const GlassSurface = React.forwardRef<HTMLElement, GlassSurfaceProps>(
  (rawProps, ref) => {
    const {
      as,
      variant,
      interactive,
      className,
      contentClassName,
      contentProps,
      frostOverlayClassName,
      children,
      ...props
    } = rawProps as GlassSurfaceOwnProps & React.HTMLAttributes<HTMLDivElement>;
    const Component: React.ElementType = as || 'div';
    const resolvedVariant = (variant ?? 'panel') as NonNullable<VariantProps<typeof glassSurfaceVariants>['variant']>;
    const resolvedInteractive = (interactive ?? false) as boolean;
    const baseFrostClassName = glassSurfaceFrostVariants[resolvedVariant];
    const isFrosted = baseFrostClassName.length > 0;

    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        data-glass-surface="true"
        data-glass-variant={resolvedVariant}
        data-glass-frosted={isFrosted ? 'true' : 'false'}
        className={cn(
          glassSurfaceVariants({ variant: resolvedVariant, interactive: resolvedInteractive }),
          className
        )}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {isFrosted && (
          <div
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-0 opacity-95', baseFrostClassName, frostOverlayClassName)}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-cyan-200/26" />
        <div
          className={cn('relative z-10', contentClassName)}
          {...contentProps}
        >
          {children}
        </div>
      </Component>
    );
  }
);

GlassSurface.displayName = 'GlassSurface';

export { GlassSurface, glassSurfaceVariants };
