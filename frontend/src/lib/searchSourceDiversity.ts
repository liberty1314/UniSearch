export const DEFAULT_ENABLE_SEARCH_SOURCE_DIVERSITY = false;
export const DEFAULT_SEARCH_FIRST_PAGE_MAX_PER_SOURCE = 16;
export const MIN_SEARCH_FIRST_PAGE_MAX_PER_SOURCE = 1;
export const MAX_SEARCH_FIRST_PAGE_MAX_PER_SOURCE = 48;

export const normalizeSearchFirstPageMaxPerSource = (value: unknown): number =>
  Number.isInteger(value)
  && Number(value) >= MIN_SEARCH_FIRST_PAGE_MAX_PER_SOURCE
  && Number(value) <= MAX_SEARCH_FIRST_PAGE_MAX_PER_SOURCE
    ? Number(value)
    : DEFAULT_SEARCH_FIRST_PAGE_MAX_PER_SOURCE;
