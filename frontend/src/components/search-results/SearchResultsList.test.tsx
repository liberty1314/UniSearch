import { describe, expect, it } from "vitest";
import {
  SEARCH_RESULT_REVEAL_LIMIT,
  resolveSearchResultEntranceDelay,
} from "@/components/search-results/searchResultReveal";

describe("结果揭示延迟", () => {
  it("只错落揭示首批前 8 条", () => {
    expect(SEARCH_RESULT_REVEAL_LIMIT).toBe(8);
    expect(
      Array.from({ length: 10 }, (_, index) =>
        resolveSearchResultEntranceDelay(index, true),
      ),
    ).toEqual([0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0, 0]);
  });

  it("非首批揭示阶段不增加延迟", () => {
    expect(resolveSearchResultEntranceDelay(5, false)).toBe(0);
  });

  it("负索引不产生延迟", () => {
    expect(resolveSearchResultEntranceDelay(-1, true)).toBe(0);
  });
});
