import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/40 dark:bg-blue-600 dark:hover:bg-blue-700 dark:shadow-blue-600/30',
        primary: 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/40 dark:bg-blue-600 dark:hover:bg-blue-700 dark:shadow-blue-600/30',
        destructive: 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40 dark:bg-red-600 dark:hover:bg-red-700 dark:shadow-red-600/30',
        outline: 'border border-gray-300 bg-transparent text-gray-700 shadow-sm shadow-black/5 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
        secondary: 'border border-gray-200 bg-gray-100 text-gray-900 shadow-sm shadow-black/5 hover:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        ghost: 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800',
        link: 'text-primary underline-offset-4 hover:underline',
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
