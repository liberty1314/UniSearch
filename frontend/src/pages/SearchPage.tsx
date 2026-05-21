import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import CloudTypeFilter from "@/components/CloudTypeFilter";
import SearchAdvancedFilterPanel from "@/components/SearchAdvancedFilterPanel";
import SearchResults from "@/components/SearchResults";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { SearchService } from "@/services/searchService";
import { useAuthStore } from "@/stores/authStore";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { useSearchStore } from "@/stores/searchStore";

const SearchPage: React.FC = () => {
  const {
    searchParams,
    searchResults,
    performSearch,
    setSearchParams,
    clearResults,
  } = useSearchStore();
  useSearchAccessStatus();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const handledResumeSearchRef = useRef<string | null>(null);
  const handledUrlSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const state = location.state as {
      resumeSearch?: { keyword?: string };
    } | null;
    const keyword = state?.resumeSearch?.keyword?.trim();

    if (!isAuthenticated || !keyword) {
      if (!keyword) {
        handledResumeSearchRef.current = null;
      }
      return;
    }

    const resumeKey = `${location.pathname}:${keyword}`;
    if (handledResumeSearchRef.current === resumeKey) {
      return;
    }

    handledResumeSearchRef.current = resumeKey;
    navigate(
      SearchService.buildSearchUrl({
        ...searchParams,
        keyword,
      }),
      { replace: true, state: undefined },
    );
  }, [
    isAuthenticated,
    location.pathname,
    location.state,
    navigate,
    searchParams,
  ]);

  useEffect(() => {
    const state = location.state as { skipSearchSync?: boolean } | null;
    const parsedParams = SearchService.parseSearchUrl(location.search);
    const keyword = parsedParams.keyword?.trim();

    if (!keyword) {
      handledUrlSearchRef.current = null;
      clearResults();
      return;
    }

    const nextParams = {
      keyword,
      source: parsedParams.source || "all",
      resultType: parsedParams.resultType || "merge",
      cloudTypes: parsedParams.cloudTypes || [],
      channels: parsedParams.channels || [],
      plugins: parsedParams.plugins || [],
      concurrency: searchParams.concurrency || 5,
      refresh: false,
      ext: searchParams.ext || {},
      filter: parsedParams.filter,
    };

    const snapshot = JSON.stringify(nextParams);
    setSearchParams(nextParams);

    if (state?.skipSearchSync) {
      handledUrlSearchRef.current = snapshot;
      if (location.state) {
        navigate(`${location.pathname}${location.search}${location.hash}`, {
          replace: true,
          state: undefined,
        });
      }
      return;
    }

    if (handledUrlSearchRef.current === snapshot) {
      return;
    }

    handledUrlSearchRef.current = snapshot;
    void performSearch(nextParams, { preserveResults: Boolean(searchResults) });
  }, [
    clearResults,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    performSearch,
    searchParams.concurrency,
    searchParams.ext,
    searchResults,
    setSearchParams,
  ]);

  const hasKeyword = useMemo(
    () => Boolean(searchParams.keyword?.trim()),
    [searchParams.keyword],
  );

  const handleBackHome = () => {
    clearResults();
    navigate("/", {
      replace: true,
      state: {
        skipHomeEntrance: true,
        routeTransition: "backward",
        transitionSource: "search-back-home",
        resetScroll: true,
      },
    });
  };

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO
        title={
          hasKeyword
            ? `${searchParams.keyword} 的搜索结果 | UniSearch`
            : "搜索结果 | UniSearch"
        }
        description="在 UniSearch 中查看聚合搜索结果，并按来源与关键词进一步筛选。"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBackHome}
              className="rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {hasKeyword ? `“${searchParams.keyword}” 的搜索结果` : "开始新的搜索"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              进入独立结果页后开始加载内容，您也可以继续调整关键词、来源和高级筛选条件。
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
          className="space-y-6"
        >
          <SearchBox className="w-full max-w-4xl" />

          {hasKeyword ? (
            <>
              <div className="max-w-5xl">
                <CloudTypeFilter />
              </div>
              <div className="max-w-5xl">
                <SearchAdvancedFilterPanel />
              </div>
            </>
          ) : null}

          <SearchResults />
        </motion.div>
      </div>
    </PublicPageShell>
  );
};

export default SearchPage;
