import React from "react";
import { SearchResultGridCard } from "@/components/home/SearchResultGridCard";
import { SearchResultListItem } from "@/components/home/SearchResultListItem";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import {
  resolveDeferredResourceLinks,
  resolveResourceOpenTarget,
} from "@/utils/resourceDisplay";
import { resolveSearchResultEntranceDelay } from "@/components/search-results/searchResultReveal";

type ViewMode = "list" | "grid";

interface SearchResultItemViewProps {
  item: ResultItem;
  /** 结果在全量列表中的扁平索引，用于计算入场动画延迟 */
  index: number;
  viewMode: ViewMode;
  revealActive?: boolean;
  enableResourceDetailPage: boolean;
  enableResourceSourceBadges: boolean;
  resolvingResourceId?: string | null;
  onOpenResource: (item: ResultItem) => void;
  onCancelResolveResource: () => void;
  onOpenDetail: (item: ResultItem) => void;
}

/**
 * 单条搜索结果的统一渲染出口：普通列表与虚拟列表共用，
 * 避免入场延迟、可打开判定与卡片选择逻辑在两条路径上重复演化。
 */
const SearchResultItemView: React.FC<SearchResultItemViewProps> = ({
  item,
  index,
  viewMode,
  revealActive = false,
  enableResourceDetailPage,
  enableResourceSourceBadges,
  resolvingResourceId,
  onOpenResource,
  onCancelResolveResource,
  onOpenDetail,
}) => {
  const entranceDelay = resolveSearchResultEntranceDelay(index, revealActive);
  const canOpenResource =
    Boolean(resolveResourceOpenTarget(item)) ||
    resolveDeferredResourceLinks(item.resource).length > 0;
  const detailHandler = enableResourceDetailPage ? onOpenDetail : () => undefined;

  return viewMode === "grid" ? (
    <SearchResultGridCard
      item={item}
      entranceDelay={entranceDelay}
      canOpenResource={canOpenResource}
      isResolvingResource={resolvingResourceId === item.resource.id}
      showDetailEntry={enableResourceDetailPage}
      showSourceBadge={enableResourceSourceBadges}
      onOpenResource={onOpenResource}
      onCancelResolveResource={onCancelResolveResource}
      onOpenDetail={detailHandler}
    />
  ) : (
    <SearchResultListItem
      item={item}
      entranceDelay={entranceDelay}
      canOpenResource={canOpenResource}
      isResolvingResource={resolvingResourceId === item.resource.id}
      onOpenResource={onOpenResource}
      onCancelResolveResource={onCancelResolveResource}
      onOpenDetail={detailHandler}
      showDetailEntry={enableResourceDetailPage}
      showSourceBadge={enableResourceSourceBadges}
    />
  );
};

export default SearchResultItemView;
