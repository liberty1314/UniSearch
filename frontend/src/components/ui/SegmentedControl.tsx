import * as React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_SEGMENT_ACTIVE } from '@/lib/brandTheme';

type SegmentedControlVariant = 'default' | 'pill';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedControlOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  testId?: string;
  className?: string;
  buttonClassName?: string;
  activeClassName?: string;
  variant?: SegmentedControlVariant;
}

const containerVariants: Record<SegmentedControlVariant, string> = {
  default:
    'inline-flex flex-nowrap items-center gap-1 rounded-[1rem] border border-slate-200/70 bg-white/58 p-1 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.46]',
  pill:
    'inline-flex flex-nowrap items-center gap-2 rounded-[1.35rem] border border-slate-200/80 bg-white/72 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-cyan-300/[0.16] dark:bg-slate-950/[0.52] dark:shadow-[0_18px_38px_rgba(2,6,23,0.34)]',
};

const buttonVariants: Record<SegmentedControlVariant, string> = {
  default:
    'min-h-9 rounded-[0.8rem] px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-offset-slate-950',
  pill:
    'min-h-12 rounded-[1rem] px-7 text-[17px] font-semibold tracking-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/55 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-offset-slate-950',
};

const inactiveButtonVariants: Record<SegmentedControlVariant, string> = {
  default:
    'text-slate-600 hover:bg-white/75 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white',
  pill:
    'text-slate-600 hover:bg-blue-50/80 hover:text-slate-900 hover:shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)] dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-white',
};

const activeButtonVariants: Record<SegmentedControlVariant, string> = {
  default: BRAND_SEGMENT_ACTIVE,
  pill:
    'bg-[#2554e8] text-white shadow-[0_8px_18px_rgba(37,84,232,0.28)] hover:bg-[#1f49d4] dark:bg-blue-500 dark:hover:bg-blue-400',
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  testId,
  className,
  buttonClassName,
  activeClassName,
  variant = 'default',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        containerVariants[variant],
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={isActive}
            onClick={() => !option.disabled && onChange(option.value)}
            className={cn(
              buttonVariants[variant],
              isActive
                ? activeClassName ?? activeButtonVariants[variant]
                : inactiveButtonVariants[variant],
              buttonClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
