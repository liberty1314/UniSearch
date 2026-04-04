import React from 'react';
import { cn } from '@/lib/utils';

type HomeSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
};

const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  className,
}) => {
  return (
    <div className={cn('mx-auto max-w-2xl text-center px-4', className)}>
      {eyebrow ? (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-blue-950 dark:text-cyan-100">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
};

export default HomeSectionHeader;
