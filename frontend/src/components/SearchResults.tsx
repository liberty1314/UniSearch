import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
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
import type { ResourceAction, ResourceObject } from "@/types/api";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  } = useSearchStore();

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
  const [detailResource, setDetailResource] = useState<ResourceObject | null>(null);

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

  // ── 结果展平 + 排序（全量，由 searchResultSorter 纯函数处理）──────────────

  const allSortedResults = useMemo(
    () => sortResources(searchResults?.resources),
    [searchResults],
  );

  // ── 当前页切片 ─────────────────────────────────────────────────────────────

  const displayedResults = useMemo(
    () => allSortedResults.slice(0, displayedCount),
    [allSortedResults, displayedCount],
  );

  // ── 回调（useCallback 保持引用稳定，配合卡片的 React.memo）───────────────

  const openExternalResource = useCallback((url: string) => {
    if (!url) return;
    window.open(url, "_blank");
  }, []);

  const handleActionClick = useCallback(
    (action: ResourceAction, item: ResultItem) => {
      const payload = action.payload || {};
      const actionUrl =
        (typeof payload.url === "string" && payload.url) ||
        item.primaryLink?.url ||
        item.resource.detail.url ||
        "";
      const actionPassword =
        (typeof payload.password === "string" && payload.password) ||
        item.primaryLink?.password ||
        "";
      const cloudTypeName =
        (typeof payload.link_type === "string" && payload.link_type) || item.cloudType;

      if (action.type === "open_detail") {
        setDetailResource(item.resource);
        return;
      }

      if (actionPassword) {
        setPasswordModal({
          isOpen: true,
          password: actionPassword,
          url: actionUrl,
          cloudType: cloudTypeName,
        });
        return;
      }

      openExternalResource(actionUrl);
    },
    [openExternalResource],
  );

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModal({ isOpen: false, password: "", url: "", cloudType: "" });
  }, []);

  const handleOpenDetail = useCallback((item: ResultItem) => {
    setDetailResource(item.resource);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    hasManualViewPreferenceRef.current = true;
    setViewMode(mode);
  }, []);

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
          totalCount={allSortedResults.length}
          displayedCount={displayedResults.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          isRefreshing={isRefreshing}
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
              onOpenDetail={handleOpenDetail}
              onActionClick={handleActionClick}
            />
          ) : (
            <SearchResultListItem
              key={item.resource.id}
              item={item}
              index={index}
              onOpenDetail={handleOpenDetail}
              onActionClick={handleActionClick}
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

      <Dialog open={Boolean(detailResource)} onOpenChange={(open) => !open && setDetailResource(null)}>
        <DialogContent className="max-w-3xl">
          {detailResource ? (
            <>
              <DialogHeader>
                <DialogTitle>资源详情</DialogTitle>
                <DialogDescription>
                  {detailResource.source.name || detailResource.source.id || detailResource.source.type}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 text-sm">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {detailResource.title}
                  </h3>
                  {detailResource.description ? (
                    <p className="text-slate-600 dark:text-slate-300">
                      {detailResource.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {detailResource.media_type ? (
                      <span className="rounded-full border border-cyan-200/60 bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                        {detailResource.media_type}
                      </span>
                    ) : null}
                    {detailResource.target_type ? (
                      <span className="rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                        {detailResource.target_type}
                      </span>
                    ) : null}
                    {(detailResource.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {detailResource.detail.content ? (
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200">
                    {detailResource.detail.content}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">资源链接</h4>
                  <div className="space-y-2">
                    {detailResource.links.map((link) => (
                      <div
                        key={`${link.type}-${link.url}`}
                        className="rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {link.title || link.work_title || detailResource.title}
                            </div>
                            <div className="break-all text-xs text-slate-500 dark:text-slate-400">
                              {link.url}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleActionClick(
                                {
                                  key: `detail.${link.type}.open`,
                                  label: "打开",
                                  type: "open_link",
                                  payload: {
                                    url: link.url,
                                    password: link.password,
                                    link_type: link.type,
                                  },
                                },
                                {
                                  resource: detailResource,
                                  primaryLink: link,
                                  cloudType: link.type,
                                  datetime: 0,
                                },
                              )
                            }
                            className="rounded-full border border-slate-200/70 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-white/[0.08] dark:text-slate-200"
                          >
                            打开
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchResults;
