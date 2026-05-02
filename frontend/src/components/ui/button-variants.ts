import { cn } from '@/lib/utils';

export const buttonVariants = (props?: { variant?: string; size?: string }) => {
  const variant = props?.variant || 'default';
  const size = props?.size || 'default';

  const baseStyles =
    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50';

  const variants: Record<string, string> = {
    default: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.4)] hover:from-blue-700 hover:to-cyan-600',
    destructive: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_8px_20px_-6px_rgba(244,63,94,0.45)] hover:from-red-600 hover:to-rose-600',
    outline: 'glass-toolbar border-slate-300/55 bg-white/25 text-slate-700 hover:bg-white/55 dark:border-white/12 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-900/58',
    secondary: 'glass-toolbar text-slate-800 hover:bg-white/72 dark:text-slate-200 dark:hover:bg-slate-900/65',
    ghost: 'text-slate-700 hover:bg-white/45 dark:text-slate-300 dark:hover:bg-slate-800/45',
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
