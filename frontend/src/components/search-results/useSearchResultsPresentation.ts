import { useMemo } from "react";
import type { CloudTypeValue, SearchParams, SearchResponse } from "@/types/search";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import { sortResources } from "@/utils/searchResultSorter";
import { buildActiveFilterChips } from "@/utils/searchFilters";

export type SearchResultsViewMode = "list" | "grid";

interface UseSearchResultsPresentationParams {
  searchResults: SearchResponse | null;
  searchParams: SearchParams;
  displayedCount: number;
}

export const useSearchResultsPresentation = ({
  searchResults,
  searchParams,
  displayedCount,
}: UseSearchResultsPresentationParams) => {
  const allSortedResults = useMemo(
    () => {
      const sortedResults = sortResources(searchResults?.resources, searchParams.keyword);
      const selectedCloudTypes = searchParams.cloudTypes || [];
      if (selectedCloudTypes.length === 0) {
        return sortedResults;
      }

      return sortedResults.filter((item) =>
        selectedCloudTypes.includes(item.cloudType as CloudTypeValue),
      );
    },
    [searchParams.cloudTypes, searchParams.keyword, searchResults?.resources],
  );

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(searchParams.filter),
    [searchParams.filter],
  );

  const displayedResults = useMemo<ResultItem[]>(
    () => allSortedResults.slice(0, displayedCount),
    [allSortedResults, displayedCount],
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
