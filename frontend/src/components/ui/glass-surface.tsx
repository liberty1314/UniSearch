import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  glassSurfaceFrostVariants,
  glassSurfaceVariants,
  type GlassSurfaceVariant,
} from '@/components/ui/glass-surface-variants';

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
    GlassSurfaceOwnProps {}

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
    const resolvedVariant = (variant ?? 'panel') as GlassSurfaceVariant;
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-transparent dark:opacity-0" />
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

export { GlassSurface };
