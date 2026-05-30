import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Film,
  Flame,
  MonitorPlay,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const starterGroups = [
  {
    title: '影视娱乐',
    description: '适合电影、剧集、动漫和高画质片源',
    icon: Film,
    keywords: ['4K', '剧集', '动漫'],
  },
  {
    title: '学习资料',
    description: '适合课程、考试、教程和资料合集',
    icon: BookOpen,
    keywords: ['教程', '考研', '网课'],
  },
  {
    title: '实用软件',
    description: '适合工具、设计、AI 和源码方向',
    icon: MonitorPlay,
    keywords: ['软件', 'AI', '源码'],
  },
] as const;

const fallbackKeywords = ['电影', '纪录片', '前端教程', '效率工具', '设计素材', '音乐合集'];

interface SearchEmptyWorkbenchProps {
  recentKeywords?: string[];
  onKeywordSearch: (keyword: string) => void;
}

export function SearchEmptyWorkbench({
  recentKeywords = [],
  onKeywordSearch,
}: SearchEmptyWorkbenchProps) {
  const visibleRecentKeywords = recentKeywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <section
      data-testid="search-empty-workbench"
      className="overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/70 shadow-[0_20px_54px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/50"
    >
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-100/42 via-sky-50/20 to-transparent dark:from-cyan-400/8 dark:via-sky-400/5" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/75 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-[0_10px_28px_rgba(14,165,233,0.12)] dark:border-cyan-300/20 dark:bg-slate-900/45 dark:text-cyan-200">
                <Search className="h-3.5 w-3.5" />
                搜索启动台
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                选一个线索，马上开始聚合搜索
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300/80">
                未输入关键词时，这里只保留可执行入口：继续最近搜索、试试热门线索，或直接去热门榜单找当前更值得搜的内容。
              </p>
            </div>

            <Link
              to="/hot"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-cyan-500"
            >
              <Flame className="h-4 w-4" />
              查看热门榜单
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {visibleRecentKeywords.length > 0 ? (
            <div className="rounded-[1.25rem] border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/40">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Clock3 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                继续最近搜索
              </div>
              <div className="flex flex-wrap gap-2.5">
                {visibleRecentKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => onKeywordSearch(keyword)}
                    className="inline-flex items-center rounded-full border border-slate-200/75 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                    aria-label={`继续搜索 ${keyword}`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            {starterGroups.map((group) => {
              const Icon = group.icon;

              return (
                <div
                  key={group.title}
                  className="rounded-[1.25rem] border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {group.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.keywords.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => onKeywordSearch(keyword)}
                        className="inline-flex items-center rounded-full border border-slate-200/75 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
                        aria-label={`快速搜索 ${keyword}`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.25rem] border border-dashed border-cyan-200/80 bg-cyan-50/35 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-cyan-700 shadow-sm dark:bg-slate-900/50 dark:text-cyan-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  还没有想法？
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  试试这些宽泛关键词，再通过结果页筛选网盘类型和关键词。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {fallbackKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => onKeywordSearch(keyword)}
                  className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:text-cyan-200"
                  aria-label={`试试搜索 ${keyword}`}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SearchEmptyWorkbench;
