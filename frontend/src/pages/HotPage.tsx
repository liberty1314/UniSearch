import React from "react";
import { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import HotHeroCarousel from "@/components/trending/HotHeroCarousel";
import HotToolbar from "@/components/trending/HotToolbar";
import HotMediaGrid from "@/components/trending/HotMediaGrid";
import HotPageSkeleton from "@/components/trending/HotPageSkeleton";
import HotPageErrorState from "@/components/trending/HotPageErrorState";
import HotPageEmptyState from "@/components/trending/HotPageEmptyState";
import {
  buildHeroItems,
  buildHotPageMeta,
  resolvePrimarySection,
  resolveSecondarySections,
} from "@/components/trending/hotRankingPresentation";
import { hotRankingService } from "@/services/hotRankingService";
import { SearchService } from "@/services/searchService";
import type {
  HotRankingCategory,
  HotRankingItem,
  HotRankingMode,
  HotRankingPeriod,
  HotRankingResponse,
  HotRankingSortBy,
} from "@/types/hotRanking";

const DEFAULT_MODE: HotRankingMode = "trend";
const DEFAULT_PERIOD: HotRankingPeriod = "day";
const DEFAULT_CATEGORY: HotRankingCategory = "all";
const DEFAULT_SORT_BY: HotRankingSortBy = "popularity.desc";

const getToday = () => new Date().toISOString().slice(0, 10);
const getCurrentMonth = () => getToday().slice(0, 7);
const getCurrentYear = () => getToday().slice(0, 4);
const getCurrentWeekStart = () => {
  const current = new Date();
  const offset = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - offset);
  return current.toISOString().slice(0, 10);
};

const createDefaultHotToolbarState = () => ({
  mode: DEFAULT_MODE,
  period: DEFAULT_PERIOD,
  category: DEFAULT_CATEGORY,
  sortBy: DEFAULT_SORT_BY,
  date: getToday(),
  weekStart: getCurrentWeekStart(),
  month: getCurrentMonth(),
  year: getCurrentYear(),
});

const HotPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<HotRankingMode>(DEFAULT_MODE);
  const [period, setPeriod] = React.useState<HotRankingPeriod>(DEFAULT_PERIOD);
  const [category, setCategory] = React.useState<HotRankingCategory>(DEFAULT_CATEGORY);
  const [sortBy, setSortBy] = React.useState<HotRankingSortBy>(DEFAULT_SORT_BY);
  const [dateFilter, setDateFilter] = React.useState(getToday);
  const [weekStartFilter, setWeekStartFilter] = React.useState(getCurrentWeekStart);
  const [monthFilter, setMonthFilter] = React.useState(getCurrentMonth);
  const [yearFilter, setYearFilter] = React.useState(getCurrentYear);
  const [data, setData] = React.useState<HotRankingResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const buildQuery = React.useCallback((
    nextMode: HotRankingMode,
    nextPeriod: HotRankingPeriod,
    nextCategory: HotRankingCategory,
    page = 1,
  ) => ({
    mode: nextMode,
    period: nextPeriod,
    category: nextCategory,
    sort_by: nextMode === "popular" && nextCategory !== "all" ? sortBy : undefined,
    date: nextMode === "popular" && nextPeriod === "day" ? dateFilter : undefined,
    week_start: nextMode === "popular" && nextPeriod === "week" ? weekStartFilter : undefined,
    month: nextMode === "popular" && nextPeriod === "month" ? monthFilter : undefined,
    year: nextMode === "popular" && nextPeriod === "year" ? yearFilter : undefined,
    page,
    page_size: 100,
  }), [dateFilter, monthFilter, sortBy, weekStartFilter, yearFilter]);

  const loadRankings = React.useCallback(async (
    nextMode: HotRankingMode,
    nextPeriod: HotRankingPeriod,
    nextCategory: HotRankingCategory,
  ) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await hotRankingService.getHotRankings(
        buildQuery(nextMode, nextPeriod, nextCategory, 1),
      );
      setData(response);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : "请稍后重试";
      setErrorMessage(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  React.useEffect(() => {
    void loadRankings(mode, period, category);
  }, [category, dateFilter, loadRankings, mode, monthFilter, period, weekStartFilter, yearFilter]);

  const appendSections = React.useCallback((current: HotRankingResponse | null, incoming: HotRankingResponse) => {
    if (!current) {
      return incoming;
    }

    if (!incoming || !Array.isArray(incoming.sections)) {
      return current;
    }

    const sectionMap = new Map(current.sections.map((section) => [section.category, section]));
    const mergedSections = current.sections.map((section) => {
      const nextSection = incoming.sections.find((item) => item.category === section.category);
      if (!nextSection) {
        return section;
      }

      const mergedItems = [...section.items, ...nextSection.items];
      const dedupedItems = mergedItems.filter((item, index, items) => (
        items.findIndex((candidate) => candidate.id === item.id && candidate.media_type === item.media_type) === index
      ));

      return {
        ...section,
        items: dedupedItems,
      };
    });

    for (const nextSection of incoming.sections) {
      if (!sectionMap.has(nextSection.category)) {
        mergedSections.push(nextSection);
      }
    }

    return {
      ...incoming,
      sections: mergedSections,
    };
  }, []);

  const handlePeriodChange = (value: HotRankingPeriod) => {
    startTransition(() => {
      setPeriod(value);
    });
  };

  const handleModeChange = (value: HotRankingMode) => {
    startTransition(() => {
      setMode(value);
      if (value === "trend" && (period === "month" || period === "year")) {
        setPeriod("day");
      }
    });
  };

  const handleCategoryChange = (value: HotRankingCategory) => {
    startTransition(() => {
      setCategory(value);
      if (value === "all") {
        setSortBy(DEFAULT_SORT_BY);
      }
    });
  };

  const handleSortByChange = (value: HotRankingSortBy) => {
    startTransition(() => {
      setSortBy(value);
    });
  };

  const handleResetFilters = () => {
    const defaults = createDefaultHotToolbarState();
    startTransition(() => {
      setMode(defaults.mode);
      setPeriod(defaults.period);
      setCategory(defaults.category);
      setSortBy(defaults.sortBy);
      setDateFilter(defaults.date);
      setWeekStartFilter(defaults.weekStart);
      setMonthFilter(defaults.month);
      setYearFilter(defaults.year);
    });
  };

  const handleRetry = () => {
    void loadRankings(mode, period, category);
  };

  const handleLoadMore = async () => {
    if (!data?.has_more || !data.next_page) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextResponse = await hotRankingService.getHotRankings(
        buildQuery(mode, period, category, data.next_page),
      );
      setData((current) => appendSections(current, nextResponse));
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : "加载更多失败，请稍后重试";
      setErrorMessage(message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (item: HotRankingItem) => {
    navigate(
      SearchService.buildSearchUrl({
        keyword: item.title,
        source: "all",
        resultType: "merge",
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
      }),
    );
  };

  const pageMeta = buildHotPageMeta(data, category);
  const primarySection = React.useMemo(() => resolvePrimarySection(data?.sections ?? []), [data?.sections]);
  const secondarySections = React.useMemo(
    () => resolveSecondarySections(data?.sections ?? []),
    [data?.sections],
  );
  const heroItems = React.useMemo(() => buildHeroItems(primarySection), [primarySection]);
  const renderSections = React.useMemo(() => {
    const sections = [primarySection, ...secondarySections].filter(
      (section): section is NonNullable<typeof section> => Boolean(section),
    );

    return sections;
  }, [primarySection, secondarySections]);
  const hasHeroItems = heroItems.length > 0;
  const hasListItems = renderSections.some((section) => section.items.length > 0);

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO
        title="热门内容 | UniSearch"
        description="查看电影、电视剧与动漫的热门榜单，并快速跳转站内搜索相关资源。"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        {!loading && !errorMessage && hasHeroItems ? (
          <HotHeroCarousel
            period={period}
            meta={pageMeta}
            items={heroItems}
            onSearch={handleSearch}
            data-testid="hot-page-hero"
          />
        ) : null}

        <HotToolbar
          mode={mode}
          period={period}
          category={category}
          sortBy={sortBy}
          date={dateFilter}
          weekStart={weekStartFilter}
          month={monthFilter}
          year={yearFilter}
          onModeChange={handleModeChange}
          onPeriodChange={handlePeriodChange}
          onCategoryChange={handleCategoryChange}
          onSortByChange={handleSortByChange}
          onResetFilters={handleResetFilters}
          onDateChange={setDateFilter}
          onWeekStartChange={setWeekStartFilter}
          onMonthChange={setMonthFilter}
          onYearChange={setYearFilter}
        />

        {loading ? <HotPageSkeleton /> : null}

        {!loading && errorMessage ? (
          <HotPageErrorState
            categoryLabel={pageMeta.categoryLabel}
            message={errorMessage}
            onRetry={handleRetry}
          />
        ) : null}

        {!loading && !errorMessage && hasListItems ? (
          <div className="space-y-8">
            {renderSections
              .filter((section) => section.items.length > 0)
              .map((section, index) => (
                <div key={section.category} data-testid="hot-page-section">
                  <HotMediaGrid
                    section={section}
                    variant={index === 0 ? "primary" : "secondary"}
                    onSearch={handleSearch}
                    showSortControl={mode === "popular" && category !== "all" && index === 0}
                    sortBy={sortBy}
                    onSortByChange={handleSortByChange}
                  />
                </div>
              ))}

            {data?.has_more ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    void handleLoadMore();
                  }}
                  disabled={loadingMore}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100"
                >
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !errorMessage && !hasHeroItems && !hasListItems ? (
          <HotPageEmptyState categoryLabel={pageMeta.categoryLabel} />
        ) : null}
      </div>
    </PublicPageShell>
  );
};

export default HotPage;
