import React from "react";
import { SearchResultsToolbar } from "@/components/home/SearchResultsToolbar";
import type { ActiveFilterChip } from "@/utils/searchFilters";

type ViewMode = "list" | "grid";
type ProgressiveStatus = "idle" | "running" | "complete" | "fallback" | "error";

interface SearchResultsHeaderProps {
  totalCount: number;
  viewMode: ViewMode;
  isRefreshing: boolean;
  progressiveStatus: ProgressiveStatus;
  activeFilterChips: ActiveFilterChip[];
  onViewModeChange: (mode: ViewMode) => void;
  onRemoveFilterChip: (chipId: string) => void;
  onClearFilters?: () => void;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalCount,
  viewMode,
  isRefreshing,
  progressiveStatus,
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
        progressiveStatus={progressiveStatus}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={onRemoveFilterChip}
        onClearFilters={onClearFilters}
      />
    )}
  </>
);

export default SearchResultsHeader;
