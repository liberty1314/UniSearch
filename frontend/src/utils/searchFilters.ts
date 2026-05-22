import type { FilterConfig } from "@/types/api";

export interface ActiveFilterChip {
  id: string;
  field: keyof FilterConfig;
  value: string;
  label: string;
}

const FILTER_LABELS: Record<keyof FilterConfig, string> = {
  include: "包含",
  exclude: "排除",
  mediaTypes: "媒体",
};

const FILTER_FIELDS: Array<keyof FilterConfig> = [
  "include",
  "exclude",
  "mediaTypes",
];

export const normalizeFilterValues = (values?: string[]): string[] => {
  if (!values?.length) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
};

export const normalizeFilterConfig = (
  filter?: FilterConfig,
): FilterConfig | undefined => {
  if (!filter) {
    return undefined;
  }

  const normalizedEntries = FILTER_FIELDS
    .map((field) => [field, normalizeFilterValues(filter[field])] as const)
    .filter(([, values]) => values.length > 0);

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries) as FilterConfig;
};

export const isFilterConfigEmpty = (filter?: FilterConfig): boolean =>
  !normalizeFilterConfig(filter);

export const cloneFilterConfig = (
  filter?: FilterConfig,
): FilterConfig | undefined => {
  const normalized = normalizeFilterConfig(filter);
  if (!normalized) {
    return undefined;
  }

  return FILTER_FIELDS.reduce<FilterConfig>((acc, field) => {
    if (normalized[field]?.length) {
      acc[field] = [...normalized[field]];
    }
    return acc;
  }, {});
};

export const buildActiveFilterChips = (
  filter?: FilterConfig,
): ActiveFilterChip[] => {
  const normalized = normalizeFilterConfig(filter);
  if (!normalized) {
    return [];
  }

  return FILTER_FIELDS.flatMap((field) =>
    (normalized[field] || []).map((value) => ({
      id: `${field}:${value}`,
      field,
      value,
      label: `${FILTER_LABELS[field]}：${value}`,
    })),
  );
};

export const removeActiveFilterChip = (
  filter: FilterConfig | undefined,
  chip: ActiveFilterChip,
): FilterConfig | undefined => {
  const normalized = cloneFilterConfig(filter);
  if (!normalized) {
    return undefined;
  }

  const remainingValues = (normalized[chip.field] || []).filter(
    (value) => value !== chip.value,
  );

  if (remainingValues.length > 0) {
    normalized[chip.field] = remainingValues;
  } else {
    delete normalized[chip.field];
  }

  return normalizeFilterConfig(normalized);
};

export interface FacetFilterOption {
  value: string;
  label: string;
  count: number;
}

const DEFAULT_FACET_LABELS: Record<string, string> = {
  share: "直达链接",
  detail: "详情页",
  downloadable: "可下载",
  searchable: "可搜索",
  official_searchable: "官方搜索",
  share_searchable: "分享检索",
  strmable: "可串流",
  movie: "电影",
  tv: "剧集",
  anime: "动漫",
  book: "图书",
  music: "音乐",
  variety: "综艺",
  document: "文档",
};

const toTitleCaseLabel = (value: string) =>
  value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");

export const buildFacetFilterOptions = (
  facets: Record<string, number> | undefined,
  customLabels?: Record<string, string>,
): FacetFilterOption[] =>
  Object.entries(facets || {})
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .map(([value, count]) => ({
      value,
      label:
        customLabels?.[value] ||
        DEFAULT_FACET_LABELS[value] ||
        toTitleCaseLabel(value),
      count,
    }));
