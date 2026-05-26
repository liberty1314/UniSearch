import { beforeEach, describe, expect, it } from "vitest";
import {
  createSearchRequestId,
  isLatestSearchRequest,
  resetSearchRequestGuard,
} from "@/stores/searchRequestGuard";

describe("searchRequestGuard", () => {
  beforeEach(() => {
    resetSearchRequestGuard();
  });

  it("只认为最新请求有效", () => {
    const first = createSearchRequestId();
    const second = createSearchRequestId();

    expect(isLatestSearchRequest(first)).toBe(false);
    expect(isLatestSearchRequest(second)).toBe(true);
  });
});
