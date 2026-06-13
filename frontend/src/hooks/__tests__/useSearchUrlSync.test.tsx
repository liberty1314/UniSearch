import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchUrlSync } from "@/hooks/useSearchUrlSync";

const {
  performSearchMock,
  setSearchParamsMock,
  clearResultsMock,
  authState,
  searchStoreState,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearResultsMock: vi.fn(),
  authState: {
    isAuthenticated: true,
  },
  searchStoreState: {
    searchParams: {
      keyword: "",
      source: "all" as const,
      resultType: "merge" as const,
      cloudTypes: [] as string[],
      channels: [] as string[],
      plugins: [] as string[],
      concurrency: 5,
      refresh: false,
      ext: {},
      filter: undefined,
    },
    searchResults: null as null | { resources: Array<{ id: string }> },
  },
}));

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({
    ...searchStoreState,
    performSearch: performSearchMock,
    setSearchParams: setSearchParamsMock,
    clearResults: clearResultsMock,
  }),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => authState,
}));

const HookProbe = () => {
  const location = useLocation();
  useSearchUrlSync();

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

const renderHookProbe = (
  entry:
    | string
    | {
        pathname: string;
        search?: string;
        state?: unknown;
      },
) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/search" element={<HookProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("useSearchUrlSync", () => {
  beforeEach(() => {
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearResultsMock.mockReset();
    authState.isAuthenticated = true;
    searchStoreState.searchParams = {
      keyword: "",
      source: "all",
      resultType: "merge",
      cloudTypes: [],
      channels: [],
      plugins: [],
      concurrency: 5,
      refresh: false,
      ext: {},
      filter: undefined,
    };
    searchStoreState.searchResults = null;
  });

  it("/search?q=测试 会调用 performSearch", async () => {
    renderHookProbe("/search?q=%E6%B5%8B%E8%AF%95");

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "测试" }),
        { preserveResults: false },
      );
    });
    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "测试" }),
    );
  });

  it("state.skipSearchSync 为 true 时不会调用 performSearch", async () => {
    renderHookProbe({
      pathname: "/search",
      search: "?q=%E6%B5%8B%E8%AF%95",
      state: { skipSearchSync: true },
    });

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "测试" }),
      );
    });
    expect(performSearchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("location-probe")).toHaveTextContent(
        '"state":null',
      );
    });
  });

  it("同一 URL 因结果刷新重渲染时不会重复回写搜索参数", async () => {
    let forceRerender: (() => void) | undefined;

    const RerenderProbe = () => {
      const [, setRenderTick] = React.useState(0);
      forceRerender = () => setRenderTick((tick) => tick + 1);
      return <HookProbe />;
    };

    render(
      <MemoryRouter initialEntries={["/search?q=%E6%B5%8B%E8%AF%95"]}>
        <Routes>
          <Route path="/search" element={<RerenderProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledTimes(1);
    });

    setSearchParamsMock.mockClear();
    performSearchMock.mockClear();
    searchStoreState.searchResults = {
      resources: [{ id: "resource-1" }],
    };

    await act(async () => {
      forceRerender?.();
    });

    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("窗口重新聚焦时按当前 URL 重新校验搜索结果", async () => {
    searchStoreState.searchResults = {
      resources: [{ id: "old-resource" }],
    };
    renderHookProbe("/search?q=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97&types=xunlei");

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "你的名字",
          cloudTypes: ["xunlei"],
        }),
        { preserveResults: false },
      );
    });

    performSearchMock.mockClear();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11_000);

    fireEvent.focus(window);

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "你的名字",
          cloudTypes: ["xunlei"],
        }),
        { preserveResults: false },
      );
    });

    nowSpy.mockRestore();
  });

  it("/search 无 q 时调用 clearResults", async () => {
    renderHookProbe("/search");

    await waitFor(() => {
      expect(clearResultsMock).toHaveBeenCalled();
    });
    expect(performSearchMock).not.toHaveBeenCalled();
  });
});
