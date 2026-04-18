import { describe, it, expect } from "vitest";
import { flattenAndSortResults } from "../searchResultSorter";
import { CloudType } from "@/types/api";
import type { MergedLink } from "@/types/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeLink = (
  url: string,
  datetime: string | null = null,
  overrides: Partial<MergedLink> = {},
): MergedLink => ({
  url,
  note: url,
  password: "",
  datetime: datetime ?? ("" as string),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("flattenAndSortResults", () => {
  // ── 边缘情况 ──────────────────────────────────────────────────────────────

  it("returns empty array for undefined input", () => {
    expect(flattenAndSortResults(undefined)).toEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(flattenAndSortResults(null)).toEqual([]);
  });

  it("returns empty array for empty object", () => {
    expect(flattenAndSortResults({})).toHaveLength(0);
  });

  it("skips non-array values in merged_by_type", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("a")],
      invalidKey: "not-an-array" as unknown as MergedLink[],
    });
    expect(result).toHaveLength(1);
  });

  // ── 展平逻辑 ──────────────────────────────────────────────────────────────

  it("flattens a single cloud type with multiple links", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("a"), makeLink("b"), makeLink("c")],
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.link.url)).toEqual(
      expect.arrayContaining(["a", "b", "c"]),
    );
  });

  it("flattens multiple cloud types into a single array", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("baidu-1"), makeLink("baidu-2")],
      [CloudType.QUARK]: [makeLink("quark-1")],
      [CloudType.ALIYUN]: [makeLink("ali-1"), makeLink("ali-2")],
    });
    expect(result).toHaveLength(5);
  });

  it("attaches the correct cloudType to each result item", () => {
    const result = flattenAndSortResults({
      [CloudType.TIANYI]: [makeLink("ty-1")],
      [CloudType.UC]: [makeLink("uc-1")],
    });
    const types = result.map((r) => r.cloudType);
    expect(types).toContain(CloudType.TIANYI);
    expect(types).toContain(CloudType.UC);
  });

  // ── datetime 处理 ─────────────────────────────────────────────────────────

  it("converts valid ISO datetime string to millisecond timestamp", () => {
    const iso = "2024-06-15T12:00:00.000Z";
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("a", iso)],
    });
    expect(result[0].datetime).toBe(new Date(iso).getTime());
  });

  it("stores 0 for null datetime", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("null-dt", null)],
    });
    expect(result[0].datetime).toBe(0);
  });

  it("stores 0 for empty string datetime", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("empty-dt", "")],
    });
    expect(result[0].datetime).toBe(0);
  });

  it("stores 0 for whitespace-only datetime string", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [makeLink("ws", "   ")],
    });
    expect(result[0].datetime).toBe(0);
  });

  // ── 时间降序排序 ──────────────────────────────────────────────────────────

  it("sorts newer items before older items", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [
        makeLink("old", "2024-01-01T00:00:00.000Z"),
        makeLink("new", "2024-12-01T00:00:00.000Z"),
        makeLink("mid", "2024-06-01T00:00:00.000Z"),
      ],
    });
    expect(result[0].link.url).toBe("new");
    expect(result[1].link.url).toBe("mid");
    expect(result[2].link.url).toBe("old");
  });

  it("places items with no datetime (0) after items with valid dates", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [
        makeLink("no-date", null),
        makeLink("has-date", "2024-01-01T00:00:00.000Z"),
      ],
    });
    expect(result[0].link.url).toBe("has-date");
    expect(result[1].link.url).toBe("no-date");
  });

  // ── 平台优先级排序（时间相同时） ────────────────────────────────────────

  it("sorts by platform priority when datetimes differ by <= 1 second", () => {
    const sameTime = "2024-01-01T00:00:00.000Z";

    const result = flattenAndSortResults({
      [CloudType.MAGNET]: [makeLink("magnet", sameTime)], // priority 3 (lowest)
      [CloudType.LANZOU]: [makeLink("lanzou", sameTime)], // priority 2
      [CloudType.QUARK]: [makeLink("quark", sameTime)], // priority 1 (highest)
    });

    expect(result[0].link.url).toBe("quark"); // p1 first
    expect(result[1].link.url).toBe("lanzou"); // p2 second
    expect(result[result.length - 1].link.url).toBe("magnet"); // p3 last
  });

  it("hot cloud types (quark/baidu/aliyun/tianyi) all rank above other types", () => {
    const sameTime = "2024-03-01T00:00:00.000Z";

    const result = flattenAndSortResults({
      [CloudType.UC]: [makeLink("uc", sameTime)], // priority 2
      [CloudType.BAIDU]: [makeLink("baidu", sameTime)], // priority 1
      [CloudType.QUARK]: [makeLink("quark", sameTime)], // priority 1
      [CloudType.ALIYUN]: [makeLink("ali", sameTime)], // priority 1
      [CloudType.TIANYI]: [makeLink("ty", sameTime)], // priority 1
    });

    const topUrls = result.slice(0, 4).map((r) => r.link.url);
    expect(topUrls).toContain("baidu");
    expect(topUrls).toContain("quark");
    expect(topUrls).toContain("ali");
    expect(topUrls).toContain("ty");
    // uc must be last since it's priority 2
    expect(result[result.length - 1].link.url).toBe("uc");
  });

  it("magnetic links rank last regardless of timestamp within tolerance", () => {
    const sameTime = "2024-01-01T00:00:00.000Z";

    const result = flattenAndSortResults({
      [CloudType.MAGNET]: [makeLink("magnet", sameTime)],
      [CloudType.BAIDU]: [makeLink("baidu", sameTime)],
      [CloudType.XUNLEI]: [makeLink("xunlei", sameTime)],
    });

    expect(result[result.length - 1].link.url).toBe("magnet");
  });

  // ── 时间排序优先于平台优先级（时间差 > 1s） ──────────────────────────────

  it("time difference > 1s overrides platform priority", () => {
    // MAGNET (low priority) but much newer than QUARK (high priority)
    const result = flattenAndSortResults({
      [CloudType.MAGNET]: [makeLink("new-magnet", "2024-12-01T00:00:00.000Z")],
      [CloudType.QUARK]: [makeLink("old-quark", "2024-01-01T00:00:00.000Z")],
    });

    // newer magnet should beat older quark despite priority difference
    expect(result[0].link.url).toBe("new-magnet");
    expect(result[1].link.url).toBe("old-quark");
  });

  // ── 混合场景 ─────────────────────────────────────────────────────────────

  it("correctly orders a realistic mixed-type result set", () => {
    const result = flattenAndSortResults({
      [CloudType.BAIDU]: [
        makeLink("baidu-dec", "2024-12-01T00:00:00.000Z"),
        makeLink("baidu-jan", "2024-01-01T00:00:00.000Z"),
      ],
      [CloudType.MAGNET]: [makeLink("magnet-dec", "2024-12-01T00:00:00.000Z")],
      [CloudType.QUARK]: [makeLink("quark-jun", "2024-06-01T00:00:00.000Z")],
    });

    // baidu-dec and magnet-dec have same time → baidu (p1) before magnet (p3)
    expect(result[0].link.url).toBe("baidu-dec");
    expect(result[1].link.url).toBe("magnet-dec");
    // quark-jun is older, so comes after the December entries
    expect(result[2].link.url).toBe("quark-jun");
    // baidu-jan is oldest
    expect(result[3].link.url).toBe("baidu-jan");
  });
});
