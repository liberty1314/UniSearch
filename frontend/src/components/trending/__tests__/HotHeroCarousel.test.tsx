import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HotHeroCarousel from "@/components/trending/HotHeroCarousel";
import type { HotRankingItem } from "@/types/hotRanking";
import type { HotPageMeta } from "@/components/trending/hotRankingPresentation";

const items: HotRankingItem[] = [
  {
    id: 1,
    tmdb_id: 1,
    media_type: "movie",
    ranking_category: "movie",
    title: "后室",
    original_title: "Backrooms",
    overview: "test overview",
    poster_url: "https://image.tmdb.org/t/p/w500/poster-1.jpg",
    backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop-1.jpg",
    vote_average: 7.5,
    vote_count: 100,
    popularity: 300,
    release_date: "2026-01-01",
    genre_names: ["惊悚"],
    tmdb_url: "https://www.themoviedb.org/movie/1",
  },
  {
    id: 2,
    tmdb_id: 2,
    media_type: "movie",
    ranking_category: "movie",
    title: "痴迷",
    original_title: "Obsession",
    overview: "test overview",
    poster_url: "https://image.tmdb.org/t/p/w500/poster-2.jpg",
    backdrop_url: "https://image.tmdb.org/t/p/w500/backdrop-2.jpg",
    vote_average: 7.2,
    vote_count: 80,
    popularity: 260,
    release_date: "2026-01-02",
    genre_names: ["恐怖"],
    tmdb_url: "https://www.themoviedb.org/movie/2",
  },
];

const meta: HotPageMeta = {
  categoryLabel: "全部热门",
  periodLabel: "日榜",
  note: "每日、每周按热门趋势整理。",
  sourceLabel: "热门趋势",
  sectionCount: 1,
};

describe("HotHeroCarousel", () => {
  it("缩略卡片不再显示序号", () => {
    render(
      <HotHeroCarousel
        period="day"
        meta={meta}
        items={items}
        onSearch={vi.fn()}
        data-testid="hot-hero-carousel"
      />,
    );

    const carousel = screen.getByTestId("hot-hero-carousel");
    expect(within(carousel).queryByText("#1")).not.toBeInTheDocument();
    expect(within(carousel).queryByText("#2")).not.toBeInTheDocument();
    expect(within(carousel).getByRole("button", { name: "切换到第 1 项：后室" })).toHaveTextContent("后室");
    expect(within(carousel).getByRole("button", { name: "切换到第 2 项：痴迷" })).toHaveTextContent("痴迷");
  });
});
