import type { ResourceAccessMode, ResourceAction, ResourceDetailRouteState, ResourceLink, ResourceObject, ScanTransferInfo } from "@/types/resource";
import type { ResultItem } from "@/utils/cloudTypeUtils";

export interface ResourceOpenTarget {
  url: string;
  password: string;
  cloudType: string;
  accessMode: ResourceAccessMode;
  scanTransfer?: ScanTransferInfo;
  resourceId?: string;
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

export const isScanTransferTarget = (
  target: Pick<ResourceOpenTarget, "accessMode" | "scanTransfer"> | null,
): boolean => Boolean(target && (target.accessMode === "scan_transfer" || target.scanTransfer));

export const resolveDirectScanTransferUrl = (
  target: Pick<ResourceOpenTarget, "accessMode" | "scanTransfer"> | null,
): string => {
  if (!isScanTransferTarget(target)) {
    return "";
  }

  const qrCodeValue = target?.scanTransfer?.qr_code_value?.trim() || "";
  if (!/^https?:\/\//i.test(qrCodeValue)) {
    return "";
  }

  return normalizeExternalUrl(qrCodeValue);
};

const resolveLinkAccessMode = (
  link: Pick<ResourceLink, "url" | "password" | "access_mode" | "scan_transfer"> | null | undefined,
  fallbackUrl?: string,
): ResourceAccessMode => {
  if (link?.access_mode) {
    return link.access_mode;
  }
  if (link?.scan_transfer) {
    return "scan_transfer";
  }
  if (link?.password?.trim()) {
    return "password_open";
  }
  if (link?.url?.trim() || fallbackUrl?.trim()) {
    return "direct_open";
  }
  return "direct_open";
};

const normalizeScanTransferInfo = (value: unknown): ScanTransferInfo | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const readString = (key: keyof ScanTransferInfo): string | undefined => {
    const current = record[key];
    return typeof current === "string" && current.trim() ? current.trim() : undefined;
  };
  const readBoolean = (key: keyof ScanTransferInfo): boolean | undefined => {
    const current = record[key];
    return typeof current === "boolean" ? current : undefined;
  };

  const normalized: ScanTransferInfo = {
    provider: readString("provider"),
    qr_code_base64: readString("qr_code_base64"),
    qr_code_image_url: readString("qr_code_image_url"),
    qr_code_value: readString("qr_code_value"),
    mobile_url: readString("mobile_url"),
    transfer_code: readString("transfer_code"),
    instruction: readString("instruction"),
    source_page_url: readString("source_page_url"),
    expires_hint: readString("expires_hint"),
    refreshable: readBoolean("refreshable"),
    refresh_key: readString("refresh_key"),
  };

  return Object.values(normalized).some((item) => item !== undefined)
    ? normalized
    : undefined;
};

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
      accessMode: resolveLinkAccessMode(item.primaryLink),
      scanTransfer: item.primaryLink.scan_transfer,
      resourceId: item.resource.id,
    };
  }
  return null;
};

export const resolveDeferredResourceLinks = (resource: ResourceObject): ResourceLink[] =>
  resource.links.filter(
    (link) =>
      link.resolution?.status === "deferred" &&
      Boolean(link.id?.trim()) &&
      Boolean(link.resolution.token?.trim()),
  );

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
  const actionScanTransfer = normalizeScanTransferInfo(payload.scan_transfer);
  const actionAccessMode = (
    toNonEmptyString(payload.access_mode) ||
    resolveLinkAccessMode(
      {
        url: actionUrl || item.primaryLink?.url || "",
        password: actionPassword,
        access_mode: undefined,
        scan_transfer: actionScanTransfer,
      },
    )
  ) as ResourceAccessMode;

  if (actionUrl) {
    return {
      url: actionUrl,
      password: actionPassword,
      cloudType: isMagnetUrl(actionUrl) ? "magnet" : actionCloudType,
      accessMode: actionAccessMode,
      scanTransfer: actionScanTransfer,
      resourceId: item.resource.id,
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
  options: NonNullable<ResourceDetailRouteState["from"]> & {
    routeTransition?: ResourceDetailRouteState["routeTransition"];
    transitionSource?: string;
    scrollY?: number;
  },
): ResourceDetailRouteState => ({
  resource,
  from: {
    pathname: options.pathname,
    search: options.search,
    hash: options.hash,
    label: options.label,
    keyword: options.keyword,
  },
  routeTransition: options.routeTransition,
  transitionSource: options.transitionSource,
  scrollY: options.scrollY,
});
