import React from 'react';
import { cn } from '@/lib/utils';

interface TagButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  colorActive?: string; // tailwind classes for active bg/text
}

export const TagButton: React.FC<TagButtonProps> = ({
  className,
  active = false,
  colorActive = 'bg-apple-blue text-white',
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-1 no-tap-highlight',
        active
          ? cn(colorActive, 'border-transparent shadow-sm')
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default TagButton;


