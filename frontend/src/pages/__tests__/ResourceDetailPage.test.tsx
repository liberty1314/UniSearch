import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ResourceDetailPage from "@/pages/ResourceDetailPage";
import type { ResourceObject } from "@/types/api";

const resourceFixture: ResourceObject = {
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
    {
      type: "quark",
      url: "https://example.com/resource-backup",
      password: "",
      title: "你的名字 4K 备用源",
      datetime: "2026-03-14T00:00:00Z",
    },
    {
      type: "baidu",
      url: "https://pan.baidu.com/s/example",
      password: "1234",
      title: "百度备份",
      datetime: "2026-03-15T00:00:00Z",
    },
  ],
  capabilities: { searchable: true, downloadable: true },
  actions: [
    {
      key: "link.quark.open",
      label: "打开夸克",
      type: "open_link",
      payload: { url: "https://example.com/resource", link_type: "quark" },
    },
    {
      key: "link.baidu.open",
      label: "打开百度",
      type: "open_link",
      payload: {
        url: "https://pan.baidu.com/s/example",
        password: "1234",
        link_type: "baidu",
      },
    },
  ],
  detail: { content: "详情内容", url: "https://example.com/detail" },
  tags: ["动画", "电影"],
  images: ["https://example.com/cover.jpg"],
  meta: { size: "2.15 GiB", score: 9 },
  published_at: "2026-03-15T00:00:00Z",
};

let searchStoreState: {
  searchResults: { resources: ResourceObject[] } | null;
} = {
  searchResults: {
    resources: [resourceFixture],
  },
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

const renderDetailPage = (initialEntry: string | { pathname: string; state?: unknown }) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route path="/search" element={<LocationProbe />} />
          <Route path="/resource/:resourceId" element={<ResourceDetailPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {JSON.stringify({
        pathname: location.pathname,
        search: location.search,
        state: location.state ?? null,
      })}
    </div>
  );
};

describe("ResourceDetailPage", () => {
  beforeEach(() => {
    searchStoreState = {
      searchResults: {
        resources: [resourceFixture],
      },
    };
    enableResourceDetailPage = true;
    vi.restoreAllMocks();
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders resource details from route state", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(screen.getByTestId("resource-detail-backbar").className).toContain("resource-detail-backbar");
    expect(
      screen.getByRole("heading", { level: 1, name: "你的名字 4K" }),
    ).toBeInTheDocument();
    expect(screen.getByText("详情内容")).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: "打开主资源" })).length).toBe(1);
    expect(screen.getAllByRole("button", { name: "复制主链接" }).length).toBe(1);
    expect(screen.getByRole("button", { name: "查看原始详情" })).toBeInTheDocument();
    expect(screen.queryByText("PanSearch")).not.toBeInTheDocument();
    expect(screen.queryByText("Telegram 频道")).not.toBeInTheDocument();
    expect(screen.queryByText("插件")).not.toBeInTheDocument();
    expect(screen.queryByText("全部链接")).not.toBeInTheDocument();
    expect(screen.queryByText("推荐入口")).not.toBeInTheDocument();
    expect(screen.queryByText("来源类别")).not.toBeInTheDocument();
    expect(screen.queryByText("具体来源")).not.toBeInTheDocument();
    expect(screen.queryByText("可执行动作")).not.toBeInTheDocument();
    expect(screen.queryByText("Resource Feature")).not.toBeInTheDocument();
    expect(screen.queryByText("Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.queryByText("用首图营造氛围，并保留资源对应的视觉材料。")).not.toBeInTheDocument();
  });

  it("uses the cleaned title in hero and keeps polluted content out of the heading", async () => {
    const pollutedTitleResource: ResourceObject = {
      ...resourceFixture,
      id: "resource-polluted-title",
      title:
        "#电影名称：【电影】速度与激情特别行动 4K 描述：洛杉矶的年轻人都热衷于街头赛车 链接：https://example.com/detail",
      detail: {
        content: "洛杉矶的年轻人都热衷于街头赛车，完整剧情说明保留在摘要区域。",
        url: "https://example.com/detail",
      },
    };

    renderDetailPage({
      pathname: "/resource/resource-polluted-title",
      state: {
        resource: pollutedTitleResource,
        from: { pathname: "/", label: "搜索结果", keyword: "速度与激情" },
      },
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: "【电影】速度与激情特别行动 4K" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: /描述：/ })).not.toBeInTheDocument();
    expect(screen.getByText("洛杉矶的年轻人都热衷于街头赛车，完整剧情说明保留在摘要区域。")).toBeInTheDocument();
  });

  it("falls back to the search store when route state is missing", async () => {
    renderDetailPage("/resource/resource-1");

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "你的名字 4K" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("全部链接")).not.toBeInTheDocument();
  });

  it("restores resource details from recent resource snapshots when route state and store are missing", async () => {
    searchStoreState = {
      searchResults: null,
    };
    localStorage.setItem(
      "unisearch_recent_resource_snapshots",
      JSON.stringify([
        {
          keyword: "你的名字",
          savedAt: Date.now(),
          resource: resourceFixture,
        },
      ]),
    );

    renderDetailPage("/resource/resource-1");

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "你的名字 4K" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when both route state and store resource are missing", async () => {
    searchStoreState = {
      searchResults: {
        resources: [],
      },
    };

    renderDetailPage("/resource/missing-resource");

    expect(await screen.findByTestId("resource-detail-empty-state")).toBeInTheDocument();
    expect(screen.getByText("资源上下文已失效")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回首页" })).toBeInTheDocument();
  });

  it("offers a retry search action when the resource snapshot cannot be restored", async () => {
    searchStoreState = {
      searchResults: null,
    };

    renderDetailPage({
      pathname: "/resource/missing-resource",
      state: {
        from: {
          pathname: "/search",
          search: "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97",
          keyword: "你的名字",
        },
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: "重新搜索当前线索" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"keyword":"你的名字"');
  });

  it("shows disabled state when the resource detail page switch is off", async () => {
    enableResourceDetailPage = false;

    renderDetailPage("/resource/resource-1");

    expect(await screen.findByTestId("resource-detail-disabled-state")).toBeInTheDocument();
    expect(screen.getByText("资源详情页未开启")).toBeInTheDocument();
  });

  it("returns to the previous search route with backward transition state", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: {
          pathname: "/search",
          search: "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97",
          keyword: "你的名字",
        },
        scrollY: 640,
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: "返回搜索结果" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"routeTransition":"backward"',
    );
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"restoreScroll":true');
    expect(screen.getByTestId("location-probe")).toHaveTextContent('"scrollY":640');
  });

  it("copies the primary link and link passwords from the detail page", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const copyPrimaryButtons = await screen.findAllByRole("button", { name: "复制主链接" });
    expect(copyPrimaryButtons).toHaveLength(1);
    fireEvent.click(copyPrimaryButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/resource");
  });

  it("renders summary and links in a single content column", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const summaryHeading = await screen.findByRole("heading", { level: 2, name: "资源摘要" });
    const summarySection = summaryHeading.closest("section");
    const metaStrip = screen.getByTestId("resource-detail-meta-strip");
    const metaItems = screen.getAllByTestId("resource-detail-meta-item");
    const summaryContent = screen.getByTestId("resource-detail-summary-content");
    const bodyBridge = screen.getByTestId("resource-detail-body-bridge");

    expect(summarySection).not.toBeNull();
    expect(bodyBridge.className).toContain("resource-detail-body-bridge");
    expect(summarySection).toHaveAttribute("data-testid", "resource-detail-summary");
    expect(summarySection?.className).toContain("resource-detail-summary-panel");
    expect(metaStrip.className).toContain("resource-detail-meta-strip");
    expect(metaItems).toHaveLength(4);
    expect(metaStrip).toHaveTextContent("发布时间");
    expect(metaStrip).toHaveTextContent("链接数量");
    expect(metaStrip).toHaveTextContent("访问方式");
    expect(metaStrip).toHaveTextContent("资源体积");
    expect(metaStrip).toHaveTextContent("3");
    expect(metaStrip).toHaveTextContent("可直接打开");
    expect(metaStrip).toHaveTextContent("2.15 GiB");
    expect(summaryContent.className).toContain("resource-detail-summary-flow");
    expect(screen.queryByRole("heading", { level: 2, name: "全部链接" })).not.toBeInTheDocument();
  });

  it("prioritizes decision-making metadata inside the hero section", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const heroDecisionCard = await screen.findByTestId("resource-detail-hero-decision-card");
    expect(heroDecisionCard).toHaveTextContent("打开前速览");
    expect(heroDecisionCard).toHaveTextContent("链接数量");
    expect(heroDecisionCard).toHaveTextContent("3");
    expect(heroDecisionCard).toHaveTextContent("访问方式");
    expect(heroDecisionCard).toHaveTextContent("可直接打开");
    expect(heroDecisionCard).toHaveTextContent("资源体积");
    expect(heroDecisionCard).toHaveTextContent("2.15 GiB");
  });

  it("shows a stronger empty-image fallback inside the hero visual card", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: {
          ...resourceFixture,
          images: [],
        },
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    expect(await screen.findByText("暂无预览图")).toBeInTheDocument();
    expect(screen.getByText("可先查看摘要、链接数量与资源体积，再决定是否打开。")).toBeInTheDocument();
  });

  it("uses a poster-friendly image container in the hero section", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const heroImage = await screen.findByRole("img", { name: "你的名字 4K 预览图" });
    const heroImageCard = screen.getByTestId("resource-detail-hero-image-card");
    expect(heroImage.className).toContain("object-contain");
    expect(heroImage.className).not.toContain("object-cover");
    expect(heroImageCard.className).not.toContain("border");
    expect(heroImageCard.className).toContain("rounded-[2.25rem]");
    expect(heroImageCard.className).toContain("shadow-[0_10px_28px_rgba(15,23,42,0.2)]");
    expect(heroImage.className).toContain("rounded-[2rem]");
    expect(heroImage.className).toContain("shadow-[0_8px_24px_rgba(15,23,42,0.18)]");
  });

  it("keeps the action panel while hiding the related image gallery", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const actionPanel = await screen.findByTestId("resource-detail-action-panel");
    const openPrimaryButton = screen.getByRole("button", { name: "打开主资源" });
    const copyPrimaryButton = screen.getByRole("button", { name: "复制主链接" });
    const actionHeading = screen.getByRole("heading", { level: 2, name: "资源操作台" });
    const summaryHeading = screen.getByRole("heading", { level: 2, name: "资源摘要" });

    expect(actionPanel.className).toContain("resource-detail-action-panel");
    expect(screen.getByText("跟随显示")).toBeInTheDocument();
    expect(openPrimaryButton.className).toContain("resource-detail-button-primary");
    expect(copyPrimaryButton.className).toContain("resource-detail-button-secondary");
    expect(actionHeading.className).toContain("resource-detail-section-title");
    expect(summaryHeading.className).toContain("resource-detail-section-title");
    expect(screen.queryByTestId("resource-detail-gallery")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "相关图片" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "你的名字 4K 相关图片 1" })).not.toBeInTheDocument();
    expect(openPrimaryButton).toBeInTheDocument();
    expect(copyPrimaryButton).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看原始详情" })).toBeInTheDocument();
  });

  it("does not render the related image gallery even when multiple images exist", async () => {
    const multiImageResource: ResourceObject = {
      ...resourceFixture,
      id: "resource-multi-image",
      images: [
        "https://example.com/cover-1.jpg",
        "https://example.com/cover-2.jpg",
      ],
    };

    renderDetailPage({
      pathname: "/resource/resource-multi-image",
      state: {
        resource: multiImageResource,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    await screen.findByRole("heading", { level: 1, name: "你的名字 4K" });

    expect(screen.queryByTestId("resource-detail-gallery")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "相关图片" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "你的名字 4K 相关图片 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "你的名字 4K 预览图" })).toBeInTheDocument();
  });

  it("uses a balanced left-side hero layout on desktop", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    await screen.findByRole("heading", { level: 1, name: "你的名字 4K" });

    const heroContent = screen.getByTestId("resource-detail-hero-content");
    const heroMeta = screen.getByTestId("resource-detail-hero-meta");
    const heroTitle = screen.getByRole("heading", { level: 1, name: "你的名字 4K" });

    expect(heroContent.className).toContain("xl:flex");
    expect(heroContent.className).toContain("xl:flex-col");
    expect(heroContent.className).toContain("xl:justify-between");
    expect(heroContent.className).toContain("xl:min-h-full");
    expect(heroMeta.className).toContain("resource-detail-hero-meta-tray");
    expect(heroMeta.className).toContain("rounded-[1.75rem]");
    expect(screen.queryByTestId("resource-detail-hero-divider")).not.toBeInTheDocument();
    expect(heroTitle.className).toContain("xl:text-[4.25rem]");
    expect(heroTitle.className).toContain("xl:leading-[0.98]");
    expect(heroTitle.className).toContain("max-w-[14ch]");
    expect(heroMeta).toHaveTextContent("夸克网盘");
    expect(heroMeta).toHaveTextContent("share");
    expect(heroMeta).toHaveTextContent("2.15 GiB");
    expect(heroMeta).toHaveTextContent("动画");
    expect(heroMeta).toHaveTextContent("电影");
  });

  it("returns to the full search URL when using the back button", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: {
          pathname: "/search",
          search: "?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97&types=quark&mediaTypes=movie",
          label: "搜索结果",
          keyword: "你的名字",
        },
      },
    });

    await screen.findByRole("button", { name: "返回搜索结果" });
    fireEvent.click(screen.getByRole("button", { name: "返回搜索结果" }));

    expect(screen.getByTestId("location-probe")).toHaveTextContent('"pathname":"/search"');
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      '"search":"?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97&types=quark&mediaTypes=movie"',
    );
  });

  it("opens the shared access modal when the primary resource is a magnet link", async () => {
    const magnetResourceFixture: ResourceObject = {
      ...resourceFixture,
      id: "resource-magnet-1",
      title: "磁力资源",
      links: [
        {
          type: "magnet",
          url: "magnet:?xt=urn:btih:testhash",
          password: "",
          title: "磁力资源",
          datetime: "2026-03-15T00:00:00Z",
        },
      ],
      detail: { content: "磁力详情", url: "https://example.com/detail" },
    };

    renderDetailPage({
      pathname: "/resource/resource-magnet-1",
      state: {
        resource: magnetResourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "磁力" },
      },
    });

    const openPrimaryButtons = await screen.findAllByRole("button", { name: "打开主资源" });
    expect(openPrimaryButtons).toHaveLength(1);
    fireEvent.click(openPrimaryButtons[0]);

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "|magnet:?xt=urn:btih:testhash|magnet",
    );
  });

  it("opens the primary resource directly on the detail page even when a password is provided", async () => {
    const passwordProtectedPrimaryResource: ResourceObject = {
      ...resourceFixture,
      id: "resource-password-primary",
      links: [
        {
          type: "quark",
          url: "https://example.com/password-protected-resource",
          password: "1234",
          title: "你的名字 4K",
          datetime: "2026-03-15T00:00:00Z",
        },
      ],
    };

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      opener: null,
    } as Window);

    renderDetailPage({
      pathname: "/resource/resource-password-primary",
      state: {
        resource: passwordProtectedPrimaryResource,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    const openPrimaryButtons = await screen.findAllByRole("button", { name: "打开主资源" });
    expect(openPrimaryButtons).toHaveLength(1);
    fireEvent.click(openPrimaryButtons[0]);

    expect(openSpy).toHaveBeenCalledWith("https://example.com/password-protected-resource", "_blank");
    expect(screen.queryByTestId("password-modal")).not.toBeInTheDocument();
  });
});
