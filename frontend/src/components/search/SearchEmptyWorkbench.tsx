import React from 'react';
import {
  ArrowRight,
  Clock3,
  Flame,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  formatCloudTypeNames,
} from '@/components/search/searchLaunchpadPresets';
import type {
  RecentEffectiveSearch,
  SearchLaunchPreset,
  SearchLaunchTrendingEntry,
} from '@/components/search/searchLaunchpadTypes';

interface SearchEmptyWorkbenchProps {
  recentSearches?: RecentEffectiveSearch[];
  trendingEntries?: SearchLaunchTrendingEntry[];
  isTrendingLoading?: boolean;
  onPresetSearch: (preset: SearchLaunchPreset) => void;
  onRemoveRecentSearch?: (id: string) => void;
  onClearRecentSearches?: () => void;
}

export function SearchEmptyWorkbench({
  recentSearches = [],
  trendingEntries = [],
  isTrendingLoading = false,
  onPresetSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
}: SearchEmptyWorkbenchProps) {
  const visibleRecentSearches = recentSearches
    .filter((item) => item.keyword.trim())
    .slice(0, 5);

  return (
    <section
      data-testid="search-empty-workbench"
      className="surface-panel rounded-[1.45rem]"
    >
      <div className="relative p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-100/[0.34] via-sky-50/[0.16] to-transparent dark:from-cyan-400/8 dark:via-sky-400/5" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/75 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-[0_10px_28px_rgba(14,165,233,0.12)] dark:border-cyan-300/20 dark:bg-slate-900/45 dark:text-cyan-200">
                <Search className="h-3.5 w-3.5" />
                搜索启动台
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                选一个更明确的线索，再开始聚合搜索
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300/80">
                未输入关键词时，这里优先展示最近有效搜索和热榜条目，尽量减少一上来就搜到一大片泛结果。
              </p>
            </div>

            <Link
              to="/trending"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200/75 bg-white/70 px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm transition hover:border-cyan-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/[0.42] dark:text-cyan-200 dark:hover:border-cyan-300/30"
            >
              <Flame className="h-4 w-4" />
              查看热门榜单
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {visibleRecentSearches.length > 0 ? (
            <div className="surface-card rounded-[1.15rem] p-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Clock3 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  最近有效搜索
                </div>
                {onClearRecentSearches ? (
                  <button
                    type="button"
                    onClick={onClearRecentSearches}
                    className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    aria-label="清空最近有效搜索"
                  >
                    清空
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleRecentSearches.map((search) => (
                  <div
                    key={search.id}
                    className="group/recent relative inline-flex min-w-[12rem] max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/75 bg-white/80 text-left text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:bg-white hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                  >
                    <button
                      type="button"
                      onClick={() => onPresetSearch({
                        id: `recent-${search.id}`,
                        label: search.keyword,
                        source: 'recent',
                        params: search.params,
                      })}
                      className="flex min-w-0 flex-1 flex-col items-start px-4 py-3 pr-10 text-left"
                      aria-label={`恢复搜索 ${search.keyword}`}
                    >
                      <span className="max-w-full truncate font-semibold">{search.keyword}</span>
                      <span className="mt-1 max-w-full truncate text-xs text-slate-500 dark:text-slate-400">
                        {`${search.total} 条结果 · ${formatCloudTypeNames(search.cloudTypes) || "全部来源"}`}
                      </span>
                    </button>
                    {onRemoveRecentSearch ? (
                      <button
                        type="button"
                        onClick={() => onRemoveRecentSearch(search.id)}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 opacity-80 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-100 sm:opacity-0 sm:group-hover/recent:opacity-100"
                        aria-label={`删除最近有效搜索 ${search.keyword}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="surface-card rounded-[1.15rem] p-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-cyan-700 shadow-sm dark:bg-slate-900/50 dark:text-cyan-200">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  热榜直搜
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  先用真实片名和剧名起步，比直接搜宽泛标签更容易命中可用结果。
                </p>
              </div>
            </div>

            {isTrendingLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在整理今日热榜线索
              </div>
            ) : trendingEntries.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {trendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1rem] border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/35"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {entry.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.subtitle}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {entry.meta}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onPresetSearch(preset)}
                          className="inline-flex items-center rounded-full border border-slate-200/75 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                          aria-label={`${preset.label} ${entry.title}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                热榜暂时没有返回可用条目，可以直接在上方输入更具体的关键词。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SearchEmptyWorkbench;
