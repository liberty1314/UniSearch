import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicPageShell from "@/components/PublicPageShell";
import SearchResults from "@/components/SearchResults";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import SearchQueryDock from "@/components/search/SearchQueryDock";
import SearchStage from "@/components/search/SearchStage";
import SearchTransition from "@/components/search/SearchTransition";
import { deriveSearchTransitionState } from "@/components/search/searchTransitionModel";
import SEO from "@/components/SEO";
import { useSearchUrlSync } from "@/hooks/useSearchUrlSync";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { useSearchStore } from "@/stores/searchStore";

const SearchPage: React.FC = () => {
  const {
    searchParams,
    searchResults,
    isLoading,
    isRefreshing,
    progressiveStatus,
    completedSources,
    totalSources,
    receivedBatches,
    error,
    setSearchParams,
    clearResults,
  } = useSearchStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  useSearchUrlSync();
  const location = useLocation();
  const navigate = useNavigate();
  const showSearchAccessHint = searchAccessStatus === "anonymous";
  const hasKeyword = Boolean(searchParams.keyword?.trim());
  const fromTrending = (
    location.state as {
      fromTrending?: {
        title?: string;
        keyword?: string;
      };
    } | null
  )?.fromTrending;

  const viewState = useMemo(
    () => deriveSearchTransitionState({
      keyword: searchParams.keyword,
      isLoading,
      isRefreshing,
      progressiveStatus,
      completedSources,
      totalSources,
      receivedBatches,
      resultCount: searchResults?.resources.length || 0,
      error,
    }),
    [
      completedSources,
      error,
      isLoading,
      isRefreshing,
      progressiveStatus,
      receivedBatches,
      searchParams.keyword,
      searchResults?.resources.length,
      totalSources,
    ],
  );

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

  const accessHint = showSearchAccessHint
    ? "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。"
    : undefined;
  const fromTrendingLabel = fromTrending?.keyword || fromTrending?.title;

  return (
    <PublicPageShell
      className="bg-[#F7F8FA] dark:bg-[#080B12]"
      contentClassName="px-4 pb-12 pt-20 sm:pb-16 sm:pt-24"
    >
      <SEO
        title={hasKeyword
          ? `${searchParams.keyword} 的搜索结果 | UniSearch`
          : "搜索 | UniSearch"}
        description="在 UniSearch 中聚合搜索网盘资源，并按来源与关键词筛选结果。"
      />

      <SearchTransition
        view={hasKeyword ? "results" : "idle"}
        idle={(
          <SearchStage
            viewState={viewState}
            completedSources={completedSources}
            totalSources={totalSources}
            receivedBatches={receivedBatches}
            accessHint={accessHint}
            onBack={handleBack}
          />
        )}
        results={(
          <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
            <SearchQueryDock
              fromTrendingLabel={fromTrendingLabel}
              onBack={handleBack}
            />
            <div className="max-w-5xl">
              <SearchUnifiedFilterCard />
            </div>
            <SearchResults revealActive={viewState.phase === "revealing"} />
          </div>
        )}
      />
    </PublicPageShell>
  );
};

export default SearchPage;
