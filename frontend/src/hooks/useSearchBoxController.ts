import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { readAccountSearchDefaults } from "@/lib/accountPreferences";

const HOME_QUICK_KEYWORD_LIMIT = 4;
const HOME_HOT_KEYWORDS_CACHE_TTL = 5 * 60 * 1000;
const FALLBACK_HOME_QUICK_KEYWORDS = [
  "电影",
  "纪录片",
  "前端教程",
  "效率工具",
] as const;

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

const createResetSearchScope = () => {
  const defaults = readAccountSearchDefaults();

  return {
    ...(defaults.resultType && defaults.resultType !== "merge"
      ? { resultType: defaults.resultType }
      : {}),
    cloudTypes: [...(defaults.cloudTypes || [])],
    channels: [],
    plugins: [],
    filter: undefined,
  };
};

const createActiveAccountSearchDefaults = () => {
  const defaults = readAccountSearchDefaults();

  return {
    ...(defaults.resultType && defaults.resultType !== "merge"
      ? { resultType: defaults.resultType }
      : {}),
    ...(defaults.cloudTypes && defaults.cloudTypes.length > 0
      ? { cloudTypes: defaults.cloudTypes }
      : {}),
  };
};

const pickHomeHotKeywords = (items: HotRankingItem[] = []) =>
  items
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title))
    .filter((title, index, titles) => titles.indexOf(title) === index)
    .slice(0, HOME_QUICK_KEYWORD_LIMIT);

const getFallbackHomeQuickKeywords = () =>
  [...FALLBACK_HOME_QUICK_KEYWORDS].slice(0, HOME_QUICK_KEYWORD_LIMIT);

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
        const nextKeywords =
          keywords.length > 0 ? keywords : getFallbackHomeQuickKeywords();
        homeHotKeywordsCache = {
          keywords: nextKeywords,
          expiresAt: Date.now() + HOME_HOT_KEYWORDS_CACHE_TTL,
        };
        return nextKeywords;
      })
      .catch(() => {
        const fallbackKeywords = getFallbackHomeQuickKeywords();
        homeHotKeywordsCache = {
          keywords: fallbackKeywords,
          expiresAt: Date.now() + HOME_HOT_KEYWORDS_CACHE_TTL,
        };
        return fallbackKeywords;
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
  const suppressHistoryOnFocusRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1);
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
      setActiveHistoryIndex(-1);
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

  useEffect(() => {
    if (visibleSearchHistory.length === 0) {
      setActiveHistoryIndex(-1);
      return;
    }

    setActiveHistoryIndex((current) =>
      current >= visibleSearchHistory.length
        ? visibleSearchHistory.length - 1
        : current,
    );
  }, [visibleSearchHistory.length]);

  const handleSearchError = async (error: unknown, keyword?: string) => {
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error, "搜索失败");
    const nextKeyword = keyword?.trim();

    if (errorCode === 401) {
      if (!isAdmin && token) {
        logout();
        toast.error("登录状态已失效，请重新登录");
        navigate("/login", {
          state: nextKeyword
            ? {
                from: buildRouteSnapshotFromUrl(
                  SearchService.buildSearchUrl({
                    ...searchParams,
                    keyword: nextKeyword,
                  }),
                ),
                pendingSearch: {
                  keyword: nextKeyword,
                },
              }
            : {
                from: getCurrentRouteSnapshot(),
              },
        });
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
      : { ...searchParams, ...createActiveAccountSearchDefaults(), keyword };
    const nextUrl = SearchService.buildSearchUrl(nextParams);
    const currentUrl = `${location.pathname}${location.search}`;

    setSearchParams(
      resetScope
        ? { keyword, ...resetScope }
        : { keyword, ...createActiveAccountSearchDefaults() },
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
      await performSearch(nextParams, { preserveResults: false });
      onSearch?.(keyword);
      setShowHistory(false);
    } catch (error) {
      await handleSearchError(error, keyword);
    }
  };

  const submitKeyword = async (keywordInput: string) => {
    const keyword = keywordInput.trim();
    if (!keyword) return;

    if (!isAuthenticated || searchAccessStatus === "anonymous") {
      const nextUrl = SearchService.buildSearchUrl({
        ...searchParams,
        ...createActiveAccountSearchDefaults(),
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

  const moveHistorySelection = (direction: "next" | "previous") => {
    if (visibleSearchHistory.length === 0) {
      return;
    }

    setShowHistory(true);
    setActiveHistoryIndex((current) => {
      if (current < 0) {
        return direction === "next" ? 0 : visibleSearchHistory.length - 1;
      }

      if (direction === "next") {
        return (current + 1) % visibleSearchHistory.length;
      }

      return (
        (current - 1 + visibleSearchHistory.length) %
        visibleSearchHistory.length
      );
    });
  };

  const submitActiveHistory = () => {
    const keyword = visibleSearchHistory[activeHistoryIndex];
    if (!showHistory || !keyword) {
      return false;
    }

    void (async () => {
      setInputValue(keyword);
      await executeSearch(keyword);
    })();
    return true;
  };

  const removeActiveHistory = () => {
    const keyword = visibleSearchHistory[activeHistoryIndex];
    if (!showHistory || !keyword) {
      return false;
    }

    removeFromHistory(keyword);
    if (visibleSearchHistory.length <= 1) {
      setShowHistory(false);
      setActiveHistoryIndex(-1);
    } else {
      setActiveHistoryIndex((current) =>
        Math.min(current, visibleSearchHistory.length - 2),
      );
    }
    return true;
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (suppressHistoryOnFocusRef.current) {
      suppressHistoryOnFocusRef.current = false;
      return;
    }

    if (visibleSearchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
  };

  return {
    inputRef,
    buttonRef,
    wrapperRef,
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    handleInputFocus,
    handleInputBlur,
    showHistory,
    setShowHistory,
    activeHistoryIndex,
    setActiveHistoryIndex,
    moveHistorySelection,
    submitActiveHistory,
    removeActiveHistory,
    visibleSearchHistory,
    homeQuickKeywords,
    isHomeQuickKeywordsLoading,
    isHomePage,
    isLoading,
    submitKeyword,
    clearInput: () => {
      suppressHistoryOnFocusRef.current = true;
      setInputValue("");
      setShowHistory(false);
      setActiveHistoryIndex(-1);
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
    removeHistoryItem: (keyword: string) => {
      removeFromHistory(keyword);
      setActiveHistoryIndex(-1);
    },
  };
}

export { HOME_QUICK_KEYWORD_LIMIT };
