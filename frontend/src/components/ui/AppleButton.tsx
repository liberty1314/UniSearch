import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'default';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles = cn(
      // 基础样式
      'relative inline-flex items-center justify-center',
      'font-medium rounded-xl',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'touch-manipulation',
      
      // 防止文本选中
      'select-none',
      
      // 宽度
      fullWidth && 'w-full'
    );

    const variantStyles = {
      primary: cn(
        'bg-blue-500 hover:bg-blue-600',
        'dark:bg-blue-600 dark:hover:bg-blue-700',
        'text-white',
        'shadow-lg shadow-blue-500/30 dark:shadow-blue-600/30',
        'hover:shadow-xl hover:shadow-blue-500/40 dark:hover:shadow-blue-600/40',
        'focus:ring-blue-500/30 dark:focus:ring-blue-400/30',
        'active:shadow-md'
      ),
      default: cn(
        'bg-blue-500 hover:bg-blue-600',
        'dark:bg-blue-600 dark:hover:bg-blue-700',
        'text-white',
        'shadow-lg shadow-blue-500/30 dark:shadow-blue-600/30',
        'hover:shadow-xl hover:shadow-blue-500/40 dark:hover:shadow-blue-600/40',
        'focus:ring-blue-500/30 dark:focus:ring-blue-400/30',
        'active:shadow-md'
      ),
      secondary: cn(
        'bg-gray-100 hover:bg-gray-200',
        'dark:bg-slate-800 dark:hover:bg-slate-700',
        'text-gray-900 dark:text-gray-100',
        'border border-gray-200 dark:border-slate-700',
        'focus:ring-gray-500/20 dark:focus:ring-gray-400/20'
      ),
      outline: cn(
        'bg-transparent hover:bg-gray-100',
        'dark:hover:bg-slate-800',
        'text-gray-700 dark:text-slate-300',
        'border border-gray-300 dark:border-slate-700',
        'focus:ring-gray-500/20 dark:focus:ring-gray-400/20'
      ),
      ghost: cn(
        'bg-transparent hover:bg-gray-100',
        'dark:hover:bg-slate-800',
        'text-gray-700 dark:text-slate-300',
        'focus:ring-gray-500/20 dark:focus:ring-gray-400/20'
      ),
      destructive: cn(
        'bg-red-500 hover:bg-red-600',
        'dark:bg-red-600 dark:hover:bg-red-700',
        'text-white',
        'shadow-lg shadow-red-500/30 dark:shadow-red-600/30',
        'hover:shadow-xl hover:shadow-red-500/40 dark:hover:shadow-red-600/40',
        'focus:ring-red-500/30 dark:focus:ring-red-400/30',
        'active:shadow-md'
      ),
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[36px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[52px]',
    };

    return (
      <motion.div
        whileTap={!isDisabled ? { scale: 0.95 } : undefined}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          className={cn(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            className
          )}
          {...props}
        >
        {/* Loading 状态 */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.div>
        )}

        {/* 内容 */}
        <span
          className={cn(
            'flex items-center justify-center gap-2',
            loading && 'opacity-0'
          )}
        >
          {children}
        </span>
        </button>
      </motion.div>
    );
  }
);

AppleButton.displayName = 'AppleButton';
