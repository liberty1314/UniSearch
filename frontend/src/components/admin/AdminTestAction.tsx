import React from 'react';
import { CheckCircle2, Loader2, XCircle, Zap } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AdminTestActionStatus = 'idle' | 'testing' | 'success' | 'error';

interface AdminTestActionProps
  extends Omit<ButtonProps, 'children' | 'variant' | 'size' | 'loading'> {
  status?: AdminTestActionStatus;
  label?: string;
  compact?: boolean;
}

const statusIconMap: Record<AdminTestActionStatus, React.ReactNode> = {
  idle: <Zap className="h-4 w-4" />,
  testing: <Loader2 className="h-4 w-4 animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
};

export const AdminTestAction = React.forwardRef<
  HTMLButtonElement,
  AdminTestActionProps
>(({
  status = 'idle',
  label = '测试',
  compact = false,
  className,
  disabled,
  ...props
}, ref) => {
  const isTesting = status === 'testing';

  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      disabled={disabled || isTesting}
      aria-busy={isTesting || undefined}
      className={cn(
        'admin-test-action h-auto min-h-9 justify-start gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
        'border-blue-200/80 bg-blue-50/85 text-blue-800 hover:border-cyan-300 hover:bg-cyan-50/85 hover:text-cyan-800',
        'dark:border-cyan-300/[0.18] dark:bg-cyan-400/[0.10] dark:text-cyan-100 dark:hover:border-cyan-300/[0.36] dark:hover:bg-cyan-400/[0.16]',
        status === 'success' && 'border-emerald-200/80 bg-emerald-50/85 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100',
        status === 'error' && 'border-rose-200/80 bg-rose-50/85 text-rose-800 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-100',
        compact ? 'min-w-[4.8rem]' : 'min-w-[5.6rem]',
        className,
      )}
      {...props}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm dark:bg-slate-950/70" aria-hidden="true">
        {statusIconMap[status]}
      </span>
      <span>{label}</span>
    </Button>
  );
});

AdminTestAction.displayName = 'AdminTestAction';
