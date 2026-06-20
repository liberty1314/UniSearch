import type { ResourceObject } from "@/types/resource";
import { getCloudTypePriority, type ResultItem } from "./cloudTypeUtils";

type SortableResultItem = ResultItem & {
  priority: number;
  matchRank: number;
  accessRank: number;
};

function resolvePrimaryLink(resource: ResourceObject) {
  if (!resource.links || resource.links.length === 0) {
    return undefined;
  }
  return resource.links.find((link) =>
    link.access_mode === "scan_transfer" || Boolean(link.scan_transfer),
  ) || resource.links[0];
}

function resolvePublishedAt(resource: ResourceObject, fallbackLinkType: string) {
  const timestamp = resource.published_at?.trim()
    ? new Date(resource.published_at).getTime()
    : 0;
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return timestamp;
  }

  const primaryLink = resolvePrimaryLink(resource);
  const linkTimestamp = primaryLink?.datetime?.trim()
    ? new Date(primaryLink.datetime).getTime()
    : 0;
  if (Number.isFinite(linkTimestamp) && linkTimestamp > 0) {
    return linkTimestamp;
  }

  if (fallbackLinkType === "detail") {
    return Number.MAX_SAFE_INTEGER - 1;
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
    resource.detail.url || "",
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

function resolveResourceAccessRank(resource: ResourceObject): number {
  const hasScanTransfer = resource.links.some((link) =>
    link.access_mode === "scan_transfer" || Boolean(link.scan_transfer),
  );
  return hasScanTransfer ? 0 : 1;
}

export const sortResources = (
  resources: ResourceObject[] | undefined | null,
  keyword = "",
): ResultItem[] => {
  if (!resources || resources.length === 0) {
    return [];
  }

  const items: SortableResultItem[] = resources.map((resource) => {
    const primaryLink = resolvePrimaryLink(resource);
    const cloudType =
      primaryLink?.type || resource.target_type || resource.media_type || "unknown";

    return {
      resource,
      primaryLink,
      cloudType,
      datetime: resolvePublishedAt(resource, cloudType),
      priority: getCloudTypePriority(cloudType),
      matchRank: resolveResourceMatchRank(resource, keyword),
      accessRank: resolveResourceAccessRank(resource),
    };
  });

  return items.sort((a, b) => {
    if (a.matchRank !== b.matchRank) {
      return a.matchRank - b.matchRank;
    }
    if (a.accessRank !== b.accessRank) {
      return a.accessRank - b.accessRank;
    }
    const timeDiff = b.datetime - a.datetime;
    if (Math.abs(timeDiff) > 1000) {
      return timeDiff;
    }
    return a.priority - b.priority;
  });
};
