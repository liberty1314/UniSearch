import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { IoCheckmarkCircle, IoEllipseOutline } from "react-icons/io5";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import SourceFocusMenu from "@/components/search-filters/SourceFocusMenu";
import {
  SOURCE_FOCUS_LONG_PRESS_MS,
  clampMenuPosition,
} from "@/components/search-filters/sourceFocusMenuUtils";
import {
  platformThemes,
  platformThemeTypes,
  type PlatformTheme,
} from "@/components/home/platformThemes";
import { SearchService } from "@/services/searchService";
import { useSearchStore } from "@/stores/searchStore";
import type { CloudTypeValue, FilterConfig, SearchParams } from "@/types/api";
import {
  buildActiveFilterChips,
  buildFacetFilterOptions,
  cloneFilterConfig,
  normalizeFilterConfig,
} from "@/utils/searchFilters";

interface SourceChipProps {
  config: PlatformTheme;
  isSelected: boolean;
  onToggle: (type: CloudTypeValue) => void;
  onOpenFocusMenu: (
    type: CloudTypeValue,
    sourceName: string,
    position: { x: number; y: number },
  ) => void;
}

const splitKeywordInput = (value: string): string[] =>
  value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const SourceChip = memo(
  ({ config, isSelected, onToggle, onOpenFocusMenu }: SourceChipProps) => {
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    useEffect(() => () => clearLongPressTimer(), []);

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      longPressTriggeredRef.current = false;
      clearLongPressTimer();
      const clientX = event.clientX;
      const clientY = event.clientY;
      const buttonRect = event.currentTarget.getBoundingClientRect();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        onOpenFocusMenu(config.type, config.name, {
          x: clientX > 0 ? clientX : buttonRect.left + buttonRect.width / 2,
          y: clientY > 0 ? clientY : buttonRect.bottom + 8,
        });
      }, SOURCE_FOCUS_LONG_PRESS_MS);
    };

    const handlePointerEnd = () => {
      clearLongPressTimer();
    };

    const handleClick = () => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      onToggle(config.type);
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearLongPressTimer();
      const buttonRect = event.currentTarget.getBoundingClientRect();
      onOpenFocusMenu(config.type, config.name, {
        x: event.clientX > 0 ? event.clientX : buttonRect.left + buttonRect.width / 2,
        y: event.clientY > 0 ? event.clientY : buttonRect.bottom + 8,
      });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const buttonRect = event.currentTarget.getBoundingClientRect();
        onOpenFocusMenu(config.type, config.name, {
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.bottom + 8,
        });
      }
    };

    return (
      <motion.button
        layout
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onKeyDown={handleKeyDown}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-pressed={isSelected}
        aria-label={`${config.name}${isSelected ? "（已选中，点击取消，长按打开来源操作）" : "（未选中，点击选择，长按打开来源操作）"}`}
        className={cn(
          "relative flex items-center rounded-[1rem] border px-5 py-2.5 text-[13.5px] font-semibold transition-colors transition-shadow duration-300 box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
          isSelected
            ? `bg-gradient-to-br ${config.color} text-white border-transparent ${config.shadow} shadow-[0_8px_20px_rgba(14,165,233,0.2)] dark:shadow-none ring-[0.5px] ring-white/50 dark:ring-white/10`
            : "bg-white/40 text-slate-600 border-[0.5px] border-slate-200/50 shadow-sm backdrop-blur-md hover:bg-white/60 hover:shadow-md dark:bg-slate-800/40 dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-700/40",
        )}
      >
        <span>{config.name}</span>
      </motion.button>
    );
  },
);

SourceChip.displayName = "SourceChip";

const SearchUnifiedFilterCard: React.FC = () => {
  const { searchParams, searchResults, setSearchParams, performSearch } = useSearchStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [includeDraft, setIncludeDraft] = useState("");
  const [excludeDraft, setExcludeDraft] = useState("");
  const [sourceFocusMenu, setSourceFocusMenu] = useState<{
    open: boolean;
    type: CloudTypeValue | null;
    sourceName: string;
    x: number;
    y: number;
  }>({
    open: false,
    type: null,
    sourceName: "",
    x: 0,
    y: 0,
  });

  const allTypes = platformThemeTypes;

  const getValidTypes = useCallback((types?: CloudTypeValue[]) => {
    const validTypes = (types || []).filter((type) => allTypes.includes(type));
    return validTypes.length === allTypes.length ? [] : validTypes;
  }, [allTypes]);

  const selectedTypes = useMemo(
    () => getValidTypes(searchParams.cloudTypes),
    [getValidTypes, searchParams.cloudTypes],
  );
  const isAllSelected = selectedTypes.length === 0;
  const effectiveSelectedTypes = isAllSelected ? allTypes : selectedTypes;
  const activeFilter = useMemo(
    () => normalizeFilterConfig(searchParams.filter),
    [searchParams.filter],
  );
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(activeFilter),
    [activeFilter],
  );
  const collapsedSummaryChips = useMemo(
    () => activeFilterChips.slice(0, 4),
    [activeFilterChips],
  );
  const activeFilterCount = activeFilterChips.length;
  const activeConditionCount = activeFilterCount + (isAllSelected ? 0 : 1);

  const syncSearchUrl = useCallback((nextParams: Partial<SearchParams>) => {
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
  }, [location.pathname, location.search, navigate, searchParams]);

  const applySearchParams = useCallback((nextParams: Partial<SearchParams>) => {
    setSearchParams(nextParams);
    syncSearchUrl(nextParams);
    void performSearch(nextParams, { preserveResults: true });
  }, [performSearch, setSearchParams, syncSearchUrl]);

  const applyFilter = useCallback((nextFilter: FilterConfig | undefined) => {
    applySearchParams({ filter: normalizeFilterConfig(nextFilter) });
  }, [applySearchParams]);

  const handleTypeToggle = (type: CloudTypeValue) => {
    const currentTypes = effectiveSelectedTypes;
    let nextTypes: CloudTypeValue[];

    if (currentTypes.includes(type)) {
      if (currentTypes.length === 1) {
        return;
      }
      nextTypes = currentTypes.filter((item) => item !== type);
    } else {
      nextTypes = [...currentTypes, type];
    }

    applySearchParams({
      cloudTypes: nextTypes.length === allTypes.length ? [] : nextTypes,
    });
  };

  const handleSelectOnly = (type: CloudTypeValue) => {
    if (selectedTypes.length === 1 && selectedTypes[0] === type) {
      return;
    }

    applySearchParams({ cloudTypes: [type] });
  };

  const handleOpenSourceFocusMenu = useCallback((
    type: CloudTypeValue,
    sourceName: string,
    position: { x: number; y: number },
  ) => {
    const menuPosition = clampMenuPosition({
      x: position.x,
      y: position.y,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    setSourceFocusMenu({
      open: true,
      type,
      sourceName,
      x: menuPosition.x,
      y: menuPosition.y,
    });
  }, []);

  const handleSelectAll = () => {
    if (isAllSelected) {
      return;
    }

    applySearchParams({ cloudTypes: [] });
  };

  const addKeywordTags = (field: keyof FilterConfig) => {
    const draftValue = field === "include" ? includeDraft : excludeDraft;
    const incomingValues = splitKeywordInput(draftValue);
    if (incomingValues.length === 0) {
      return;
    }

    const nextFilter = cloneFilterConfig(searchParams.filter) || {};
    const currentValues = new Set(nextFilter[field] || []);
    incomingValues.forEach((value) => currentValues.add(value));
    nextFilter[field] = Array.from(currentValues);
    applyFilter(nextFilter);

    if (field === "include") {
      setIncludeDraft("");
    } else {
      setExcludeDraft("");
    }
  };

  const removeKeywordTag = (field: keyof FilterConfig, value: string) => {
    const nextFilter = cloneFilterConfig(searchParams.filter) || {};
    const nextValues = (nextFilter[field] || []).filter((item) => item !== value);

    if (nextValues.length > 0) {
      nextFilter[field] = nextValues;
    } else {
      delete nextFilter[field];
    }

    applyFilter(nextFilter);
  };

  const toggleFacetValue = (field: "mediaTypes", value: string) => {
    const nextFilter = cloneFilterConfig(searchParams.filter) || {};
    const currentValues = new Set(nextFilter[field] || []);

    if (currentValues.has(value)) {
      currentValues.delete(value);
    } else {
      currentValues.add(value);
    }

    const nextValues = Array.from(currentValues);
    if (nextValues.length > 0) {
      nextFilter[field] = nextValues;
    } else {
      delete nextFilter[field];
    }

    applyFilter(nextFilter);
  };

  const handleClearAllFilters = () => {
    if (isAllSelected && !activeFilter) {
      return;
    }

    applySearchParams({
      cloudTypes: [],
      filter: undefined,
    });
  };

  const facetGroups = useMemo(
    () => [
      {
        title: "媒体类型",
        field: "mediaTypes" as const,
        options: buildFacetFilterOptions(searchResults?.facets?.media_types),
      },
    ].filter((group) => group.options.length > 0),
    [searchResults?.facets],
  );

  if (!searchParams.keyword?.trim()) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="search-unified-filter-card"
      className="w-full max-w-5xl rounded-[2rem] border-[0.5px] border-white/60 bg-white/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-3xl dark:border-white/[0.06] dark:bg-slate-950/40 sm:p-8"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                筛选条件
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                先选网盘，再根据需要按关键词继续收窄结果
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {activeConditionCount > 0 ? (
              <span className="rounded-full bg-cyan-500/12 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-400/12 dark:text-cyan-200">
                已启用 {activeConditionCount} 项
              </span>
            ) : null}
            {activeConditionCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearAllFilters}
                className="rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                清空全部筛选
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-full"
            >
              <span>{expanded ? "收起高级条件" : "展开高级条件"}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")}
              />
            </Button>
          </div>
        </div>

        {!expanded && collapsedSummaryChips.length > 0 ? (
          <div
            data-testid="search-unified-filter-collapsed-summary"
            className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-[1.4rem] border border-cyan-200/60 bg-cyan-50/70 px-4 py-3 text-sm text-cyan-900 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-50"
          >
            <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-cyan-700 dark:text-cyan-200">
              已生效条件
            </span>
            {collapsedSummaryChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex max-w-[70vw] shrink-0 items-center rounded-full border border-cyan-300/35 bg-white/75 px-3 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-300/20 dark:bg-slate-950/45 dark:text-cyan-100"
                title={chip.label}
              >
                <span className="truncate whitespace-nowrap">{chip.label}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                网盘筛选
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                点击切换来源，长按可仅看单个来源
              </p>
            </div>
            <Button
              type="button"
              variant={isAllSelected ? "default" : "outline"}
              onClick={handleSelectAll}
              aria-pressed={isAllSelected}
              aria-label={isAllSelected ? "取消全选所有网盘类型" : "全选所有网盘类型"}
              className="rounded-[1rem] px-4 py-2 text-sm font-semibold"
            >
              {isAllSelected ? (
                <IoCheckmarkCircle className="h-5 w-5" />
              ) : (
                <IoEllipseOutline className="h-5 w-5" />
              )}
              <span>{isAllSelected ? "全选状态" : "选择全部"}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex w-full flex-wrap justify-center gap-3">
              {platformThemes.slice(0, 6).map((config) => (
                <SourceChip
                  key={config.type}
                  config={config}
                  isSelected={effectiveSelectedTypes.includes(config.type)}
                  onToggle={handleTypeToggle}
                  onOpenFocusMenu={handleOpenSourceFocusMenu}
                />
              ))}
            </div>
            <div className="flex w-full flex-wrap justify-center gap-3">
              {platformThemes.slice(6).map((config) => (
                <SourceChip
                  key={config.type}
                  config={config}
                  isSelected={effectiveSelectedTypes.includes(config.type)}
                  onToggle={handleTypeToggle}
                  onOpenFocusMenu={handleOpenSourceFocusMenu}
                />
              ))}
            </div>
          </div>
        </div>

        {expanded ? (
          <div className="space-y-6" data-testid="search-unified-filter-advanced">
            <div className="grid gap-4 lg:grid-cols-2">
              {(
                [
                  {
                    title: "包含关键词",
                    field: "include" as const,
                    draft: includeDraft,
                    setDraft: setIncludeDraft,
                    placeholder: "输入关键词后按回车或逗号",
                  },
                  {
                    title: "排除关键词",
                    field: "exclude" as const,
                    draft: excludeDraft,
                    setDraft: setExcludeDraft,
                    placeholder: "例如：枪版、失效",
                  },
                ] as const
              ).map((group) => (
                <section
                  key={group.field}
                  className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div
                    data-testid={`${group.field}-keyword-header`}
                    className="flex min-h-8 items-center gap-3"
                  >
                    <h4 className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {group.title}
                    </h4>
                    <div
                      data-testid={`${group.field}-keyword-chip-row`}
                      className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pr-1"
                    >
                      {/* 关键词 chip 需要稳定横向滚动和删除语义，保留原生按钮。 */}
                      {(activeFilter?.[group.field] || []).map((value) => (
                        <button
                          key={`${group.field}-${value}`}
                          type="button"
                          onClick={() => removeKeywordTag(group.field, value)}
                          title={value}
                          className="inline-flex max-w-[70vw] shrink-0 items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-800 transition hover:bg-cyan-500/15 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100 sm:max-w-[18rem]"
                        >
                          <span className="truncate whitespace-nowrap">{value}</span>
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={group.draft}
                      onChange={(event) => group.setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addKeywordTags(group.field);
                        }
                      }}
                      placeholder={group.placeholder}
                      className="h-10 rounded-xl bg-white/80 dark:bg-slate-900/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addKeywordTags(group.field)}
                      className="rounded-xl"
                    >
                      添加
                    </Button>
                  </div>
                </section>
              ))}
            </div>

            {facetGroups.length > 0 ? (
              <div className="grid gap-4">
                {facetGroups.map((group) => (
                  <section
                    key={group.field}
                    className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {group.title}
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* 分面 chip 需要保留计数布局和快速切换状态，保留原生按钮。 */}
                      {group.options.map((option) => {
                        const isActive = (activeFilter?.[group.field] || []).includes(option.value);
                        return (
                          <button
                            key={`${group.field}-${option.value}`}
                            type="button"
                            onClick={() => toggleFacetValue(group.field, option.value)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                              isActive
                                ? "border-cyan-300/40 bg-cyan-500/10 text-cyan-800 hover:bg-cyan-500/15 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                                : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:text-white",
                            )}
                          >
                            <span>{option.label}</span>
                            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                              {option.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <SourceFocusMenu
          open={sourceFocusMenu.open}
          sourceName={sourceFocusMenu.sourceName}
          x={sourceFocusMenu.x}
          y={sourceFocusMenu.y}
          selected={Boolean(
            sourceFocusMenu.type &&
              effectiveSelectedTypes.includes(sourceFocusMenu.type),
          )}
          onSelectOnly={() => {
            if (sourceFocusMenu.type) {
              handleSelectOnly(sourceFocusMenu.type);
            }
          }}
          onToggle={() => {
            if (sourceFocusMenu.type) {
              handleTypeToggle(sourceFocusMenu.type);
            }
          }}
          onSelectAll={handleSelectAll}
          onClose={() => {
            setSourceFocusMenu((current) => ({ ...current, open: false }));
          }}
        />
      </div>
    </motion.section>
  );
};

export default SearchUnifiedFilterCard;
