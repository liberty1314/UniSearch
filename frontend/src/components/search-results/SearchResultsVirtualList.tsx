import React, { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import SearchResultItemView from "@/components/search-results/SearchResultItemView";
import type { ResultItem } from "@/utils/cloudTypeUtils";

type ViewMode = "list" | "grid";

interface SearchResultsVirtualListProps {
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

// 网格断点与 Tailwind 的 grid-cols 配置保持一致：
// grid-cols-1 / sm(≥640):2 / lg(≥1024):3 / xl(≥1280):4。列表视图恒为 1 列。
const GRID_BREAKPOINTS: ReadonlyArray<{ minWidth: number; columns: number }> = [
  { minWidth: 1280, columns: 4 },
  { minWidth: 1024, columns: 3 },
  { minWidth: 640, columns: 2 },
  { minWidth: 0, columns: 1 },
];

const resolveGridColumns = (): number => {
  if (typeof window === "undefined") {
    return 1;
  }
  const width = window.innerWidth;
  for (const bp of GRID_BREAKPOINTS) {
    if (width >= bp.minWidth) {
      return bp.columns;
    }
  }
  return 1;
};

// 行高估算：网格卡片约 220px + 20px 间距；列表条目约 96px + 16px 间距。
// 仅用于首次布局，真实高度由 measureElement 动态测量校正。
const estimateRowHeight = (viewMode: ViewMode): number =>
  viewMode === "grid" ? 240 : 112;

const chunkIntoRows = <T,>(items: T[], columns: number): T[][] => {
  if (columns <= 1) {
    return items.map((item) => [item]);
  }
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
};

/**
 * 搜索结果虚拟列表（window 滚动虚拟化）。
 *
 * 页面本身随 window 滚动（配合外层 IntersectionObserver 无限加载），
 * 因此用 useWindowVirtualizer，仅渲染视口附近的行，降低长列表 DOM 与合成开销。
 * 按当前列数把结果切成「行」再虚拟化，兼容响应式多列网格；
 * 入场动画仅对前若干项保留（与非虚拟化路径一致）。
 */
const SearchResultsVirtualList: React.FC<SearchResultsVirtualListProps> = ({
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
  const [columns, setColumns] = useState<number>(() =>
    viewMode === "grid" ? resolveGridColumns() : 1,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const [listOffset, setListOffset] = useState(0);

  useEffect(() => {
    if (viewMode !== "grid") {
      setColumns(1);
      return;
    }
    const handleResize = () => setColumns(resolveGridColumns());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  // 记录列表容器相对文档顶部的偏移，供 window 虚拟化器扣除头部区域。
  useEffect(() => {
    const measure = () => {
      if (listRef.current) {
        setListOffset(
          listRef.current.getBoundingClientRect().top + window.scrollY,
        );
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewMode, columns, resources.length]);

  const rows = chunkIntoRows(resources, viewMode === "grid" ? columns : 1);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimateRowHeight(viewMode),
    overscan: 4,
    scrollMargin: listOffset,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      ref={listRef}
      data-testid="search-results-stage"
      className="relative z-10 w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) {
          return null;
        }
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className={cn(
              "absolute left-0 top-0 w-full",
              viewMode === "grid"
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-4",
              // 行之间的纵向间距通过底部 padding 实现，避免绝对定位下 gap 失效。
              viewMode === "grid" ? "pb-5" : "pb-4",
            )}
            style={{
              transform: `translateY(${
                virtualRow.start - virtualizer.options.scrollMargin
              }px)`,
            }}
          >
            {row.map((item, columnIndex) => (
              <SearchResultItemView
                key={item.resource.id}
                item={item}
                index={virtualRow.index * columns + columnIndex}
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
      })}
    </div>
  );
};

export default SearchResultsVirtualList;
