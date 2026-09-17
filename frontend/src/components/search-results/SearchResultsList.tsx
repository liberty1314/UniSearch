import React from "react";
import { cn } from "@/lib/utils";
import SearchResultsVirtualList from "@/components/search-results/SearchResultsVirtualList";
import SearchResultItemView from "@/components/search-results/SearchResultItemView";
import type { ResultItem } from "@/utils/cloudTypeUtils";

type ViewMode = "list" | "grid";

// 超过该数量才启用虚拟化：少量结果直接渲染，避免虚拟化的测量/定位开销与潜在布局抖动；
// 大量结果（持续下拉累积）时才用窗口虚拟化收敛 DOM 与合成成本。
const VIRTUALIZATION_THRESHOLD = 60;

interface SearchResultsListProps {
  resources: ResultItem[];
  viewMode: ViewMode;
  revealActive?: boolean;
  enableResourceDetailPage: boolean;
  enableResourceSourceBadges: boolean;
  resolvingResourceId?: string | null;
  onOpenResource: (item: ResultItem) => void;
  onCancelResolveResource: () => void;
  onOpenDetail: (item: ResultItem) => void;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  resources,
  viewMode,
  revealActive = false,
  enableResourceDetailPage,
  enableResourceSourceBadges,
  resolvingResourceId,
  onOpenResource,
  onCancelResolveResource,
  onOpenDetail,
}) => {
  if (resources.length > VIRTUALIZATION_THRESHOLD) {
    return (
      <SearchResultsVirtualList
        resources={resources}
        viewMode={viewMode}
        revealActive={revealActive}
        enableResourceDetailPage={enableResourceDetailPage}
        enableResourceSourceBadges={enableResourceSourceBadges}
        resolvingResourceId={resolvingResourceId}
        onOpenResource={onOpenResource}
        onCancelResolveResource={onCancelResolveResource}
        onOpenDetail={onOpenDetail}
      />
    );
  }

  return (
    <div
      data-testid="search-results-stage"
      className={cn(
        "relative z-10 w-full",
        viewMode === "grid"
          ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "flex flex-col gap-4",
      )}
    >
      {resources.map((item, index) => (
        <SearchResultItemView
          key={item.resource.id}
          item={item}
          index={index}
          viewMode={viewMode}
          revealActive={revealActive}
          enableResourceDetailPage={enableResourceDetailPage}
          enableResourceSourceBadges={enableResourceSourceBadges}
          resolvingResourceId={resolvingResourceId}
          onOpenResource={onOpenResource}
          onCancelResolveResource={onCancelResolveResource}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
};

export default SearchResultsList;
