import React, { useCallback, useEffect, memo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IoCheckmarkCircle, IoEllipseOutline } from "react-icons/io5";
import { type CloudTypeValue } from "@/types/api";
import { useSearchStore } from "@/stores/searchStore";
import { cn } from "@/lib/utils";
import { CoolMode } from "@/components/magicui/cool-mode";
import {
  platformThemes,
  platformThemeTypes,
  type PlatformTheme,
} from "@/components/home/platformThemes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// --- Sub-components ---

interface CloudTypeTagProps {
  config: PlatformTheme;
  isSelected: boolean;
  onToggle: (type: CloudTypeValue) => void;
  onSelectOnly: (type: CloudTypeValue) => void;
}

const CLICK_DELAY_MS = 220;

const CloudTypeTag = memo(
  ({ config, isSelected, onToggle, onSelectOnly }: CloudTypeTagProps) => {
    const clickTimerRef = useRef<number | null>(null);

    const clearClickTimer = () => {
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        clearClickTimer();
      };
    }, []);

    const handleClick = () => {
      clearClickTimer();
      clickTimerRef.current = window.setTimeout(() => {
        onToggle(config.type);
        clickTimerRef.current = null;
      }, CLICK_DELAY_MS);
    };

    const handleDoubleClick = () => {
      clearClickTimer();
      onSelectOnly(config.type);
    };

    return (
      <CoolMode
        options={{ particleCount: 12, speedHorz: 5, speedUp: 15 }}
        triggerMode="mouse"
      >
        <motion.button
          layout
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-pressed={isSelected}
          aria-label={`${config.name}${isSelected ? "（已选中，单击取消，双击仅看此源）" : "（未选中，单击选择，双击仅看此源）"}`}
          className={cn(
            "relative flex items-center px-5 py-2.5 rounded-[1rem] text-[13.5px] font-semibold transition-colors transition-shadow duration-300 border box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
            isSelected
              ? `bg-gradient-to-br ${config.color} text-white border-transparent ${config.shadow} shadow-[0_8px_20px_rgba(14,165,233,0.2)] dark:shadow-none ring-[0.5px] ring-white/50 dark:ring-white/10`
              : "bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-[0.5px] border-slate-200/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-slate-700/40 shadow-sm backdrop-blur-md hover:shadow-md",
          )}
        >
          {/* 文本内容 */}
          <span>{config.name}</span>
        </motion.button>
      </CoolMode>
    );
  },
);

CloudTypeTag.displayName = "CloudTypeTag";

// --- Main Component ---

/**
 * 网盘类型筛选器组件 - Premium Design & Zero Layout Shift
 */
const CloudTypeFilter: React.FC = () => {
  const { searchParams, setSearchParams, performSearch } = useSearchStore();

  const cloudTypeConfigs = platformThemes;
  const allTypes = platformThemeTypes;
  const getValidTypes = useCallback((types?: CloudTypeValue[]) => {
    const validTypes = (types || []).filter((type) => allTypes.includes(type));
    return validTypes.length > 0 ? validTypes : allTypes;
  }, [allTypes]);

  const [selectedTypes, setSelectedTypes] = useState<CloudTypeValue[]>(() =>
    getValidTypes(searchParams.cloudTypes),
  );
  const debouncedSelectedTypes = useDebouncedValue(selectedTypes, 150);
  const hasInitializedCloudTypesRef = useRef(false);
  const shouldSkipNextSearchRef = useRef(true);
  const lastTriggeredSearchSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasInitializedCloudTypesRef.current) {
      return;
    }

    const validTypes = getValidTypes(searchParams.cloudTypes);
    if (JSON.stringify(selectedTypes) !== JSON.stringify(validTypes)) {
      shouldSkipNextSearchRef.current = true;
      setSelectedTypes(validTypes);
    }

    if ((searchParams.cloudTypes || []).length !== validTypes.length) {
      setSearchParams({ cloudTypes: validTypes });
    }

    hasInitializedCloudTypesRef.current = true;
  }, [allTypes, getValidTypes, searchParams.cloudTypes, selectedTypes, setSearchParams]);

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

    const selectionSnapshot = JSON.stringify(debouncedSelectedTypes);
    if (lastTriggeredSearchSnapshotRef.current === selectionSnapshot) {
      return;
    }

    lastTriggeredSearchSnapshotRef.current = selectionSnapshot;

    void performSearch(
      { cloudTypes: debouncedSelectedTypes },
      { preserveResults: true },
    );
  }, [debouncedSelectedTypes, performSearch, searchParams.keyword]);

  const isAllSelected = selectedTypes.length === cloudTypeConfigs.length;

  const handleTypeToggle = (type: CloudTypeValue) => {
    const currentTypes = selectedTypes;
    let newTypes: CloudTypeValue[];

    if (currentTypes.includes(type)) {
      if (currentTypes.length === 1) {
        return;
      }
      newTypes = currentTypes.filter((t) => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }

    setSelectedTypes(newTypes);
    setSearchParams({ cloudTypes: newTypes });
  };

  const handleSelectOnly = (type: CloudTypeValue) => {
    if (selectedTypes.length === 1 && selectedTypes[0] === type) {
      return;
    }

    setSelectedTypes([type]);
    setSearchParams({ cloudTypes: [type] });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      return;
    }

    setSelectedTypes(allTypes);
    setSearchParams({ cloudTypes: allTypes });
  };

  const isTypeSelected = (type: CloudTypeValue) =>
    selectedTypes.includes(type);

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
                  来源筛选
                </h3>
                <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                  {isAllSelected
                    ? "已聚合全网顶级资源平台"
                    : `已精准定位 ${selectedTypes.length} 个优质来源`}
                </p>
                <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
                  单击多选，双击仅看此源
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
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
                  <IoCheckmarkCircle className="w-[20px] h-[20px]" />
                ) : (
                  <IoEllipseOutline className="w-[20px] h-[20px]" />
                )}
              </div>
              <span className="min-w-[4em] text-center tracking-wide">
                {isAllSelected ? "全选状态" : "选择全部"}
              </span>
            </motion.button>
          </div>

          {/* 筛选标签网格 (6, 5 对称排布) */}
          <div className="relative z-10 flex w-full flex-col items-center gap-3">
            <div className="flex w-full flex-wrap justify-center gap-3">
              {cloudTypeConfigs.slice(0, 6).map((config) => (
                <CloudTypeTag
                  key={config.type}
                  config={config}
                  isSelected={isTypeSelected(config.type)}
                  onToggle={handleTypeToggle}
                  onSelectOnly={handleSelectOnly}
                />
              ))}
            </div>
            <div className="flex w-full flex-wrap justify-center gap-3">
              {cloudTypeConfigs.slice(6).map((config) => (
                <CloudTypeTag
                  key={config.type}
                  config={config}
                  isSelected={isTypeSelected(config.type)}
                  onToggle={handleTypeToggle}
                  onSelectOnly={handleSelectOnly}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CloudTypeFilter;
