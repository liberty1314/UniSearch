import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  resolveSearchTransitionMotion,
  type SearchTransitionView,
} from "@/components/search/searchTransitionModel";

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
  const shouldReduceMotion = Boolean(useReducedMotion());
  const transitionMotion = resolveSearchTransitionMotion(
    view,
    shouldReduceMotion,
  );

  return (
    <div
      data-testid="search-transition-shell"
      data-presence-mode="replace"
      className="relative w-full"
    >
      <motion.div
        key={view}
        data-testid="search-transition-view"
        data-view={view}
        className="w-full"
        initial={transitionMotion.initial}
        animate={transitionMotion.animate}
        transition={transitionMotion.transition}
      >
        {view === "idle" ? idle : results}
      </motion.div>
    </div>
  );
};

export default SearchTransition;
