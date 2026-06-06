import React from 'react';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchBox from '@/components/SearchBox';
import { cn } from '@/lib/utils';

interface HomeSearchWorkbenchProps {
  accessHint?: string;
  className?: string;
}

export function HomeSearchWorkbench({
  accessHint,
  className,
}: HomeSearchWorkbenchProps) {
  return (
    <section
      data-testid="home-search-workbench"
      className={cn('mx-auto w-full max-w-4xl space-y-3', className)}
    >
      <SearchBox className="max-w-none" accessHint={accessHint} />
      <div className="flex flex-wrap items-center justify-center gap-2 px-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">不知道搜什么？</span>
        <Link
          to="/trending"
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/70 bg-cyan-50/75 px-3 py-1.5 font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-100 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200"
        >
          <Flame className="h-4 w-4" />
          热门榜单
        </Link>
      </div>
    </section>
  );
}
