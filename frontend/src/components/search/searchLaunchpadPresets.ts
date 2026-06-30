import type { SearchParams } from "@/types/search";
import { SearchService } from "@/services/searchService";
import { getCloudTypeInfo } from "@/utils/cloudTypeUtils";
import { resolveHotRankingAvailability } from "@/utils/hotRankingAvailability";
import type { HotRankingItem } from "@/types/hotRanking";
import type {
  SearchLaunchPreset,
  SearchLaunchTrendingEntry,
} from "@/components/search/searchLaunchpadTypes";

const buildSearchParams = (params: Partial<SearchParams>): SearchParams => ({
  keyword: params.keyword?.trim() || "",
  source: params.source || "all",
  resultType: params.resultType || "merge",
  cloudTypes: [...(params.cloudTypes || [])],
  channels: [...(params.channels || [])],
  plugins: [...(params.plugins || [])],
  concurrency: params.concurrency || 5,
  refresh: params.refresh || false,
  ext: params.ext ? { ...params.ext } : {},
  filter: params.filter
    ? {
      include: params.filter.include ? [...params.filter.include] : undefined,
      exclude: params.filter.exclude ? [...params.filter.exclude] : undefined,
      mediaTypes: params.filter.mediaTypes
        ? [...params.filter.mediaTypes]
        : undefined,
    }
    : undefined,
});

const createPreset = (
  id: string,
  label: string,
  source: SearchLaunchPreset["source"],
  params: Partial<SearchParams>,
  description?: string,
): SearchLaunchPreset => ({
  id,
  label,
  description,
  source,
  params: buildSearchParams(params),
});

export const buildTrendingLaunchEntries = (
  items: HotRankingItem[],
): SearchLaunchTrendingEntry[] =>
  items.filter((item) => resolveHotRankingAvailability(item).search_available).map((item) => {
    const actions = SearchService.buildTrendingSearchActions(item);
    const presets = actions.map((action) => ({
      ...createPreset(
        `trending-${item.id}-${action.key}`,
        action.label,
        "trending",
        {
          keyword: action.keyword,
          filter:
            action.key === "title_4k"
              ? {
                include: ["4K"],
                exclude: ["预告", "枪版"],
              }
              : undefined,
        },
      ),
      fromTrending: {
        title: item.title.trim(),
        originalTitle: item.original_title.trim(),
        keyword: action.keyword,
      },
    }));

    const genreText =
      item.genre_names?.filter(Boolean).slice(0, 2).join(" / ") || "热门资源";
    const yearText = item.release_date?.slice(0, 4) || "待补充";

    return {
      id: `trending-entry-${item.id}`,
      title: item.title.trim(),
      subtitle: item.original_title.trim() || item.title.trim(),
      meta: `${yearText} · ${genreText}`,
      presets,
    };
  });

export const formatCloudTypeNames = (cloudTypes: string[]): string =>
  cloudTypes
    .map((type) => getCloudTypeInfo(type).name.replace("网盘", "").replace("云盘", ""))
    .join(" / ");
