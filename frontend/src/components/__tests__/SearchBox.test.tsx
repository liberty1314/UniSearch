import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "@/components/SearchBox";

const {
  performSearchMock,
  setSearchParamsMock,
  clearHistoryMock,
  removeFromHistoryMock,
  navigateMock,
  warningToastMock,
  errorToastMock,
  logoutMock,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearHistoryMock: vi.fn(),
  removeFromHistoryMock: vi.fn(),
  navigateMock: vi.fn(),
  warningToastMock: vi.fn(),
  errorToastMock: vi.fn(),
  logoutMock: vi.fn(),
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
    searchParams: { keyword: "" },
    setSearchParams: setSearchParamsMock,
    performSearch: performSearchMock,
    clearHistory: clearHistoryMock,
    removeFromHistory: removeFromHistoryMock,
    isLoading: false,
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

vi.mock("@/components/ui/stateful-button", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  const StatefulButton = React.forwardRef<
    { run: (fn: () => Promise<void>) => Promise<void>; reset: () => void },
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, onClick, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      run: (fn) => fn(),
      reset: vi.fn(),
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
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearHistoryMock.mockReset();
    removeFromHistoryMock.mockReset();
    navigateMock.mockReset();
    warningToastMock.mockReset();
    errorToastMock.mockReset();
    logoutMock.mockReset();

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
    };
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
    expect(searchShell).toHaveClass("bg-white/60");
    expect(searchShell).toHaveClass("dark:bg-slate-950/40");
    expect(searchShell).toHaveClass("border-white/60");
    expect(searchShell).toHaveClass("dark:border-white/[0.08]");
    expect(searchShell).toHaveClass("group-focus-within:border-blue-300/60");

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
    expect(navigateMock).toHaveBeenCalledWith("/search?q=%E4%BB%99%E9%80%86");
    await waitFor(() => {
      expect(screen.queryByText("最近搜索")).not.toBeInTheDocument();
    });
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
    expect(navigateMock).toHaveBeenCalledWith("/search?q=%E7%94%B5%E5%BD%B1");
  });

  it("keeps instant searching behavior when already on the standalone results page", async () => {
    currentLocation = {
      pathname: "/search",
      search: "?q=%E6%97%A7%E5%85%B3%E9%94%AE%E8%AF%8D",
      hash: "",
    };
    performSearchMock.mockResolvedValue(undefined);

    render(<SearchBox />);

    await userEvent.type(
      screen.getByPlaceholderText("搜索网盘资源..."),
      "凡人修仙传",
    );
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith({ keyword: "凡人修仙传" });
    });
    expect(navigateMock).toHaveBeenCalledWith("/search?q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0", {
      state: { skipSearchSync: true },
    });
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

  it("logs out expired JWT sessions and sends them back to /login", async () => {
    currentLocation = {
      pathname: "/search",
      search: "",
      hash: "",
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
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
