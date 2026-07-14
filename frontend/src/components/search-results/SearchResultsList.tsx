import React from "react";
import { cn } from "@/lib/utils";
import { SearchResultGridCard } from "@/components/home/SearchResultGridCard";
import { SearchResultListItem } from "@/components/home/SearchResultListItem";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import {
  resolveDeferredResourceLinks,
  resolveResourceOpenTarget,
} from "@/utils/resourceDisplay";

type ViewMode = "list" | "grid";

interface SearchResultsListProps {
  resources: ResultItem[];
  viewMode: ViewMode;
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
  enableResourceDetailPage,
  enableResourceSourceBadges,
  resolvingResourceId,
  onOpenResource,
  onCancelResolveResource,
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
          canOpenResource={
            Boolean(resolveResourceOpenTarget(item)) ||
            resolveDeferredResourceLinks(item.resource).length > 0
          }
          isResolvingResource={resolvingResourceId === item.resource.id}
          showDetailEntry={enableResourceDetailPage}
          showSourceBadge={enableResourceSourceBadges}
          onOpenResource={onOpenResource}
          onCancelResolveResource={onCancelResolveResource}
          onOpenDetail={enableResourceDetailPage ? onOpenDetail : () => undefined}
        />
      ) : (
        <SearchResultListItem
          key={item.resource.id}
          item={item}
          index={index}
          canOpenResource={
            Boolean(resolveResourceOpenTarget(item)) ||
            resolveDeferredResourceLinks(item.resource).length > 0
          }
          isResolvingResource={resolvingResourceId === item.resource.id}
          onOpenResource={onOpenResource}
          onCancelResolveResource={onCancelResolveResource}
          onOpenDetail={enableResourceDetailPage ? onOpenDetail : () => undefined}
          showDetailEntry={enableResourceDetailPage}
          showSourceBadge={enableResourceSourceBadges}
        />
      ),
    )}
  </div>
);

export default SearchResultsList;
