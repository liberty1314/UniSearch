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
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const toneClasses = {
      blue: 'focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20',
      emerald: 'focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20',
      rose: 'focus:border-rose-500 dark:focus:border-rose-400 focus:ring-rose-500/20 dark:focus:ring-rose-400/20',
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
              // 基础样式
              'w-full px-4 py-3 text-base rounded-xl',
              startAdornment && 'pl-11',
              endAdornment && 'pr-12',
              'bg-white/80 dark:bg-slate-800/80',
              'border border-gray-200 dark:border-slate-700',
              'backdrop-blur-sm',
              
              // 字体与文本
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              
              // 过渡动画
              'transition-all duration-200 ease-out',
              
              // 聚焦状态 (Apple 风格光晕)
              'focus:outline-none',
              'focus:ring-4',
              toneClasses[tone],
              'focus:bg-white dark:focus:bg-gray-800',
              
              // 错误状态
              error && [
                'border-red-500 dark:border-red-400',
                'focus:ring-red-500/20 dark:focus:ring-red-400/20',
                'focus:border-red-500 dark:focus:border-red-400',
              ],
              
              // 禁用状态
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'disabled:bg-gray-100 dark:disabled:bg-gray-900',
              
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

        {/* 错误提示动画 */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              id={errorId}
              role="alert"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 mt-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 辅助文本 */}
        {!error && helperText && (
          <p
            id={helperId}
            className="mt-2 text-sm text-gray-500 dark:text-slate-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';
