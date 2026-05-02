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
        'group relative inline-flex h-[32px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        checked 
          ? 'bg-blue-500 hover:bg-blue-600' 
          : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span className="sr-only">Toggle</span>
      
      {/* Background shadow for extra depth */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute h-full w-full rounded-full border shadow-inner transition-colors duration-300',
          checked 
            ? 'border-blue-600/20' 
            : 'border-black/5 dark:border-white/5'
        )}
      />

      <motion.span
        initial={false}
        animate={{
          x: checked ? 20 : 2,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={cn(
          'pointer-events-none absolute left-0 inline-block h-[28px] w-[28px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] ring-0 transition-shadow',
          !disabled && 'group-active:w-[34px]',
          checked && !disabled && 'group-active:ml-[-6px]'
        )}
      />
    </button>
  );
};
