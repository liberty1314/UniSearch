import React from 'react';
import { ArrowRight, Flame, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const suggestions = [
  '输入资源名、课程名、软件名或主演名',
  '从热门榜单选择当前热度更高的内容',
  '搜索后再按网盘类型和关键词过滤',
] as const;

export function SearchEmptyWorkbench() {
  return (
    <section
      data-testid="search-empty-workbench"
      className="rounded-[1.75rem] border border-slate-200/70 bg-white/62 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/42 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">可以这样开始</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                先输入关键词，或从热门内容里找搜索线索。
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {suggestions.map((item) => (
              <div
                key={item}
                className="rounded-[1rem] border border-slate-200/70 bg-white/65 px-3 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <Link
          to="/hot"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)] transition hover:from-blue-700 hover:to-cyan-600"
        >
          <Flame className="h-4 w-4" />
          查看热门榜单
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
