import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_PRIMARY_BUTTON } from '@/lib/brandTheme';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: BRAND_PRIMARY_BUTTON,
        primary: BRAND_PRIMARY_BUTTON,
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md border border-red-600 dark:bg-red-500 dark:hover:bg-red-400 dark:border-red-400',
        outline: 'glass-toolbar border-slate-300/55 bg-white/[0.28] text-slate-700 shadow-none hover:bg-white/[0.58] dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46] dark:text-slate-200 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08] dark:hover:text-cyan-100',
        secondary: 'glass-toolbar text-slate-800 shadow-none hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-900/[0.62]',
        glass: 'surface-panel text-slate-800 hover:bg-white/[0.82] dark:text-slate-200 dark:hover:bg-slate-900/[0.62]',
        ghost: 'text-slate-700 dark:text-slate-300 hover:bg-white/[0.42] dark:hover:bg-slate-800/[0.42]',
        link: 'text-blue-500 dark:text-cyan-400 underline-offset-4 hover:underline',
        adminAction: 'rounded-full border-[0.5px] border-slate-200/65 bg-white/[0.52] text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.04)] backdrop-blur-md hover:border-cyan-200/80 hover:bg-white/[0.82] hover:text-slate-950 active:translate-y-0 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.50] dark:text-slate-200 dark:hover:border-cyan-300/[0.30] dark:hover:bg-cyan-400/[0.10] dark:hover:text-cyan-100',
        adminPrimaryAction: 'rounded-full border-[0.5px] border-cyan-300/55 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_22px_rgba(14,165,233,0.22)] hover:-translate-y-0.5 hover:from-blue-700 hover:to-cyan-600 hover:shadow-[0_14px_30px_rgba(14,165,233,0.28)] active:translate-y-0 dark:border-cyan-300/[0.28] dark:from-blue-500 dark:to-cyan-400 dark:hover:from-blue-400 dark:hover:to-cyan-300',
        adminDangerAction: 'rounded-full border-[0.5px] border-red-200/70 bg-white/[0.52] text-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.05)] backdrop-blur-md hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:translate-y-0 dark:border-red-900/45 dark:bg-slate-950/[0.50] dark:text-red-300 dark:hover:border-red-500/55 dark:hover:bg-red-950/35 dark:hover:text-red-200',
        adminIconAction: 'rounded-full border-[0.5px] border-slate-200/65 bg-white/45 text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.035)] backdrop-blur-md hover:border-cyan-200/80 hover:bg-white/[0.82] hover:text-slate-900 active:translate-y-0 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.50] dark:text-slate-300 dark:hover:border-cyan-300/[0.30] dark:hover:bg-cyan-400/[0.10] dark:hover:text-cyan-100',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-xs',
        default: 'h-9 px-4 py-2',
        md: 'h-11 px-6 py-3 text-base',
        lg: 'h-10 rounded-lg px-8',
        icon: 'h-9 w-9',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, fullWidth, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;
    const content = (
      <>
        {loading && !asChild && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </>
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? children : content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };
