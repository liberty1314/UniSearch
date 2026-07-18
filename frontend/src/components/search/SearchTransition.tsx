import React from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";

interface SearchTransitionProps {
  view: "idle" | "results";
  idle: React.ReactNode;
  results: React.ReactNode;
}

const SearchTransition: React.FC<SearchTransitionProps> = ({
  view,
  idle,
  results,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LayoutGroup id="search-fragment-canvas">
      <AnimatePresence initial={false} mode="sync">
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
    </LayoutGroup>
  );
};

export default SearchTransition;
