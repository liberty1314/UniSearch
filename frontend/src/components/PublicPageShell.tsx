import React from 'react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { cn } from '@/lib/utils';

interface PublicPageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const PublicPageShell: React.FC<PublicPageShellProps> = ({
  children,
  className,
  contentClassName,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-900 dark:to-slate-950 transition-colors duration-500 relative overflow-hidden',
        className
      )}
    >
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.07}
          duration={3}
          className="text-blue-600 dark:text-cyan-400 stroke-blue-300/30 dark:stroke-cyan-700/20 fill-blue-500/[0.04] dark:fill-cyan-400/[0.03]"
        />
        <div
          data-testid="public-page-glow"
          className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-radial from-blue-200/25 via-cyan-100/10 to-transparent dark:from-blue-950/25 dark:via-cyan-950/10 dark:to-transparent"
        />
      </div>

      <div className={cn('relative z-10', contentClassName)}>
        {children}
      </div>
    </div>
  );
};

export default PublicPageShell;
