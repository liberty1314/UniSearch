import React from "react";

export interface SearchTransitionLayoutContextValue {
  shouldShareQueryLayout: boolean;
}

export const SearchTransitionLayoutContext =
  React.createContext<SearchTransitionLayoutContextValue>({
    shouldShareQueryLayout: false,
  });

export const useSearchTransitionLayout = () =>
  React.useContext(SearchTransitionLayoutContext);
