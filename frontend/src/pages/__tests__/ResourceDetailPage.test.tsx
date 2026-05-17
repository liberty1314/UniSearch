import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

const tgResourceFixture: ResourceObject = {
  ...resourceFixture,
  id: "resource-tg-1",
  title: "速度与激情10",
  source: { type: "tg", id: "movie_channel", name: "电影频道", channel: "share" },
};

const unknownSourceFixture: ResourceObject = {
  ...resourceFixture,
  id: "resource-unknown-1",
  title: "未知来源资源",
  source: { type: "", id: "", name: "" },
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
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/resource/:resourceId" element={<ResourceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const findInfoCardByLabel = (label: string): HTMLElement => {
  const labelNode = screen.getByText(label);
  const card = labelNode.closest("div")?.parentElement;
  if (!card) {
    throw new Error(`未找到 ${label} 对应的信息卡片`);
  }
  return card;
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
    expect(
      screen.getByRole("heading", { level: 1, name: "你的名字 4K" }),
    ).toBeInTheDocument();
    expect(within(findInfoCardByLabel("来源类别")).getByText("插件")).toBeInTheDocument();
    expect(within(findInfoCardByLabel("具体来源")).getByText("PanSearch")).toBeInTheDocument();
    expect(screen.getByText("详情内容")).toBeInTheDocument();
    expect(screen.getByText("打开夸克")).toBeInTheDocument();
    expect(screen.getByText("打开百度")).toBeInTheDocument();
  });

  it("renders tg source detail with concrete channel name", async () => {
    renderDetailPage({
      pathname: "/resource/resource-tg-1",
      state: {
        resource: tgResourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "速度与激情" },
      },
    });

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(within(findInfoCardByLabel("来源类别")).getByText("Telegram 频道")).toBeInTheDocument();
    const sourceCard = within(findInfoCardByLabel("具体来源"));
    expect(sourceCard.getByText("share")).toBeInTheDocument();
    expect(sourceCard.getByText("电影频道")).toBeInTheDocument();
  });

  it("shows fallback label when source fields are missing", async () => {
    renderDetailPage({
      pathname: "/resource/resource-unknown-1",
      state: {
        resource: unknownSourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "未知" },
      },
    });

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(screen.getAllByText("未知来源").length).toBeGreaterThan(0);
  });

  it("falls back to the search store when route state is missing", async () => {
    renderDetailPage("/resource/resource-1");

    expect(await screen.findByTestId("resource-detail-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "你的名字 4K" }),
    ).toBeInTheDocument();
    expect(screen.getByText("百度备份")).toBeInTheDocument();
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

  it("shows disabled state when the resource detail page switch is off", async () => {
    enableResourceDetailPage = false;

    renderDetailPage("/resource/resource-1");

    expect(await screen.findByTestId("resource-detail-disabled-state")).toBeInTheDocument();
    expect(screen.getByText("资源详情页未开启")).toBeInTheDocument();
  });

  it("opens password modal for protected actions", async () => {
    renderDetailPage({
      pathname: "/resource/resource-1",
      state: {
        resource: resourceFixture,
        from: { pathname: "/", label: "搜索结果", keyword: "你的名字" },
      },
    });

    await screen.findByRole("button", { name: "打开百度" });
    fireEvent.click(screen.getByRole("button", { name: "打开百度" }));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "1234|https://pan.baidu.com/s/example|baidu",
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

    await screen.findByRole("button", { name: "打开主资源" });
    fireEvent.click(screen.getByRole("button", { name: "打开主资源" }));

    expect(screen.getByTestId("password-modal")).toHaveTextContent(
      "|magnet:?xt=urn:btih:testhash|magnet",
    );
  });
});
