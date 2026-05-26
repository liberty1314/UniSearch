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

  it("点击调整榜单后展示筛选控件", () => {
    render(<HotToolbar {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "调整榜单" }));

    expect(screen.getByText("榜单模式")).toBeInTheDocument();
    expect(screen.getByText("时间维度")).toBeInTheDocument();
    expect(screen.getByText("内容分类")).toBeInTheDocument();
  });
});
