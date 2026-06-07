import type { ResourceObject } from "@/types/api";
import { readJsonStorage, writeJsonStorage } from "@/lib/safeStorage";

export const RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY =
  "unisearch_recent_resource_snapshots";

const MAX_RECENT_RESOURCE_SNAPSHOTS = 20;
const RESOURCE_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_DETAIL_CONTENT_LENGTH = 4000;
const MAX_LINKS = 8;
const MAX_ACTIONS = 8;
const MAX_TAGS = 12;
const MAX_IMAGES = 6;

export interface RecentResourceSnapshot {
  resource: ResourceObject;
  keyword?: string;
  savedAt: number;
}

const trimText = (value: string | undefined, maxLength: number) => {
  if (!value) {
    return undefined;
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const isResourceSnapshot = (value: unknown): value is RecentResourceSnapshot => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<RecentResourceSnapshot>;
  return Boolean(
    snapshot.resource &&
      typeof snapshot.resource.id === "string" &&
      typeof snapshot.resource.title === "string" &&
      typeof snapshot.savedAt === "number",
  );
};

const isFreshSnapshot = (snapshot: RecentResourceSnapshot, now = Date.now()) =>
  now - snapshot.savedAt <= RESOURCE_SNAPSHOT_TTL_MS;

const compactResource = (resource: ResourceObject): ResourceObject => ({
  ...resource,
  description: trimText(resource.description, MAX_DESCRIPTION_LENGTH),
  links: resource.links.slice(0, MAX_LINKS).map((link) => ({ ...link })),
  capabilities: { ...resource.capabilities },
  actions: resource.actions
    .slice(0, MAX_ACTIONS)
    .map((action) => ({
      ...action,
      payload: action.payload ? { ...action.payload } : undefined,
    })),
  detail: {
    ...resource.detail,
    content: trimText(resource.detail.content, MAX_DETAIL_CONTENT_LENGTH),
  },
  tags: resource.tags?.slice(0, MAX_TAGS),
  images: resource.images?.slice(0, MAX_IMAGES),
  meta: resource.meta ? { ...resource.meta } : undefined,
});

export const readRecentResourceSnapshots = (): RecentResourceSnapshot[] =>
  readJsonStorage<unknown[]>(RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY, [])
    .filter(isResourceSnapshot)
    .filter((snapshot) => isFreshSnapshot(snapshot));

export const writeRecentResourceSnapshots = (
  resources: ResourceObject[] = [],
  keyword?: string,
): void => {
  const nextKeyword = keyword?.trim() || undefined;
  const now = Date.now();
  const nextSnapshots = resources
    .filter((resource) => resource.id.trim() && resource.title.trim())
    .map((resource) => ({
      resource: compactResource(resource),
      keyword: nextKeyword,
      savedAt: now,
    }));

  if (nextSnapshots.length === 0) {
    return;
  }

  const nextResourceIds = new Set(
    nextSnapshots.map((snapshot) => snapshot.resource.id),
  );
  const existingSnapshots = readRecentResourceSnapshots().filter(
    (snapshot) => !nextResourceIds.has(snapshot.resource.id),
  );

  writeJsonStorage(
    RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY,
    [...nextSnapshots, ...existingSnapshots].slice(0, MAX_RECENT_RESOURCE_SNAPSHOTS),
  );
};

export const findRecentResourceSnapshot = (
  resourceId: string,
): ResourceObject | null => {
  const targetId = resourceId.trim();
  if (!targetId) {
    return null;
  }

  return (
    readRecentResourceSnapshots().find(
      (snapshot) => snapshot.resource.id === targetId,
    )?.resource || null
  );
};
