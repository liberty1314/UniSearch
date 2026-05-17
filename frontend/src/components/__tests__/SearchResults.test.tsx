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

let searchStoreState = {
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
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<SearchResults />} />
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
    renderSearchResults();
    await screen.findByRole("button", { name: /详情/i });
    fireEvent.click(screen.getByRole("button", { name: /详情/i }));

    expect(screen.getByTestId("resource-id")).toHaveTextContent("resource-1");
    expect(screen.getByTestId("detail-state")).toHaveTextContent("resource-1");
    expect(screen.getByTestId("detail-state")).toHaveTextContent("你的名字");
  });

  it("hides the detail entry when the system setting is disabled", async () => {
    enableResourceDetailPage = false;

    renderSearchResults();

    await screen.findByTestId("search-result-grid-card");
    expect(screen.queryByRole("button", { name: /详情/i })).not.toBeInTheDocument();
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
