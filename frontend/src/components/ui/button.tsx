import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(14,165,233,0.6)] hover:from-blue-700 hover:to-cyan-600 border border-transparent',
        primary: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(14,165,233,0.6)] hover:from-blue-700 hover:to-cyan-600 border border-transparent',
        destructive: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_8px_20px_-6px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(244,63,94,0.6)] hover:from-red-600 hover:to-rose-600 border border-transparent',
        outline: 'glass-toolbar border-slate-300/55 bg-white/25 text-slate-700 shadow-glass-soft hover:bg-white/55 dark:border-white/12 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-900/58',
        secondary: 'glass-toolbar text-slate-800 shadow-glass-soft hover:bg-white/72 dark:text-slate-200 dark:hover:bg-slate-900/65',
        glass: 'glass text-slate-800 shadow-glass-strong hover:bg-white/72 hover:shadow-glass-strong dark:text-slate-200 dark:hover:bg-slate-900/58 dark:hover:shadow-glass-dark',
        ghost: 'text-slate-700 dark:text-slate-300 hover:bg-white/45 dark:hover:bg-slate-800/45 backdrop-blur-sm',
        link: 'text-blue-500 dark:text-cyan-400 underline-offset-4 hover:underline',
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
        {...props}
      >
        {asChild ? children : content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };
