import React from "react";
import { SearchResultsToolbar } from "@/components/home/SearchResultsToolbar";
import type { ActiveFilterChip } from "@/utils/searchFilters";

type ViewMode = "list" | "grid";

interface SearchResultsHeaderProps {
  totalCount: number;
  viewMode: ViewMode;
  isRefreshing: boolean;
  hasWarnings: boolean;
  activeFilterChips: ActiveFilterChip[];
  onViewModeChange: (mode: ViewMode) => void;
  onRemoveFilterChip: (chipId: string) => void;
  onClearFilters?: () => void;
}

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalCount,
  viewMode,
  isRefreshing,
  hasWarnings,
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

    {hasWarnings ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        部分搜索源暂时不可用，已优先展示可用结果。
      </div>
    ) : null}
  </>
);

export default SearchResultsHeader;
