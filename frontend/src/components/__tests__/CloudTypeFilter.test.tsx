import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CloudTypeFilter from "@/components/CloudTypeFilter";
import { CloudType } from "@/types/api";

const { setSearchParamsMock, performSearchMock, navigateMock } = vi.hoisted(() => ({
  setSearchParamsMock: vi.fn(),
  performSearchMock: vi.fn(),
  navigateMock: vi.fn(),
}));

const CLICK_DELAY_MS = 220;
const ALL_CLOUD_TYPES = [
  CloudType.BAIDU,
  CloudType.ALIYUN,
  CloudType.QUARK,
  CloudType.TIANYI,
  CloudType.UC,
  CloudType.MOBILE,
  CloudType.ONE_ONE_FIVE,
  CloudType.XUNLEI,
  CloudType.ONE_TWO_THREE,
  CloudType.MAGNET,
  CloudType.LANZOU,
];

let searchParamsState = {
  keyword: "流浪地球",
  cloudTypes: ALL_CLOUD_TYPES,
};

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({
      pathname: "/",
      search: "?q=%E6%B5%81%E6%B5%AA%E5%9C%B0%E7%90%83",
      hash: "",
    }),
  };
});

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: () => ({
    searchParams: searchParamsState,
    setSearchParams: setSearchParamsMock,
    performSearch: performSearchMock,
    searchResults: {
      total: 0,
      resources: [],
      facets: {
        cloud_types: {
          quark: 0,
        },
        source_types: {},
        media_types: {},
        target_types: {},
        capabilities: {},
        action_types: {},
      },
    },
  }),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

describe("CloudTypeFilter", () => {
  beforeEach(() => {
    searchParamsState = {
      keyword: "流浪地球",
      cloudTypes: ALL_CLOUD_TYPES,
    };
    setSearchParamsMock.mockReset();
    performSearchMock.mockReset();
    navigateMock.mockReset();
    setSearchParamsMock.mockImplementation((params) => {
      searchParamsState = {
        ...searchParamsState,
        ...params,
      };
    });
  });

  it("renders the filter panel without the outer halo layer", () => {
    const { container } = render(<CloudTypeFilter />);

    expect(
      screen.getByRole("heading", { name: "网盘筛选" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /取消全选所有网盘类型|全选所有网盘类型/,
      }),
    ).toBeInTheDocument();
    const filterSurface = screen.getByTestId("cloud-type-filter-surface");
    expect(filterSurface).toHaveClass("bg-white/60");
    expect(filterSurface).toHaveClass("dark:bg-slate-950/40");
    expect(filterSurface).toHaveClass("border-white/60");
    expect(filterSurface).toHaveClass("dark:border-white/[0.06]");
    expect(
      screen.getByText("单击多选，双击仅看此源"),
    ).toBeInTheDocument();
    const hasOuterHaloLayer = Array.from(
      container.querySelectorAll("div"),
    ).some(
      (node) =>
        typeof node.className === "string" &&
        node.className.includes("via-purple-500/10"),
    );

    expect(hasOuterHaloLayer).toBe(false);
  });

  it("re-runs search with updated cloud types when a source chip is toggled", async () => {
    performSearchMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CloudTypeFilter />);

    await user.click(
      screen.getByRole("button", {
        name: "百度网盘（已选中，单击取消，双击仅看此源）",
      }),
    );

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        cloudTypes: ALL_CLOUD_TYPES.filter((type) => type !== CloudType.BAIDU),
      });
    });

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalled();
    });
  });

  it("keeps only the chosen source when a chip is double-clicked", async () => {
    performSearchMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CloudTypeFilter />);

    await user.dblClick(
      screen.getByRole("button", {
        name: "百度网盘（已选中，单击取消，双击仅看此源）",
      }),
    );

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledTimes(1);
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        cloudTypes: [CloudType.BAIDU],
      });
    });

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenCalled();
      expect(performSearchMock).toHaveBeenLastCalledWith(
        { cloudTypes: [CloudType.BAIDU] },
        { preserveResults: true },
      );
    });
  });

  it("does not narrow the selection on touch hold without a double click", async () => {
    render(<CloudTypeFilter />);

    const target = screen.getByRole("button", {
      name: "百度网盘（已选中，单击取消，双击仅看此源）",
    });

    fireEvent.pointerDown(target, { pointerType: "touch" });
    fireEvent.pointerUp(target, { pointerType: "touch" });

    await new Promise((resolve) =>
      window.setTimeout(resolve, CLICK_DELAY_MS + 40),
    );

    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("does not re-run search when the chip is already the only selected source", async () => {
    searchParamsState = {
      keyword: "流浪地球",
      cloudTypes: [CloudType.BAIDU],
    };
    const user = userEvent.setup();

    render(<CloudTypeFilter />);

    await user.dblClick(
      screen.getByRole("button", {
        name: "百度网盘（已选中，单击取消，双击仅看此源）",
      }),
    );

    await new Promise((resolve) =>
      window.setTimeout(resolve, CLICK_DELAY_MS + 40),
    );

    expect(setSearchParamsMock).not.toHaveBeenCalled();
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it("submits an unrestricted cloud type filter when selecting all sources again", async () => {
    performSearchMock.mockResolvedValue(undefined);
    searchParamsState = {
      keyword: "流浪地球",
      cloudTypes: [CloudType.BAIDU, CloudType.QUARK],
    };

    const user = userEvent.setup();
    render(<CloudTypeFilter />);

    await user.click(screen.getByRole("button", { name: "全选所有网盘类型" }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({
        cloudTypes: [],
      });
    });

    await waitFor(() => {
      expect(performSearchMock).toHaveBeenLastCalledWith(
        { cloudTypes: [] },
        { preserveResults: true },
      );
    });
  });
});
