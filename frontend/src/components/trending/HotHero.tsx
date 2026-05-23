import React from "react";
import type { HotRankingPeriod } from "@/types/hotRanking";
import type { HotPageMeta } from "@/components/trending/hotRankingPresentation";

const titleMap: Record<HotRankingPeriod, string> = {
  day: "每日热门内容",
  week: "每周热门内容",
  month: "每月热门内容",
  year: "每年热门内容",
};

const periodLabelMap: Record<HotRankingPeriod, string> = {
  day: "日榜",
  week: "周榜",
  month: "月榜",
  year: "年榜",
};

interface HotHeroProps {
  period: HotRankingPeriod;
  meta: HotPageMeta;
  "data-testid"?: string;
}

const HotHero: React.FC<HotHeroProps> = ({ period, meta, "data-testid": dataTestId }) => {
  return (
    <section
      className="glass-card-premium relative overflow-hidden px-6 py-7 md:px-8 md:py-9"
      data-testid={dataTestId}
    >
      <div className="absolute inset-y-0 right-0 hidden w-48 bg-gradient-to-l from-cyan-300/10 via-sky-300/5 to-transparent md:block" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.55fr)] lg:items-end">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
            TMDB 热门榜单
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950 dark:text-cyan-100 sm:text-4xl">
            {titleMap[period]}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-slate-400">
            覆盖电影、电视剧与动漫三类内容，帮助你先看热度，再回站内搜索相关资源。
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-full border border-cyan-200/60 bg-white/75 px-3.5 py-1.5 text-sm font-medium text-cyan-700 shadow-sm dark:border-cyan-300/20 dark:bg-slate-900/45 dark:text-cyan-200">
              {periodLabelMap[period]}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300">
              {meta.categoryLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="glass-toolbar rounded-[1.35rem] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              当前分类
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {meta.categoryLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotHero;
