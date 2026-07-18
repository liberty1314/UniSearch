export const SEARCH_RESULT_REVEAL_LIMIT = 8;

export const resolveSearchResultEntranceDelay = (
  index: number,
  revealActive: boolean,
) => {
  if (!revealActive || index < 0 || index >= SEARCH_RESULT_REVEAL_LIMIT) {
    return 0;
  }

  return index * 0.04;
};
