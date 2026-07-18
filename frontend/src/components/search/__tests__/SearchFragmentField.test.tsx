import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchFragmentField from "@/components/search/SearchFragmentField";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => false };
});

describe("SearchFragmentField", () => {
  it("桌面渲染 12 个碎片且其中 6 个在移动端隐藏", () => {
    render(
      <SearchFragmentField
        phase="idle"
        completedSources={0}
        totalSources={0}
        receivedBatches={0}
        focused={false}
        inputSignal={0}
      />,
    );

    expect(screen.getAllByTestId(/^search-fragment-\d+$/)).toHaveLength(12);
    expect(
      screen.getAllByTestId(/^search-fragment-\d+$/).filter(
        (node) => node.dataset.mobileHidden === "true",
      ),
    ).toHaveLength(6);
  });

  it("来源完成数直接映射到碎片状态", () => {
    render(
      <SearchFragmentField
        phase="collecting"
        completedSources={2}
        totalSources={4}
        receivedBatches={1}
        focused
        inputSignal={3}
      />,
    );

    expect(screen.getByTestId("search-fragment-0")).toHaveAttribute(
      "data-state",
      "complete",
    );
    expect(screen.getByTestId("search-fragment-1")).toHaveAttribute(
      "data-state",
      "complete",
    );
    expect(screen.getByTestId("search-fragment-2")).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("装饰层不接收指针且对辅助技术隐藏", () => {
    render(
      <SearchFragmentField
        phase="idle"
        completedSources={0}
        totalSources={0}
        receivedBatches={0}
        focused={false}
        inputSignal={0}
      />,
    );

    expect(screen.getByTestId("search-fragment-field")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByTestId("search-fragment-field")).toHaveClass(
      "pointer-events-none",
    );
  });
});
