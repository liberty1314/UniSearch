import { describe, expect, it } from "vitest";
import type { ResourceObject } from "@/types/resource";
import type { ResultItem } from "@/utils/cloudTypeUtils";
import {
  buildSearchResultsPresentation,
  rebalanceFirstPageBySource,
} from "./searchResultsPresentation";

const makeItem = (
  id: string,
  sourceId: string,
  publishedAt = "2026-07-13T00:00:00.000Z",
): ResultItem => {
  const resource: ResourceObject = {
    id,
    title: id,
    description: "",
    source: { type: "plugin", id: sourceId, name: sourceId || "未知来源" },
    media_type: "movie",
    target_type: "share",
    links: [{ type: "quark", url: `https://example.com/${id}`, title: id }],
    capabilities: { searchable: true },
    actions: [],
    detail: {},
    tags: [],
    images: [],
    meta: {},
    published_at: publishedAt,
  };

  return {
    resource,
    primaryLink: resource.links[0],
    cloudType: "quark",
    datetime: new Date(publishedAt).getTime(),
  };
};

const makeSourceItems = (sourceId: string, count: number): ResultItem[] =>
  Array.from({ length: count }, (_, index) =>
    makeItem(`${sourceId || "unknown"}-${String(index + 1).padStart(2, "0")}`, sourceId),
  );

const countFirstPageBySource = (items: ResultItem[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const item of items.slice(0, 48)) {
    const sourceId = item.resource.source.id.trim() || "unknown";
    counts.set(sourceId, (counts.get(sourceId) || 0) + 1);
  }
  return counts;
};

describe("search results source diversity presentation", () => {
  it("keeps semantic sort order when the switch is disabled", () => {
    const resources = [
      makeItem("older", "source-a", "2026-07-01T00:00:00.000Z").resource,
      makeItem("newer", "source-a", "2026-07-12T00:00:00.000Z").resource,
      makeItem("middle", "source-b", "2026-07-06T00:00:00.000Z").resource,
    ];

    const result = buildSearchResultsPresentation({
      resources,
      keyword: "",
      selectedCloudTypes: [],
      displayedCount: 48,
      enableSourceDiversity: false,
      maxPerSource: 1,
    });

    expect(result.displayedResults.map((item) => item.resource.id)).toEqual([
      "newer",
      "middle",
      "older",
    ]);
  });

  it("caps each source at 16 in the first 48 when enough sources exist", () => {
    const items = [
      ...makeSourceItems("source-a", 48),
      ...makeSourceItems("source-b", 16),
      ...makeSourceItems("source-c", 16),
    ];

    const result = rebalanceFirstPageBySource(items, 48, 16);
    const counts = countFirstPageBySource(result);

    expect(result).toHaveLength(80);
    expect(Object.fromEntries(counts)).toEqual({
      "source-a": 16,
      "source-b": 16,
      "source-c": 16,
    });
  });

  it("backfills the first page when there are not enough sources", () => {
    const items = [
      ...makeSourceItems("source-a", 48),
      ...makeSourceItems("source-b", 8),
    ];

    const result = rebalanceFirstPageBySource(items, 48, 16);
    const counts = countFirstPageBySource(result);

    expect(result.slice(0, 48)).toHaveLength(48);
    expect(counts.get("source-a")).toBe(40);
    expect(counts.get("source-b")).toBe(8);
  });

  it("still fills 48 items when every result has the same source", () => {
    const result = rebalanceFirstPageBySource(
      makeSourceItems("source-a", 60),
      48,
      16,
    );

    expect(result.slice(0, 48)).toHaveLength(48);
    expect(result.slice(0, 48).every((item) => item.resource.source.id === "source-a")).toBe(true);
  });

  it("keeps deferred items available on later pages", () => {
    const items = [
      ...makeSourceItems("source-a", 48),
      ...makeSourceItems("source-b", 24),
    ];

    const result = rebalanceFirstPageBySource(items, 48, 16);
    const originalIds = items.map((item) => item.resource.id).sort();
    const resultIds = result.map((item) => item.resource.id).sort();

    expect(result).toHaveLength(72);
    expect(resultIds).toEqual(originalIds);
    expect(result.slice(48)).toHaveLength(24);
    expect(result.slice(48).some((item) => item.resource.source.id === "source-a")).toBe(true);
  });

  it("groups blank source ids under one stable unknown source key", () => {
    const items = [
      makeItem("unknown-first", ""),
      makeItem("unknown-second", "   "),
      makeItem("known-a", "source-a"),
      makeItem("known-b", "source-b"),
    ];

    const result = rebalanceFirstPageBySource(items, 3, 1);

    expect(result.map((item) => item.resource.id)).toEqual([
      "unknown-first",
      "known-a",
      "known-b",
      "unknown-second",
    ]);
  });
});
