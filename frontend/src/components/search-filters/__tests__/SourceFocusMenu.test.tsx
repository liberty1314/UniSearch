import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SourceFocusMenu from "@/components/search-filters/SourceFocusMenu";

describe("SourceFocusMenu", () => {
  it("展示当前来源名称和三个操作", () => {
    render(
      <SourceFocusMenu
        open
        sourceName="夸克网盘"
        x={40}
        y={80}
        selected
        onSelectOnly={vi.fn()}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("menu", { name: "夸克网盘来源操作" })).toBeInTheDocument();
    expect(screen.getByText("夸克网盘")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "仅看此源" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "取消选择" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "选择全部来源" })).toBeInTheDocument();
  });

  it("未选中来源时切换操作显示为加入选择", () => {
    render(
      <SourceFocusMenu
        open
        sourceName="阿里云盘"
        x={40}
        y={80}
        selected={false}
        onSelectOnly={vi.fn()}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("menuitem", { name: "加入选择" })).toBeInTheDocument();
  });

  it("点击操作后调用对应回调并关闭菜单", () => {
    const onSelectOnly = vi.fn();
    const onClose = vi.fn();

    render(
      <SourceFocusMenu
        open
        sourceName="百度网盘"
        x={40}
        y={80}
        selected
        onSelectOnly={onSelectOnly}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "仅看此源" }));

    expect(onSelectOnly).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("按 Escape 关闭菜单", () => {
    const onClose = vi.fn();

    render(
      <SourceFocusMenu
        open
        sourceName="百度网盘"
        x={40}
        y={80}
        selected
        onSelectOnly={vi.fn()}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
