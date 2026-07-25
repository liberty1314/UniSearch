import { useMemo } from "react";
import type { SearchParams, SearchResponse } from "@/types/search";
import {
  buildSearchResultsPresentation,
} from "@/components/search-results/searchResultsPresentation";
import { buildActiveFilterChips } from "@/utils/searchFilters";
import { DEFAULT_SEARCH_FIRST_PAGE_MAX_PER_SOURCE } from "@/lib/searchSourceDiversity";
import {
  DEFAULT_SEARCH_SORT_MODE,
  type SearchSortMode,
} from "@/utils/searchResultSorter";

export type SearchResultsViewMode = "list" | "grid";

interface UseSearchResultsPresentationParams {
  searchResults: SearchResponse | null;
  searchParams: SearchParams;
  displayedCount: number;
  enableSourceDiversity?: boolean;
  maxPerSource?: number;
  sortMode?: SearchSortMode;
}

export const useSearchResultsPresentation = ({
  searchResults,
  searchParams,
  displayedCount,
  enableSourceDiversity = false,
  maxPerSource = DEFAULT_SEARCH_FIRST_PAGE_MAX_PER_SOURCE,
  sortMode = DEFAULT_SEARCH_SORT_MODE,
}: UseSearchResultsPresentationParams) => {
  const { allSortedResults, displayedResults } = useMemo(
    () => buildSearchResultsPresentation({
      resources: searchResults?.resources,
      keyword: searchParams.keyword || "",
      selectedCloudTypes: searchParams.cloudTypes || [],
      displayedCount,
      enableSourceDiversity,
      maxPerSource,
      sortMode,
    }),
    [
      displayedCount,
      enableSourceDiversity,
      maxPerSource,
      sortMode,
      searchParams.cloudTypes,
      searchParams.keyword,
      searchResults?.resources,
    ],
  );

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(searchParams.filter),
    [searchParams.filter],
  );

  const hasAdvancedFilters = activeFilterChips.length > 0;
  const hasSourceFilters = Boolean(searchParams.cloudTypes?.length);

  return {
    activeFilterChips,
    allSortedResults,
    displayedResults,
    hasAdvancedFilters,
    hasSourceFilters,
    hasAnyActiveFilters: hasAdvancedFilters || hasSourceFilters,
  };
};
