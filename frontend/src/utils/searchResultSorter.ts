import type { MergedLinks } from "@/types/api";
import { getCloudTypePriority, type ResultItem } from "./cloudTypeUtils";

// ─── 内部辅助类型 ────────────────────────────────────────────────────────────

/** 带优先级的排序辅助类型，priority 字段不传给 UI 层 */
type SortableResultItem = ResultItem & { priority: number };

// ─── 核心纯函数 ───────────────────────────────────────────────────────────────

/**
 * 将后端返回的 `merged_by_type` 结构展平并排序。
 *
 * 排序规则（双键排序）：
 * 1. **时间降序**：`datetime` 越大（越新）越靠前；
 *    若两条记录时间差 ≤ 1000ms，视为"同时"，进入第二排序键。
 * 2. **平台优先级升序**（数值越小优先级越高）：
 *    - 1 — 热门网盘（夸克、百度、阿里、天翼）
 *    - 2 — 其他网盘
 *    - 3 — 种子 / 磁力
 *
 * 该函数为纯函数，不依赖任何组件状态，便于单独测试。
 *
 * @param mergedByType - 后端 `SearchResponse.merged_by_type`，可为 undefined
 * @returns 展平并排序后的 `ResultItem[]`
 */
export const flattenAndSortResults = (
  mergedByType:
    | Partial<MergedLinks>
    | Record<string, unknown>
    | undefined
    | null,
): ResultItem[] => {
  if (!mergedByType) return [];

  const items: SortableResultItem[] = [];

  Object.entries(mergedByType).forEach(([cloudType, links]) => {
    if (!Array.isArray(links)) return;

    const priority = getCloudTypePriority(cloudType);

    (links as ResultItem["link"][]).forEach((link) => {
      // datetime 为 ISO 字符串或空值，转换为毫秒时间戳（无效时为 0）
      const datetime =
        link.datetime && String(link.datetime).trim()
          ? new Date(link.datetime).getTime()
          : 0;

      items.push({
        link: link as ResultItem["link"],
        cloudType,
        priority,
        datetime,
      });
    });
  });

  return items.sort((a, b) => {
    const timeDiff = b.datetime - a.datetime;

    // 时间差超过 1 秒时按时间排序
    if (Math.abs(timeDiff) > 1000) return timeDiff;

    // 时间相近时按平台优先级排序（数值小的在前）
    return a.priority - b.priority;
  });
};
