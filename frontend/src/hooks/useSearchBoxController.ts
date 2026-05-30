import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MAX_SEARCH_HISTORY,
  useSearchHistory,
  useSearchStore,
} from "@/stores/searchStore";
import { useAuthStore } from "@/stores/authStore";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { SearchService } from "@/services/searchService";
import { hotRankingService } from "@/services/hotRankingService";
import type { StatefulButtonHandle } from "@/components/ui/stateful-button";
import type { HotRankingItem } from "@/types/hotRanking";
import { getErrorCode, getErrorMessage } from "@/lib/error";

const HOME_QUICK_KEYWORD_LIMIT = 4;
const HOME_HOT_KEYWORDS_CACHE_TTL = 5 * 60 * 1000;

type HomeHotKeywordsCache = {
  keywords: string[];
  expiresAt: number;
};

let homeHotKeywordsCache: HomeHotKeywordsCache | null = null;
let homeHotKeywordsRequest: Promise<string[]> | null = null;

const resetHomeHotKeywordsCache = () => {
  homeHotKeywordsCache = null;
  homeHotKeywordsRequest = null;
};

if (typeof globalThis !== "undefined") {
  (
    globalThis as typeof globalThis & {
      __unisearchResetHomeHotKeywordsCache?: () => void;
    }
  ).__unisearchResetHomeHotKeywordsCache = resetHomeHotKeywordsCache;
}

const getCurrentRouteSnapshot = () => ({
  pathname: window.location.pathname || "/",
  search: window.location.search || "",
  hash: window.location.hash || "",
});

const buildRouteSnapshotFromUrl = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin);
  return {
    pathname: parsedUrl.pathname || "/",
    search: parsedUrl.search || "",
    hash: parsedUrl.hash || "",
  };
};

const buildHomeSearchTransitionState = () => ({
  routeTransition: "forward" as const,
  transitionSource: "home-search-box",
  resetScroll: true,
});

const createResetSearchScope = () => ({
  cloudTypes: [],
  channels: [],
  plugins: [],
  filter: undefined,
});

const pickHomeHotKeywords = (items: HotRankingItem[] = []) =>
  items
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title))
    .filter((title, index, titles) => titles.indexOf(title) === index)
    .slice(0, HOME_QUICK_KEYWORD_LIMIT);

const extractHomeHotKeywords = async (): Promise<string[]> => {
  const response = await hotRankingService.getHotRankings({
    mode: "trend",
    period: "day",
    category: "all",
    page_size: 20,
  });

  return pickHomeHotKeywords(
    (response.sections ?? []).flatMap((section) => {
      const candidates: HotRankingItem[] = [];
      if (section.spotlight) {
        candidates.push(section.spotlight);
      }
      candidates.push(...section.items);
      return candidates;
    }),
  );
};

const loadHomeHotKeywords = async (): Promise<string[]> => {
  const now = Date.now();
  if (homeHotKeywordsCache && homeHotKeywordsCache.expiresAt > now) {
    return homeHotKeywordsCache.keywords;
  }

  if (!homeHotKeywordsRequest) {
    homeHotKeywordsRequest = extractHomeHotKeywords()
      .then((keywords) => {
        homeHotKeywordsCache = {
          keywords,
          expiresAt: Date.now() + HOME_HOT_KEYWORDS_CACHE_TTL,
        };
        return keywords;
      })
      .finally(() => {
        homeHotKeywordsRequest = null;
      });
  }

  return homeHotKeywordsRequest;
};

interface UseSearchBoxControllerOptions {
  autoFocus?: boolean;
  onSearch?: (keyword: string) => void;
}

export function useSearchBoxController({
  autoFocus = false,
  onSearch,
}: UseSearchBoxControllerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<StatefulButtonHandle>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [homeQuickKeywords, setHomeQuickKeywords] = useState<string[]>([]);
  const [isHomeQuickKeywordsLoading, setIsHomeQuickKeywordsLoading] = useState(
    false,
  );

  const {
    searchParams,
    setSearchParams,
    performSearch,
    clearResults,
    clearHistory,
    removeFromHistory,
    isLoading,
  } = useSearchStore();
  const { token, isAuthenticated, isAdmin, logout } = useAuthStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const searchHistory = useSearchHistory();
  const visibleSearchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
  const isHomePage = location.pathname === "/";
  const shouldResetFromHomeBack = Boolean(
    (
      location.state as { resetHomeSearchBox?: boolean } | null
    )?.resetHomeSearchBox,
  );

  const [inputValue, setInputValue] = useState(searchParams.keyword || "");

  useEffect(() => {
    setInputValue(searchParams.keyword || "");
  }, [searchParams.keyword]);

  useEffect(() => {
    if (!isHomePage || !shouldResetFromHomeBack) {
      return undefined;
    }

    setInputValue("");
    setSearchParams({ keyword: "" });
    setShowHistory(false);
    buttonRef.current?.reset?.();
  }, [isHomePage, setSearchParams, shouldResetFromHomeBack]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!isHomePage) {
      return;
    }

    let isMounted = true;
    const now = Date.now();
    const cachedKeywords =
      homeHotKeywordsCache && homeHotKeywordsCache.expiresAt > now
        ? homeHotKeywordsCache.keywords
        : null;

    if (cachedKeywords) {
      setHomeQuickKeywords(cachedKeywords);
      setIsHomeQuickKeywordsLoading(false);
    } else {
      setIsHomeQuickKeywordsLoading(true);
    }

    const hydrateHomeQuickKeywords = async () => {
      try {
        const keywords = await loadHomeHotKeywords();
        if (!isMounted) {
          return;
        }
        setHomeQuickKeywords(keywords);
      } catch {
        if (!isMounted) {
          return;
        }
        setHomeQuickKeywords([]);
      } finally {
        if (isMounted) {
          setIsHomeQuickKeywordsLoading(false);
        }
      }
    };

    if (!cachedKeywords) {
      void hydrateHomeQuickKeywords();
    }

    return () => {
      isMounted = false;
    };
  }, [isHomePage]);

  useEffect(() => {
    if (!showHistory) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [showHistory]);

  const handleSearchError = async (error: unknown) => {
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error, "搜索失败");

    if (errorCode === 401) {
      if (!isAdmin && token) {
        logout();
        toast.error("登录状态已失效，请重新登录");
        navigate("/login");
        return undefined;
      }
      toast.warning("搜索前请先登录", { duration: 3000 });
      navigate("/login", {
        state: {
          from: getCurrentRouteSnapshot(),
        },
      });
      return undefined;
    }

    toast.error(errorMessage);
  };

  const executeSearch = async (keyword: string) => {
    const isSearchPage = location.pathname === "/search";
    const isDifferentKeyword = keyword !== (searchParams.keyword || "").trim();
    const shouldResetSearchScope = isSearchPage && isDifferentKeyword;
    const resetScope = shouldResetSearchScope ? createResetSearchScope() : null;
    const nextParams = resetScope
      ? { ...searchParams, keyword, ...resetScope }
      : { ...searchParams, keyword };
    const nextUrl = SearchService.buildSearchUrl(nextParams);
    const currentUrl = `${location.pathname}${location.search}`;

    setSearchParams(
      resetScope
        ? { keyword, ...resetScope }
        : { keyword },
    );

    if (!isSearchPage) {
      if (currentUrl !== nextUrl) {
        navigate(
          nextUrl,
          isHomePage
            ? { state: buildHomeSearchTransitionState() }
            : undefined,
        );
      }
      onSearch?.(keyword);
      setShowHistory(false);
      return undefined;
    }

    try {
      if (currentUrl !== nextUrl) {
        navigate(nextUrl, {
          state: { skipSearchSync: true },
        });
      }
      await buttonRef.current?.run(() => performSearch(nextParams));
      onSearch?.(keyword);
      setShowHistory(false);
    } catch (error) {
      await handleSearchError(error);
    }
  };

  const submitKeyword = async (keywordInput: string) => {
    const keyword = keywordInput.trim();
    if (!keyword) return;

    if (!isAuthenticated || searchAccessStatus === "anonymous") {
      const nextUrl = SearchService.buildSearchUrl({
        ...searchParams,
        keyword,
      });
      toast.warning("搜索前请先登录", { duration: 3000 });
      navigate("/login", {
        state: {
          from: buildRouteSnapshotFromUrl(nextUrl),
          pendingSearch: {
            keyword,
          },
        },
      });
      return undefined;
    }

    await executeSearch(keyword);
  };

  return {
    inputRef,
    buttonRef,
    wrapperRef,
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    showHistory,
    setShowHistory,
    visibleSearchHistory,
    homeQuickKeywords,
    isHomeQuickKeywordsLoading,
    isHomePage,
    isLoading,
    submitKeyword,
    clearInput: () => {
      setInputValue("");
      clearResults();
      if (location.pathname === "/" && location.search) {
        navigate("/", { replace: true, state: { skipSearchSync: true } });
      }
      if (location.pathname === "/search" && location.search) {
        navigate("/search", { replace: true, state: { skipSearchSync: true } });
      }
      inputRef.current?.focus();
      buttonRef.current?.reset?.();
    },
    selectHistory: async (keyword: string) => {
      setInputValue(keyword);
      await executeSearch(keyword);
    },
    clearHistory: () => {
      clearHistory();
      setShowHistory(false);
    },
    removeHistoryItem: removeFromHistory,
  };
}

export { HOME_QUICK_KEYWORD_LIMIT };
