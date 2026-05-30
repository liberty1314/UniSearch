import React from "react";
import { SearchResultsToolbar } from "@/components/home/SearchResultsToolbar";
import type { ActiveFilterChip } from "@/utils/searchFilters";

type ViewMode = "list" | "grid";

interface SearchResultsHeaderProps {
  totalCount: number;
  viewMode: ViewMode;
  isRefreshing: boolean;
  activeFilterChips: ActiveFilterChip[];
  onViewModeChange: (mode: ViewMode) => void;
  onRemoveFilterChip: (chipId: string) => void;
  onClearFilters?: () => void;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalCount,
  viewMode,
  isRefreshing,
  activeFilterChips,
  onViewModeChange,
  onRemoveFilterChip,
  onClearFilters,
}) => (
  <>
    {totalCount > 0 && (
      <SearchResultsToolbar
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isRefreshing={isRefreshing}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={onRemoveFilterChip}
        onClearFilters={onClearFilters}
      />
    )}
  </>
);

export default SearchResultsHeader;
