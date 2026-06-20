import { CloudType } from "@/types/search";
import type { ResourceLink, ResourceObject } from "@/types/resource";

// ─── 共享类型 ────────────────────────────────────────────────────────────────

/** 网盘类型完整样式配置（徽章 + 跑马灯标签 + 卡片装饰） */
export interface CloudTypeStyle {
  name: string;
  /** Tailwind 背景色（带透明度），用于搜索结果卡片徽章 */
  bg: string;
  /** Tailwind 文字色 */
  text: string;
  /** Tailwind 边框色 */
  border: string;
  /** Tailwind 图标色 */
  icon: string;
  /** Tailwind 渐变 class，用于卡片顶部装饰条 */
  gradient: string;
  /** 实心背景色（无透明度），用于 platformThemes 跑马灯 / CloudTypeFilter 标签 */
  tagColor: string;
  /** 阴影 class，用于 platformThemes 跑马灯标签悬停效果 */
  tagShadow: string;
}

/**
 * 搜索结果条目（展平后的单条资源）
 * 同时被 SearchResults、SearchResultGridCard、SearchResultListItem 使用
 */
export interface ResultItem {
  resource: ResourceObject;
  primaryLink?: ResourceLink;
  cloudType: string;
  datetime: number;
}

// ─── 网盘类型样式映射（模块级常量，只创建一次）────────────────────────────────

const CLOUD_TYPE_MAP: Record<string, CloudTypeStyle> = {
  [CloudType.BAIDU]: {
    name: "百度网盘",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-700/50",
    icon: "text-blue-500",
    gradient: "from-blue-400 to-cyan-300",
    tagColor: "bg-blue-500",
    tagShadow: "shadow-blue-500/30",
  },
  [CloudType.ALIYUN]: {
    name: "阿里云盘",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200/50 dark:border-orange-700/50",
    icon: "text-orange-500",
    gradient: "from-orange-400 to-yellow-300",
    tagColor: "bg-orange-500",
    tagShadow: "shadow-orange-500/30",
  },
  [CloudType.QUARK]: {
    name: "夸克网盘",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200/50 dark:border-purple-700/50",
    icon: "text-purple-500",
    gradient: "from-purple-400 to-pink-300",
    tagColor: "bg-purple-500",
    tagShadow: "shadow-purple-500/30",
  },
  [CloudType.TIANYI]: {
    name: "天翼云盘",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200/50 dark:border-cyan-700/50",
    icon: "text-cyan-500",
    gradient: "from-cyan-400 to-blue-300",
    tagColor: "bg-cyan-500",
    tagShadow: "shadow-cyan-500/30",
  },
  [CloudType.UC]: {
    name: "UC网盘",
    bg: "bg-green-500/10 dark:bg-green-500/20",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200/50 dark:border-green-700/50",
    icon: "text-green-500",
    gradient: "from-green-400 to-emerald-300",
    tagColor: "bg-green-500",
    tagShadow: "shadow-green-500/30",
  },
  [CloudType.MOBILE]: {
    name: "移动云盘",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200/50 dark:border-indigo-700/50",
    icon: "text-indigo-500",
    gradient: "from-indigo-400 to-blue-300",
    tagColor: "bg-indigo-500",
    tagShadow: "shadow-indigo-500/30",
  },
  [CloudType.ONE_ONE_FIVE]: {
    name: "115网盘",
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200/50 dark:border-red-700/50",
    icon: "text-red-500",
    gradient: "from-red-400 to-rose-300",
    tagColor: "bg-red-500",
    tagShadow: "shadow-red-500/30",
  },
  [CloudType.XUNLEI]: {
    name: "迅雷网盘",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200/50 dark:border-yellow-700/50",
    icon: "text-yellow-500",
    gradient: "from-yellow-400 to-amber-300",
    tagColor: "bg-yellow-500",
    tagShadow: "shadow-yellow-500/30",
  },
  [CloudType.ONE_TWO_THREE]: {
    name: "123网盘",
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200/50 dark:border-teal-700/50",
    icon: "text-teal-500",
    gradient: "from-teal-400 to-green-300",
    tagColor: "bg-teal-500",
    tagShadow: "shadow-teal-500/30",
  },
  [CloudType.MAGNET]: {
    name: "磁力链接",
    bg: "bg-gray-600/10 dark:bg-gray-600/20",
    text: "text-gray-700 dark:text-slate-300",
    border: "border-gray-300/50 dark:border-slate-700/50",
    icon: "text-gray-600",
    gradient: "from-gray-400 to-gray-300",
    tagColor: "bg-slate-600",
    tagShadow: "shadow-gray-500/30",
  },
  [CloudType.LANZOU]: {
    name: "蓝奏云",
    bg: "bg-blue-600/10 dark:bg-blue-600/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300/50 dark:border-blue-600/50",
    icon: "text-blue-600",
    gradient: "from-sky-400 to-blue-300",
    tagColor: "bg-sky-500",
    tagShadow: "shadow-blue-600/30",
  },
};

const FALLBACK_CLOUD_TYPE_STYLE: CloudTypeStyle = {
  name: "未知类型",
  bg: "bg-gray-500/10",
  text: "text-gray-600",
  border: "border-gray-200",
  icon: "text-gray-500",
  gradient: "from-gray-400 to-gray-300",
  tagColor: "bg-gray-500",
  tagShadow: "shadow-gray-500/30",
};

// ─── 纯函数工具 ────────────────────────────────────────────────────────────────

/**
 * 根据网盘类型 key 获取完整样式配置。
 * 使用模块级常量，每次调用只做一次对象属性访问（O(1)）。
 */
export const getCloudTypeInfo = (cloudType: string): CloudTypeStyle =>
  CLOUD_TYPE_MAP[cloudType] ?? FALLBACK_CLOUD_TYPE_STYLE;

/**
 * 获取网盘类型排序优先级（数值越小越靠前）。
 *
 * 1 — 热门网盘（夸克、百度、阿里、天翼）
 * 2 — 其他网盘
 * 3 — 种子 / 磁力
 */
export const getCloudTypePriority = (cloudType: string): number => {
  if (
    [
      CloudType.QUARK,
      CloudType.BAIDU,
      CloudType.ALIYUN,
      CloudType.TIANYI,
    ].includes(cloudType as CloudType)
  ) {
    return 1;
  }
  if (cloudType === CloudType.MAGNET) return 3;
  return 2;
};

/**
 * 格式化搜索结果时间戳为可读日期字符串（zh-CN）。
 * 对无效时间戳（null / 0 / NaN / Infinity / 2000年前）返回「未知时间」。
 */
export const formatResultTime = (
  timestamp: number | undefined | null,
): string => {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0)
    return "未知时间";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "未知时间";
  if (date.getFullYear() < 2000) return "未知时间";
  return date.toLocaleDateString("zh-CN");
};

/**
 * 导出 CLOUD_TYPE_MAP 供 platformThemes 派生使用。
 * 外部消费者应优先使用 getCloudTypeInfo() 函数，而非直接访问此 Map。
 */
export { CLOUD_TYPE_MAP };
