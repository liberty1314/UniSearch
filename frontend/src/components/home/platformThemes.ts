import { CloudType, type CloudTypeValue } from "@/types/search";
import { CLOUD_TYPE_MAP } from "@/utils/cloudTypeUtils";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export type PlatformTheme = {
  type: CloudTypeValue;
  name: string;
  /** 实心背景色 class，用于跑马灯 / CloudTypeFilter 标签 */
  color: string;
  /** 阴影 class，用于标签悬停效果 */
  shadow: string;
};

// ─── 展示顺序（影响 CloudTypeFilter 和 PlatformMarquee 的视觉顺序）────────────

const PLATFORM_DISPLAY_ORDER: CloudTypeValue[] = [
  CloudType.BAIDU,
  CloudType.ALIYUN,
  CloudType.QUARK,
  CloudType.TIANYI,
  CloudType.UC,
  CloudType.MOBILE,
  CloudType.ONE_ONE_FIVE,
  CloudType.XUNLEI,
  CloudType.ONE_TWO_THREE,
  CloudType.MAGNET,
  CloudType.LANZOU,
];

// ─── 从 cloudTypeUtils 单一数据源派生，彻底消除重复维护 ───────────────────────

/**
 * 平台主题数组。
 *
 * 数据来源为 `cloudTypeUtils.ts` 的 `CLOUD_TYPE_MAP`，不再独立维护。
 * 新增或修改网盘类型时，只需更新 `cloudTypeUtils.ts` 即可同步生效。
 */
export const platformThemes: PlatformTheme[] = PLATFORM_DISPLAY_ORDER.map(
  (type) => {
    const info = CLOUD_TYPE_MAP[type];
    return {
      type,
      name: info.name,
      color: info.tagColor,
      shadow: info.tagShadow,
    };
  },
);

export const platformThemeTypes = platformThemes.map((t) => t.type);
