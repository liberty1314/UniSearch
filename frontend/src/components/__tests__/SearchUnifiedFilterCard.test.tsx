import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import { SearchService } from "@/services/searchService";
import { CloudType } from "@/types/api";

const { performSearchMock, setSearchParamsMock, navigateMock } = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  navigateMock: vi.fn(),
}));

let searchStoreState = {
  searchParams: {
    keyword: "你的名字",
    cloudTypes: [] as string[],
    filter: undefined as
      | undefined
      | {
          include?: string[];
          exclude?: string[];
          mediaTypes?: string[];
        },
  },
  searchResults: {
    total: 2,
    resources: [],
    facets: {
      cloud_types: { quark: 1 },
      source_types: { plugin: 1 },
      media_types: { movie: 1, anime: 1 },
      target_types: {},
      capabilities: {},
      action_types: {},
    },
  },
};
let locationSearch = "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97";

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({
      pathname: "/search",
      search: locationSearch,
      hash: "",
    }),
  };
});

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({
    ...searchStoreState,
    performSearch: performSearchMock,
    setSearchParams: setSearchParamsMock,
  }),
}));

vi.mock("@/components/magicui/cool-mode", () => ({
  CoolMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    section: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      initial?: unknown;
      animate?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.initial;
      delete domProps.animate;
      return <section {...domProps}>{children}</section>;
    },
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.exit;
      delete domProps.transition;
      return <div {...domProps}>{children}</div>;
    },
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      layout?: boolean;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.layout;
      delete domProps.whileHover;
      delete domProps.whileTap;
      return <button {...domProps}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("SearchUnifiedFilterCard", () => {
  beforeEach(() => {
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    navigateMock.mockReset();
    searchStoreState = {
      searchParams: {
        keyword: "你的名字",
        cloudTypes: [],
        filter: undefined,
      },
      searchResults: {
        total: 2,
        resources: [],
        facets: {
          cloud_types: { quark: 1 },
          source_types: { plugin: 1 },
          media_types: { movie: 1, anime: 1 },
          target_types: {},
          capabilities: {},
          action_types: {},
        },
      },
    };
    locationSearch = "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97";
  });

  it("默认只展示统一筛选卡片与网盘筛选摘要", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "筛选条件" })).toBeInTheDocument();
    expect(screen.getByText("网盘筛选")).toBeInTheDocument();
    expect(screen.queryByText("已生效条件")).not.toBeInTheDocument();
    expect(screen.queryByTestId("search-unified-filter-advanced")).not.toBeInTheDocument();
  });

  it("收起状态下保留启用计数和清空操作，但不再展示摘要区", () => {
    searchStoreState.searchParams.filter = {
      include: ["4K"],
      exclude: ["枪版"],
    };

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    expect(screen.getByText("已启用 2 项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空全部筛选" })).toBeInTheDocument();
    expect(screen.queryByText("已生效条件")).not.toBeInTheDocument();
    expect(screen.queryByText("包含：4K")).not.toBeInTheDocument();
  });

  it("展开后展示关键词与媒体类型高级条件", () => {
    searchStoreState.searchParams.filter = {
      include: ["4k"],
    };

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /展开高级条件/ }));

    expect(screen.getByTestId("search-unified-filter-advanced")).toBeInTheDocument();
    expect(screen.getByText("包含关键词")).toBeInTheDocument();
    expect(screen.getByText("排除关键词")).toBeInTheDocument();
    expect(screen.getByText("媒体类型")).toBeInTheDocument();
    expect(screen.getByText("4k")).toBeInTheDocument();
    expect(screen.getByTestId("include-keyword-header").className).toContain("items-center");
    expect(screen.getByTestId("include-keyword-header").className).toContain("min-h-8");
    expect(screen.getByTestId("include-keyword-chip-row").className).toContain("flex-nowrap");
    expect(screen.getByTestId("include-keyword-chip-row").className).toContain("overflow-x-auto");
    expect(screen.getByRole("button", { name: "4k" }).className).toContain("shrink-0");
    expect(screen.getByRole("button", { name: "4k" }).className).toContain("max-w-[70vw]");
  });

  it("清空全部筛选时会一次性重置网盘和高级条件", async () => {
    searchStoreState.searchParams.cloudTypes = [CloudType.QUARK];
    searchStoreState.searchParams.filter = {
      include: ["4K"],
    };
    locationSearch = SearchService.buildSearchUrl({
      keyword: "你的名字",
      cloudTypes: [CloudType.QUARK],
      filter: {
        include: ["4K"],
      },
    }).replace("/search", "");

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "清空全部筛选" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        cloudTypes: [],
        filter: undefined,
      });
    });

    expect(performSearchMock).toHaveBeenCalledWith(
      {
        cloudTypes: [],
        filter: undefined,
      },
      { preserveResults: true },
    );
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        replace: true,
        state: expect.objectContaining({
          skipSearchSync: true,
          preserveScroll: true,
        }),
      }),
    );
  });
});
