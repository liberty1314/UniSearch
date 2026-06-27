import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import SearchResults from "@/components/SearchResults";
import { SearchService } from "@/services/searchService";
import type { SearchParams, SearchResponse } from "@/types/search";

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
  progressiveStatus: "idle" | "running" | "complete" | "fallback" | "error";
  completedSources: number;
  totalSources: number;
  receivedBatches: number;
  updateResourceScanTransfer: ReturnType<typeof vi.fn>;
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
  progressiveStatus: "idle",
  completedSources: 0,
  totalSources: 0,
  receivedBatches: 0,
  updateResourceScanTransfer: vi.fn(),
};
let enableResourceDetailPage = true;
let enableResourceSourceBadges = false;

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => searchStoreState,
}));

vi.mock("@/services/searchService", () => ({
  SearchService: {
    buildSearchUrl: vi.fn((params: SearchParams) => {
      const keyword = params.keyword ? `?q=${encodeURIComponent(params.keyword)}` : "";
      return `/search${keyword}`;
    }),
    refreshScanTransfer: vi.fn(),
  },
}));

vi.mock("@/services/systemSettingsService", () => ({
  SystemSettingsService: {
    getSettingsCached: vi.fn(async () => ({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: enableResourceDetailPage,
      enable_resource_source_badges: enableResourceSourceBadges,
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
    vi.restoreAllMocks();
    localStorage.clear();
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
      progressiveStatus: "idle",
      completedSources: 0,
      totalSources: 0,
      receivedBatches: 0,
      updateResourceScanTransfer: vi.fn((resourceId: string, linkUrl: string, scanTransfer) => {
        const results = searchStoreState.searchResults;
        if (!results) {
          return;
        }
        searchStoreState.searchResults = {
          ...results,
          resources: results.resources.map((resource) =>
            resource.id === resourceId
              ? {
                  ...resource,
                  links: resource.links.map((link) =>
                    link.url === linkUrl
                      ? { ...link, access_mode: "scan_transfer", scan_transfer: scanTransfer }
                      : link,
                  ),
                }
              : resource,
          ),
        };
      }),
    };
    enableResourceDetailPage = true;
    enableResourceSourceBadges = false;

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.mocked(SearchService.refreshScanTransfer).mockReset();
    vi.mocked(SearchService.buildSearchUrl).mockClear();
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

  it("shows plugin source badge only when enabled", async () => {
    enableResourceSourceBadges = true;

    renderSearchResults();

    const card = await screen.findByTestId("search-result-grid-card");
    const sourceBadge = screen.getByTestId("search-result-source-badge");

    expect(card).toHaveTextContent("PanSearch");
    expect(sourceBadge).toHaveTextContent("PanSearch");
    expect(sourceBadge.className).toContain("text-violet");
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
    expect(screen.queryByText("需扫码")).not.toBeInTheDocument();
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
    expect(screen.queryByText("需扫码")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "|magnet:?xt=urn:btih:testhash|magnet",
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("opens the shared access modal for scan transfer resources", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "quark",
      url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      password: "",
      access_mode: "scan_transfer",
      scan_transfer: {
        qr_code_base64: "data:image/png;base64,abc123",
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
      title: "你的名字 扫码资源",
      datetime: "2026-03-15T00:00:00Z",
    };

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");
    expect(screen.queryByText("需扫码")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "|https://www.seedhub.cc/link_start/?redirect_to=quark_scan|quark",
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("点击无二维码的扫码资源时先刷新，成功后再打开弹窗", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "quark",
      url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      password: "",
      access_mode: "scan_transfer",
      scan_transfer: {
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
      title: "你的名字 待解析扫码资源",
      datetime: "2026-03-15T00:00:00Z",
    };
    vi.mocked(SearchService.refreshScanTransfer).mockResolvedValue({
      resource_id: "resource-1",
      link_url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      access_mode: "scan_transfer",
      scan_transfer: {
        qr_code_base64: "data:image/png;base64,new123",
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
    });

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");

    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
    expect(screen.getByText("取消获取")).toBeInTheDocument();
    await waitFor(() =>
      expect(SearchService.refreshScanTransfer).toHaveBeenCalledWith(
        {
          resource_id: "resource-1",
          link_url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
          refresh_key: "seedhub:4259:quark:1",
        },
        { signal: expect.any(Object) },
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId("password-modal")).toHaveTextContent(
        "|https://www.seedhub.cc/link_start/?redirect_to=quark_scan|quark",
      ),
    );
  });

  it("点击无二维码的扫码资源刷新出二维码内容链接时直接打开链接", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "baidu",
      url: "https://www.seedhub.cc/link_start/?redirect_to=baidu_scan",
      password: "",
      access_mode: "scan_transfer",
      scan_transfer: {
        refreshable: true,
        refresh_key: "seedhub:4259:baidu:1",
      },
      title: "你的名字 待直跳扫码资源",
      datetime: "2026-03-15T00:00:00Z",
    };
    vi.mocked(SearchService.refreshScanTransfer).mockResolvedValue({
      resource_id: "resource-1",
      link_url: "https://www.seedhub.cc/link_start/?redirect_to=baidu_scan",
      access_mode: "scan_transfer",
      scan_transfer: {
        qr_code_value: "https://pan.baidu.com/s/1XG5rTVKw14x2axO6pBabc",
        refreshable: true,
        refresh_key: "seedhub:4259:baidu:1",
      },
    });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");

    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
    expect(screen.getByText("取消获取")).toBeInTheDocument();
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "https://pan.baidu.com/s/1XG5rTVKw14x2axO6pBabc",
        "_blank",
      ),
    );
    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
  });

  it("点击取消获取会中止无二维码扫码资源刷新", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "quark",
      url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      password: "",
      access_mode: "scan_transfer",
      scan_transfer: {
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
      title: "你的名字 可取消扫码资源",
      datetime: "2026-03-15T00:00:00Z",
    };
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(SearchService.refreshScanTransfer).mockImplementation((_, options?: { signal?: AbortSignal }) => {
      capturedSignal = options?.signal;
      return new Promise((_, reject) => {
        options?.signal?.addEventListener("abort", () => {
          const error = new Error("canceled") as Error & { code?: string };
          error.name = "CanceledError";
          error.code = "ERR_CANCELED";
          reject(error);
        });
      });
    });

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");

    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));
    const cancelButton = await screen.findByRole("button", { name: "取消获取" });
    fireEvent.click(cancelButton);

    await waitFor(() => expect(capturedSignal?.aborted).toBe(true));
    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
  });

  it("只预热前 6 条 SeedHub 待解析扫码资源", async () => {
    searchStoreState.searchResults = {
      ...searchStoreState.searchResults!,
      total: 8,
      resources: Array.from({ length: 8 }, (_, index) => ({
        ...searchStoreState.searchResults!.resources[0],
        id: `seedhub-resource-${index + 1}`,
        title: `SeedHub 资源 ${index + 1}`,
        source: { type: "plugin", id: "sidhub", name: "SeedHub" },
        links: [
          {
            type: "quark",
            url: `https://www.seedhub.cc/link_start/?redirect_to=quark_scan_${index + 1}`,
            password: "",
            access_mode: "scan_transfer" as const,
            scan_transfer: {
              refreshable: true,
              refresh_key: `seedhub:4259:quark:${index + 1}`,
            },
            title: `SeedHub 资源 ${index + 1}`,
            datetime: "2026-03-15T00:00:00Z",
          },
        ],
        meta: { sid_hub_movie_id: "4259" },
      })),
    };
    vi.mocked(SearchService.refreshScanTransfer).mockResolvedValue({
      access_mode: "scan_transfer",
      link_url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      scan_transfer: {
        qr_code_base64: "data:image/png;base64,prewarm",
      },
    });

    renderSearchResults();
    await screen.findByText("SeedHub 资源 1");

    await waitFor(() => expect(SearchService.refreshScanTransfer).toHaveBeenCalledTimes(6));
    expect(SearchService.refreshScanTransfer).not.toHaveBeenCalledWith(
      expect.objectContaining({ refresh_key: "seedhub:4259:quark:7" }),
      expect.anything(),
    );
  });

  it("预热成功后点击资源会直接使用已回写的二维码链接", async () => {
    searchStoreState.searchResults.resources[0] = {
      ...searchStoreState.searchResults.resources[0],
      source: { type: "plugin", id: "sidhub", name: "SeedHub" },
      links: [
        {
          type: "quark",
          url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
          password: "",
          access_mode: "scan_transfer",
          scan_transfer: {
            refreshable: true,
            refresh_key: "seedhub:4259:quark:1",
          },
          title: "你的名字 待预热扫码资源",
          datetime: "2026-03-15T00:00:00Z",
        },
      ],
      meta: { sid_hub_movie_id: "4259" },
    };
    vi.mocked(SearchService.refreshScanTransfer).mockResolvedValue({
      resource_id: "resource-1",
      link_url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      access_mode: "scan_transfer",
      scan_transfer: {
        qr_code_value: "https://pan.quark.cn/s/prewarmed",
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
    });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    const view = renderSearchResults();
    await waitFor(() =>
      expect(searchStoreState.updateResourceScanTransfer).toHaveBeenCalledWith(
        "resource-1",
        "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
        expect.objectContaining({ qr_code_value: "https://pan.quark.cn/s/prewarmed" }),
      ),
    );
    view.rerender(
      <MemoryRouter initialEntries={["/search?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"]}>
        <Routes>
          <Route path="/search" element={<SearchResults />} />
          <Route path="/resource/:resourceId" element={<DetailRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId("search-result-grid-card-wrapper"));
    expect(openSpy).toHaveBeenCalledWith("https://pan.quark.cn/s/prewarmed", "_blank");
  });

  it("opens the scan transfer QR code value directly when it is a URL", async () => {
    searchStoreState.searchResults.resources[0].links[0] = {
      type: "quark",
      url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      password: "",
      access_mode: "scan_transfer",
      scan_transfer: {
        qr_code_value: "https://pan.quark.cn/s/686290f881b7",
        qr_code_base64: "data:image/png;base64,abc123",
        refreshable: true,
        refresh_key: "seedhub:4259:quark:1",
      },
      title: "你的名字 扫码直开资源",
      datetime: "2026-03-15T00:00:00Z",
    };

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderSearchResults();
    await screen.findByTestId("search-result-grid-card-wrapper");
    expect(screen.queryByText("需扫码")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("search-result-grid-card-wrapper"));

    expect(openSpy).toHaveBeenCalledWith("https://pan.quark.cn/s/686290f881b7", "_blank");
    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
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
    enableResourceSourceBadges = true;
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
    expect(screen.getByText("BookChannel")).toBeInTheDocument();
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

  it("切换网盘筛选时先用当前结果做本地即时过滤", async () => {
    searchStoreState.searchResults = {
      total: 2,
      resources: [
        searchStoreState.searchResults.resources[0],
        {
          id: "resource-baidu",
          title: "你的名字 百度备份",
          description: "百度资源",
          source: { type: "plugin", id: "pansearch", name: "PanSearch" },
          media_type: "movie",
          target_type: "share",
          links: [
            {
              type: "baidu",
              url: "https://example.com/baidu",
              password: "",
              title: "你的名字 百度备份",
              datetime: "2026-03-16T00:00:00Z",
            },
          ],
          capabilities: { searchable: true, downloadable: true },
          actions: [],
          detail: { content: "百度详情", url: "https://example.com/baidu-detail" },
          tags: [],
          images: [],
          meta: {},
          published_at: "2026-03-16T00:00:00Z",
        },
      ],
      facets: {
        cloud_types: { quark: 1, baidu: 1 },
        source_types: { plugin: 2 },
        media_types: { movie: 2 },
        target_types: { share: 2 },
        capabilities: { downloadable: 2 },
        action_types: { open_link: 1 },
      },
    };
    searchStoreState.searchParams = {
      keyword: "你的名字",
      cloudTypes: ["quark"],
    };
    searchStoreState.isRefreshing = true;

    renderSearchResults();

    expect(await screen.findByText("你的名字 4K")).toBeInTheDocument();
    expect(screen.queryByText("你的名字 百度备份")).not.toBeInTheDocument();
    expect(screen.getByText("加载中")).toBeInTheDocument();
    expect(screen.getByTestId("search-results-toolbar-meta")).toHaveTextContent("1");
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

  it("search request failure no longer renders source availability hint", async () => {
    searchStoreState = {
      ...searchStoreState,
      searchResults: null,
      error: "搜索请求超时",
    };

    renderSearchResults();

    expect(await screen.findByText("搜索请求失败")).toBeInTheDocument();
    expect(
      screen.queryByText("部分搜索源可能不可用，请稍后重试或更换关键词。"),
    ).not.toBeInTheDocument();
  });

  it("empty results with source warnings no longer render extra availability copy", async () => {
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
      warnings: [
        {
          source: "failed-plugin",
          message: "该搜索源暂时不可用，已返回其他来源结果",
        },
      ],
    };

    renderSearchResults();

    expect(await screen.findByText("未找到相关资源")).toBeInTheDocument();
    expect(
      screen.queryByText("部分搜索源可能暂时不可用，可以更换关键词或稍后再试。"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("failed-plugin")).not.toBeInTheDocument();
    expect(
      screen.queryByText("该搜索源暂时不可用，已返回其他来源结果"),
    ).not.toBeInTheDocument();
  });

  it("shows a refresh hint without clearing previous results during in-place refresh", async () => {
    searchStoreState = {
      ...searchStoreState,
      isRefreshing: true,
    };

    renderSearchResults();

    expect(await screen.findByText("加载中")).toBeInTheDocument();
    expect(screen.getByTestId("search-result-grid-card")).toBeInTheDocument();
  });

  it("搜索进行中不向普通用户展示来源进度和批次数", async () => {
    searchStoreState = {
      ...searchStoreState,
      isRefreshing: true,
      progressiveStatus: "running",
      completedSources: 14,
      totalSources: 23,
      receivedBatches: 14,
    };

    renderSearchResults();

    expect(await screen.findByText("加载中")).toBeInTheDocument();
    expect(screen.queryByText(/仍在搜索/)).not.toBeInTheDocument();
    expect(screen.queryByText(/个来源/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已接收/)).not.toBeInTheDocument();
  });

  it("结果 warning 不向普通用户展示提示、来源名和来源数量", async () => {
    searchStoreState = {
      ...searchStoreState,
      searchResults: {
        ...searchStoreState.searchResults,
        warnings: [
          {
            source: "failed-plugin",
            message: "该搜索源暂时不可用，已返回其他来源结果",
          },
        ],
      },
    };

    renderSearchResults();

    expect(await screen.findByTestId("search-result-grid-card")).toBeInTheDocument();
    expect(screen.queryByText("部分结果暂不可用")).not.toBeInTheDocument();
    expect(screen.queryByText(/部分来源/)).not.toBeInTheDocument();
    expect(screen.queryByText("failed-plugin")).not.toBeInTheDocument();
    expect(screen.queryByText(/该搜索源暂时不可用/)).not.toBeInTheDocument();
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

  it("restores and persists the user's search result view mode preference", async () => {
    localStorage.setItem(
      "unisearch_search_results_view_mode",
      JSON.stringify("list"),
    );

    renderSearchResults();

    const stage = await screen.findByTestId("search-results-stage");
    expect(stage.className).toContain("flex flex-col");

    fireEvent.click(screen.getByRole("button", { name: "切换为网格视图" }));

    expect(stage.className).toContain("grid grid-cols-1");
    expect(localStorage.getItem("unisearch_search_results_view_mode")).toBe(
      JSON.stringify("grid"),
    );
  });
});
