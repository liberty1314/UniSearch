import type { SearchParams } from "@/types/search";
import { SearchService } from "@/services/searchService";
import { getCloudTypeInfo } from "@/utils/cloudTypeUtils";
import { resolveHotRankingAvailability } from "@/utils/hotRankingAvailability";
import type { HotRankingItem } from "@/types/hotRanking";
import type {
  SearchLaunchPreset,
  SearchLaunchTemplateGroup,
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

export const searchLaunchTemplateGroups: SearchLaunchTemplateGroup[] = [
  {
    title: "影视娱乐",
    description: "先从资源形态和清晰度收窄，再进入结果页细调。",
    keywords: [
      createPreset(
        "template-movie-4k",
        "电影 4K",
        "template",
        {
          keyword: "电影 4K",
          cloudTypes: ["quark", "aliyun"],
          filter: {
            include: ["4K"],
            exclude: ["预告", "枪版"],
          },
        },
        "优先看高画质电影片源",
      ),
      createPreset(
        "template-series-complete",
        "剧集 全集",
        "template",
        {
          keyword: "剧集 全集",
          cloudTypes: ["quark", "aliyun", "baidu"],
          filter: {
            include: ["全集"],
            exclude: ["预告", "删减"],
          },
        },
        "适合整季或全集资源",
      ),
      createPreset(
        "template-anime-subtitle",
        "动漫 简中",
        "template",
        {
          keyword: "动漫 简中",
          cloudTypes: ["quark", "baidu"],
          filter: {
            include: ["简中"],
            exclude: ["预告"],
          },
        },
        "优先筛出字幕明确的条目",
      ),
    ],
  },
  {
    title: "学习资料",
    description: "把内容类型和交付形态一起带上，减少泛搜索。",
    keywords: [
      createPreset(
        "template-exam-paper",
        "考研 真题",
        "template",
        {
          keyword: "考研 真题",
          filter: {
            include: ["真题", "解析"],
            exclude: ["预告"],
          },
        },
        "适合考试类资料快速收敛",
      ),
      createPreset(
        "template-frontend-course",
        "前端 项目实战",
        "template",
        {
          keyword: "前端 项目实战",
          filter: {
            include: ["实战", "源码"],
            exclude: ["片段"],
          },
        },
        "偏向完整教程和源码",
      ),
      createPreset(
        "template-english-course",
        "英语 课程",
        "template",
        {
          keyword: "英语 课程",
          filter: {
            include: ["完整版", "课件"],
            exclude: ["试看"],
          },
        },
        "适合课程和讲义一起找",
      ),
    ],
  },
  {
    title: "实用软件",
    description: "先选平台和资源类型，再看结果质量。",
    keywords: [
      createPreset(
        "template-mac-software",
        "Mac 软件",
        "template",
        {
          keyword: "Mac 软件",
          cloudTypes: ["quark", "aliyun"],
          filter: {
            include: ["Mac"],
            exclude: ["试用", "广告"],
          },
        },
        "聚焦 macOS 可用资源",
      ),
      createPreset(
        "template-win-software",
        "Windows 软件",
        "template",
        {
          keyword: "Windows 软件",
          cloudTypes: ["quark", "aliyun"],
          filter: {
            include: ["Windows"],
            exclude: ["试用", "广告"],
          },
        },
        "聚焦 Windows 工具资源",
      ),
      createPreset(
        "template-ai-workflow",
        "AI 工作流 教程",
        "template",
        {
          keyword: "AI 工作流 教程",
          filter: {
            include: ["教程", "工作流"],
            exclude: ["宣传"],
          },
        },
        "适合找教程、案例和资料包",
      ),
    ],
  },
];

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
