import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearchStore } from "@/stores/searchStore";
import { cn } from "@/lib/utils";
import PasswordModal from "./PasswordModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import LoadingState from "@/components/LoadingState";
import { SearchResultsSkeleton } from "@/components/SkeletonLoader";
import { SearchResultGridCard } from "@/components/home/SearchResultGridCard";
import { SearchResultListItem } from "@/components/home/SearchResultListItem";
import { SearchResultsToolbar } from "@/components/home/SearchResultsToolbar";
import { SearchResultsEmptyState } from "@/components/home/SearchResultsEmptyState";
import { sortResources } from "@/utils/searchResultSorter";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import { SystemSettingsService } from "@/services/systemSettingsService";
import {
  buildResourceDetailRouteState,
  isMagnetTarget,
  normalizeExternalUrl,
  resolveResourceOpenTarget,
} from "@/utils/resourceDisplay";
import {
  buildActiveFilterChips,
  removeActiveFilterChip,
} from "@/utils/searchFilters";
import { SearchService } from "@/services/searchService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResultsProps {
  className?: string;
}

type ViewMode = "list" | "grid";

// ─── Component ────────────────────────────────────────────────────────────────

const SearchResults: React.FC<SearchResultsProps> = ({ className }) => {
  const {
    searchResults,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    loadMore,
    searchParams,
    performSearch,
    displayedCount,
    setSearchParams,
  } = useSearchStore();
  const navigate = useNavigate();
  const location = useLocation();

  const syncSearchUrl = useCallback(
    (nextParams: Partial<typeof searchParams>) => {
      const nextUrl = SearchService.buildSearchUrl({
        ...searchParams,
        ...nextParams,
      });
      const currentUrl = `${location.pathname}${location.search}`;

      if (nextUrl === currentUrl) {
        return;
      }

      navigate(nextUrl, {
        replace: true,
        state: { skipSearchSync: true, preserveScroll: true },
      });
    },
    [location.pathname, location.search, navigate, searchParams],
  );

  const debouncedIsLoading = useDebouncedValue(isLoading, 200);
  const hasManualViewPreferenceRef = useRef(false);

  const getResponsiveViewMode = useCallback(
    (): ViewMode =>
      typeof window !== "undefined" && window.innerWidth < 640
        ? "list"
        : "grid",
    [],
  );

  // 移动端（< 640px）默认使用列表视图，桌面端默认网格视图
  const [viewMode, setViewMode] = useState<ViewMode>(getResponsiveViewMode);
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    password: string;
    url: string;
    cloudType: string;
  }>({
    isOpen: false,
    password: "",
    url: "",
    cloudType: "",
  });
  const [enableResourceDetailPage, setEnableResourceDetailPage] = useState(true);

  // ── 无限滚动观察器 ─────────────────────────────────────────────────────────

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (hasManualViewPreferenceRef.current) {
        return;
      }

      setViewMode(getResponsiveViewMode());
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getResponsiveViewMode]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, isLoading, loadMore]);

  useEffect(() => {
    let isMounted = true;

    void SystemSettingsService.getSettingsCached()
      .then((settings) => {
        if (!isMounted) {
          return;
        }
        setEnableResourceDetailPage(settings.enable_resource_detail_page);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setEnableResourceDetailPage(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── 结果展平 + 排序（全量，由 searchResultSorter 纯函数处理）──────────────

  const allSortedResults = useMemo(
    () => sortResources(searchResults?.resources, searchParams.keyword),
    [searchParams.keyword, searchResults?.resources],
  );

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(searchParams.filter),
    [searchParams.filter],
  );
  const hasAdvancedFilters = activeFilterChips.length > 0;
  const hasSourceFilters = Boolean(searchParams.cloudTypes?.length);
  const hasAnyActiveFilters = hasAdvancedFilters || hasSourceFilters;

  // ── 当前页切片 ─────────────────────────────────────────────────────────────

  const displayedResults = useMemo(
    () => allSortedResults.slice(0, displayedCount),
    [allSortedResults, displayedCount],
  );

  // ── 回调（useCallback 保持引用稳定，配合卡片的 React.memo）───────────────

  const openExternalResource = useCallback((url: string) => {
    const targetUrl = normalizeExternalUrl(url);
    if (!targetUrl) {
      return;
    }

    const openedWindow = window.open(targetUrl, "_blank");
    if (openedWindow) {
      openedWindow.opener = null;
    }
  }, []);

  const handleOpenResource = useCallback(
    (item: ResultItem) => {
      const openTarget = resolveResourceOpenTarget(item);
      if (!openTarget) {
        return;
      }

      if (openTarget.password || isMagnetTarget(openTarget)) {
        setPasswordModal({
          isOpen: true,
          password: openTarget.password,
          url: openTarget.url,
          cloudType: openTarget.cloudType,
        });
        return;
      }

      openExternalResource(openTarget.url);
    },
    [openExternalResource],
  );

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModal({ isOpen: false, password: "", url: "", cloudType: "" });
  }, []);

  const handleOpenDetail = useCallback((item: ResultItem) => {
    navigate(`/resource/${encodeURIComponent(item.resource.id)}`, {
      state: buildResourceDetailRouteState(item.resource, {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        label: "搜索结果",
        keyword: searchParams.keyword,
        routeTransition: "forward",
        transitionSource: "search-results-detail",
        scrollY: window.scrollY,
      }),
    });
  }, [location.hash, location.pathname, location.search, navigate, searchParams.keyword]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    hasManualViewPreferenceRef.current = true;
    setViewMode(mode);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams({ cloudTypes: [], filter: undefined });
    syncSearchUrl({ cloudTypes: [], filter: undefined });
    void performSearch(
      { cloudTypes: [], filter: undefined },
      { preserveResults: true },
    );
  }, [performSearch, setSearchParams, syncSearchUrl]);

  const handleRemoveFilterChip = useCallback((chipId: string) => {
    const chip = activeFilterChips.find((item) => item.id === chipId);
    if (!chip) {
      return;
    }

    const nextFilter = removeActiveFilterChip(searchParams.filter, chip);
    setSearchParams({ filter: nextFilter });
    syncSearchUrl({ filter: nextFilter });
    void performSearch({ filter: nextFilter }, { preserveResults: true });
  }, [activeFilterChips, performSearch, searchParams.filter, setSearchParams, syncSearchUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // 渲染：空状态（error / 无结果 / 无关键词）
  // ─────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <SearchResultsEmptyState
        variant="error"
        error={error}
        onRetry={() => performSearch(searchParams)}
      />
    );
  }

  if (!isLoading && allSortedResults.length === 0 && searchParams.keyword) {
    if (hasAnyActiveFilters) {
      return (
        <SearchResultsEmptyState
          variant="filtered-results"
          onClearFilters={handleClearAllFilters}
        />
      );
    }

    return (
      <SearchResultsEmptyState
        variant="no-results"
        keyword={searchParams.keyword}
        className={className}
        onSuggestSearch={(kw) =>
          performSearch({ ...searchParams, keyword: kw })
        }
      />
    );
  }

  if (!searchParams.keyword) {
    return (
      <SearchResultsEmptyState variant="no-keyword" className={className} />
    );
  }

  // ── 正常结果视图 ───────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-6", className)}>
      {/* 工具栏 */}
      {allSortedResults.length > 0 && (
        <SearchResultsToolbar
          keyword={searchParams.keyword}
          totalCount={allSortedResults.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isRefreshing={isRefreshing}
          activeFilterChips={activeFilterChips}
          onRemoveFilterChip={handleRemoveFilterChip}
          onClearFilters={hasAnyActiveFilters ? handleClearAllFilters : undefined}
        />
      )}

      {/* 结果列表
          每个卡片（React.memo）自管理首次挂载动画；
          loadMore 时旧卡片因 memo 不重渲染，不会重播动画。 */}
      <div
        data-testid="search-results-stage"
        className={cn(
          "relative z-10 w-full",
          viewMode === "grid"
            ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "flex flex-col gap-4",
        )}
      >
        {displayedResults.map((item, index) =>
          viewMode === "grid" ? (
            <SearchResultGridCard
              key={item.resource.id}
              item={item}
              index={index}
              canOpenResource={Boolean(resolveResourceOpenTarget(item))}
              showDetailEntry={enableResourceDetailPage}
              onOpenResource={handleOpenResource}
              onOpenDetail={enableResourceDetailPage ? handleOpenDetail : () => undefined}
            />
          ) : (
            <SearchResultListItem
              key={item.resource.id}
              item={item}
              index={index}
              canOpenResource={Boolean(resolveResourceOpenTarget(item))}
              onOpenResource={handleOpenResource}
              onOpenDetail={enableResourceDetailPage ? handleOpenDetail : () => undefined}
              showDetailEntry={enableResourceDetailPage}
            />
          ),
        )}
      </div>

      {/* 无限滚动触发点 */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex justify-center items-center py-8"
        >
          <LoadingState
            type="inline"
            size="sm"
            message="正在加载更多优质资源..."
          />
        </div>
      )}

      {/* 已加载全部提示 */}
      {!hasMore && displayedResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="glass-toolbar inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-gray-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            已加载全部 {allSortedResults.length} 条结果
          </div>
        </motion.div>
      )}

      {/* 初次加载骨架 */}
      {debouncedIsLoading && displayedResults.length === 0 && (
        <SearchResultsSkeleton viewMode={viewMode} />
      )}

      {/* 密码弹窗 */}
      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={handlePasswordModalClose}
        password={passwordModal.password}
        url={passwordModal.url}
        cloudType={passwordModal.cloudType}
      />
    </div>
  );
};

export default SearchResults;
