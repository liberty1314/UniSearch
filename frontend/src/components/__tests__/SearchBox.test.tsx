import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "@/components/SearchBox";
import { resetHomeHotKeywordsCacheForTests } from "@/components/searchBoxTestUtils";
import type { SearchParams } from "@/types/api";

const baseHotRankingResponse = {
  mode: "trend" as const,
  period: "day" as const,
  page: 1,
  page_size: 20,
  has_more: false,
  updated_at: "2026-05-24T10:00:00Z",
  source: "tmdb" as const,
};

const {
  performSearchMock,
  setSearchParamsMock,
  clearResultsMock,
  clearHistoryMock,
  removeFromHistoryMock,
  navigateMock,
  warningToastMock,
  errorToastMock,
  logoutMock,
  resetButtonMock,
  getHotRankingsMock,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearResultsMock: vi.fn(),
  clearHistoryMock: vi.fn(),
  removeFromHistoryMock: vi.fn(),
  navigateMock: vi.fn(),
  warningToastMock: vi.fn(),
  errorToastMock: vi.fn(),
  logoutMock: vi.fn(),
  resetButtonMock: vi.fn(),
  getHotRankingsMock: vi.fn(),
}));

let authState = {
  token: "jwt-token" as string | null,
  isAdmin: false,
  isAuthenticated: true,
};

let searchAccessStatus: "anonymous" | "authenticated" = "authenticated";
let searchHistoryState: string[] = [];
let currentLocation = {
  pathname: "/",
  search: "",
  hash: "",
  state: undefined as unknown,
};

let searchStoreState: {
  searchParams: Partial<SearchParams> & { keyword: string };
  isLoading: boolean;
} = {
  searchParams: { keyword: "" },
  isLoading: false,
};

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => currentLocation,
  };
});

vi.mock("@/stores/searchStore", () => ({
  MAX_SEARCH_HISTORY: 8,
  useSearchStore: () => ({
    ...searchStoreState,
    setSearchParams: setSearchParamsMock,
    performSearch: performSearchMock,
    clearResults: clearResultsMock,
    clearHistory: clearHistoryMock,
    removeFromHistory: removeFromHistoryMock,
  }),
  useSearchHistory: () => searchHistoryState,
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    ...authState,
    logout: logoutMock,
  }),
}));

vi.mock("@/stores/searchAccessStore", () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    warning: warningToastMock,
    error: errorToastMock,
  },
}));

vi.mock("@/services/hotRankingService", () => ({
  hotRankingService: {
    getHotRankings: getHotRankingsMock,
  },
}));

vi.mock("@/components/ui/stateful-button", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  const StatefulButton = React.forwardRef<
    { run: (fn: () => Promise<void>) => Promise<void>; reset: () => void },
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, onClick, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      run: (fn) => fn(),
      reset: resetButtonMock,
    }));

    return (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    );
  });

  StatefulButton.displayName = "StatefulButton";

  return {
    Button: StatefulButton,
  };
});

describe("SearchBox", () => {
  beforeEach(() => {
    resetHomeHotKeywordsCacheForTests(() => {
      (globalThis as typeof globalThis & {
        __unisearchResetHomeHotKeywordsCache?: () => void;
      }).__unisearchResetHomeHotKeywordsCache?.();
    });
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearResultsMock.mockReset();
    clearHistoryMock.mockReset();
    removeFromHistoryMock.mockReset();
    navigateMock.mockReset();
    warningToastMock.mockReset();
    errorToastMock.mockReset();
    logoutMock.mockReset();
    resetButtonMock.mockReset();
    getHotRankingsMock.mockReset();
    getHotRankingsMock.mockResolvedValue({
      ...baseHotRankingResponse,
      sections: [],
    });

    authState = {
      token: "jwt-token",
      isAdmin: false,
      isAuthenticated: true,
    };
    searchAccessStatus = "authenticated";
    searchHistoryState = [];
    currentLocation = {
      pathname: "/",
      search: "",
      hash: "",
      state: undefined,
    };
    searchStoreState = {
      searchParams: { keyword: "" },
      isLoading: false,
    };
  });

  const expectHomeToSearchNavigationState = () => ({
    state: expect.objectContaining({
      routeTransition: "forward",
      transitionSource: "home-search-box",
      resetScroll: true,
    }),
  });

  it("shows up to eight recent searches when the input is focused", async () => {
    searchHistoryState = [
      "海贼王",
      "斗破苍穹",
      "庆余年",
      "流浪地球",
      "仙逆",
      "凡人修仙传",
      "三体",
      "原神",
      "黑神话悟空", // 第 9 条，超过上限 8，不应显示
    ];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));

    expect(screen.getByText("最近搜索")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "删除历史记录 海贼王" }),
    ).toBeInTheDocument();
    // 第 8 条仍可见
    expect(
      screen.getByRole("button", { name: "删除历史记录 原神" }),
    ).toBeInTheDocument();
    // 第 9 条超出上限，不可见
    expect(
      screen.queryByRole("button", { name: "删除历史记录 黑神话悟空" }),
    ).not.toBeInTheDocument();
  });

  it("renders plain history labels and keeps delete buttons pinned to the top-right corner", async () => {
    searchHistoryState = ["海贼王"];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));

    const historyButton = screen.getByRole("button", {
      name: "使用历史记录搜索 海贼王",
    });
    const deleteButton = screen.getByRole("button", {
      name: "删除历史记录 海贼王",
    });
    const deleteButtonClassName = deleteButton.getAttribute("class") ?? "";

    expect(historyButton.querySelector("svg")).toBeNull();
    expect(deleteButtonClassName).toContain("-top-1.5");
    expect(deleteButtonClassName).toContain("-right-1.5");
  });

  it("does not render the history panel when there is no search history", async () => {
    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));

    expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
  });

  it("uses the shared glass surface for the search shell and history popover", async () => {
    searchHistoryState = ["海贼王"];

    render(<SearchBox />);

    const searchShell = screen.getByTestId("search-box-surface");
    expect(searchShell).toHaveClass("bg-white/75");
    expect(searchShell).toHaveClass("dark:bg-slate-950/[0.55]");
    expect(searchShell).toHaveClass("border-slate-200/70");
    expect(searchShell).toHaveClass("dark:border-white/[0.08]");
    expect(searchShell).toHaveClass("group-focus-within:border-blue-300/70");

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));

    const historyPopover = screen.getByTestId("search-history-surface");
    expect(historyPopover).toHaveClass("bg-white/70");
    expect(historyPopover).toHaveClass("dark:bg-slate-950/50");
    expect(historyPopover).toHaveClass("border-white/60");
    expect(historyPopover).toHaveClass("dark:border-white/[0.08]");

    const historyHeader = screen.getByTestId("search-history-header");
    expect(historyHeader).toHaveClass("dark:bg-white/[0.02]");
    expect(historyHeader).toHaveClass("dark:border-white/[0.04]");

    const historyList = screen.getByTestId("search-history-list");
    expect(historyList).toHaveClass("dark:bg-transparent");

    const historyItem = screen.getByRole("button", {
      name: "使用历史记录搜索 海贼王",
    });
    expect(historyItem).toHaveClass("dark:border-white/[0.06]");
    expect(historyItem).toHaveClass("dark:bg-white/[0.03]");
  });

  it("展示搜索访问提示时不影响输入和按钮状态", async () => {
    render(
      <SearchBox accessHint="搜索结果需要登录后查看，输入关键词后会进入登录流程。" />,
    );

    const accessHint = screen.getByText(
      "搜索结果需要登录后查看，输入关键词后会进入登录流程。",
    );

    expect(accessHint).toBeInTheDocument();
    expect(accessHint).toHaveClass("mt-2");
    expect(accessHint).toHaveClass("text-[11px]");
    expect(accessHint).toHaveClass("sm:mt-3");
    expect(accessHint).toHaveClass("sm:text-xs");

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.type(input, "星际穿越");

    expect(screen.getByRole("button", { name: "搜索" })).toBeEnabled();
  });

  it("keeps compact mobile spacing for the input, clear button, and search button", async () => {
    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    expect(input).toHaveClass("pr-24");
    expect(input).toHaveClass("sm:pr-32");

    await userEvent.type(input, "电影");

    const clearButton = screen.getByRole("button", { name: "清空输入" });
    const searchButton = screen.getByRole("button", { name: "搜索" });

    expect(clearButton).toHaveClass("right-[84px]");
    expect(clearButton).toHaveClass("sm:right-[120px]");
    expect(searchButton).toHaveClass("min-w-[78px]");
    expect(searchButton).toHaveClass("sm:min-w-[96px]");
  });

  it("输入法组合态回车不会触发搜索", async () => {
    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.type(input, "前端教程");

    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      keyCode: 229,
    });

    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("anchors the history popover to the search surface instead of the homepage helper chips", async () => {
    searchHistoryState = ["海贼王"];

    const { container } = render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));

    const searchShell = screen.getByTestId("search-box-surface");
    const historyPopover = screen.getByTestId("search-history-surface");
    const helperChipRow = screen.getByText("试试这些").parentElement;

    expect(searchShell.parentElement).toContainElement(historyPopover);
    expect(helperChipRow).not.toContainElement(historyPopover);
    expect(container.firstChild).not.toBe(historyPopover.parentElement);
  });

  it("navigates to the standalone results page after selecting a history item on the homepage", async () => {
    searchHistoryState = ["仙逆", "凡人修仙传"];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));
    await userEvent.click(
      screen.getByRole("button", { name: "使用历史记录搜索 仙逆" }),
    );

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "仙逆" });
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E4%BB%99%E9%80%86",
      expectHomeToSearchNavigationState(),
    );
    await waitFor(() => {
      expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
    });
  });

  it("supports keyboard navigation and enter search for history items", async () => {
    searchHistoryState = ["仙逆", "凡人修仙传"];

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.click(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "仙逆" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "仙逆" });
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E4%BB%99%E9%80%86",
      expectHomeToSearchNavigationState(),
    );
  });

  it("supports arrow-up selection and backspace removal for history items when input is empty", async () => {
    searchHistoryState = ["仙逆", "凡人修仙传"];

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.click(input);

    fireEvent.keyDown(input, { key: "ArrowUp" });

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "凡人修仙传" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(input, { key: "Backspace" });

    expect(removeFromHistoryMock).toHaveBeenCalledWith("凡人修仙传");
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("removes a single history item without triggering a search", async () => {
    searchHistoryState = ["海贼王"];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));
    await userEvent.click(
      screen.getByRole("button", { name: "删除历史记录 海贼王" }),
    );

    expect(removeFromHistoryMock).toHaveBeenCalledWith("海贼王");
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("clears history and closes the panel", async () => {
    searchHistoryState = ["海贼王", "三体"];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));
    await userEvent.click(screen.getByRole("button", { name: "清空记录" }));

    expect(clearHistoryMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
    });
  });

  it("closes the history panel immediately when clicking outside the search surface", async () => {
    searchHistoryState = ["海贼王"];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText("搜索网盘资源..."));
    expect(screen.getByText("最近搜索")).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
  });

  it("closes the history panel when escape is pressed", async () => {
    searchHistoryState = ["海贼王"];

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.click(input);
    expect(screen.getByText("最近搜索")).toBeInTheDocument();

    await userEvent.type(input, "{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
    });
  });

  it("navigates to /search first instead of requesting in place when searching from the homepage", async () => {
    render(<SearchBox />);

    await userEvent.type(
      screen.getByPlaceholderText("搜索网盘资源..."),
      "电影",
    );
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "电影" });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E7%94%B5%E5%BD%B1",
      expectHomeToSearchNavigationState(),
    );
  });

  it("renders quick keyword chips on the homepage and reuses the existing search flow", async () => {
    getHotRankingsMock.mockResolvedValue({
      ...baseHotRankingResponse,
      sections: [
        {
          category: "movie",
          title: "热门电影",
          description: "desc",
          spotlight: {
            id: 1,
            tmdb_id: 1,
            media_type: "movie",
            ranking_category: "movie",
            title: "木乃伊",
            original_title: "木乃伊",
            overview: "",
            poster_url: "",
            backdrop_url: "",
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            release_date: "",
            genre_names: [],
            tmdb_url: "",
          },
          items: [
            {
              id: 2,
              tmdb_id: 2,
              media_type: "movie",
              ranking_category: "movie",
              title: "疯狂计划",
              original_title: "疯狂计划",
              overview: "",
              poster_url: "",
              backdrop_url: "",
              vote_average: 0,
              vote_count: 0,
              popularity: 0,
              release_date: "",
              genre_names: [],
              tmdb_url: "",
            },
          ],
        },
        {
          category: "tv",
          title: "热门电视剧",
          description: "desc",
          spotlight: {
            id: 3,
            tmdb_id: 3,
            media_type: "tv",
            ranking_category: "tv",
            title: "女士优先",
            original_title: "女士优先",
            overview: "",
            poster_url: "",
            backdrop_url: "",
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            release_date: "",
            genre_names: [],
            tmdb_url: "",
          },
          items: [],
        },
        {
          category: "anime",
          title: "热门动漫",
          description: "desc",
          spotlight: {
            id: 4,
            tmdb_id: 4,
            media_type: "movie",
            ranking_category: "anime",
            title: "超级马力欧银河大电影",
            original_title: "超级马力欧银河大电影",
            overview: "",
            poster_url: "",
            backdrop_url: "",
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            release_date: "",
            genre_names: [],
            tmdb_url: "",
          },
          items: [],
        },
      ],
    });

    render(<SearchBox />);

    expect(screen.getByText("试试这些")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "快速搜索 木乃伊" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "快速搜索 木乃伊" }));

    expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "木乃伊" });
    expect(performSearchMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E6%9C%A8%E4%B9%83%E4%BC%8A",
      expectHomeToSearchNavigationState(),
    );
  });

  it("shows a skeleton while homepage hot keywords are loading", () => {
    getHotRankingsMock.mockImplementation(
      () =>
        new Promise(() => {
          // 保持挂起，验证骨架屏状态
        }),
    );

    render(<SearchBox />);

    expect(screen.getByTestId("home-hot-keywords-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /快速搜索/ })).not.toBeInTheDocument();
  });

  it("reuses in-memory hot keyword cache when the homepage remounts shortly after", async () => {
    getHotRankingsMock.mockResolvedValue({
      ...baseHotRankingResponse,
      sections: [
        {
          category: "movie",
          title: "热门电影",
          description: "desc",
          spotlight: {
            id: 1,
            tmdb_id: 1,
            media_type: "movie",
            ranking_category: "movie",
            title: "木乃伊",
            original_title: "木乃伊",
            overview: "",
            poster_url: "",
            backdrop_url: "",
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            release_date: "",
            genre_names: [],
            tmdb_url: "",
          },
          items: [],
        },
      ],
    });

    const firstRender = render(<SearchBox />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "快速搜索 木乃伊" })).toBeInTheDocument();
    });
    expect(getHotRankingsMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    render(<SearchBox />);

    expect(screen.getByRole("button", { name: "快速搜索 木乃伊" })).toBeInTheDocument();
    expect(screen.queryByTestId("home-hot-keywords-skeleton")).not.toBeInTheDocument();
    expect(getHotRankingsMock).toHaveBeenCalledTimes(1);
  });

  it("renders fallback keyword chips when the hot ranking request fails", async () => {
    getHotRankingsMock.mockRejectedValue(new Error("boom"));

    render(<SearchBox />);

    expect(screen.getByTestId("home-hot-keywords-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("home-hot-keywords-skeleton")).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "快速搜索 电影" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "快速搜索 前端教程" }),
    ).toBeInTheDocument();
  });

  it("renders fallback keyword chips when hot ranking response has no usable keywords", async () => {
    getHotRankingsMock.mockResolvedValue({
      ...baseHotRankingResponse,
      sections: [],
    });

    render(<SearchBox />);

    await waitFor(() => {
      expect(screen.queryByTestId("home-hot-keywords-skeleton")).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "快速搜索 电影" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "快速搜索 效率工具" }),
    ).toBeInTheDocument();
  });

  it("hides homepage quick keyword chips on the standalone search page", () => {
    currentLocation = {
      pathname: "/search",
      search: "",
      hash: "",
      state: undefined,
    };

    render(<SearchBox />);

    expect(screen.queryByText("试试这些")).not.toBeInTheDocument();
  });

  it("clears the homepage input and resets button animation when returning from the search page", async () => {
    currentLocation = {
      pathname: "/",
      search: "",
      hash: "",
      state: { resetHomeSearchBox: true },
    };
    searchStoreState = {
      searchParams: { keyword: "旧关键词" },
      isLoading: false,
    };

    render(<SearchBox />);

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: "" });
    });
    expect(screen.getByPlaceholderText("搜索网盘资源...")).toHaveValue("");
    expect(resetButtonMock).toHaveBeenCalled();
  });

  it("在搜索页点击清空输入会清空结果并回到无关键词地址", async () => {
    currentLocation = {
      pathname: "/search",
      search: "?q=%E9%80%9F%E5%BA%A6%E4%B8%8E%E6%BF%80%E6%83%85",
      hash: "",
      state: undefined,
    };
    searchStoreState = {
      searchParams: { keyword: "速度与激情" },
      isLoading: false,
    };

    render(<SearchBox />);

    await userEvent.click(screen.getByRole("button", { name: "清空输入" }));

    expect(clearResultsMock).toHaveBeenCalled();
    expect(setSearchParamsMock).not.toHaveBeenCalledWith({ keyword: "" });
    expect(navigateMock).toHaveBeenCalledWith("/search", {
      replace: true,
      state: { skipSearchSync: true },
    });
    expect(screen.getByPlaceholderText("搜索网盘资源...")).toHaveValue("");
    expect(resetButtonMock).toHaveBeenCalled();
  });

  it("在搜索页清空输入时关闭最近搜索浮层并阻止重新聚焦打开", async () => {
    currentLocation = {
      pathname: "/search",
      search: "?q=%E8%B0%9C%E5%8D%B0%E5%A5%B3%E5%AD%90",
      hash: "",
      state: undefined,
    };
    searchHistoryState = ["谜印女子", "流浪地球"];
    searchStoreState = {
      searchParams: { keyword: "谜印女子" },
      isLoading: false,
    };

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.click(input);
    expect(screen.getByText("最近搜索")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "清空输入" }));

    await waitFor(() => {
      expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
    });
    expect(input).toHaveFocus();
  });

  it("keeps instant searching behavior when already on the standalone results page", async () => {
    currentLocation = {
      pathname: "/search",
      search: "?q=%E6%97%A7%E5%85%B3%E9%94%AE%E8%AF%8D",
      hash: "",
      state: undefined,
    };
    performSearchMock.mockResolvedValue(undefined);

    render(<SearchBox />);

    await userEvent.type(
      screen.getByPlaceholderText("搜索网盘资源..."),
      "凡人修仙传",
    );
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "凡人修仙传",
          cloudTypes: [],
          channels: [],
          plugins: [],
          filter: undefined,
        }),
      );
    });
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0",
      {
        state: { skipSearchSync: true },
      },
    );
  });

  it("clears previous result filters when searching a different keyword on the standalone results page", async () => {
    currentLocation = {
      pathname: "/search",
      search: "?q=%E6%97%A7%E5%85%B3%E9%94%AE%E8%AF%8D&types=quark&include=%E5%AD%97%E5%B9%95",
      hash: "",
      state: undefined,
    };
    searchStoreState = {
      searchParams: {
        keyword: "旧关键词",
        source: "all",
        resultType: "merge",
        cloudTypes: ["quark"],
        channels: ["channel-a"],
        plugins: ["plugin-a"],
        concurrency: 5,
        refresh: false,
        ext: {},
        filter: {
          include: ["字幕"],
        },
      },
      isLoading: false,
    };
    performSearchMock.mockResolvedValue(undefined);

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.clear(input);
    await userEvent.type(input, "凡人修仙传");
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        keyword: "凡人修仙传",
        cloudTypes: [],
        channels: [],
        plugins: [],
        filter: undefined,
      });
    });
    expect(performSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "凡人修仙传",
        cloudTypes: [],
        channels: [],
        plugins: [],
        filter: undefined,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0",
      {
        state: { skipSearchSync: true },
      },
    );
  });

  it("在搜索页清空后重新搜索时会先同步目标地址再发起搜索", async () => {
    currentLocation = {
      pathname: "/search",
      search: "",
      hash: "",
      state: { skipSearchSync: true },
    };
    searchStoreState = {
      searchParams: {
        keyword: "",
        source: "all",
        resultType: "merge",
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
      },
      isLoading: false,
    };
    const eventOrder: string[] = [];
    navigateMock.mockImplementation(() => {
      eventOrder.push("navigate");
    });
    performSearchMock.mockImplementation(() => {
      eventOrder.push("performSearch");
      return new Promise(() => {
        // 保持挂起，验证发起请求前已经离开无关键词 URL。
      });
    });

    render(<SearchBox />);

    const input = screen.getByPlaceholderText("搜索网盘资源...");
    await userEvent.type(input, "速度与激情");
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "速度与激情",
          cloudTypes: [],
          channels: [],
          plugins: [],
          filter: undefined,
        }),
      );
    });
    expect(navigateMock).toHaveBeenCalledWith(
      "/search?q=%E9%80%9F%E5%BA%A6%E4%B8%8E%E6%BF%80%E6%83%85",
      {
        state: { skipSearchSync: true },
      },
    );
    expect(eventOrder).toEqual(["navigate", "performSearch"]);
  });

  it("redirects anonymous users to /login before starting a search", async () => {
    authState = {
      token: null,
      isAdmin: false,
      isAuthenticated: false,
    };
    searchAccessStatus = "anonymous";

    render(<SearchBox />);

    await userEvent.type(
      screen.getByPlaceholderText("搜索网盘资源..."),
      "仙逆",
    );
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    expect(performSearchMock).not.toHaveBeenCalled();
    expect(warningToastMock).toHaveBeenCalledWith("搜索前请先登录", {
      duration: 3000,
    });
    expect(navigateMock).toHaveBeenCalledWith(
      "/login",
      expect.objectContaining({
        state: expect.objectContaining({
          pendingSearch: {
            keyword: "仙逆",
          },
          from: expect.objectContaining({
            pathname: "/search",
            search: "?q=%E4%BB%99%E9%80%86",
          }),
        }),
      }),
    );
  });

  it("logs out expired JWT sessions and sends them back to /login with the pending search", async () => {
    currentLocation = {
      pathname: "/search",
      search: "",
      hash: "",
      state: undefined,
    };
    searchAccessStatus = "authenticated";
    performSearchMock.mockRejectedValue({
      code: 401,
      message: "登录状态已失效，请重新登录",
    });

    render(<SearchBox />);

    await userEvent.type(
      screen.getByPlaceholderText("搜索网盘资源..."),
      "凡人修仙传",
    );
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
    });
    expect(errorToastMock).toHaveBeenCalledWith("登录状态已失效，请重新登录");
    expect(navigateMock).toHaveBeenCalledWith(
      "/login",
      expect.objectContaining({
        state: expect.objectContaining({
          pendingSearch: {
            keyword: "凡人修仙传",
          },
          from: expect.objectContaining({
            pathname: "/search",
            search: "?q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0",
          }),
        }),
      }),
    );
  });
});
