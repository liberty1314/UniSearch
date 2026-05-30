import React, { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import SearchResults from "@/components/SearchResults";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import { SearchEmptyWorkbench } from "@/components/search/SearchEmptyWorkbench";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useSearchUrlSync } from "@/hooks/useSearchUrlSync";
import { SearchService } from "@/services/searchService";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { useSearchStore } from "@/stores/searchStore";

const buildRouteSnapshotFromUrl = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin);
  return {
    pathname: parsedUrl.pathname || "/",
    search: parsedUrl.search || "",
    hash: parsedUrl.hash || "",
  };
};

const SearchPage: React.FC = () => {
  const {
    searchParams,
    setSearchParams,
    clearResults,
    performSearch,
    searchHistory,
  } = useSearchStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  useSearchUrlSync();
  const location = useLocation();
  const navigate = useNavigate();
  const showSearchAccessHint = searchAccessStatus === "anonymous";

  const hasKeyword = useMemo(
    () => Boolean(searchParams.keyword?.trim()),
    [searchParams.keyword],
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

  const handleQuickSearch = (keywordInput: string) => {
    const keyword = keywordInput.trim();
    if (!keyword) {
      return;
    }

    const nextParams = {
      ...searchParams,
      keyword,
      cloudTypes: [],
      channels: [],
      plugins: [],
      filter: undefined,
    };
    const targetUrl = SearchService.buildSearchUrl(nextParams);

    if (showSearchAccessHint) {
      navigate("/login", {
        state: {
          from: buildRouteSnapshotFromUrl(targetUrl),
          pendingSearch: { keyword },
        },
      });
      return;
    }

    setSearchParams({
      keyword,
      cloudTypes: [],
      channels: [],
      plugins: [],
      filter: undefined,
    });
    void performSearch(nextParams, { preserveResults: false });

    const currentUrl = `${location.pathname}${location.search}`;
    if (targetUrl !== currentUrl) {
      navigate(targetUrl, {
        state: { skipSearchSync: true },
      });
    }
  };

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO
        title={
          hasKeyword
            ? `${searchParams.keyword} 的搜索结果 | UniSearch`
            : "搜索结果 | UniSearch"
        }
        description="在 UniSearch 中查看聚合搜索结果，并按网盘与关键词进一步筛选。"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4">
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

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {hasKeyword ? `“${searchParams.keyword}” 的搜索结果` : "开始新的搜索"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {showSearchAccessHint
                ? "输入关键词后会先完成登录确认，系统会保留本次搜索意图并继续查看结果。"
                : "输入关键词后进入聚合搜索，也可以从最近搜索或热门线索直接开始。"}
            </p>
          </div>
        </div>

        <div className="space-y-5">
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
              recentKeywords={searchHistory}
              onKeywordSearch={handleQuickSearch}
            />
          )}
        </div>
      </div>
    </PublicPageShell>
  );
};

export default SearchPage;
