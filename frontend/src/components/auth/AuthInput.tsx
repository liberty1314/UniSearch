import React, { type ReactNode } from 'react';
import { AppleInput, type AppleInputProps } from '@/components/ui/AppleInput';
import { cn } from '@/lib/utils';

export type AuthInputTone = 'blue' | 'emerald' | 'rose';

export interface AuthInputProps
  extends Omit<
    AppleInputProps,
    | 'containerClassName'
    | 'labelClassName'
    | 'startAdornment'
    | 'endAdornment'
    | 'tone'
  > {
  tone?: AuthInputTone;
  icon?: ReactNode;
  iconClassName?: string;
  endAdornment?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

const iconToneClasses: Record<AuthInputTone, string> = {
  blue: 'text-blue-600 dark:text-blue-300',
  emerald: 'text-emerald-600 dark:text-emerald-300',
  rose: 'text-rose-600 dark:text-rose-300',
};

const labelToneClasses: Record<AuthInputTone, string> = {
  blue: 'text-gray-700 dark:text-slate-300',
  emerald: 'text-gray-700 dark:text-slate-300',
  rose: 'text-gray-700 dark:text-slate-300',
};

const AuthInput: React.FC<AuthInputProps> = ({
  tone = 'blue',
  icon,
  iconClassName,
  endAdornment,
  containerClassName,
  labelClassName,
  className,
  ...props
}) => {
  const startAdornment = icon ? (
    <span className={cn('relative z-10 flex items-center', iconClassName ?? iconToneClasses[tone])}>
      {icon}
    </span>
  ) : undefined;

  return (
    <AppleInput
      {...props}
      tone={tone}
      startAdornment={startAdornment}
      endAdornment={endAdornment}
      containerClassName={cn('space-y-2', containerClassName)}
      labelClassName={cn('transition-colors duration-200', labelToneClasses[tone], labelClassName)}
      className={cn('h-12', className)}
    />
  );
};

export default AuthInput;
