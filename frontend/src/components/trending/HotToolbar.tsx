import React from "react";
import { RotateCcw } from "lucide-react";
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
          <Input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label="指定日期"
            reserveMessageSpace={false}
            className="h-10 rounded-[1rem] py-0 text-sm"
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
          <Input
            type="date"
            value={weekStart}
            onChange={(event) => onWeekStartChange(event.target.value)}
            aria-label="周起始日"
            reserveMessageSpace={false}
            className="h-10 rounded-[1rem] py-0 text-sm"
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
          <Input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            aria-label="指定月份"
            reserveMessageSpace={false}
            className="h-10 rounded-[1rem] py-0 text-sm"
          />
        </label>
      );
    }

    return (
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
    );
  };

  return (
    <section className="glass-card-premium p-5 md:p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
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
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="group h-9 w-full rounded-full px-4 text-sm sm:w-auto sm:shrink-0"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180" />
            重置条件
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => setMobileExpanded((current) => !current)}
          className="h-10 rounded-full sm:hidden"
          aria-expanded={mobileExpanded}
        >
          {mobileExpanded ? "收起榜单调整" : "调整榜单"}
        </Button>

        <div
          data-testid="hot-toolbar-filter-grid"
          className={cn(
            "gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(12rem,0.8fr)_minmax(18rem,1.2fr)_minmax(21rem,1.45fr)_minmax(15rem,1fr)]",
            mobileExpanded ? "grid" : "hidden sm:grid",
          )}
        >
          <div className="glass-toolbar min-w-0 rounded-[1.35rem] p-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              榜单模式
            </p>
            <div className="mt-3">
              <HotModeTabs value={mode} onChange={onModeChange} />
            </div>
          </div>

          <div className="glass-toolbar min-w-0 rounded-[1.35rem] p-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              时间维度
            </p>
            <div className="mt-3">
              <HotPeriodTabs value={period} onChange={onPeriodChange} options={availablePeriods} />
            </div>
          </div>

          <div className="glass-toolbar min-w-0 rounded-[1.35rem] p-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              内容分类
            </p>
            <div className="mt-3">
              <HotCategoryTabs value={category} onChange={onCategoryChange} />
            </div>
          </div>

          <div
            data-testid="hot-toolbar-time-panel"
            className="glass-toolbar min-w-0 rounded-[1.35rem] p-3"
          >
            <div>
              {renderTimeField()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotToolbar;
