import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminDeleteActionProps
  extends Omit<ButtonProps, 'children' | 'variant' | 'size'> {
  compact?: boolean;
  label?: string;
  isLoading?: boolean;
}

export const AdminDeleteAction = React.forwardRef<
  HTMLButtonElement,
  AdminDeleteActionProps
>(({
  compact = false,
  label = '删除',
  isLoading = false,
  className,
  disabled,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      disabled={disabled || isLoading}
      className={cn(
        'admin-delete-action h-auto min-h-9 justify-start gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
        'border-rose-200/70 text-rose-700 bg-rose-50/85 hover:border-rose-300 hover:bg-rose-100/85',
        'dark:border-rose-300/[0.25] dark:bg-rose-400/[0.12] dark:text-rose-100 dark:hover:border-rose-300/[0.35] dark:hover:bg-rose-400/[0.18]',
        compact ? 'min-w-[4.2rem]' : 'min-w-[5rem]',
        className,
      )}
      {...props}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-slate-950/70">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </span>
      <span>{label}</span>
    </Button>
  );
});

AdminDeleteAction.displayName = 'AdminDeleteAction';
