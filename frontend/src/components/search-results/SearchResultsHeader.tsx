import React from "react";
import { SearchResultsToolbar } from "@/components/home/SearchResultsToolbar";
import type { ActiveFilterChip } from "@/utils/searchFilters";
import type { SearchSortMode } from "@/utils/searchResultSorter";

type ViewMode = "list" | "grid";

interface SearchResultsHeaderProps {
  totalCount: number;
  viewMode: ViewMode;
  sortMode: SearchSortMode;
  isRefreshing: boolean;
  activeFilterChips: ActiveFilterChip[];
  onViewModeChange: (mode: ViewMode) => void;
  onSortModeChange: (mode: SearchSortMode) => void;
  onRemoveFilterChip: (chipId: string) => void;
  onClearFilters?: () => void;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalCount,
  viewMode,
  sortMode,
  isRefreshing,
  activeFilterChips,
  onViewModeChange,
  onSortModeChange,
  onRemoveFilterChip,
  onClearFilters,
}) => (
  <>
    {totalCount > 0 && (
      <SearchResultsToolbar
        totalCount={totalCount}
        viewMode={viewMode}
        sortMode={sortMode}
        onViewModeChange={onViewModeChange}
        onSortModeChange={onSortModeChange}
        isRefreshing={isRefreshing}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={onRemoveFilterChip}
        onClearFilters={onClearFilters}
      />
    )}
  </>
);

export default SearchResultsHeader;
