import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchService } from "@/services/searchService";
import { useAuthStore } from "@/stores/authStore";
import { useSearchStore } from "@/stores/searchStore";
import type { SearchParams } from "@/types/api";
import { readAccountSearchDefaults } from "@/lib/accountPreferences";

const SEARCH_REVALIDATE_INTERVAL_MS = 10_000;

const buildResumeSearchParams = (
  params: Partial<SearchParams> | undefined,
  fallbackSearchParams: SearchParams,
  keyword: string,
): SearchParams => ({
  keyword,
  source: params?.source || fallbackSearchParams.source || "all",
  resultType: params?.resultType || fallbackSearchParams.resultType || readAccountSearchDefaults().resultType || "merge",
  cloudTypes: [...(params?.cloudTypes || fallbackSearchParams.cloudTypes || readAccountSearchDefaults().cloudTypes || [])],
  channels: [...(params?.channels || [])],
  plugins: [...(params?.plugins || [])],
  concurrency: params?.concurrency || fallbackSearchParams.concurrency || 5,
  refresh: params?.refresh || false,
  ext: params?.ext ? { ...params.ext } : fallbackSearchParams.ext || {},
  filter: params?.filter,
});

export function useSearchUrlSync(): void {
  const {
    searchParams,
    searchResults,
    performSearch,
    setSearchParams,
    clearResults,
    lastCompletedSearchParams,
  } = useSearchStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const handledResumeSearchRef = useRef<string | null>(null);
  const handledUrlSearchRef = useRef<string | null>(null);
  const lastFocusRevalidateAtRef = useRef(0);

  useEffect(() => {
    const state = location.state as {
      resumeSearch?: {
        keyword?: string;
        params?: Partial<SearchParams>;
        fromTrending?: {
          title?: string;
          originalTitle?: string;
          keyword?: string;
        };
      };
    } | null;
    const resumeParams = state?.resumeSearch?.params;
    const keyword =
      resumeParams?.keyword?.trim() || state?.resumeSearch?.keyword?.trim();

    if (!isAuthenticated || !keyword) {
      if (!keyword) {
        handledResumeSearchRef.current = null;
      }
      return;
    }

    const resumeKey = `${location.pathname}:${JSON.stringify(resumeParams || keyword)}`;
    if (handledResumeSearchRef.current === resumeKey) {
      return;
    }

    handledResumeSearchRef.current = resumeKey;
    navigate(
      SearchService.buildSearchUrl(
        buildResumeSearchParams(resumeParams, searchParams, keyword),
      ),
      {
        replace: true,
        state: state?.resumeSearch?.fromTrending
          ? { fromTrending: state.resumeSearch.fromTrending }
          : undefined,
      },
    );
  }, [
    isAuthenticated,
    location.pathname,
    location.state,
    navigate,
    searchParams,
  ]);

  useEffect(() => {
    const state = location.state as { skipSearchSync?: boolean; forceSkeleton?: boolean } | null;
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
      resultType: parsedParams.resultType || readAccountSearchDefaults().resultType || "merge",
      cloudTypes: parsedParams.cloudTypes ?? readAccountSearchDefaults().cloudTypes,
      channels: parsedParams.channels || [],
      plugins: parsedParams.plugins || [],
      concurrency: searchParams.concurrency || 5,
      refresh: parsedParams.refresh || false,
      ext: searchParams.ext || {},
      filter: parsedParams.filter,
    };

    const snapshot = JSON.stringify({
      keyword,
      source: parsedParams.source,
      resultType: parsedParams.resultType,
      cloudTypes: parsedParams.cloudTypes,
      channels: parsedParams.channels,
      plugins: parsedParams.plugins,
      refresh: parsedParams.refresh,
      filter: parsedParams.filter,
    });

    const isAlreadyHandledUrl = handledUrlSearchRef.current === snapshot;

    if (!state?.skipSearchSync && isAlreadyHandledUrl) {
      if (state?.forceSkeleton) {
        // 继续执行
      } else {
        return;
      }
    }

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

    handledUrlSearchRef.current = snapshot;

    const forceSkeleton = state?.forceSkeleton ?? false;
    lastFocusRevalidateAtRef.current = Date.now();
    void performSearch(nextParams, {
      preserveResults: forceSkeleton ? false : Boolean(searchResults) && lastCompletedSearchParams?.keyword === nextParams.keyword,
    });
    if (forceSkeleton && location.state) {
      const nextState = { ...(location.state as Record<string, unknown>) };
      delete nextState.forceSkeleton;
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: Object.keys(nextState).length > 0 ? nextState : undefined,
      });
    }
  }, [
    clearResults,
    lastCompletedSearchParams?.keyword,
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

  useEffect(() => {
    if (!isAuthenticated || location.pathname !== "/search") {
      return undefined;
    }

    const revalidateCurrentSearch = () => {
      const now = Date.now();
      if (now - lastFocusRevalidateAtRef.current < SEARCH_REVALIDATE_INTERVAL_MS) {
        return;
      }

      const parsedParams = SearchService.parseSearchUrl(location.search);
      const keyword = parsedParams.keyword?.trim();
      if (!keyword) {
        return;
      }

      const hasCompletedVisibleResults =
        Boolean(searchResults) && lastCompletedSearchParams?.keyword === keyword;
      if (!parsedParams.refresh && hasCompletedVisibleResults) {
        lastFocusRevalidateAtRef.current = now;
        return;
      }

      lastFocusRevalidateAtRef.current = now;
      void performSearch(
        {
          keyword,
          source: parsedParams.source || "all",
          resultType: parsedParams.resultType || "merge",
          cloudTypes: parsedParams.cloudTypes || [],
          channels: parsedParams.channels || [],
          plugins: parsedParams.plugins || [],
          concurrency: searchParams.concurrency || 5,
          refresh: parsedParams.refresh || false,
          ext: searchParams.ext || {},
          filter: parsedParams.filter,
        },
        {
          preserveResults:
            Boolean(searchResults) &&
            lastCompletedSearchParams?.keyword === keyword,
        },
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidateCurrentSearch();
      }
    };

    window.addEventListener("focus", revalidateCurrentSearch);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", revalidateCurrentSearch);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isAuthenticated,
    lastCompletedSearchParams?.keyword,
    location.pathname,
    location.search,
    performSearch,
    searchParams.concurrency,
    searchParams.ext,
    searchResults,
  ]);
}
