import React from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  resolveSearchTransitionDirection,
  shouldShareSearchQueryLayout,
  type SearchTransitionView,
} from "@/components/search/searchTransitionModel";
import { SearchTransitionLayoutContext } from "@/components/search/searchTransitionContext";

interface SearchTransitionProps {
  view: SearchTransitionView;
  idle: React.ReactNode;
  results: React.ReactNode;
}

const SearchTransition: React.FC<SearchTransitionProps> = ({
  view,
  idle,
  results,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const previousViewRef = React.useRef<SearchTransitionView>(view);
  const direction = resolveSearchTransitionDirection(previousViewRef.current, view);
  const shouldShareQueryLayout = shouldShareSearchQueryLayout(view, direction);

  React.useEffect(() => {
    previousViewRef.current = view;
  }, [view]);

  return (
    <LayoutGroup id="search-fragment-canvas">
      <SearchTransitionLayoutContext.Provider value={{ shouldShareQueryLayout }}>
        <div
          data-testid="search-transition-shell"
          data-presence-mode="popLayout"
          className="relative w-full"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={view}
              data-testid="search-transition-view"
              data-view={view}
              className="w-full"
              initial={shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: view === "results" ? 12 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: view === "results" ? -8 : 12 }}
              transition={{
                duration: shouldReduceMotion
                  ? 0.16
                  : view === "results"
                    ? 0.36
                    : 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {view === "idle" ? idle : results}
            </motion.div>
          </AnimatePresence>
        </div>
      </SearchTransitionLayoutContext.Provider>
    </LayoutGroup>
  );
};

export default SearchTransition;
