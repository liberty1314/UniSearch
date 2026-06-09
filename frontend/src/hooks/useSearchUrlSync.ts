import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchService } from "@/services/searchService";
import { useAuthStore } from "@/stores/authStore";
import { useSearchStore } from "@/stores/searchStore";

const SEARCH_REVALIDATE_INTERVAL_MS = 10_000;

export function useSearchUrlSync(): void {
  const {
    searchParams,
    searchResults,
    performSearch,
    setSearchParams,
    clearResults,
  } = useSearchStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const handledResumeSearchRef = useRef<string | null>(null);
  const handledUrlSearchRef = useRef<string | null>(null);
  const lastFocusRevalidateAtRef = useRef(0);

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
    const isAlreadyHandledUrl = handledUrlSearchRef.current === snapshot;

    if (!state?.skipSearchSync && isAlreadyHandledUrl) {
      return;
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
    lastFocusRevalidateAtRef.current = Date.now();
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
          refresh: false,
          ext: searchParams.ext || {},
          filter: parsedParams.filter,
        },
        { preserveResults: Boolean(searchResults) },
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
    location.pathname,
    location.search,
    performSearch,
    searchParams.concurrency,
    searchParams.ext,
    searchResults,
  ]);
}
