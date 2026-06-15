import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(within(screen.getByTestId("hot-media-popularity-stack")).getByText("800")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜原名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜 4K" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "搜合集" })).not.toBeInTheDocument();
  });

  it("将热度与评分并排展示在标题右侧，时间与搜索按钮同行", () => {
    render(<HotMediaCard item={item} rank={1} category="movie" onSearch={vi.fn()} />);

    const posterColumn = screen.getByTestId("hot-media-poster-column");
    const badgeGroup = screen.getByTestId("hot-media-badge-group");
    const popularityStack = screen.getByTestId("hot-media-popularity-stack");
    const ratingStack = screen.getByTestId("hot-media-rating-stack");
    const footer = screen.getByTestId("hot-media-footer");
    const releaseDate = screen.getByTestId("hot-media-release-date");
    const actionRow = screen.getByTestId("hot-media-action-row");

    // 海报列底部不再承载热度块
    expect(posterColumn).not.toContainElement(popularityStack);
    expect(posterColumn.className).not.toContain("sm:justify-between");

    // 热度与评分同处一个徽章组容器，互为兄弟节点
    expect(badgeGroup).toContainElement(popularityStack);
    expect(badgeGroup).toContainElement(ratingStack);
    expect(popularityStack.parentElement).toBe(badgeGroup);
    expect(ratingStack.parentElement).toBe(badgeGroup);

    // 热度改为橙色火焰胶囊，仅显示数字、去掉"热度"文字
    expect(within(popularityStack).getByText("800")).toBeInTheDocument();
    expect(within(popularityStack).queryByText(/热度/)).not.toBeInTheDocument();
    expect(within(popularityStack).queryByText(/上映\/首播/)).not.toBeInTheDocument();
    expect(popularityStack.className).toContain("rounded-full");
    expect(popularityStack.className).toContain("bg-orange");
    expect(popularityStack.className).toContain("text-orange");

    // footer 布局保持不变
    expect(footer).toContainElement(releaseDate);
    expect(footer).toContainElement(actionRow);
    expect(footer.className).toContain("sm:mt-auto");
    expect(releaseDate).toHaveTextContent("上映/首播：2023-08-30");
    expect(within(actionRow).getByRole("button", { name: "搜索" })).toBeInTheDocument();
    expect(within(actionRow).getByRole("button", { name: "搜原名" })).toBeInTheDocument();
    expect(within(actionRow).getByRole("button", { name: "搜 4K" })).toBeInTheDocument();
    expect(within(actionRow).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "搜索",
      "搜原名",
      "搜 4K",
    ]);
  });

  it("点击快捷搜索入口会返回对应搜索动作", () => {
    const onSearch = vi.fn();

    render(<HotMediaCard item={item} rank={1} category="movie" onSearch={onSearch} />);

    fireEvent.click(screen.getByRole("button", { name: "搜 4K" }));

    expect(onSearch).toHaveBeenCalledWith(item, expect.objectContaining({
      key: "title_4k",
      keyword: "奥本海默",
    }));
  });

  it("在类型数组为空值时也能稳定渲染", () => {
    const itemWithNullGenres = {
      ...item,
      genre_names: null,
    } as unknown as HotRankingItem;

    render(<HotMediaCard item={itemWithNullGenres} rank={1} category="movie" onSearch={vi.fn()} />);

    expect(screen.getByText("奥本海默")).toBeInTheDocument();
    expect(screen.queryByText("剧情")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索" })).toBeInTheDocument();
  });
});
