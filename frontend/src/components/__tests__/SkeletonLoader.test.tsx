import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FeatureCardsSkeleton,
  SearchResultsSkeleton,
} from "@/components/SkeletonLoader";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => {
      void initial;
      void animate;
      void transition;
      return <div {...props}>{children}</div>;
    },
  },
}));

describe("SkeletonLoader", () => {
  it("渲染搜索结果骨架容器", () => {
    render(<SearchResultsSkeleton viewMode="grid" />);

    expect(screen.getByTestId("search-results-skeleton")).toBeInTheDocument();
  });

  it("渲染首页特性卡片骨架容器", () => {
    render(<FeatureCardsSkeleton />);

    expect(screen.getByTestId("feature-cards-skeleton")).toBeInTheDocument();
  });
});
