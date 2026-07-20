import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import { useSearchTransitionLayout } from "@/components/search/searchTransitionContext";
import {
  SEARCH_QUERY_LAYOUT_ID,
  type SearchTransitionViewState,
} from "@/components/search/searchTransitionModel";
import { Button } from "@/components/ui/button";

interface SearchQueryDockProps {
  viewState: SearchTransitionViewState;
  fromTrendingLabel?: string;
  onBack: () => void;
}

const SearchQueryDock: React.FC<SearchQueryDockProps> = ({
  viewState,
  fromTrendingLabel,
  onBack,
}) => {
  const { shouldShareQueryLayout } = useSearchTransitionLayout();

  return (
    <header
      data-testid="search-query-dock"
      className="sticky top-20 z-40 border-b border-slate-200/70 bg-[#F7F8FA]/95 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#080B12]/[0.92]"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-1 sm:px-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="返回"
          className="shrink-0 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <motion.div
          layoutId={shouldShareQueryLayout ? SEARCH_QUERY_LAYOUT_ID : undefined}
          data-shared-query-layout={shouldShareQueryLayout}
          className="min-w-0 flex-1"
        >
          <SearchBox
            className="max-w-none"
            placeholder="继续搜索资源..."
            appearance="canvas"
          />
        </motion.div>

        <span
          role="status"
          aria-live="polite"
          className="sr-only shrink-0 font-mono text-xs text-slate-500 dark:text-slate-300 sm:not-sr-only"
        >
          {viewState.progressLabel}
        </span>
      </div>

      {fromTrendingLabel ? (
        <div className="mx-auto mt-2 max-w-6xl px-12 text-xs text-cyan-700 dark:text-cyan-200 sm:px-16">
          来自热门榜单：{fromTrendingLabel}
        </div>
      ) : null}
    </header>
  );
};

export default SearchQueryDock;
