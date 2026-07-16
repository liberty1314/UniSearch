import type { ResourceObject } from "@/types/resource";
import { getCloudTypePriority, type ResultItem } from "./cloudTypeUtils";

type SortableResultItem = ResultItem & {
  originalIndex: number;
  priority: number;
  matchRank: number;
  actionabilityRank: number;
  hasKnownTime: boolean;
};

function resolvePrimaryLink(resource: ResourceObject) {
  if (!resource.links || resource.links.length === 0) {
    return undefined;
  }
  return resource.links.find((link) =>
    link.access_mode === "scan_transfer" || Boolean(link.scan_transfer),
  ) || resource.links[0];
}

function parseKnownTimestamp(value?: string): number {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  if (!Number.isFinite(timestamp) || parsed.getUTCFullYear() <= 1) {
    return 0;
  }
  return timestamp;
}

function resolvePublishedAt(resource: ResourceObject) {
  if (resource.meta?.sid_hub_time_source === "synthetic_fetch_time") {
    return 0;
  }

  const timestamp = parseKnownTimestamp(resource.published_at);
  if (timestamp > 0) {
    return timestamp;
  }

  const primaryLink = resolvePrimaryLink(resource);
  const linkTimestamp = parseKnownTimestamp(primaryLink?.datetime);
  if (linkTimestamp > 0) {
    return linkTimestamp;
  }

  return 0;
}

function splitKeywordTerms(lowerKeyword: string): string[] {
  const normalized = lowerKeyword
    .replace(/[与和及、，,；;|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.split(" ") : [];
}

function collectSearchableFields(resource: ResourceObject): string[] {
  const fields = [
    resource.title,
    resource.description || "",
    resource.detail.content || "",
    ...resource.links.flatMap((link) => [link.title || "", link.work_title || ""]),
  ];

  return fields
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function resolveResourceMatchRank(resource: ResourceObject, keyword: string): number {
  const lowerKeyword = keyword.trim().toLowerCase();
  if (!lowerKeyword) {
    return 3;
  }

  const title = resource.title.trim().toLowerCase();
  if (title && title.includes(lowerKeyword)) {
    return 0;
  }

  const fields = collectSearchableFields(resource);
  if (fields.some((field) => field.includes(lowerKeyword))) {
    return 1;
  }

  const terms = splitKeywordTerms(lowerKeyword);
  if (terms.length <= 1) {
    return 4;
  }

  if (title && terms.every((term) => title.includes(term))) {
    return 2;
  }

  const combined = fields.join(" ");
  if (terms.every((term) => combined.includes(term))) {
    return 3;
  }

  return 4;
}

function resolveResourceActionabilityRank(resource: ResourceObject): number {
  const sourceID = resource.source.id || resource.source.plugin_id;
  if (sourceID !== "sidhub") {
    return 0;
  }

  const status = resource.meta?.sid_hub_resolution_status;
  if (status === "resolved") {
    return 0;
  }
  if (status === "invalid") {
    return 2;
  }
  return 1;
}

export const sortResources = (
  resources: ResourceObject[] | undefined | null,
  keyword = "",
): ResultItem[] => {
  if (!resources || resources.length === 0) {
    return [];
  }

  const items: SortableResultItem[] = resources.map((resource, originalIndex) => {
    const primaryLink = resolvePrimaryLink(resource);
    const cloudType =
      primaryLink?.type || resource.target_type || resource.media_type || "unknown";
    const datetime = resolvePublishedAt(resource);

    return {
      resource,
      primaryLink,
      cloudType,
      datetime,
      originalIndex,
      priority: getCloudTypePriority(cloudType),
      matchRank: resolveResourceMatchRank(resource, keyword),
      actionabilityRank: resolveResourceActionabilityRank(resource),
      hasKnownTime: datetime > 0,
    };
  });

  return items.sort((a, b) => {
    if (a.matchRank !== b.matchRank) {
      return a.matchRank - b.matchRank;
    }
    if (a.hasKnownTime !== b.hasKnownTime) {
      return a.hasKnownTime ? -1 : 1;
    }
    const timeDiff = b.datetime - a.datetime;
    if (timeDiff !== 0) {
      return timeDiff;
    }
    if (a.actionabilityRank !== b.actionabilityRank) {
      return a.actionabilityRank - b.actionabilityRank;
    }
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.originalIndex - b.originalIndex;
  });
};
