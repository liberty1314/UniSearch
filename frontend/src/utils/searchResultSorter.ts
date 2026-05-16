import type { ResourceObject } from "@/types/api";
import { getCloudTypePriority, type ResultItem } from "./cloudTypeUtils";

type SortableResultItem = ResultItem & { priority: number };

function resolvePrimaryLink(resource: ResourceObject) {
  if (!resource.links || resource.links.length === 0) {
    return undefined;
  }
  return resource.links[0];
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

export const sortResources = (
  resources: ResourceObject[] | undefined | null,
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
    };
  });

  return items.sort((a, b) => {
    const timeDiff = b.datetime - a.datetime;
    if (Math.abs(timeDiff) > 1000) {
      return timeDiff;
    }
    return a.priority - b.priority;
  });
};
