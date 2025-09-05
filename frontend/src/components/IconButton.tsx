import React from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({
    className,
    label,
    size = 'md',
    active = false,
    children,
    ...props
  }, ref) => {
    const sizeClasses =
      size === 'sm'
        ? 'p-1.5 rounded-md'
        : size === 'lg'
        ? 'p-3 rounded-xl'
        : 'p-2 rounded-lg';

    return (
      <button
        ref={ref}
        aria-label={label}
        className={cn(
          'no-tap-highlight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
          'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
          active && 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
          sizeClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;


