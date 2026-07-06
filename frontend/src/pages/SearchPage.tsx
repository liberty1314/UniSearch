import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import SearchResults from "@/components/SearchResults";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import { SearchEmptyWorkbench } from "@/components/search/SearchEmptyWorkbench";
import {
  buildTrendingLaunchEntries,
} from "@/components/search/searchLaunchpadPresets";
import type {
  SearchLaunchPreset,
  SearchLaunchTrendingEntry,
} from "@/components/search/searchLaunchpadTypes";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useSearchUrlSync } from "@/hooks/useSearchUrlSync";
import { hotRankingService } from "@/services/hotRankingService";
import { SearchService } from "@/services/searchService";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { useSearchStore } from "@/stores/searchStore";
import type { SearchParams } from "@/types/search";
import { readAccountSearchDefaults } from "@/lib/accountPreferences";

const buildRouteSnapshotFromUrl = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin);
  return {
    pathname: parsedUrl.pathname || "/",
    search: parsedUrl.search || "",
    hash: parsedUrl.hash || "",
  };
};

const buildPresetSearchParams = (
  presetParams: SearchParams,
  currentSearchParams: SearchParams,
): SearchParams => ({
  keyword: presetParams.keyword.trim(),
  source: presetParams.source || "all",
  resultType: presetParams.resultType || readAccountSearchDefaults().resultType || "merge",
  cloudTypes: [...(presetParams.cloudTypes ?? readAccountSearchDefaults().cloudTypes ?? [])],
  channels: [...(presetParams.channels || [])],
  plugins: [...(presetParams.plugins || [])],
  concurrency: presetParams.concurrency || currentSearchParams.concurrency || 5,
  refresh: false,
  ext: presetParams.ext ? { ...presetParams.ext } : currentSearchParams.ext || {},
  filter: presetParams.filter,
});

const SearchPage: React.FC = () => {
  const {
    searchParams,
    setSearchParams,
    clearResults,
    performSearch,
    recentEffectiveSearches,
    removeRecentEffectiveSearch,
    clearRecentEffectiveSearches,
  } = useSearchStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  useSearchUrlSync();
  const location = useLocation();
  const navigate = useNavigate();
  const [trendingEntries, setTrendingEntries] = useState<SearchLaunchTrendingEntry[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const showSearchAccessHint = searchAccessStatus === "anonymous";
  const fromTrending = (
    location.state as {
      fromTrending?: {
        title?: string;
        originalTitle?: string;
        keyword?: string;
      };
    } | null
  )?.fromTrending;

  const hasKeyword = useMemo(
    () => Boolean(searchParams.keyword?.trim()),
    [searchParams.keyword],
  );

  useEffect(() => {
    if (hasKeyword) {
      setTrendingEntries([]);
      setIsTrendingLoading(false);
      return;
    }

    let cancelled = false;
    setIsTrendingLoading(true);

    void hotRankingService
      .getHotRankings({
        mode: "trend",
        period: "day",
        category: "all",
        page_size: 6,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }

        const items = response.sections
          .flatMap((section) => section.items || [])
          .filter((item) => item.title?.trim())
          .slice(0, 6);

        setTrendingEntries(buildTrendingLaunchEntries(items));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("加载搜索启动台热榜失败:", error);
          setTrendingEntries([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTrendingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasKeyword]);

  const handleBack = () => {
    clearResults();
    setSearchParams({ keyword: "" });

    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate("/", {
      replace: true,
      state: {
        skipHomeEntrance: true,
        resetHomeSearchBox: true,
        routeTransition: "backward",
        transitionSource: "search-back-home",
        resetScroll: true,
      },
    });
  };

  const handlePresetSearch = (preset: SearchLaunchPreset) => {
    const keyword = preset.params.keyword.trim();
    if (!keyword) {
      return;
    }

    const nextParams = buildPresetSearchParams(preset.params, searchParams);
    const targetUrl = SearchService.buildSearchUrl(nextParams);

    if (showSearchAccessHint) {
      navigate("/login", {
        state: {
          from: buildRouteSnapshotFromUrl(targetUrl),
          pendingSearch: {
            keyword,
            params: nextParams,
            fromTrending: preset.fromTrending,
          },
        },
      });
      return;
    }

    const currentUrl = `${location.pathname}${location.search}`;
    if (targetUrl !== currentUrl) {
      navigate(targetUrl, {
        state: {
          forceSkeleton: true,
          ...(preset.fromTrending ? { fromTrending: preset.fromTrending } : {}),
        },
      });
      return;
    }

    setSearchParams(nextParams);
    void performSearch(nextParams, { preserveResults: false });
  };

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-6 pt-22 pb-12 sm:pt-24 sm:pb-16">
      <SEO
        title={
          hasKeyword
            ? `${searchParams.keyword} 的搜索结果 | UniSearch`
            : "搜索结果 | UniSearch"
        }
        description="在 UniSearch 中查看聚合搜索结果，并按网盘与关键词进一步筛选。"
      />

      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              className="rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              {hasKeyword ? `“${searchParams.keyword}” 的搜索结果` : "开始新的搜索"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {showSearchAccessHint
                ? "输入关键词后会先完成登录确认，系统会保留本次搜索意图并继续查看结果。"
                : "输入关键词后进入聚合搜索，也可以从最近搜索或热门线索直接开始。"}
            </p>
            {fromTrending?.title ? (
              <div className="inline-flex w-fit max-w-full items-center rounded-full border border-cyan-200/70 bg-cyan-50/75 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                来自热门榜单：{fromTrending.keyword || fromTrending.title}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <SearchBox
            className="w-full max-w-4xl"
            autoFocus={!hasKeyword}
            accessHint={
              showSearchAccessHint
                ? "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。"
                : undefined
            }
          />

          {hasKeyword ? (
            <>
              <div className="max-w-5xl">
                <SearchUnifiedFilterCard />
              </div>
              <SearchResults />
            </>
          ) : (
            <SearchEmptyWorkbench
              recentSearches={recentEffectiveSearches}
              trendingEntries={trendingEntries}
              isTrendingLoading={isTrendingLoading}
              onPresetSearch={handlePresetSearch}
              onRemoveRecentSearch={removeRecentEffectiveSearch}
              onClearRecentSearches={clearRecentEffectiveSearches}
            />
          )}
        </div>
      </div>
    </PublicPageShell>
  );
};

export default SearchPage;
