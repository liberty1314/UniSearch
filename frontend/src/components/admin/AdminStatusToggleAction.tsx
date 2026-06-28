import React from 'react';
import { Power, PowerOff } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminStatusToggleActionProps
  extends Omit<ButtonProps, 'children' | 'variant' | 'size' | 'aria-label'> {
  enabled: boolean;
  entityLabel: string;
  compact?: boolean;
}

export const AdminStatusToggleAction = React.forwardRef<
  HTMLButtonElement,
  AdminStatusToggleActionProps
>(({
  enabled,
  entityLabel,
  compact = false,
  className,
  ...props
}, ref) => {
  const stateLabel = enabled ? '已启用' : '已停用';

  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      role="switch"
      aria-checked={enabled}
      aria-label={`${entityLabel} 当前${stateLabel}`}
      className={cn(
        'admin-status-toggle-action group/status h-auto min-h-9 justify-start gap-2 rounded-full px-2.5 py-1.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.06)]',
        'focus-visible:outline-cyan-500/70 dark:focus-visible:outline-cyan-300/70',
        enabled
          ? 'border-emerald-200/80 bg-emerald-50/85 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100/85 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100 dark:hover:border-emerald-300/45 dark:hover:bg-emerald-400/15'
          : 'border-slate-200/70 bg-white/70 text-slate-700 hover:border-cyan-200/80 hover:bg-cyan-50/80 hover:text-cyan-800 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52] dark:text-slate-200 dark:hover:border-cyan-300/[0.32] dark:hover:bg-cyan-400/[0.10] dark:hover:text-cyan-100',
        compact ? 'min-w-[5.8rem]' : 'min-w-[6.8rem]',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200',
          enabled
            ? 'border-emerald-300/70 bg-emerald-500 shadow-inner dark:border-emerald-200/35 dark:bg-emerald-400'
            : 'border-slate-300 bg-slate-200 shadow-inner dark:border-slate-600 dark:bg-slate-800',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] shadow-sm transition-transform duration-200 dark:bg-slate-950',
            enabled ? 'translate-x-[1.05rem] text-emerald-600' : 'translate-x-0.5 text-slate-500 dark:text-slate-300',
          )}
        >
          {enabled ? <Power className="h-2.5 w-2.5" /> : <PowerOff className="h-2.5 w-2.5" />}
        </span>
      </span>
      <span className="min-w-0 text-xs font-semibold leading-none">
        {stateLabel}
      </span>
    </Button>
  );
});

AdminStatusToggleAction.displayName = 'AdminStatusToggleAction';
