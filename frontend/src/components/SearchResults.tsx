import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSearchStore } from "@/stores/searchStore";
import { cn } from "@/lib/utils";
import PasswordModal from "./PasswordModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import LoadingState from "@/components/LoadingState";
import SearchResultsHeader from "@/components/search-results/SearchResultsHeader";
import SearchResultsList from "@/components/search-results/SearchResultsList";
import SearchResultsState from "@/components/search-results/SearchResultsState";
import {
  useSearchResultsPresentation,
  type SearchResultsViewMode,
} from "@/components/search-results/useSearchResultsPresentation";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import { SystemSettingsService } from "@/services/systemSettingsService";
import {
  buildResourceDetailRouteState,
  isMagnetTarget,
  isScanTransferTarget,
  normalizeExternalUrl,
  resolveDirectScanTransferUrl,
  type ResourceOpenTarget,
  resolveResourceOpenTarget,
} from "@/utils/resourceDisplay";
import { removeActiveFilterChip } from "@/utils/searchFilters";
import { SearchService } from "@/services/searchService";
import { readJsonStorage, writeJsonStorage } from "@/lib/safeStorage";
import { SEARCH_RESULTS_VIEW_MODE_KEY } from "@/lib/accountPreferences";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResultsProps {
  className?: string;
}

const isSearchResultsViewMode = (
  value: unknown,
): value is SearchResultsViewMode => value === "list" || value === "grid";

const readStoredViewMode = (): SearchResultsViewMode | null => {
  const value = readJsonStorage<unknown>(SEARCH_RESULTS_VIEW_MODE_KEY, null);
  return isSearchResultsViewMode(value) ? value : null;
};

const hasScanTransferPayload = (target: ResourceOpenTarget): boolean => {
  const scanTransfer = target.scanTransfer;
  return Boolean(
    scanTransfer?.qr_code_base64 ||
      scanTransfer?.qr_code_image_url ||
      scanTransfer?.qr_code_value ||
      scanTransfer?.mobile_url ||
      scanTransfer?.transfer_code,
  );
};

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
    progressiveStatus,
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
  const getResponsiveViewMode = useCallback(
    (): SearchResultsViewMode =>
      typeof window !== "undefined" && window.innerWidth < 640
        ? "list"
        : "grid",
    [],
  );
  const initialViewModeRef = useRef<{
    mode: SearchResultsViewMode;
    hasStoredPreference: boolean;
  } | null>(null);

  if (!initialViewModeRef.current) {
    const storedViewMode = readStoredViewMode();
    initialViewModeRef.current = {
      mode: storedViewMode || getResponsiveViewMode(),
      hasStoredPreference: Boolean(storedViewMode),
    };
  }

  const hasManualViewPreferenceRef = useRef(
    initialViewModeRef.current.hasStoredPreference,
  );

  // 移动端（< 640px）默认使用列表视图，桌面端默认网格视图
  const [viewMode, setViewMode] = useState<SearchResultsViewMode>(
    initialViewModeRef.current.mode,
  );
  const [passwordModalTarget, setPasswordModalTarget] = useState<ResourceOpenTarget | null>(null);
  const [resolvingResourceId, setResolvingResourceId] = useState<string | null>(null);
  const [enableResourceDetailPage, setEnableResourceDetailPage] = useState(true);
  const [enableResourceSourceBadges, setEnableResourceSourceBadges] = useState(false);

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
        setEnableResourceSourceBadges(Boolean(settings.enable_resource_source_badges));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setEnableResourceDetailPage(true);
        setEnableResourceSourceBadges(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    activeFilterChips,
    allSortedResults,
    displayedResults,
    hasAnyActiveFilters,
  } = useSearchResultsPresentation({
    searchResults,
    searchParams,
    displayedCount,
  });

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
    async (item: ResultItem) => {
      if (resolvingResourceId) {
        return;
      }

      const openTarget = resolveResourceOpenTarget(item);
      if (!openTarget) {
        return;
      }

      const directScanTransferUrl = resolveDirectScanTransferUrl(openTarget);
      if (directScanTransferUrl) {
        openExternalResource(directScanTransferUrl);
        return;
      }

      const refreshKey = openTarget.scanTransfer?.refresh_key?.trim();
      if (
        isScanTransferTarget(openTarget) &&
        openTarget.scanTransfer?.refreshable &&
        refreshKey &&
        !hasScanTransferPayload(openTarget)
      ) {
        const resourceKey = openTarget.resourceId || openTarget.url;
        setResolvingResourceId(resourceKey);
        try {
          const response = await SearchService.refreshScanTransfer({
            resource_id: openTarget.resourceId,
            link_url: openTarget.url,
            refresh_key: refreshKey,
          });
          if (!response.scan_transfer) {
            throw new Error("当前资源未返回新的扫码载荷");
          }
          const refreshedDirectUrl = resolveDirectScanTransferUrl({
            accessMode: "scan_transfer",
            scanTransfer: response.scan_transfer,
          });
          if (refreshedDirectUrl) {
            openExternalResource(refreshedDirectUrl);
            return;
          }
          setPasswordModalTarget({
            ...openTarget,
            accessMode: "scan_transfer",
            scanTransfer: response.scan_transfer,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message.trim()
              ? error.message
              : "获取二维码失败";
          toast.error(message);
        } finally {
          setResolvingResourceId(null);
        }
        return;
      }

      if (openTarget.password || isMagnetTarget(openTarget) || isScanTransferTarget(openTarget)) {
        setPasswordModalTarget(openTarget);
        return;
      }

      openExternalResource(openTarget.url);
    },
    [openExternalResource, resolvingResourceId],
  );

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModalTarget(null);
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

  const handleViewModeChange = useCallback((mode: SearchResultsViewMode) => {
    hasManualViewPreferenceRef.current = true;
    writeJsonStorage(SEARCH_RESULTS_VIEW_MODE_KEY, mode);
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

  const shouldRenderState =
    Boolean(error) ||
    (!isLoading && allSortedResults.length === 0) ||
    !searchParams.keyword ||
    (debouncedIsLoading && displayedResults.length === 0);

  if (shouldRenderState) {
    return (
      <SearchResultsState
        className={className}
        error={error}
        isLoading={isLoading}
        showLoadingSkeleton={debouncedIsLoading}
        resultCount={allSortedResults.length}
        displayedCount={displayedResults.length}
        viewMode={viewMode}
        keyword={searchParams.keyword}
        hasAnyActiveFilters={hasAnyActiveFilters}
        sourceWarnings={searchResults?.warnings}
        searchParams={searchParams}
        onRetry={(params) => {
          void performSearch(params);
        }}
        onClearFilters={handleClearAllFilters}
        onSuggestSearch={(kw) => {
          const nextKeyword = kw.trim();
          if (!nextKeyword) {
            return;
          }

          setSearchParams({ keyword: nextKeyword });
          syncSearchUrl({ keyword: nextKeyword });
          void performSearch({ keyword: nextKeyword }, { preserveResults: false });
        }}
      />
    );
  }

  // ── 正常结果视图 ───────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-6", className)}>
      <SearchResultsHeader
        totalCount={allSortedResults.length}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isRefreshing={isRefreshing}
        progressiveStatus={progressiveStatus}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        onClearFilters={hasAnyActiveFilters ? handleClearAllFilters : undefined}
      />

      {/* 结果列表
          每个卡片（React.memo）自管理首次挂载动画；
          loadMore 时旧卡片因 memo 不重渲染，不会重播动画。 */}
      <SearchResultsList
        resources={displayedResults}
        viewMode={viewMode}
        enableResourceDetailPage={enableResourceDetailPage}
        enableResourceSourceBadges={enableResourceSourceBadges}
        resolvingResourceId={resolvingResourceId}
        onOpenResource={handleOpenResource}
        onOpenDetail={handleOpenDetail}
      />

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

      {/* 密码弹窗 */}
      <PasswordModal
        isOpen={Boolean(passwordModalTarget)}
        onClose={handlePasswordModalClose}
        password={passwordModalTarget?.password || ""}
        url={passwordModalTarget?.url || ""}
        cloudType={passwordModalTarget?.cloudType || ""}
        resourceId={passwordModalTarget?.resourceId}
        accessMode={passwordModalTarget?.accessMode}
        scanTransfer={passwordModalTarget?.scanTransfer}
      />
    </div>
  );
};

export default SearchResults;
