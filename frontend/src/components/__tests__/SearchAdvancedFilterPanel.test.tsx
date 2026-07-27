import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import SearchAdvancedFilterPanel from "@/components/SearchAdvancedFilterPanel";

const { performSearchMock, setSearchParamsMock } = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
}));

let searchStoreState = {
  searchParams: {
    keyword: "你的名字",
    filter: undefined,
  },
  searchResults: {
    total: 2,
    resources: [],
    facets: {
      cloud_types: { quark: 1 },
      source_types: { plugin: 1 },
      media_types: { movie: 1, anime: 1 },
      target_types: { share: 1, detail: 1 },
      capabilities: { downloadable: 2, searchable: 2 },
      action_types: { open_link: 1 },
    },
  },
};

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({
    ...searchStoreState,
    performSearch: performSearchMock,
    setSearchParams: setSearchParamsMock,
  }),
}));

describe("SearchAdvancedFilterPanel", () => {
  beforeEach(() => {
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    searchStoreState = {
      searchParams: {
        keyword: "你的名字",
        filter: undefined,
      },
      searchResults: {
        total: 2,
        resources: [],
        facets: {
          cloud_types: { quark: 1 },
          source_types: { plugin: 1 },
          media_types: { movie: 1, anime: 1 },
          target_types: { share: 1, detail: 1 },
          capabilities: { downloadable: 2, searchable: 2 },
          action_types: { open_link: 1 },
        },
      },
    };
  });

  it("只展示关键词筛选，不再展示媒体类型、跳转类型和资源能力", () => {
    render(
      <MemoryRouter initialEntries={["/search?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"]}>
        <SearchAdvancedFilterPanel />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /高级筛选/i }));

    expect(screen.getByText("包含关键词")).toBeInTheDocument();
    expect(screen.getByText("排除关键词")).toBeInTheDocument();
    expect(screen.queryByText("媒体类型")).not.toBeInTheDocument();
    expect(screen.queryByText("跳转类型")).not.toBeInTheDocument();
    expect(screen.queryByText("资源能力")).not.toBeInTheDocument();
    expect(screen.queryByText("可下载")).not.toBeInTheDocument();
    expect(screen.queryByText("可搜索")).not.toBeInTheDocument();
  });
});
