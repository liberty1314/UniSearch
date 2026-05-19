import type {
  ResourceAction,
  ResourceDetailRouteState,
  ResourceLink,
  ResourceObject,
} from "@/types/api";
import type { ResultItem } from "@/utils/cloudTypeUtils";

export interface ResourceOpenTarget {
  url: string;
  password: string;
  cloudType: string;
}

export interface ResourceSourcePresentation {
  kindLabel: string;
  primaryLabel: string;
  secondaryLabel: string | null;
}

const RESOURCE_TITLE_NOISE_PREFIXES = [
  "电影名称",
  "资源名称",
  "片名",
  "剧名",
  "名称",
  "标题",
];

const RESOURCE_TITLE_BREAK_LABELS = [
  "描述",
  "简介",
  "链接",
  "提取码",
  "密码",
  "标签",
  "大小",
  "访问码",
];

const stripResourceTitleNoisePrefix = (value: string): string => {
  let result = value.trim();

  while (result) {
    const next = result.replace(
      new RegExp(
        `^(?:[#＃]\\s*)?(?:${RESOURCE_TITLE_NOISE_PREFIXES.join("|")})\\s*[:：]\\s*`,
        "u",
      ),
      "",
    );

    if (next === result) {
      return result;
    }

    result = next.trim();
  }

  return result;
};

const cropResourceTitleByBreakLabels = (value: string): string => {
  let earliestIndex = -1;

  for (const label of RESOURCE_TITLE_BREAK_LABELS) {
    for (const separator of [":", "："]) {
      const index = value.indexOf(`${label}${separator}`);
      if (index >= 0 && (earliestIndex === -1 || index < earliestIndex)) {
        earliestIndex = index;
      }
    }
  }

  if (earliestIndex < 0) {
    return value.trim();
  }

  return value.slice(0, earliestIndex).trim();
};

export const isMagnetUrl = (value?: string | null): boolean =>
  typeof value === "string" && value.trim().toLowerCase().startsWith("magnet:");

type ResourceMetaSizeKey =
  | "size"
  | "file_size"
  | "filesize"
  | "resource_size";

const META_SIZE_KEYS: ResourceMetaSizeKey[] = [
  "size",
  "file_size",
  "filesize",
  "resource_size",
];

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

export const resolveResourceSourceLabel = (resource: ResourceObject): string =>
  resolveResourceSourcePresentation(resource).primaryLabel;

export const resolveResourceDisplayTitle = (resource: ResourceObject): string => {
  const originalTitle = resource.title.trim();
  if (!originalTitle) {
    return "未命名资源";
  }

  const cleanedTitle = cropResourceTitleByBreakLabels(
    stripResourceTitleNoisePrefix(originalTitle),
  )
    .replace(/\s+/g, " ")
    .trim();

  return cleanedTitle || originalTitle;
};

export const resolveResourceSourcePresentation = (
  resource: ResourceObject,
): ResourceSourcePresentation => {
  const { source } = resource;
  const sourceType = source.type?.trim().toLowerCase() || "";

  if (sourceType === "tg") {
    const primaryLabel =
      source.channel?.trim() ||
      source.name?.trim() ||
      source.id?.trim() ||
      "未知来源";
    const secondaryCandidates = [
      source.name?.trim() || null,
      source.id?.trim() || null,
    ].filter((value): value is string => Boolean(value && value !== primaryLabel));

    return {
      kindLabel: "Telegram 频道",
      primaryLabel,
      secondaryLabel: secondaryCandidates[0] || null,
    };
  }

  if (sourceType === "plugin") {
    const primaryLabel =
      source.name?.trim() ||
      source.plugin_id?.trim() ||
      source.id?.trim() ||
      "未知来源";
    const secondaryCandidates = [
      source.plugin_id?.trim() || null,
      source.id?.trim() || null,
    ].filter((value): value is string => Boolean(value && value !== primaryLabel));

    return {
      kindLabel: "插件",
      primaryLabel,
      secondaryLabel: secondaryCandidates[0] || null,
    };
  }

  const primaryLabel =
    source.name?.trim() ||
    source.id?.trim() ||
    source.type?.trim() ||
    "未知来源";
  const secondaryCandidates = [
    source.id?.trim() || null,
    source.type?.trim() || null,
  ].filter((value): value is string => Boolean(value && value !== primaryLabel));

  return {
    kindLabel: source.type?.trim() || "未知来源",
    primaryLabel,
    secondaryLabel: secondaryCandidates[0] || null,
  };
};

export const normalizeExternalUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("magnet:")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export const isMagnetTarget = (target: Pick<ResourceOpenTarget, "url" | "cloudType"> | null): boolean =>
  Boolean(target && (target.cloudType === "magnet" || isMagnetUrl(target.url)));

export const resolveResourceOpenTarget = (
  item: Pick<ResultItem, "resource" | "primaryLink" | "cloudType">,
): ResourceOpenTarget | null => {
  if (item.primaryLink?.url?.trim()) {
    return {
      url: item.primaryLink.url.trim(),
      password: item.primaryLink.password?.trim() || "",
      cloudType: isMagnetUrl(item.primaryLink.url)
        ? "magnet"
        : item.primaryLink.type || item.cloudType,
    };
  }

  const detailUrl = item.resource.detail.url?.trim();
  if (!detailUrl) {
    return null;
  }

  return {
    url: detailUrl,
    password: "",
    cloudType: isMagnetUrl(detailUrl)
      ? "magnet"
      : item.cloudType || item.resource.target_type || "detail",
  };
};

export const resolveResourceActionTarget = (
  action: ResourceAction,
  item: Pick<ResultItem, "resource" | "primaryLink" | "cloudType">,
): ResourceOpenTarget | null => {
  if (action.type === "open_detail") {
    return null;
  }

  const payload = action.payload || {};
  const actionUrl = toNonEmptyString(payload.url);
  const actionPassword = toNonEmptyString(payload.password) || "";
  const actionCloudType =
    toNonEmptyString(payload.link_type) || item.cloudType || item.primaryLink?.type || "unknown";

  if (actionUrl) {
    return {
      url: actionUrl,
      password: actionPassword,
      cloudType: isMagnetUrl(actionUrl) ? "magnet" : actionCloudType,
    };
  }

  return resolveResourceOpenTarget(item);
};

export const resolveResourceDisplaySize = (
  item: Pick<ResultItem, "resource" | "primaryLink">,
): string | null => {
  const linkWithSize = item.primaryLink as (ResourceLink & { size?: unknown }) | undefined;
  const linkSize = toNonEmptyString(linkWithSize?.size);
  if (linkSize) {
    return linkSize;
  }

  for (const key of META_SIZE_KEYS) {
    const metaSize = toNonEmptyString(item.resource.meta?.[key]);
    if (metaSize) {
      return metaSize;
    }
  }

  return null;
};

export const buildResourceDetailRouteState = (
  resource: ResourceObject,
  options: NonNullable<ResourceDetailRouteState["from"]>,
): ResourceDetailRouteState => ({
  resource,
  from: options,
});
