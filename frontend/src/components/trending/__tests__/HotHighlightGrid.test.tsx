import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HotHighlightGrid from "@/components/trending/HotHighlightGrid";
import type { HotRankingItem } from "@/types/hotRanking";

const item: HotRankingItem = {
  id: 1,
  tmdb_id: 1,
  media_type: "movie",
  ranking_category: "movie",
  title: "沙丘 2",
  original_title: "Dune: Part Two",
  overview: "test overview",
  poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
  backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop.jpg",
  vote_average: 8.8,
  vote_count: 1000,
  popularity: 999,
  release_date: "2024-03-01",
  genre_names: ["科幻", "冒险"],
  tmdb_url: "https://www.themoviedb.org/movie/1",
};

describe("HotHighlightGrid", () => {
  it("展示榜首标识、关键指标和主操作按钮", () => {
    render(<HotHighlightGrid item={item} onSearch={vi.fn()} />);

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("榜首推荐")).toBeInTheDocument();
    expect(screen.getByText("热度值")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
    expect(screen.queryByText("查看 TMDB 条目")).not.toBeInTheDocument();
  });
});
