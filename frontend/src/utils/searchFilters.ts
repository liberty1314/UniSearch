import type {
  FilterConfig,
  ResourceObject,
} from "@/types/api";

export interface ActiveFilterChip {
  id: string;
  field: keyof FilterConfig;
  value: string;
  label: string;
}

const FILTER_LABELS: Record<keyof FilterConfig, string> = {
  include: "包含",
  exclude: "排除",
};

const FILTER_FIELDS: Array<keyof FilterConfig> = [
  "include",
  "exclude",
];

const normalizeFilterValues = (values?: string[]): string[] => {
  if (!values?.length) {
    return [];
  }

  return values
    .map((value) => value.trim())
    .filter(Boolean);
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

const buildResourceFilterText = (resource: ResourceObject): string => {
  const parts = [
    resource.id,
    resource.title,
    resource.description,
    resource.source.type,
    resource.source.id,
    resource.source.name,
    resource.media_type,
    resource.target_type,
    resource.detail.url,
    resource.detail.content,
    ...(resource.tags || []),
  ];

  resource.links.forEach((link) => {
    parts.push(link.type, link.url, link.title, link.work_title);
  });

  return parts
    .map((value) => (value || "").toLowerCase())
    .join(" ");
};

const matchesTextFilter = (
  resource: ResourceObject,
  includeKeywords: string[],
  excludeKeywords: string[],
): boolean => {
  const filterText = buildResourceFilterText(resource);

  for (const keyword of excludeKeywords) {
    if (filterText.includes(keyword.toLowerCase())) {
      return false;
    }
  }

  if (includeKeywords.length === 0) {
    return true;
  }

  return includeKeywords.some((keyword) =>
    filterText.includes(keyword.toLowerCase()),
  );
};

export const filterResourceObjects = (
  resources: ResourceObject[] | undefined,
  filter?: FilterConfig,
): ResourceObject[] => {
  const normalized = normalizeFilterConfig(filter);
  const items = resources || [];
  if (!normalized) {
    return items;
  }

  const includeKeywords = normalizeFilterValues(normalized.include);
  const excludeKeywords = normalizeFilterValues(normalized.exclude);

  return items.filter((resource) => {
    if (!matchesTextFilter(resource, includeKeywords, excludeKeywords)) {
      return false;
    }
    return true;
  });
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
