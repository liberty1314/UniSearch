import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  tone?: 'blue' | 'emerald' | 'rose';
  reserveMessageSpace?: boolean;
}

export const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      containerClassName,
      labelClassName,
      startAdornment,
      endAdornment,
      tone = 'blue',
      reserveMessageSpace = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const toneClasses = {
      blue: 'focus:border-blue-500 dark:focus:border-blue-300 focus:ring-blue-500/20 dark:focus:ring-blue-400/20',
      emerald: 'focus:border-emerald-500 dark:focus:border-emerald-300 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
      rose: 'focus:border-rose-500 dark:focus:border-rose-300 focus:ring-rose-500/20 dark:focus:ring-rose-400/20',
    } as const;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2',
              'transition-colors duration-200',
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {startAdornment && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
          className={cn(
              'glass-input px-4 py-3 text-base',
              startAdornment && 'pl-11',
              endAdornment && 'pr-12',
              'transition-all duration-200 ease-out',
              toneClasses[tone],
              'focus:bg-white/82 dark:focus:bg-slate-900/62',
              
              // 错误状态
              error && [
                'border-red-400 dark:border-red-300',
                'focus:ring-red-500/20 dark:focus:ring-red-400/20',
                'focus:border-red-500 dark:focus:border-red-300',
              ],
              
              // 禁用状态
              'disabled:bg-gray-100/75 dark:disabled:bg-slate-900/66',
              
              // 移动端优化 (防止 iOS 自动缩放)
              'text-[16px] sm:text-base',
              
              // 触摸优化
              'touch-manipulation',
              
              className
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {endAdornment}
            </div>
          )}
        </div>

        {/* 底部信息区 (使用绝对定位防止撑开布局) */}
        {reserveMessageSpace || error || helperText ? (
          <div className="relative h-6 mt-1">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  id={errorId}
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute inset-x-0 top-0 flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{error}</span>
                </motion.div>
              ) : helperText ? (
                <motion.div
                  key="helper"
                  id={helperId}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute inset-x-0 top-0"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {helperText}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';
