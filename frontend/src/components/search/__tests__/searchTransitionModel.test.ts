import { describe, expect, it } from "vitest";
import {
  deriveSearchTransitionState,
  resolveSearchTransitionMotion,
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
      progressLabel: "多来源已就绪",
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

describe("搜索视图过渡", () => {
  it("结果与空态只使用低幅位移和短时淡入", () => {
    expect(resolveSearchTransitionMotion("results", false)).toEqual({
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: {
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      },
    });
    expect(resolveSearchTransitionMotion("idle", false)).toEqual({
      initial: { opacity: 0, y: -4 },
      animate: { opacity: 1, y: 0 },
      transition: {
        duration: 0.18,
        ease: [0.22, 1, 0.36, 1],
      },
    });
  });

  it("减少动态效果时只保留快速淡入", () => {
    expect(resolveSearchTransitionMotion("results", true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: {
        duration: 0.12,
        ease: "linear",
      },
    });
  });
});
