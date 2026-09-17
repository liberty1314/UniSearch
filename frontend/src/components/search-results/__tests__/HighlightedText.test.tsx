import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HighlightedText from "@/components/search-results/HighlightedText";

describe("HighlightedText", () => {
  it("命中片段渲染为 mark 且保留原文", () => {
    render(<HighlightedText text="沙丘2 4K" keyword="沙丘" />);

    const mark = screen.getByText("沙丘");
    expect(mark.tagName).toBe("MARK");
    expect(screen.getByText("2 4K")).toBeInTheDocument();
  });

  it("无命中时不渲染任何 mark", () => {
    const { container } = render(
      <HighlightedText text="流浪地球" keyword="星际穿越" />,
    );

    expect(container.querySelector("mark")).toBeNull();
    expect(screen.getByText("流浪地球")).toBeInTheDocument();
  });

  it("无关键词时按普通文本渲染", () => {
    const { container } = render(<HighlightedText text="你的名字" />);

    expect(container.querySelector("mark")).toBeNull();
  });
});
