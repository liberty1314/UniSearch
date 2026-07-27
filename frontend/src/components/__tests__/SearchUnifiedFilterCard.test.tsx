import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import { SearchService } from "@/services/searchService";
import { CloudType } from "@/types/search";

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
      media_types: { movie: 1, anime: 1 } as Record<string, number>,
      target_types: {},
      capabilities: {},
      action_types: {},
    },
  },
};
let locationSearch = "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
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
    vi.useRealTimers();
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
          media_types: { movie: 1, anime: 1 } as Record<string, number>,
          target_types: {},
          capabilities: {},
          action_types: {},
        },
      },
    };
    locationSearch = "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("默认渲染原版筛选条件卡片和网盘分组", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "筛选条件" })).toBeInTheDocument();
    expect(screen.getByText("先选网盘，再根据需要按关键词继续收窄结果")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "网盘筛选" })).toBeInTheDocument();
    expect(screen.getByText("点击切换来源，长按可仅看单个来源")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /取消全选所有网盘类型/ })).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "展开高级条件",
    })).toBeInTheDocument();
    expect(screen.queryByTestId("search-filter-rail")).not.toBeInTheDocument();
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
    expect(screen.getByTestId("search-unified-filter-collapsed-summary")).toBeInTheDocument();
    expect(screen.getByText("包含：4K")).toBeInTheDocument();
    expect(screen.getByText("排除：枪版")).toBeInTheDocument();
  });

  it("不展示已生效的媒体类型和媒体类型分面", () => {
    searchStoreState.searchParams.filter = {
      mediaTypes: ["movie"],
    };
    searchStoreState.searchResults.facets.media_types = {} as Record<string, number>;

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    expect(screen.queryByText("媒体：电影")).not.toBeInTheDocument();
    expect(screen.queryByText("已启用 1 项")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /展开高级条件/ }));

    expect(screen.queryByText("媒体类型")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /电影/ })).not.toBeInTheDocument();
  });

  it("展开后只展示关键词高级条件", () => {
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
    expect(screen.queryByText("媒体类型")).not.toBeInTheDocument();
    expect(screen.getByText("4k")).toBeInTheDocument();
    expect(screen.getByTestId("include-keyword-header").className).toContain("items-center");
    expect(screen.getByTestId("include-keyword-header").className).toContain("min-h-8");
    expect(screen.getByTestId("include-keyword-chip-row").className).toContain("flex-nowrap");
    expect(screen.getByTestId("include-keyword-chip-row").className).toContain("overflow-x-auto");
    expect(screen.getByRole("button", { name: "4k" }).className).toContain("shrink-0");
    expect(screen.getByRole("button", { name: "4k" }).className).toContain("max-w-[70vw]");
  });

  it("筛选轨道的来源按钮保持长按操作语义", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", {
        name: /夸克网盘.*长按打开来源操作/,
      }),
    ).toBeInTheDocument();
  });

  it("右键网盘来源时打开聚焦菜单并可仅看此源", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: /夸克网盘/ }), {
      clientX: 120,
      clientY: 180,
    });

    expect(screen.getByRole("menu", { name: "夸克网盘来源操作" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "仅看此源" }));

    expect(setSearchParamsMock).toHaveBeenCalledWith({
      cloudTypes: [CloudType.QUARK],
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining(`types=${CloudType.QUARK}`),
      expect.objectContaining({
        replace: true,
        state: expect.objectContaining({
          skipSearchSync: true,
          preserveScroll: true,
        }),
      }),
    );
  });

  it("连续切换多个网盘时只更新本地筛选，不重新搜索", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /百度网盘/ }));
    fireEvent.click(screen.getByRole("button", { name: /阿里云盘/ }));

    expect(setSearchParamsMock).toHaveBeenCalledTimes(2);
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledTimes(2);
  });

  it("选择全部时只更新本地筛选，不重新搜索", () => {
    searchStoreState.searchParams.cloudTypes = [CloudType.QUARK];
    locationSearch = SearchService.buildSearchUrl({
      keyword: "你的名字",
      cloudTypes: [CloudType.QUARK],
    }).replace("/search", "");

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "全选所有网盘类型" }));

    expect(setSearchParamsMock).toHaveBeenCalledWith({ cloudTypes: [] });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      expect.not.stringContaining("types="),
      expect.objectContaining({
        replace: true,
        state: expect.objectContaining({
          skipSearchSync: true,
          preserveScroll: true,
        }),
      }),
    );
  });

  it("右键网盘来源只打开聚焦菜单，不触发普通切换", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: /夸克网盘/ }), {
      clientX: 120,
      clientY: 180,
    });

    expect(screen.getByRole("menu", { name: "夸克网盘来源操作" })).toBeInTheDocument();
    expect(setSearchParamsMock).not.toHaveBeenCalled();
  });

  it("通过键盘菜单键打开来源聚焦菜单", () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    const quarkButton = screen.getByRole("button", { name: /夸克网盘/ });
    quarkButton.focus();
    fireEvent.keyDown(quarkButton, { key: "ContextMenu" });

    expect(screen.getByRole("menu", { name: "夸克网盘来源操作" })).toBeInTheDocument();
  });

  it("编辑高级关键词时先写入草稿，点击应用后才触发搜索", async () => {
    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /展开高级条件/ }));

    const includeInput = screen.getByPlaceholderText("输入关键词后按回车或逗号");
    fireEvent.change(includeInput, { target: { value: "4K" } });
    fireEvent.keyDown(includeInput, { key: "Enter" });

    expect(screen.getByRole("button", { name: "4K" })).toBeInTheDocument();
    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        filter: { include: ["4K"] },
      });
    });
    expect(performSearchMock).toHaveBeenCalledWith(
      { filter: { include: ["4K"] } },
      { preserveResults: true },
    );
  });

  it("重置高级条件只清空草稿，应用后才同步为空筛选", async () => {
    searchStoreState.searchParams.filter = {
      include: ["4K"],
    };

    render(
      <MemoryRouter>
        <SearchUnifiedFilterCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /展开高级条件/ }));
    expect(screen.getByRole("button", { name: "4K" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重置高级条件" }));

    expect(screen.queryByRole("button", { name: "4K" })).not.toBeInTheDocument();
    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        filter: undefined,
      });
    });
    expect(performSearchMock).toHaveBeenCalledWith(
      { filter: undefined },
      { preserveResults: true },
    );
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
