import React, { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/stores/searchStore";
import { SearchService } from "@/services/searchService";
import {
  cloneFilterConfig,
  buildFacetFilterOptions,
  isFilterConfigEmpty,
  normalizeFilterConfig,
} from "@/utils/searchFilters";
import type { FilterConfig } from "@/types/api";

type FilterArrayField = keyof FilterConfig;

const splitKeywordInput = (value: string): string[] =>
  value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const SearchAdvancedFilterPanel: React.FC = () => {
  const { searchParams, searchResults, performSearch, setSearchParams } = useSearchStore();
  const [expanded, setExpanded] = useState(false);
  const [includeDraft, setIncludeDraft] = useState("");
  const [excludeDraft, setExcludeDraft] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const activeFilter = useMemo(
    () => normalizeFilterConfig(searchParams.filter),
    [searchParams.filter],
  );
  const activeFilterCount = useMemo(
    () =>
      Object.values(activeFilter || {}).reduce(
        (count, values) => count + (values?.length || 0),
        0,
      ),
    [activeFilter],
  );

  const syncSearchUrl = (nextFilter: FilterConfig | undefined) => {
    const nextUrl = SearchService.buildSearchUrl({
      ...searchParams,
      filter: nextFilter,
    });
    const currentUrl = `${location.pathname}${location.search}`;

    if (nextUrl === currentUrl) {
      return;
    }

    navigate(nextUrl, {
      replace: true,
      state: { skipSearchSync: true, preserveScroll: true },
    });
  };

  const applyFilter = (nextFilter: FilterConfig | undefined) => {
    const normalized = normalizeFilterConfig(nextFilter);
    setSearchParams({ filter: normalized });
    syncSearchUrl(normalized);
    void performSearch({ filter: normalized }, { preserveResults: true });
  };

  const addKeywordTags = (field: FilterArrayField) => {
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

  const removeKeywordTag = (field: FilterArrayField, value: string) => {
    const nextFilter = cloneFilterConfig(searchParams.filter) || {};
    const nextValues = (nextFilter[field] || []).filter((item) => item !== value);

    if (nextValues.length > 0) {
      nextFilter[field] = nextValues;
    } else {
      delete nextFilter[field];
    }

    applyFilter(nextFilter);
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

  if (!searchParams.keyword?.trim()) {
    return null;
  }

  return (
    <div
      data-testid="advanced-filter-panel"
      className="w-full max-w-5xl rounded-[2rem] border-[0.5px] border-white/60 bg-white/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-3xl dark:border-white/[0.06] dark:bg-slate-950/40 sm:p-6"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-slate-200/60 bg-white/60 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                高级筛选
              </h3>
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-cyan-500/12 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-400/12 dark:text-cyan-200">
                  已启用 {activeFilterCount} 项
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              按包含关键词和排除关键词进一步收窄结果
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 dark:text-slate-400",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="mt-6 space-y-6">
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
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {group.title}
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeFilter?.[group.field] || []).map((value) => (
                    <button
                      key={`${group.field}-${value}`}
                      type="button"
                      onClick={() => removeKeywordTag(group.field, value)}
                      className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-800 transition hover:bg-cyan-500/15 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                    >
                      {value}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
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
            <div className="grid gap-4 lg:grid-cols-1">
              {facetGroups.map((group) => (
                <section
                  key={group.field}
                  className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {group.title}
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
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

          {!isFilterConfigEmpty(activeFilter) ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyFilter(undefined)}
                className="rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                清空面板内筛选
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchAdvancedFilterPanel;
