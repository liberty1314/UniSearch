import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HotMediaCard from "@/components/trending/HotMediaCard";
import type { HotRankingItem } from "@/types/hotRanking";

const item: HotRankingItem = {
  id: 2,
  tmdb_id: 2,
  media_type: "movie",
  ranking_category: "movie",
  title: "奥本海默",
  original_title: "Oppenheimer",
  overview: "another overview",
  poster_url: "https://image.tmdb.org/t/p/w500/poster-2.jpg",
  backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop-2.jpg",
  vote_average: 8.4,
  vote_count: 800,
  popularity: 800,
  release_date: "2023-08-30",
  genre_names: ["剧情"],
  tmdb_url: "https://www.themoviedb.org/movie/2",
};

describe("HotMediaCard", () => {
  it("移除海报内排名覆盖层并保留卡片信息区排名", () => {
    render(<HotMediaCard item={item} rank={1} category="movie" onSearch={vi.fn()} />);

    expect(within(screen.getByTestId("hot-media-poster")).queryByText("#1")).not.toBeInTheDocument();
    expect(screen.getByText("排名 #1")).toBeInTheDocument();
    expect(screen.getByText("电影")).toBeInTheDocument();
    expect(screen.getByText("热度 800")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
  });
});
