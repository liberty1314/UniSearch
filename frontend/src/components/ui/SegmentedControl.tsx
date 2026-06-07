import * as React from 'react';
import { cn } from '@/lib/utils';
import { BRAND_SEGMENT_ACTIVE } from '@/lib/brandTheme';

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
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  testId,
  className,
  buttonClassName,
  activeClassName,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        'inline-flex flex-nowrap items-center gap-1 rounded-[1rem] border border-slate-200/70 bg-white/58 p-1 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/42',
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
              'min-h-9 rounded-[0.8rem] px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-offset-slate-950',
              isActive
                ? activeClassName ?? BRAND_SEGMENT_ACTIVE
                : 'text-slate-600 hover:bg-white/75 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white',
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
