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
const DEFAULT_POPULAR_PERIOD: HotRankingPeriod = "day";

const getToday = () => new Date().toISOString().slice(0, 10);
const getCurrentMonth = () => getToday().slice(0, 7);
const getCurrentYear = () => getToday().slice(0, 4);
const getCurrentWeekStart = () => {
  const current = new Date();
  const offset = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - offset);
  return current.toISOString().slice(0, 10);
};

const createDefaultHotToolbarState = (): HotToolbarState => ({
  mode: DEFAULT_MODE,
  period: DEFAULT_PERIOD,
  category: DEFAULT_CATEGORY,
  sortBy: DEFAULT_SORT_BY,
  date: getToday(),
  weekStart: getCurrentWeekStart(),
  month: getCurrentMonth(),
  year: getCurrentYear(),
});

interface HotToolbarState {
  mode: HotRankingMode;
  period: HotRankingPeriod;
  category: HotRankingCategory;
  sortBy: HotRankingSortBy;
  date: string;
  weekStart: string;
  month: string;
  year: string;
}
type HotToolbarAction =
  | { type: "setMode"; value: HotRankingMode }
  | { type: "setPeriod"; value: HotRankingPeriod }
  | { type: "setCategory"; value: HotRankingCategory }
  | { type: "setSortBy"; value: HotRankingSortBy }
  | { type: "setDate"; value: string }
  | { type: "setWeekStart"; value: string }
  | { type: "setMonth"; value: string }
  | { type: "setYear"; value: string }
  | { type: "reset" };

const normalizeToolbarState = (state: HotToolbarState): HotToolbarState => {
  if (state.mode === "trend") {
    return {
      ...state,
      period: state.period === "month" || state.period === "year" ? DEFAULT_PERIOD : state.period,
    };
  }

  return state;
};

const hotToolbarReducer = (state: HotToolbarState, action: HotToolbarAction): HotToolbarState => {
  switch (action.type) {
    case "setMode":
      return normalizeToolbarState({
        ...state,
        mode: action.value,
      });
    case "setPeriod":
      return normalizeToolbarState({
        ...state,
        period: action.value,
      });
    case "setCategory":
      return normalizeToolbarState({
        ...state,
        category: action.value,
        sortBy: action.value === "all" ? DEFAULT_SORT_BY : state.sortBy,
      });
    case "setSortBy":
      return normalizeToolbarState({
        ...state,
        sortBy: action.value,
      });
    case "setDate":
      return normalizeToolbarState({
        ...state,
        date: action.value,
      });
    case "setWeekStart":
      return normalizeToolbarState({
        ...state,
        weekStart: action.value,
      });
    case "setMonth":
      return normalizeToolbarState({
        ...state,
        month: action.value,
      });
    case "setYear":
      return normalizeToolbarState({
        ...state,
        year: action.value,
      });
    case "reset":
      return normalizeToolbarState(createDefaultHotToolbarState());
    default:
      return state;
  }
};

const HotPage: React.FC = () => {
  const navigate = useNavigate();
  const [toolbarState, dispatchToolbar] = React.useReducer(
    hotToolbarReducer,
    undefined,
    () => normalizeToolbarState(createDefaultHotToolbarState()),
  );
  const [data, setData] = React.useState<HotRankingResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const {
    mode,
    period,
    category,
    sortBy,
    date: dateFilter,
    weekStart: weekStartFilter,
    month: monthFilter,
    year: yearFilter,
  } = toolbarState;

  const buildQuery = React.useCallback((state: HotToolbarState, page = 1) => ({
    mode: state.mode,
    period: state.period,
    category: state.category,
    sort_by: state.sortBy,
    date: state.mode === "popular" && state.period === "day" ? state.date : undefined,
    week_start: state.mode === "popular" && state.period === "week" ? state.weekStart : undefined,
    month: state.mode === "popular" && state.period === "month" ? state.month : undefined,
    year: state.mode === "popular" && state.period === "year" ? state.year : undefined,
    page,
    page_size: 100,
  }), []);

  const dataRef = React.useRef<HotRankingResponse | null>(null);
  const latestRequestIdRef = React.useRef(0);
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const loadRankings = React.useCallback(async (
    state: HotToolbarState,
  ) => {
    const shouldShowSkeleton = !dataRef.current;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setLoading(shouldShowSkeleton);
    setRefreshing(!shouldShowSkeleton);
    setErrorMessage("");

    try {
      const response = await hotRankingService.getHotRankings(
        buildQuery(state, 1),
      );
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      setData(response);
    } catch (error) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : "请稍后重试";
      setErrorMessage(message);
      if (shouldShowSkeleton) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQuery]);

  React.useEffect(() => {
    void loadRankings(toolbarState);
  }, [loadRankings, toolbarState]);

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
      dispatchToolbar({ type: "setPeriod", value });
    });
  };

  const handleModeChange = (value: HotRankingMode) => {
    startTransition(() => {
      dispatchToolbar({ type: "setMode", value });
    });
  };

  const handleCategoryChange = (value: HotRankingCategory) => {
    startTransition(() => {
      dispatchToolbar({ type: "setCategory", value });
    });
  };

  const handleSortByChange = (value: HotRankingSortBy) => {
    startTransition(() => {
      dispatchToolbar({ type: "setSortBy", value });
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      dispatchToolbar({ type: "reset" });
    });
  };

  const handleRetry = () => {
    void loadRankings(toolbarState);
  };

  const handleLoadMore = async () => {
    if (!data?.has_more || !data.next_page) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextResponse = await hotRankingService.getHotRankings(
        buildQuery(toolbarState, data.next_page),
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
  const showRefreshOverlay = refreshing && !loading && !errorMessage && (hasHeroItems || hasListItems);

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
          onDateChange={(value) => startTransition(() => dispatchToolbar({ type: "setDate", value }))}
          onWeekStartChange={(value) => startTransition(() => dispatchToolbar({ type: "setWeekStart", value }))}
          onMonthChange={(value) => startTransition(() => dispatchToolbar({ type: "setMonth", value }))}
          onYearChange={(value) => startTransition(() => dispatchToolbar({ type: "setYear", value }))}
        />

        {loading ? <HotPageSkeleton /> : null}

        {!loading && errorMessage ? (
          <HotPageErrorState
            categoryLabel={pageMeta.categoryLabel}
            message={errorMessage}
            onRetry={handleRetry}
          />
        ) : null}

        {!loading && !errorMessage && (hasListItems || data?.has_more) ? (
          <div className="relative space-y-8">
            {showRefreshOverlay ? (
              <div
                className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]"
                data-testid="hot-page-refresh-overlay"
                aria-hidden="true"
              >
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] dark:bg-slate-950/26" />
                <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/65 to-transparent opacity-80 animate-[hotPageRefreshShimmer_1.2s_ease-in-out_infinite] dark:via-cyan-100/18" />
              </div>
            ) : null}
            {renderSections
              .filter((section) => section.items.length > 0)
              .map((section, index) => (
                <div key={section.category} data-testid="hot-page-section">
                  <HotMediaGrid
                    section={section}
                    variant={index === 0 ? "primary" : "secondary"}
                    onSearch={handleSearch}
                    showSortControl={index === 0}
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
