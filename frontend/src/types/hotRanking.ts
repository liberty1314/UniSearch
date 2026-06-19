export type HotRankingMode = "trend" | "popular";
export type HotRankingPeriod = "day" | "week" | "month" | "year";
export type HotRankingCategory = "all" | "movie" | "tv" | "anime";
export type HotRankingSortBy = "popularity.desc" | "primary_release_date.desc" | "vote_average.desc";
export type HotRankingAvailabilityStatus = "released" | "upcoming" | "unknown";

export interface HotRankingItem {
  id: number;
  tmdb_id: number;
  media_type: "movie" | "tv";
  ranking_category: HotRankingCategory;
  title: string;
  original_title: string;
  overview: string;
  poster_url: string;
  backdrop_url: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date: string;
  availability_status?: HotRankingAvailabilityStatus;
  search_available?: boolean;
  days_until_release?: number;
  search_hint?: string;
  genre_names: string[] | null;
  region?: string;
  origin_countries?: string[] | null;
  tmdb_url: string;
}

export interface HotRankingSection {
  category: HotRankingCategory;
  title: string;
  description: string;
  spotlight?: HotRankingItem;
  items: HotRankingItem[];
}

export interface HotRankingResponse {
  mode: HotRankingMode;
  period: HotRankingPeriod;
  time_key?: string;
  time_label?: string;
  page: number;
  page_size: number;
  has_more: boolean;
  next_page?: number;
  updated_at: string;
  source: "tmdb";
  note?: string;
  sections: HotRankingSection[];
}

export interface HotRankingQuery {
  mode?: HotRankingMode;
  period?: HotRankingPeriod;
  category?: HotRankingCategory;
  sort_by?: HotRankingSortBy;
  date?: string;
  week_start?: string;
  month?: string;
  year?: string;
  page?: number;
  page_size?: number;
}
