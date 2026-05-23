export type HotRankingPeriod = "day" | "week" | "month" | "year";
export type HotRankingCategory = "movie" | "tv" | "anime";

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
  genre_names: string[];
  region?: string;
  origin_countries?: string[];
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
  period: HotRankingPeriod;
  updated_at: string;
  source: "tmdb";
  note?: string;
  sections: HotRankingSection[];
}

export interface HotRankingQuery {
  period?: HotRankingPeriod;
  category?: HotRankingCategory;
}
