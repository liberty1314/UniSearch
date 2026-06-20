import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CloudTypeValue } from "@/types/search";
import { useSearchStore } from "@/stores/searchStore";
import { cn } from "@/lib/utils";
import { platformThemeTypes } from "@/components/home/platformThemes";
import CloudTypeChipGroup from "@/components/CloudTypeChipGroup";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SearchService } from "@/services/searchService";

// --- Main Component ---

/**
 * 网盘类型筛选器组件 - Premium Design & Zero Layout Shift
 */
const CloudTypeFilter: React.FC = () => {
  const { searchParams, setSearchParams, performSearch } = useSearchStore();
  const navigate = useNavigate();
  const location = useLocation();

  const allTypes = platformThemeTypes;
  const buildRequestedCloudTypes = useCallback((types: CloudTypeValue[]) => (
    types.length === allTypes.length ? [] : types
  ), [allTypes]);
  const getValidTypes = useCallback((types?: CloudTypeValue[]) => {
    const validTypes = (types || []).filter((type) => allTypes.includes(type));
    return validTypes.length === allTypes.length ? [] : validTypes;
  }, [allTypes]);

  const [selectedTypes, setSelectedTypes] = useState<CloudTypeValue[]>(() =>
    getValidTypes(searchParams.cloudTypes),
  );
  const debouncedSelectedTypes = useDebouncedValue(selectedTypes, 150);
  const hasInitializedCloudTypesRef = useRef(false);
  const shouldSkipNextSearchRef = useRef(true);
  const lastTriggeredSearchSnapshotRef = useRef<string | null>(null);

  const syncSearchUrl = useCallback((nextTypes: CloudTypeValue[]) => {
    const nextUrl = SearchService.buildSearchUrl({
      ...searchParams,
      cloudTypes: nextTypes,
    });
    const currentUrl = `${location.pathname}${location.search}`;

    if (nextUrl === currentUrl) {
      return;
    }

    navigate(nextUrl, {
      replace: true,
      state: { skipSearchSync: true, preserveScroll: true },
    });
  }, [location.pathname, location.search, navigate, searchParams]);

  useEffect(() => {
    if (hasInitializedCloudTypesRef.current) {
      return;
    }

    const validTypes = getValidTypes(searchParams.cloudTypes);
    if (JSON.stringify(selectedTypes) !== JSON.stringify(validTypes)) {
      setSelectedTypes(validTypes);
    }

    hasInitializedCloudTypesRef.current = true;
  }, [getValidTypes, searchParams.cloudTypes, selectedTypes]);

  useEffect(() => {
    if (!hasInitializedCloudTypesRef.current) {
      return;
    }

    const nextTypes = getValidTypes(searchParams.cloudTypes);
    const currentSnapshot = JSON.stringify(selectedTypes);
    const nextSnapshot = JSON.stringify(nextTypes);

    if (currentSnapshot !== nextSnapshot) {
      shouldSkipNextSearchRef.current = true;
      setSelectedTypes(nextTypes);
    }
  }, [allTypes, getValidTypes, searchParams.cloudTypes, selectedTypes]);

  useEffect(() => {
    if (shouldSkipNextSearchRef.current) {
      shouldSkipNextSearchRef.current = false;
      return;
    }

    if (!searchParams.keyword?.trim()) {
      return;
    }

    const requestedTypes = buildRequestedCloudTypes(debouncedSelectedTypes);
    const selectionSnapshot = JSON.stringify(requestedTypes);
    if (lastTriggeredSearchSnapshotRef.current === selectionSnapshot) {
      return;
    }

    lastTriggeredSearchSnapshotRef.current = selectionSnapshot;
    syncSearchUrl(requestedTypes);

    void performSearch(
      { cloudTypes: requestedTypes },
      { preserveResults: true },
    );
  }, [buildRequestedCloudTypes, debouncedSelectedTypes, performSearch, searchParams.keyword, syncSearchUrl]);

  const effectiveSelectedTypes =
    selectedTypes.length === 0 ? allTypes : selectedTypes;
  const isAllSelected = selectedTypes.length === 0;

  // CloudTypeChipGroup 内部封装了单击切换与双击仅看此源，这里仅需更新选中集合。
  // 两个守卫：避免清空全部、选中集无变化时跳过（双击唯一已选项不应重复触发搜索）。
  const handleSelectionChange = (next: CloudTypeValue[]) => {
    if (next.length === 0) {
      return;
    }
    const nextSnapshot = next.slice().sort().join(",");
    const currentSnapshot = effectiveSelectedTypes.slice().sort().join(",");
    if (nextSnapshot === currentSnapshot) {
      return;
    }
    const requestedTypes = buildRequestedCloudTypes(next);
    setSelectedTypes(requestedTypes);
    setSearchParams({ cloudTypes: requestedTypes });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      return;
    }

    setSelectedTypes(allTypes);
    setSearchParams({ cloudTypes: [] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto mt-6"
    >
      <div className="relative">
        {/* 内容容器 */}
        <div
          data-testid="cloud-type-filter-surface"
          className="relative overflow-hidden rounded-[2rem] border-[0.5px] border-white/60 bg-white/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-3xl transition-all duration-500 hover:shadow-[0_16px_48px_rgba(15,23,42,0.06)] dark:border-white/[0.06] dark:bg-slate-950/40 dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] sm:p-8"
        >
          {/* 顶部栏：标题与全选 */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:rotate-3">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </div>
              <div className="min-w-[150px]">
                <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  网盘筛选
                </h3>
                <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                  {isAllSelected
                    ? "已聚合全网顶级资源平台"
                    : `已精准定位 ${selectedTypes.length} 个优质网盘`}
                </p>
                <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
                  单击多选，双击仅看此源
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleSelectAll}
              aria-pressed={isAllSelected}
              aria-label={
                isAllSelected ? "取消全选所有网盘类型" : "全选所有网盘类型"
              }
              className={cn(
                "px-6 py-2.5 rounded-[1.2rem] font-semibold text-[14px] transition-colors transition-shadow duration-300 flex items-center gap-2.5 shadow-sm flex-shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                isAllSelected
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.15)] hover:bg-slate-800 dark:hover:bg-slate-100 dark:shadow-[0_8px_20px_rgba(255,255,255,0.15)] ring-1 ring-slate-900/10 dark:ring-white/10"
                  : "bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-[0.5px] border-slate-200/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white backdrop-blur-md hover:shadow-md",
              )}
            >
              <div className="w-[18px] h-[18px] flex items-center justify-center">
                {isAllSelected ? (
                  <CheckCircle2 className="w-[20px] h-[20px]" />
                ) : (
                  <Circle className="w-[20px] h-[20px]" />
                )}
              </div>
              <span className="min-w-[4em] text-center tracking-wide">
                {isAllSelected ? "全选状态" : "选择全部"}
              </span>
            </motion.button>
          </div>

          {/* 筛选标签网格 (6, 5 对称排布) */}
          <div className="relative z-10">
            <CloudTypeChipGroup
              selected={effectiveSelectedTypes}
              onChange={handleSelectionChange}
              selectOnlyEnabled
              splitIndex={6}
              data-testid="cloud-type-chip-group"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CloudTypeFilter;
