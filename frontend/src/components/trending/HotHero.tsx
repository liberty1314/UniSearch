import React from "react";
import { Clock3, Database, Sparkles } from "lucide-react";
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

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return "待刷新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const HotHero: React.FC<HotHeroProps> = ({ period, meta, "data-testid": dataTestId }) => {
  return (
    <section
      className="glass-card-premium relative overflow-hidden px-6 py-7 md:px-8 md:py-9"
      data-testid={dataTestId}
    >
      <div className="absolute inset-y-0 right-0 hidden w-56 bg-gradient-to-l from-cyan-300/10 via-sky-300/5 to-transparent md:block" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_58%)]" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
            热门榜单
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950 dark:text-cyan-100 sm:text-4xl">
            {titleMap[period]}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-slate-400">
            覆盖电影、电视剧与动漫三类内容，帮助你先看热度，再回站内搜索相关资源。
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50/80 px-3.5 py-1.5 text-sm font-medium text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200">
            <Sparkles className="h-4 w-4" />
            先看热度，再搜资源
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <div className="glass-toolbar rounded-[1.35rem] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              当前口径
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {meta.categoryLabel}
            </p>
          </div>
          <div className="glass-toolbar rounded-[1.35rem] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              当前周期
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {periodLabelMap[period]}
            </p>
          </div>
          <div className="glass-toolbar rounded-[1.35rem] px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <Database className="h-3.5 w-3.5" />
              榜单范围
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {meta.sourceLabel || "热门趋势"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {meta.note || "按当前周期整理热门内容，便于快速浏览与搜索。"}
            </p>
          </div>
          <div className="glass-toolbar rounded-[1.35rem] px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <Clock3 className="h-3.5 w-3.5" />
              已更新
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {formatUpdatedAt(meta.updatedAtLabel)}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              当前页共整合 {meta.sectionCount || 0} 个热门分区。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotHero;
