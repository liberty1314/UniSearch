import React from "react";
import { cn } from "@/lib/utils";
import { SearchResultsSkeleton } from "@/components/SkeletonLoader";
import { SearchResultsEmptyState } from "@/components/home/SearchResultsEmptyState";
import type { SearchParams, SearchSourceWarning } from "@/types/api";

type ViewMode = "list" | "grid";

interface SearchResultsStateProps {
  className?: string;
  error: string | null;
  isLoading: boolean;
  showLoadingSkeleton: boolean;
  resultCount: number;
  displayedCount: number;
  viewMode: ViewMode;
  keyword?: string;
  hasAnyActiveFilters: boolean;
  sourceWarnings?: SearchSourceWarning[];
  searchParams: SearchParams;
  onRetry: (params: SearchParams) => void;
  onClearFilters: () => void;
  onSuggestSearch: (keyword: string) => void;
}

const SearchResultsState: React.FC<SearchResultsStateProps> = ({
  className,
  error,
  isLoading,
  showLoadingSkeleton,
  resultCount,
  displayedCount,
  viewMode,
  keyword,
  hasAnyActiveFilters,
  sourceWarnings = [],
  searchParams,
  onRetry,
  onClearFilters,
  onSuggestSearch,
}) => {
  const hasSourceWarnings = sourceWarnings.length > 0;

  if (error) {
    return (
      <SearchResultsEmptyState
        variant="error"
        error={error}
        systemHint="部分搜索源可能不可用，请稍后重试或更换关键词。"
        onRetry={() => onRetry(searchParams)}
      />
    );
  }

  if (!isLoading && resultCount === 0 && keyword) {
    if (hasAnyActiveFilters) {
      return (
        <SearchResultsEmptyState
          variant="filtered-results"
          onClearFilters={onClearFilters}
        />
      );
    }

    return (
      <SearchResultsEmptyState
        variant="no-results"
        keyword={keyword}
        className={className}
        systemHint={
          hasSourceWarnings
            ? "部分搜索源可能暂时不可用，可以更换关键词或稍后再试。"
            : undefined
        }
        onSuggestSearch={onSuggestSearch}
      />
    );
  }

  if (!keyword) {
    return (
      <SearchResultsEmptyState variant="no-keyword" className={className} />
    );
  }

  if (showLoadingSkeleton && displayedCount === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <SearchResultsSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return null;
};

export default SearchResultsState;
