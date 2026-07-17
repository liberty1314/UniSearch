import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HotToolbar from "@/components/trending/HotToolbar";

const baseProps = {
  mode: "trend" as const,
  period: "day" as const,
  category: "all" as const,
  sortBy: "popularity.desc" as const,
  date: "2026-05-26",
  weekStart: "2026-05-25",
  month: "2026-05",
  year: "2026",
  onModeChange: vi.fn(),
  onPeriodChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onSortByChange: vi.fn(),
  onResetFilters: vi.fn(),
  onDateChange: vi.fn(),
  onWeekStartChange: vi.fn(),
  onMonthChange: vi.fn(),
  onYearChange: vi.fn(),
};

describe("HotToolbar", () => {
  it("移动端提供调整榜单入口", () => {
    render(<HotToolbar {...baseProps} />);

    expect(screen.getByRole("button", { name: "调整榜单" })).toBeInTheDocument();
  });

  it("移除摘要卡片并保留重置入口", () => {
    render(<HotToolbar {...baseProps} />);

    expect(screen.queryByTestId("hot-toolbar-summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重置条件" })).toBeInTheDocument();
  });

  it("点击调整榜单后展示筛选控件", () => {
    render(<HotToolbar {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "调整榜单" }));

    expect(screen.getByText("榜单模式")).toBeInTheDocument();
    expect(screen.getByText("时间维度")).toBeInTheDocument();
    expect(screen.getByText("内容分类")).toBeInTheDocument();
  });

  it("使用统一分段控件渲染榜单模式、周期和分类", () => {
    render(<HotToolbar {...baseProps} />);

    expect(screen.getByRole("group", { name: "榜单模式" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "时间维度" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "内容分类" })).toBeInTheDocument();
  });

  it("内容分类选中态使用统一纯色品牌色", () => {
    render(<HotToolbar {...baseProps} />);

    const activeButton = screen.getByRole("button", { name: "全部" });

    expect(activeButton.className).toContain("bg-blue-700");
    expect(activeButton.className).not.toContain("from-blue-600");
  });

  it("控制台使用单层控制轨道并移除筛选卡片嵌套", () => {
    render(<HotToolbar {...baseProps} />);

    const controlRail = screen.getByTestId("hot-toolbar-control-rail");

    expect(controlRail).toBeInTheDocument();
    expect(controlRail.querySelectorAll(".surface-card")).toHaveLength(0);
    expect(controlRail.className).toContain("divide");
  });

  it("始终展示当前榜单口径", () => {
    render(<HotToolbar {...baseProps} />);

    expect(screen.getByTestId("hot-toolbar-current-context")).toHaveTextContent(/趋势榜.*每日.*全部/);
  });

  it("不展示后端返回的榜单说明文案", () => {
    render(
      <HotToolbar
        {...baseProps}
        mode="popular"
        period="day"
      />,
    );

    expect(screen.queryByText("当前展示近 180 天内按加权评分排序的热门榜单。")).not.toBeInTheDocument();
  });
});
