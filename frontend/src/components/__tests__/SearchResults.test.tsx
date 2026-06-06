import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import SearchResults from "@/components/SearchResults";
import type { SearchParams, SearchResponse } from "@/types/api";

type SearchStoreState = {
  searchResults: SearchResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  hasMore: boolean;
  loadMore: ReturnType<typeof vi.fn>;
  searchParams: SearchParams;
  performSearch: ReturnType<typeof vi.fn>;
  setSearchParams: ReturnType<typeof vi.fn>;
  displayedCount: number;
};

let searchStoreState: SearchStoreState = {
  searchResults: {
    total: 1,
    resources: [
      {
        id: "resource-1",
        title: "你的名字 4K",
        description: "新海诚动画电影资源",
        source: { type: "plugin", id: "pansearch", name: "PanSearch" },
        media_type: "movie",
        target_type: "share",
        links: [
          {
            type: "quark",
            url: "https://example.com/resource",
            password: "",
            title: "你的名字 4K",
            datetime: "2026-03-15T00:00:00Z",
          },
        ],
        capabilities: { searchable: true, downloadable: true },
        actions: [
          {
            key: "link.quark.open",
            label: "打开夸克",
            type: "open_link",
            payload: {
              url: "https://example.com/resource",
              link_type: "quark",
            },
          },
        ],
        detail: { content: "详情内容", url: "https://example.com/detail" },
        tags: ["动画"],
        images: [],
        meta: { size: "2.15 GiB", score: 9 },
        published_at: "2026-03-15T00:00:00Z",
      },
    ],
    facets: {
      cloud_types: { quark: 1 },
      source_types: { plugin: 1 },
      media_types: { movie: 1 },
      target_types: { share: 1 },
      capabilities: { downloadable: 1 },
      action_types: { open_link: 1 },
    },
  },
  isLoading: false,
  isRefreshing: false,
  error: "",
  hasMore: false,
  loadMore: vi.fn(),
  searchParams: { keyword: "你的名字" },
  performSearch: vi.fn(),
  setSearchParams: vi.fn(),
  displayedCount: 48,
};
let enableResourceDetailPage = true;

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => searchStoreState,
}));

vi.mock("@/services/systemSettingsService", () => ({
  SystemSettingsService: {
    getSettingsCached: vi.fn(async () => ({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: enableResourceDetailPage,
      public_site_url: "",
      default_copy_format_template: "",
    })),
  },
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("@/components/PasswordModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    password,
    url,
    cloudType,
  }: {
    isOpen: boolean;
    password: string;
    url: string;
    cloudType: string;
  }) =>
    isOpen ? (
      <div data-testid="password-modal">{`${password}|${url}|${cloudType}`}</div>
    ) : null,
}));

vi.mock("@/components/LoadingState", () => ({
  __esModule: true,
  default: () => <div>loading-state</div>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      variants?: unknown;
      initial?: unknown;
      animate?: unknown;
      layout?: unknown;
      layoutId?: unknown;
      whileHover?: unknown;
      whileInView?: unknown;
      transition?: unknown;
    }) => {
      const domProps = { ...props };
      delete domProps.variants;
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.layout;
      delete domProps.layoutId;
      delete domProps.whileHover;
      delete domProps.whileInView;
      delete domProps.transition;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const DetailRouteProbe = () => {
  const location = useLocation();
  const params = useParams();

  return (
    <div>
      <div data-testid="resource-id">{params.resourceId}</div>
      <div data-testid="detail-state">{JSON.stringify(location.state ?? null)}</div>
    </div>
  );
};

const renderSearchResults = () =>
  render(
    <MemoryRouter initialEntries={["/search?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"]}>
      <Routes>
        <Route path="/search" element={<SearchResults />} />
        <Route path="/resource/:resourceId" element={<DetailRouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("SearchResults", () => {
  beforeEach(() => {
    searchStoreState = {
      searchResults: {
        total: 1,
        resources: [
          {
            id: "resource-1",
            title: "你的名字 4K",
            description: "新海诚动画电影资源",
            source: { type: "plugin", id: "pansearch", name: "PanSearch" },
            media_type: "movie",
            target_type: "share",
            links: [
              {
                type: "quark",
                url: "https://example.com/resource",
                password: "",
                title: "你的名字 4K",
                datetime: "2026-03-15T00:00:00Z",
              },
            ],
            capabilities: { searchable: true, downloadable: true },
            actions: [
              {
                key: "link.quark.open",
                label: "打开夸克",
                type: "open_link",
                payload: {
                  url: "https://example.com/resource",
                  link_type: "quark",
                },
              },
            ],
            detail: {
              content: "详情内容",
              url: "https://example.com/detail",
            },
            tags: ["动画"],
            images: [],
            meta: { size: "2.15 GiB", score: 9 },
            published_at: "2026-03-15T00:00:00Z",
          },
        ],
        facets: {
          cloud_types: { quark: 1 },
          source_types: { plugin: 1 },
          media_types: { movie: 1 },
          target_types: { share: 1 },
          capabilities: { downloadable: 1 },
          action_types: { open_link: 1 },
        },
      },
      isLoading: false,
      isRefreshing: false,
      error: "",
      hasMore: false,
      loadMore: vi.fn(),
      searchParams: { keyword: "你的名字" },
      performSearch: vi.fn(),
      setSearchParams: vi.fn(),
      displayedCount: 48,
    };
    enableResourceDetailPage = true;

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
  });

  it("renders lightweight cards without redundant metadata", async () => {
    renderSearchResults();

    expect(await screen.findByTestId("search-result-grid-card")).toHaveTextContent("你的名字 4K");
    expect(screen.getByTestId("search-result-grid-card")).toHaveTextContent("夸克网盘");
    expect(screen.getByTestId("search-result-grid-card")).toHaveTextContent("2.15 GiB");
    expect(screen.getByText("详情")).toBeInTheDocument();

    expect(screen.queryByText("PanSearch")).not.toBeInTheDocument();
    expect(screen.queryByText("movie")).not.toBeInTheDocument();
    expect(screen.queryByText("share")).not.toBeInTheDocument();
    expect(screen.queryByText("新海诚动画电影资源")).not.toBeInTheDocument();
    expect(screen.queryByText("打开夸克")).not.toBeInTheDocument();
    expect(screen.queryByText("资源详情")).not.toBeInTheDocument();
  });

  it("keeps cloud type, password badge and detail entry on a single footer row", async () => {
    searchStoreState.searchResults.resources[0].links[0].password = "1234";

    renderSearchResults();

    const footerRow = await screen.findByTestId("search-result-grid-card-footer");
    const footerLeft = screen.getByTestId("search-result-grid-card-footer-left");
    const detailEntry = screen.getByTestId("search-result-grid-card-detail-entry");

    expect(footerRow.className).toContain("justify-between");
    expect(footerRow.className).toContain("items-center");
    expect(footerLeft).toHaveTextContent("夸克网盘");
    expect(footerLeft).toHaveTextContent("有码");
    expect(detailEntry).toHaveTextContent("详情");
  });

  it("cleans polluted titles in desktop grid cards", async () => {
    searchStoreState.searchResults.resources[0].title =
      "#电影名称：【电影】速度与激情特别行动 4K 描述：洛杉矶街头赛车 链接：https://example.com/detail";

    renderSearchResults();

    expect(await screen.findByText("【电影】速度与激情特别行动 4K")).toBeInTheDocument();
    expect(screen.queryByText(/描述：/)).not.toBeInTheDocument();
    expect(screen.getByTestId("search-result-grid-card-wrapper")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("【电影】速度与激情特别行动 4K"),
    );
  });

  it("cleans polluted titles in mobile list cards", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 520,
    });
    searchStoreState.searchResults.resources[0].title =
      "#电影名称：【电影】速度与激情特别行动 4K 描述：洛杉矶街头赛车 链接：https://example.com/detail";

    renderSearchResults();

    expect(await screen.findByText("【电影】速度与激情特别行动 4K")).toBeInTheDocument();
    expect(screen.queryByText(/描述：/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /【电影】速度与激情特别行动 4K/ })).toBeInTheDocument();
  });

  it("opens the primary resource directly when clicking the card", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(openSpy).toHaveBeenCalledWith("https://example.com/resource", "_blank");
  });

  it("opens the password modal when the primary resource requires a password", async () => {
    searchStoreState.searchResults.resources[0].links[0].password = "1234";

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "1234|https://example.com/resource|quark",
    );
  });

  it("opens the resource access modal instead of direct jump for magnet resources", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "magnet",
      url: "magnet:?xt=urn:btih:testhash",
      password: "",
      title: "你的名字 磁力",
      datetime: "2026-03-15T00:00:00Z",
    };

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "|magnet:?xt=urn:btih:testhash|magnet",
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("navigates to the dedicated resource detail page from the secondary detail entry", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 640,
    });

    renderSearchResults();
    await screen.findByRole("button", { name: /详情/i });
    fireEvent.click(screen.getByRole("button", { name: /详情/i }));

    expect(screen.getByTestId("resource-id")).toHaveTextContent("resource-1");
    expect(screen.getByTestId("detail-state")).toHaveTextContent("resource-1");
    expect(screen.getByTestId("detail-state")).toHaveTextContent("你的名字");
    expect(screen.getByTestId("detail-state")).toHaveTextContent('"/search"');
    expect(screen.getByTestId("detail-state")).toHaveTextContent(
      '"?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"',
    );
    expect(screen.getByTestId("detail-state")).toHaveTextContent('"scrollY":640');
    expect(screen.getByTestId("detail-state")).toHaveTextContent(
      '"routeTransition":"forward"',
    );
  });

  it("hides the detail entry when the system setting is disabled", async () => {
    enableResourceDetailPage = false;

    renderSearchResults();

    await screen.findByTestId("search-result-grid-card");
    expect(screen.queryByRole("button", { name: /详情/i })).not.toBeInTheDocument();
  });

  it("shows service-side filter summary chips and re-runs search when clearing filters", async () => {
    searchStoreState.searchResults = {
      total: 2,
      resources: [
        searchStoreState.searchResults.resources[0],
        {
          id: "resource-2",
          title: "你的名字 原画设定集",
          description: "电子书资源",
          source: { type: "tg", id: "book_channel", name: "BookChannel" },
          media_type: "book",
          target_type: "detail",
          links: [
            {
              type: "baidu",
              url: "https://example.com/book",
              password: "",
              title: "设定集 PDF",
              datetime: "2026-03-16T00:00:00Z",
            },
          ],
          capabilities: { searchable: true },
          actions: [],
          detail: { content: "设定集详情", url: "https://example.com/book-detail" },
          tags: ["电子书"],
          images: [],
          meta: { size: "800 MiB" },
          published_at: "2026-03-16T00:00:00Z",
        },
      ],
      facets: {
        cloud_types: { quark: 1, baidu: 1 },
        source_types: { plugin: 1, tg: 1 },
        media_types: { movie: 1, book: 1 },
        target_types: { share: 1, detail: 1 },
        capabilities: { downloadable: 1, searchable: 2 },
        action_types: { open_link: 1 },
      },
    };
    searchStoreState.searchParams = {
      keyword: "你的名字",
      filter: {
        include: ["4K"],
        exclude: ["设定集"],
      },
    };

    renderSearchResults();

    expect(await screen.findAllByTestId("search-result-grid-card")).toHaveLength(2);
    expect(screen.getByText("你的名字 原画设定集")).toBeInTheDocument();
    expect(screen.getByText("包含：4K")).toBeInTheDocument();
    expect(screen.getByText("排除：设定集")).toBeInTheDocument();
    const toolbarMeta = screen.getByTestId("search-results-toolbar-meta");
    const toolbarFilters = screen.getByTestId("search-results-toolbar-filters");
    expect(toolbarMeta).toContainElement(screen.getByText("个结果"));
    expect(toolbarMeta).toContainElement(toolbarFilters);
    expect(toolbarMeta.className).toContain("flex-wrap");
    expect(toolbarMeta.className).toContain("items-center");
    expect(toolbarMeta.className).toContain("sm:flex-nowrap");
    expect(toolbarFilters.className).toContain("sm:flex-nowrap");
    expect(toolbarFilters.className).toContain("items-center");
    expect(screen.getByTestId("search-results-toolbar").className).toContain("sticky");
    expect(screen.queryByText("媒体：movie")).not.toBeInTheDocument();
    expect(screen.queryByText("能力：downloadable")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "清空筛选条件" }));

    expect(searchStoreState.setSearchParams).toHaveBeenCalledWith({
      cloudTypes: [],
      filter: undefined,
    });
    expect(searchStoreState.performSearch).toHaveBeenCalledWith(
      { cloudTypes: [], filter: undefined },
      { preserveResults: true },
    );
  });

  it("shows a dedicated empty state when the server returns zero results under active filters", async () => {
    searchStoreState.searchResults = {
      total: 0,
      resources: [],
      facets: {
        cloud_types: {},
        source_types: {},
        media_types: {},
        target_types: {},
        capabilities: {},
        action_types: {},
      },
    };
    searchStoreState.searchParams = {
      keyword: "你的名字",
      filter: {
        include: ["不存在的关键词"],
      },
    };

    renderSearchResults();

    expect(await screen.findByText("筛选后暂无结果")).toBeInTheDocument();
    expect(screen.getByText("可以调整网盘、包含关键词或排除关键词，或者清空筛选条件后重新查看全部结果。")).toBeInTheDocument();
  });

  it("shows a refresh hint without clearing previous results during in-place refresh", async () => {
    searchStoreState = {
      ...searchStoreState,
      isRefreshing: true,
    };

    renderSearchResults();

    expect(await screen.findByText("刷新中")).toBeInTheDocument();
    expect(screen.getByTestId("search-result-grid-card")).toBeInTheDocument();
  });

  it("keeps the rendered result count bounded for a 1000 item response", async () => {
    const baseResource = searchStoreState.searchResults.resources[0];
    searchStoreState.searchResults = {
      ...searchStoreState.searchResults,
      total: 1000,
      resources: Array.from({ length: 1000 }, (_, index) => ({
        ...baseResource,
        id: `resource-${index}`,
        title: `你的名字 ${index}`,
        links: baseResource.links.map((link) => ({
          ...link,
          title: `你的名字 ${index}`,
        })),
      })),
    };
    searchStoreState.displayedCount = 48;

    renderSearchResults();

    expect(await screen.findAllByTestId("search-result-grid-card")).toHaveLength(48);
    expect(screen.queryByText("你的名字 999")).not.toBeInTheDocument();
  });

  it("does not show source warning copy when some search sources fail", async () => {
    searchStoreState.searchResults = {
      ...searchStoreState.searchResults,
      warnings: [
        {
          source: "failed-plugin",
          message: "该搜索源暂时不可用，已返回其他来源结果",
        },
      ],
    };

    renderSearchResults();

    expect(await screen.findByTestId("search-result-grid-card")).toBeInTheDocument();
    expect(screen.queryByText("部分搜索源暂时不可用，已优先展示可用结果。")).not.toBeInTheDocument();
  });

  it("switches from mobile list to desktop grid when the viewport crosses the breakpoint", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 520,
    });

    renderSearchResults();
    await screen.findByTestId("search-results-stage");

    const stage = screen.getByTestId("search-results-stage");
    expect(stage.className).toContain("flex flex-col");

    window.innerWidth = 1280;
    fireEvent(window, new Event("resize"));

    expect(stage.className).toContain("grid grid-cols-1");
  });
});
