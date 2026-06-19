import type { HotRankingAvailabilityStatus, HotRankingItem } from "@/types/hotRanking";

interface HotRankingAvailability {
  availability_status: HotRankingAvailabilityStatus;
  search_available: boolean;
  days_until_release?: number;
  search_hint: string;
}

const HOT_RANKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const countDaysUntilRelease = (releaseDate: string): number | undefined => {
  const today = new Date(`${getTodayKey()}T00:00:00.000Z`);
  const release = new Date(`${releaseDate}T00:00:00.000Z`);
  const diffMs = release.getTime() - today.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return undefined;
  }
  return Math.ceil(diffMs / 86_400_000);
};

export const resolveHotRankingAvailability = (
  item: Pick<
    HotRankingItem,
    "release_date" | "availability_status" | "search_available" | "days_until_release" | "search_hint"
  >,
): HotRankingAvailability => {
  const releaseDate = item.release_date?.trim();
  if (!releaseDate || !HOT_RANKING_DATE_PATTERN.test(releaseDate)) {
    return {
      availability_status: "unknown",
      search_available: true,
      search_hint: "上映时间未知，搜索结果可能不准确",
    };
  }

  if (releaseDate > getTodayKey()) {
    return {
      availability_status: "upcoming",
      search_available: false,
      days_until_release:
        typeof item.days_until_release === "number"
          ? item.days_until_release
          : countDaysUntilRelease(releaseDate),
      search_hint: `预计 ${releaseDate} 上映，当前站内资源可能不可用`,
    };
  }

  return {
    availability_status: "released",
    search_available: true,
    search_hint: "",
  };
};
