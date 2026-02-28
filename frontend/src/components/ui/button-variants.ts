import { cn } from '@/lib/utils';

export const buttonVariants = (props?: { variant?: string; size?: string }) => {
  const variant = props?.variant || 'default';
  const size = props?.size || 'default';

  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all';

  const variants: Record<string, string> = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'hover:bg-gray-100',
    link: 'text-blue-500 underline-offset-4 hover:underline',
  };

  const sizes: Record<string, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };

  return cn(baseStyles, variants[variant] || variants.default, sizes[size] || sizes.default);
};
