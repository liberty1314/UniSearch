import React from "react";
import { CalendarDays, Clapperboard, RotateCcw, Sparkles } from "lucide-react";
import HotModeTabs from "@/components/trending/HotModeTabs";
import HotCategoryTabs from "@/components/trending/HotCategoryTabs";
import HotPeriodTabs from "@/components/trending/HotPeriodTabs";
import type {
  HotRankingCategory,
  HotRankingMode,
  HotRankingPeriod,
  HotRankingSortBy,
} from "@/types/hotRanking";

interface HotToolbarProps {
  mode: HotRankingMode;
  period: HotRankingPeriod;
  category: HotRankingCategory;
  sortBy: HotRankingSortBy;
  date: string;
  weekStart: string;
  month: string;
  year: string;
  onModeChange: (value: HotRankingMode) => void;
  onPeriodChange: (value: HotRankingPeriod) => void;
  onCategoryChange: (value: HotRankingCategory) => void;
  onSortByChange: (value: HotRankingSortBy) => void;
  onResetFilters: () => void;
  onDateChange: (value: string) => void;
  onWeekStartChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}

const HotToolbar: React.FC<HotToolbarProps> = ({
  mode,
  period,
  category,
  sortBy,
  date,
  weekStart,
  month,
  year,
  onModeChange,
  onPeriodChange,
  onCategoryChange,
  onSortByChange,
  onResetFilters,
  onDateChange,
  onWeekStartChange,
  onMonthChange,
  onYearChange,
}) => {
  const modeLabel = mode === "trend" ? "趋势榜" : "热门榜";
  const periodLabelMap: Record<HotRankingPeriod, string> = {
    day: "每日",
    week: "每周",
    month: "每月",
    year: "每年",
  };
  const categoryLabelMap: Record<HotRankingCategory, string> = {
    all: "全部内容",
    movie: "电影",
    tv: "电视剧",
    anime: "动漫",
  };
  const availablePeriods = mode === "trend"
    ? (["day", "week"] as HotRankingPeriod[])
    : (["day", "week", "month", "year"] as HotRankingPeriod[]);

  const activeTimeLabel = (() => {
    if (mode === "trend") {
      return period === "day" ? "当前周期" : "最近一周";
    }
    if (period === "day") {
      return date;
    }
    if (period === "week") {
      return weekStart;
    }
    if (period === "month") {
      return month;
    }
    return year;
  })();

  const renderTimeField = () => {
    if (mode === "trend") {
      return (
        <div className="rounded-[1.2rem] border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm leading-6 text-cyan-700 dark:border-cyan-400/15 dark:bg-cyan-500/10 dark:text-cyan-200">
          {period === "day" ? "当前显示每日趋势榜。" : "当前显示每周趋势榜。"}
        </div>
      );
    }

    if (period === "day") {
      return (
        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            指定日期
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
          />
        </label>
      );
    }

    if (period === "week") {
      return (
        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            周起始日
          </span>
          <input
            type="date"
            value={weekStart}
            onChange={(event) => onWeekStartChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
          />
        </label>
      );
    }

    if (period === "month") {
      return (
        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            指定月份
          </span>
          <input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
          />
        </label>
      );
    }

    return (
      <label className="space-y-2">
        <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          指定年份
        </span>
        <input
          type="number"
          min="2000"
          max="2099"
          value={year}
          onChange={(event) => onYearChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
        />
      </label>
    );
  };

  return (
    <section className="glass-card-premium p-5 md:p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              热榜控制台
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              先定口径，再看榜单
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              先选择榜单模式、时间维度与内容分类，结果区会立刻按当前口径刷新。
            </p>
            </div>

            <button
              type="button"
              onClick={onResetFilters}
              aria-label="重置筛选"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300 dark:hover:border-cyan-400/35 dark:hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:max-w-3xl" data-testid="hot-toolbar-summary">
            <div className="rounded-2xl border border-cyan-100/80 bg-white/65 px-3.5 py-3 shadow-sm dark:border-cyan-400/15 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Sparkles className="h-3.5 w-3.5" />
                当前模式
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{modeLabel}</p>
            </div>
            <div className="rounded-2xl border border-cyan-100/80 bg-white/65 px-3.5 py-3 shadow-sm dark:border-cyan-400/15 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                当前周期
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {periodLabelMap[period]}{mode === "popular" ? ` · ${activeTimeLabel}` : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100/80 bg-white/65 px-3.5 py-3 shadow-sm dark:border-cyan-400/15 dark:bg-slate-900/40">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Clapperboard className="h-3.5 w-3.5" />
                当前分类
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {categoryLabelMap[category]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
          <div className="glass-toolbar rounded-[1.35rem] p-3 xl:col-span-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              榜单模式
            </p>
            <div className="mt-3">
              <HotModeTabs value={mode} onChange={onModeChange} />
            </div>
          </div>

          <div className="glass-toolbar rounded-[1.35rem] p-3 xl:col-span-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              时间维度
            </p>
            <div className="mt-3">
              <HotPeriodTabs value={period} onChange={onPeriodChange} options={availablePeriods} />
            </div>
          </div>

          <div className="glass-toolbar rounded-[1.35rem] p-3 xl:col-span-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              内容分类
            </p>
            <div className="mt-3">
              <HotCategoryTabs value={category} onChange={onCategoryChange} />
            </div>
          </div>

          {mode === "popular" ? (
            <div className="glass-toolbar rounded-[1.35rem] p-3 xl:col-span-3">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                时间筛选
              </p>
              <div className="mt-3">
                {renderTimeField()}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default HotToolbar;
