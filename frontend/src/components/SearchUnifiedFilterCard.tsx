import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
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
import type { CloudTypeValue, FilterConfig, SearchParams } from "@/types/search";
import {
  buildActiveFilterChips,
  cloneFilterConfig,
  normalizeFilterConfig,
} from "@/utils/searchFilters";

interface SourceChipProps {
  config: PlatformTheme;
  compact: boolean;
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
  ({
    config,
    compact,
    isSelected,
    onToggle,
    onOpenFocusMenu,
  }: SourceChipProps) => {
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
          "relative flex shrink-0 items-center border text-[13px] font-semibold transition-colors transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2",
          compact ? "rounded-xl px-3 py-2" : "rounded-[1rem] px-5 py-2.5",
          isSelected
            ? "border-[#246BFD] bg-[#246BFD] text-white shadow-[0_6px_16px_rgba(36,107,253,0.18)] dark:border-[#6F8BFF] dark:bg-[#6F8BFF] dark:text-[#080B12]"
            : "border-slate-200 bg-white text-slate-600 hover:border-[#20C7B5] hover:text-slate-900 dark:border-[#253142] dark:bg-[#111722] dark:text-slate-300 dark:hover:border-[#4ED9C8] dark:hover:text-white",
        )}
      >
        <span>{config.name}</span>
      </motion.button>
    );
  },
);

SourceChip.displayName = "SourceChip";

const SearchUnifiedFilterCard: React.FC = () => {
  const { searchParams, setSearchParams, performSearch } = useSearchStore();
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
  const [draftFilter, setDraftFilter] = useState<FilterConfig | undefined>(
    activeFilter,
  );
  const draftActiveFilter = useMemo(
    () => normalizeFilterConfig(draftFilter),
    [draftFilter],
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

  useEffect(() => {
    setDraftFilter(activeFilter);
  }, [activeFilter]);

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

  const applyCloudSearchParams = useCallback((nextParams: Partial<SearchParams>) => {
    setSearchParams(nextParams);
    syncSearchUrl(nextParams);
  }, [setSearchParams, syncSearchUrl]);

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

    applyCloudSearchParams({
      cloudTypes: nextTypes.length === allTypes.length ? [] : nextTypes,
    });
  };

  const handleSelectOnly = (type: CloudTypeValue) => {
    if (selectedTypes.length === 1 && selectedTypes[0] === type) {
      return;
    }

    applyCloudSearchParams({ cloudTypes: [type] });
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

    applyCloudSearchParams({ cloudTypes: [] });
  };

  const addKeywordTags = (field: keyof FilterConfig) => {
    const draftValue = field === "include" ? includeDraft : excludeDraft;
    const incomingValues = splitKeywordInput(draftValue);
    if (incomingValues.length === 0) {
      return;
    }

    const nextFilter = cloneFilterConfig(draftFilter) || {};
    const currentValues = new Set(nextFilter[field] || []);
    incomingValues.forEach((value) => currentValues.add(value));
    nextFilter[field] = Array.from(currentValues);
    setDraftFilter(normalizeFilterConfig(nextFilter));

    if (field === "include") {
      setIncludeDraft("");
    } else {
      setExcludeDraft("");
    }
  };

  const removeKeywordTag = (field: keyof FilterConfig, value: string) => {
    const nextFilter = cloneFilterConfig(draftFilter) || {};
    const nextValues = (nextFilter[field] || []).filter((item) => item !== value);

    if (nextValues.length > 0) {
      nextFilter[field] = nextValues;
    } else {
      delete nextFilter[field];
    }

    setDraftFilter(normalizeFilterConfig(nextFilter));
  };

  const handleApplyAdvancedFilter = () => {
    applySearchParams({ filter: normalizeFilterConfig(draftFilter) });
  };

  const handleResetAdvancedFilter = () => {
    setDraftFilter(undefined);
    setIncludeDraft("");
    setExcludeDraft("");
  };

  const handleClearAllFilters = () => {
    if (isAllSelected && !activeFilter) {
      return;
    }

    setDraftFilter(undefined);
    setIncludeDraft("");
    setExcludeDraft("");
    applySearchParams({
      cloudTypes: [],
      filter: undefined,
    });
  };

  if (!searchParams.keyword?.trim()) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="search-unified-filter-card"
      className="w-full rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.045)] dark:border-[#253142] dark:bg-[#111722]"
    >
      <div className="flex flex-col gap-3">
        <div
          data-testid="search-filter-rail"
          className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "收起高级条件" : "展开高级条件"}
            title={expanded ? "收起高级条件" : "展开高级条件"}
            className="shrink-0 rounded-xl"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={isAllSelected ? "default" : "outline"}
            onClick={handleSelectAll}
            aria-pressed={isAllSelected}
            aria-label={isAllSelected ? "取消全选所有网盘类型" : "全选所有网盘类型"}
            className="h-9 shrink-0 rounded-xl px-3 text-xs"
          >
            全部
          </Button>

          {platformThemes.map((config) => (
            <SourceChip
              key={config.type}
              config={config}
              compact
              isSelected={effectiveSelectedTypes.includes(config.type)}
              onToggle={handleTypeToggle}
              onOpenFocusMenu={handleOpenSourceFocusMenu}
            />
          ))}

          {activeConditionCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[#20C7B5]/[0.12] px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-[#4ED9C8]">
              已启用 {activeConditionCount} 项
            </span>
          ) : null}

          {activeConditionCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearAllFilters}
              aria-label="清空全部筛选"
              className="h-9 shrink-0 rounded-xl px-3 text-xs text-slate-500"
            >
              清空
            </Button>
          ) : null}
        </div>

        {!expanded && collapsedSummaryChips.length > 0 ? (
          <div
            data-testid="search-unified-filter-collapsed-summary"
            className="flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3 text-xs dark:border-[#253142]"
          >
            {collapsedSummaryChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex max-w-[70vw] shrink-0 items-center rounded-full border border-[#20C7B5]/[0.30] bg-[#20C7B5]/[0.08] px-3 py-1 text-teal-800 dark:text-[#4ED9C8]"
                title={chip.label}
              >
                <span className="truncate whitespace-nowrap">{chip.label}</span>
              </span>
            ))}
          </div>
        ) : null}

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
                      {(draftActiveFilter?.[group.field] || []).map((value) => (
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

            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-cyan-200/60 bg-cyan-50/60 p-4 dark:border-cyan-300/15 dark:bg-cyan-400/[0.07] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  高级条件待应用
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  包含词和排除词会先暂存，点击应用后再刷新结果。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetAdvancedFilter}
                  className="rounded-full"
                >
                  重置高级条件
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyAdvancedFilter}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
                >
                  应用筛选
                </Button>
              </div>
            </div>
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
