import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AppleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const AppleSwitch: React.FC<AppleSwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-[0.5px] transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950',
        checked 
          ? 'border-cyan-200/50 bg-gradient-to-r from-blue-600 to-cyan-500' 
          : 'border-slate-200/50 bg-gray-300 dark:border-white/10 dark:bg-slate-600',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
};
