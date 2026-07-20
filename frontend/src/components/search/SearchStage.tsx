import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import SearchFragmentField from "@/components/search/SearchFragmentField";
import { useSearchTransitionLayout } from "@/components/search/searchTransitionContext";
import {
  SEARCH_QUERY_LAYOUT_ID,
  type SearchTransitionViewState,
} from "@/components/search/searchTransitionModel";
import { Button } from "@/components/ui/button";

interface SearchStageProps {
  viewState: SearchTransitionViewState;
  completedSources: number;
  totalSources: number;
  receivedBatches: number;
  accessHint?: string;
  onBack: () => void;
}

const SearchStage: React.FC<SearchStageProps> = ({
  viewState,
  completedSources,
  totalSources,
  receivedBatches,
  accessHint,
  onBack,
}) => {
  const [focused, setFocused] = useState(false);
  const [inputSignal, setInputSignal] = useState(0);
  const { shouldShareQueryLayout } = useSearchTransitionLayout();

  return (
    <section
      data-testid="search-stage"
      className="relative mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-6xl items-center justify-center overflow-hidden px-1 py-8 sm:px-6"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onBack}
        aria-label="返回"
        className="absolute left-1 top-2 z-30 rounded-full sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <SearchFragmentField
        phase={viewState.phase}
        completedSources={completedSources}
        totalSources={totalSources}
        receivedBatches={receivedBatches}
        focused={focused}
        inputSignal={inputSignal}
      />

      <div className="relative z-20 w-full max-w-4xl text-center">
        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
          多源索引 / 就绪
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950 dark:text-slate-50 sm:text-4xl lg:text-5xl">
          输入资源名称，其他交给聚合
        </h1>

        <motion.div
          layoutId={shouldShareQueryLayout ? SEARCH_QUERY_LAYOUT_ID : undefined}
          data-shared-query-layout={shouldShareQueryLayout}
          className="relative z-30 mx-auto mt-8 w-full max-w-3xl"
        >
          <SearchBox
            className="max-w-none"
            placeholder="搜索电影、课程、软件或资料..."
            autoFocus
            accessHint={accessHint}
            appearance="canvas"
            onFocusChange={setFocused}
            onInputCommitted={() => setInputSignal((value) => value + 1)}
          />
        </motion.div>

        <span
          role="status"
          aria-live="polite"
          className="mt-5 block text-xs text-slate-500 dark:text-slate-400"
        >
          {viewState.progressLabel}
        </span>
      </div>
    </section>
  );
};

export default SearchStage;
