import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import HotSectionSummary from "@/components/trending/HotSectionSummary";
import type { HotRankingSection } from "@/types/hotRanking";

const section: HotRankingSection = {
  category: "movie",
  title: "电影热榜",
  description: "当前最热电影内容",
  items: [],
};

describe("HotSectionSummary", () => {
  it("支持切换排序并关闭菜单", async () => {
    const user = userEvent.setup();
    const onSortByChange = vi.fn();

    render(
      <HotSectionSummary
        section={section}
        showSortControl
        sortBy="popularity.desc"
        onSortByChange={onSortByChange}
      />,
    );

    await user.click(screen.getByLabelText("打开排序菜单"));
    await user.click(await screen.findByRole("menuitemradio", { name: "近期高分" }));

    expect(onSortByChange).toHaveBeenCalledWith("vote_average.desc");
    expect(screen.queryByRole("menuitemradio", { name: "近期高分" })).not.toBeInTheDocument();
  });

  it("点击当前排序项不会重复触发回调", async () => {
    const user = userEvent.setup();
    const onSortByChange = vi.fn();

    render(
      <HotSectionSummary
        section={section}
        showSortControl
        sortBy="popularity.desc"
        onSortByChange={onSortByChange}
      />,
    );

    await user.click(screen.getByLabelText("打开排序菜单"));
    await user.click(await screen.findByRole("menuitemradio", { name: "按热度" }));

    expect(onSortByChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitemradio", { name: "按热度" })).not.toBeInTheDocument();
  });

  it("未知排序值会回退到默认热度文案", () => {
    render(
      <HotSectionSummary
        section={section}
        showSortControl
        sortBy={"unknown.sort" as never}
      />,
    );

    expect(screen.getByRole("button", { name: "打开排序菜单" })).toHaveTextContent("按热度");
  });

  it("评分排序会显示近期高分文案", () => {
    render(
      <HotSectionSummary
        section={section}
        showSortControl
        sortBy="vote_average.desc"
      />,
    );

    expect(screen.getByRole("button", { name: "打开排序菜单" })).toHaveTextContent("近期高分");
  });

  it("保留布局切换按钮", async () => {
    const user = userEvent.setup();
    const onLayoutModeChange = vi.fn();

    render(
      <HotSectionSummary
        section={section}
        showSortControl
        sortBy="popularity.desc"
        layoutMode="double"
        onLayoutModeChange={onLayoutModeChange}
      />,
    );

    await user.click(screen.getByTestId("hot-layout-toggle"));

    expect(onLayoutModeChange).toHaveBeenCalledWith("single");
  });
});
