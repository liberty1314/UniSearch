import { describe, expect, it } from "vitest";
import {
  deriveSearchTransitionState,
  resolveSearchTransitionDirection,
  shouldShareSearchQueryLayout,
  type SearchTransitionSnapshot,
} from "@/components/search/searchTransitionModel";

const buildSnapshot = (
  overrides: Partial<SearchTransitionSnapshot> = {},
): SearchTransitionSnapshot => ({
  keyword: "",
  isLoading: false,
  isRefreshing: false,
  progressiveStatus: "idle",
  completedSources: 0,
  totalSources: 0,
  receivedBatches: 0,
  resultCount: 0,
  error: null,
  ...overrides,
});

describe("deriveSearchTransitionState", () => {
  it("无关键词时返回静置画布", () => {
    expect(deriveSearchTransitionState(buildSnapshot())).toEqual({
      phase: "idle",
      progressLabel: "多来源聚合已准备",
      resultCount: 0,
    });
  });

  it("提交后在收到真实进度前显示连接状态", () => {
    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      isLoading: true,
      progressiveStatus: "running",
    }))).toMatchObject({
      phase: "submitting",
      progressLabel: "正在连接搜索来源",
    });
  });

  it("使用真实来源完成数生成聚合状态", () => {
    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      isLoading: true,
      progressiveStatus: "running",
      completedSources: 2,
      totalSources: 5,
      receivedBatches: 1,
    }))).toMatchObject({
      phase: "collecting",
      progressLabel: "已完成 2/5 个来源",
    });
  });

  it("首批结果到达后立即进入揭示阶段", () => {
    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      isRefreshing: true,
      progressiveStatus: "running",
      completedSources: 1,
      totalSources: 3,
      receivedBatches: 1,
      resultCount: 4,
    }))).toMatchObject({
      phase: "revealing",
      progressLabel: "已收到 4 条结果",
    });
  });

  it("普通搜索回退和错误使用明确文案", () => {
    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      isLoading: true,
      progressiveStatus: "fallback",
    }))).toMatchObject({
      phase: "fallback",
      progressLabel: "已切换为完整搜索",
    });

    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      progressiveStatus: "error",
      error: "搜索服务暂不可用",
    }))).toMatchObject({
      phase: "error",
      progressLabel: "搜索服务暂不可用",
    });
  });

  it("来源完成数越界时限制在真实来源总数内", () => {
    expect(deriveSearchTransitionState(buildSnapshot({
      keyword: "流浪地球",
      isLoading: true,
      progressiveStatus: "running",
      completedSources: 9,
      totalSources: 3,
      receivedBatches: 1,
    }))).toMatchObject({
      phase: "collecting",
      progressLabel: "已完成 3/3 个来源",
    });
  });
});

describe("搜索过渡方向", () => {
  it("按视图变化区分正向、反向和静置状态", () => {
    expect(resolveSearchTransitionDirection("idle", "results")).toBe("forward");
    expect(resolveSearchTransitionDirection("results", "idle")).toBe("backward");
    expect(resolveSearchTransitionDirection("idle", "idle")).toBe("steady");
  });

  it("只在正向接管时启用查询框共享布局", () => {
    expect(shouldShareSearchQueryLayout("idle", "steady")).toBe(true);
    expect(shouldShareSearchQueryLayout("results", "forward")).toBe(true);
    expect(shouldShareSearchQueryLayout("idle", "backward")).toBe(false);
    expect(shouldShareSearchQueryLayout("results", "steady")).toBe(false);
  });
});
