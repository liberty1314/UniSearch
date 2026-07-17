import React from "react";
import { CalendarDays, RotateCcw, SlidersHorizontal } from "lucide-react";
import HotModeTabs from "@/components/trending/HotModeTabs";
import HotCategoryTabs from "@/components/trending/HotCategoryTabs";
import HotPeriodTabs from "@/components/trending/HotPeriodTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

const modeLabels: Record<HotRankingMode, string> = {
  trend: "趋势榜",
  popular: "热门榜",
};

const periodLabels: Record<HotRankingPeriod, string> = {
  day: "每日",
  week: "每周",
  month: "每月",
  year: "每年",
};

const categoryLabels: Record<HotRankingCategory, string> = {
  all: "全部",
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
};

const HotToolbar: React.FC<HotToolbarProps> = ({
  mode,
  period,
  category,
  date,
  weekStart,
  month,
  year,
  onModeChange,
  onPeriodChange,
  onCategoryChange,
  onResetFilters,
  onDateChange,
  onWeekStartChange,
  onMonthChange,
  onYearChange,
}) => {
  const [mobileExpanded, setMobileExpanded] = React.useState(false);
  const availablePeriods = mode === "trend"
    ? (["day", "week"] as HotRankingPeriod[])
    : (["day", "week", "month", "year"] as HotRankingPeriod[]);

  const renderTimeField = () => {
    if (mode === "trend") {
      return (
        <div className="flex min-h-10 items-center gap-2 px-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          <CalendarDays className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
          {period === "day" ? "每日趋势榜" : "每周趋势榜"}
        </div>
      );
    }

    if (period === "day") {
      return (
        <div className="space-y-3">
          <label className="space-y-2">
            <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              指定日期
            </span>
            <Input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              aria-label="指定日期"
              reserveMessageSpace={false}
              className="h-10 rounded-[1rem] py-0 text-sm"
            />
          </label>
        </div>
      );
    }

    if (period === "week") {
      return (
        <div className="space-y-3">
          <label className="space-y-2">
            <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              周起始日
            </span>
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => onWeekStartChange(event.target.value)}
              aria-label="周起始日"
              reserveMessageSpace={false}
              className="h-10 rounded-[1rem] py-0 text-sm"
            />
          </label>
        </div>
      );
    }

    if (period === "month") {
      return (
        <div className="space-y-3">
          <label className="space-y-2">
            <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              指定月份
            </span>
            <Input
              type="month"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
              aria-label="指定月份"
              reserveMessageSpace={false}
              className="h-10 rounded-[1rem] py-0 text-sm"
            />
          </label>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <label className="space-y-2">
          <span className="block px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            指定年份
          </span>
          <Input
            type="number"
            min="2000"
            max="2099"
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            aria-label="指定年份"
            reserveMessageSpace={false}
            className="h-10 rounded-[1rem] py-0 text-sm"
          />
        </label>
      </div>
    );
  };

  return (
    <section className="surface-panel p-4 sm:p-5 lg:p-6">
      <div className="space-y-4 lg:space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 dark:text-slate-500">
              热榜控制台
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
              先定口径，再看榜单
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              选择榜单模式、时间和内容分类，结果将按当前口径刷新。
            </p>

            <div
              data-testid="hot-toolbar-current-context"
              className="mt-3 flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.10)]" />
              <span>{modeLabels[mode]}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
              <span>{periodLabels[period]}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
              <span className="truncate">{categoryLabels[category]}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            aria-label="重置条件"
            title="重置条件"
            className="group h-9 w-9 shrink-0 rounded-[0.9rem] p-0"
          >
            <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => setMobileExpanded((current) => !current)}
          className="h-10 rounded-[0.9rem] sm:hidden"
          aria-expanded={mobileExpanded}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {mobileExpanded ? "收起榜单调整" : "调整榜单"}
        </Button>

        <div
          data-testid="hot-toolbar-control-rail"
          className={cn(
            "overflow-hidden rounded-[1.1rem] border border-slate-200/70 bg-white/40 divide-y divide-slate-200/70 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y dark:border-white/10 dark:bg-slate-950/25 dark:divide-white/10 xl:grid-cols-[minmax(11rem,0.8fr)_minmax(16rem,1.15fr)_minmax(19rem,1.35fr)_minmax(13rem,0.9fr)] xl:divide-y-0",
            mobileExpanded ? "grid" : "hidden sm:grid",
          )}
        >
          <div className="min-w-0 p-3.5 sm:p-4">
            <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
              榜单模式
            </p>
            <div className="mt-2.5">
              <HotModeTabs value={mode} onChange={onModeChange} />
            </div>
          </div>

          <div className="min-w-0 p-3.5 sm:p-4">
            <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
              时间维度
            </p>
            <div className="mt-2.5">
              <HotPeriodTabs value={period} onChange={onPeriodChange} options={availablePeriods} />
            </div>
          </div>

          <div className="min-w-0 p-3.5 sm:p-4">
            <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
              内容分类
            </p>
            <div className="mt-2.5">
              <HotCategoryTabs value={category} onChange={onCategoryChange} />
            </div>
          </div>

          <div
            data-testid="hot-toolbar-time-panel"
            className="min-w-0 p-3.5 sm:p-4"
          >
            <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
              当前周期
            </p>
            <div className="mt-2.5">
              {renderTimeField()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotToolbar;
