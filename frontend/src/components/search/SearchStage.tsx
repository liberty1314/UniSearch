import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import SearchFragmentField from "@/components/search/SearchFragmentField";
import { type SearchTransitionViewState } from "@/components/search/searchTransitionModel";
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
        <div
          className="relative z-30 mx-auto w-full max-w-3xl"
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
        </div>
      </div>
    </section>
  );
};

export default SearchStage;
