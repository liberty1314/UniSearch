export type SearchProgressiveStatus =
  | "idle"
  | "running"
  | "complete"
  | "fallback"
  | "error";

export type SearchVisualPhase =
  | "idle"
  | "submitting"
  | "collecting"
  | "revealing"
  | "settled"
  | "fallback"
  | "error";

export interface SearchTransitionSnapshot {
  keyword: string;
  isLoading: boolean;
  isRefreshing: boolean;
  progressiveStatus: SearchProgressiveStatus;
  completedSources: number;
  totalSources: number;
  receivedBatches: number;
  resultCount: number;
  error: string | null;
}

export interface SearchTransitionViewState {
  phase: SearchVisualPhase;
  progressLabel: string;
  resultCount: number;
}

const clampCompletedSources = (completed: number, total: number) =>
  Math.max(0, Math.min(completed, total));

export function deriveSearchTransitionState(
  snapshot: SearchTransitionSnapshot,
): SearchTransitionViewState {
  const keyword = snapshot.keyword.trim();
  const resultCount = Math.max(0, snapshot.resultCount);

  if (!keyword) {
    return {
      phase: "idle",
      progressLabel: "多来源聚合已准备",
      resultCount,
    };
  }

  if (snapshot.error || snapshot.progressiveStatus === "error") {
    return {
      phase: "error",
      progressLabel: snapshot.error || "搜索未完成",
      resultCount,
    };
  }

  if (snapshot.progressiveStatus === "fallback") {
    return {
      phase: "fallback",
      progressLabel: "已切换为完整搜索",
      resultCount,
    };
  }

  const isSearching = snapshot.isLoading || snapshot.isRefreshing;

  if (isSearching && resultCount > 0) {
    return {
      phase: "revealing",
      progressLabel: `已收到 ${resultCount} 条结果`,
      resultCount,
    };
  }

  if (isSearching) {
    if (snapshot.totalSources > 0) {
      const completedSources = clampCompletedSources(
        snapshot.completedSources,
        snapshot.totalSources,
      );
      const hasProgress = completedSources > 0 || snapshot.receivedBatches > 0;

      return {
        phase: hasProgress ? "collecting" : "submitting",
        progressLabel: hasProgress
          ? `已完成 ${completedSources}/${snapshot.totalSources} 个来源`
          : "正在连接搜索来源",
        resultCount,
      };
    }

    return {
      phase: snapshot.receivedBatches > 0 ? "collecting" : "submitting",
      progressLabel: snapshot.receivedBatches > 0
        ? `已收到 ${snapshot.receivedBatches} 批结果`
        : "正在连接搜索来源",
      resultCount,
    };
  }

  return {
    phase: "settled",
    progressLabel: resultCount > 0
      ? `共找到 ${resultCount} 条结果`
      : "没有找到匹配资源",
    resultCount,
  };
}
