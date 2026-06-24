import React from "react";
import { cn } from "@/lib/utils";
import { SearchResultGridCard } from "@/components/home/SearchResultGridCard";
import { SearchResultListItem } from "@/components/home/SearchResultListItem";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import { resolveResourceOpenTarget } from "@/utils/resourceDisplay";

type ViewMode = "list" | "grid";

interface SearchResultsListProps {
  resources: ResultItem[];
  viewMode: ViewMode;
  enableResourceDetailPage: boolean;
  enableResourceSourceBadges: boolean;
  onOpenResource: (item: ResultItem) => void;
  onOpenDetail: (item: ResultItem) => void;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  resources,
  viewMode,
  enableResourceDetailPage,
  enableResourceSourceBadges,
  onOpenResource,
  onOpenDetail,
}) => (
  <div
    data-testid="search-results-stage"
    className={cn(
      "relative z-10 w-full",
      viewMode === "grid"
        ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "flex flex-col gap-4",
    )}
  >
    {resources.map((item, index) =>
      viewMode === "grid" ? (
        <SearchResultGridCard
          key={item.resource.id}
          item={item}
          index={index}
          canOpenResource={Boolean(resolveResourceOpenTarget(item))}
          showDetailEntry={enableResourceDetailPage}
          showSourceBadge={enableResourceSourceBadges}
          onOpenResource={onOpenResource}
          onOpenDetail={enableResourceDetailPage ? onOpenDetail : () => undefined}
        />
      ) : (
        <SearchResultListItem
          key={item.resource.id}
          item={item}
          index={index}
          canOpenResource={Boolean(resolveResourceOpenTarget(item))}
          onOpenResource={onOpenResource}
          onOpenDetail={enableResourceDetailPage ? onOpenDetail : () => undefined}
          showDetailEntry={enableResourceDetailPage}
          showSourceBadge={enableResourceSourceBadges}
        />
      ),
    )}
  </div>
);

export default SearchResultsList;
