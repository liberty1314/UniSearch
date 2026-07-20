import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchQueryDock from "@/components/search/SearchQueryDock";
import SearchStage from "@/components/search/SearchStage";
import SearchTransition from "@/components/search/SearchTransition";
import type { SearchTransitionViewState } from "@/components/search/searchTransitionModel";

vi.mock("@/components/SearchBox", () => ({
  __esModule: true,
  default: ({
    onFocusChange,
    onInputCommitted,
  }: {
    onFocusChange?: (focused: boolean) => void;
    onInputCommitted?: (value: string) => void;
  }) => (
    <div data-testid="search-box-mock">
      <button type="button" onClick={() => onFocusChange?.(true)}>
        聚焦
      </button>
      <button type="button" onClick={() => onInputCommitted?.("电影")}>
        输入
      </button>
    </div>
  ),
}));

const idleState: SearchTransitionViewState = {
  phase: "idle",
  progressLabel: "多来源聚合已准备",
  resultCount: 0,
};

describe("搜索体验组件", () => {
  it("空态只展示搜索画布，不包含旧启动台内容", () => {
    const onBack = vi.fn();
    render(
      <SearchStage
        viewState={idleState}
        completedSources={0}
        totalSources={0}
        receivedBatches={0}
        accessHint={undefined}
        onBack={onBack}
      />,
    );

    expect(screen.getByTestId("search-stage")).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "输入资源名称，其他交给聚合",
    })).toBeInTheDocument();
    expect(screen.queryByText("搜索启动台")).not.toBeInTheDocument();
    expect(screen.queryByText("最近有效搜索")).not.toBeInTheDocument();
    expect(screen.queryByText("热榜直搜")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("结果查询条显示真实进度和榜单来源", () => {
    render(
      <SearchQueryDock
        viewState={{
          phase: "collecting",
          progressLabel: "已完成 2/5 个来源",
          resultCount: 0,
        }}
        fromTrendingLabel="沙丘 2"
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByTestId("search-query-dock")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("已完成 2/5 个来源");
    expect(screen.getByText("来自热门榜单：沙丘 2")).toBeInTheDocument();
  });

  it("过渡容器只渲染当前视图", () => {
    const { rerender } = render(
      <SearchTransition
        view="idle"
        idle={<div>空态内容</div>}
        results={<div>结果内容</div>}
      />,
    );

    expect(screen.getByText("空态内容")).toBeInTheDocument();
    expect(screen.queryByText("结果内容")).not.toBeInTheDocument();
    expect(screen.getByTestId("search-transition-shell")).toHaveAttribute(
      "data-presence-mode",
      "popLayout",
    );

    rerender(
      <SearchTransition
        view="results"
        idle={<div>空态内容</div>}
        results={<div>结果内容</div>}
      />,
    );
    expect(screen.getByText("结果内容")).toBeInTheDocument();
  });
});
