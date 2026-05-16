import { describe, expect, it } from "vitest";
import { CloudType, type ResourceObject } from "@/types/api";
import { sortResources } from "../searchResultSorter";

const makeResource = (
  id: string,
  publishedAt: string | null,
  linkType: string,
  overrides: Partial<ResourceObject> = {},
): ResourceObject => ({
  id,
  title: id,
  description: "",
  source: { type: "plugin", id: "test", name: "测试源" },
  media_type: "movie",
  target_type: "share",
  links: linkType
    ? [{ type: linkType, url: `https://example.com/${id}`, title: id }]
    : [],
  capabilities: { searchable: true },
  actions: [],
  detail: {},
  tags: [],
  images: [],
  meta: {},
  published_at: publishedAt ?? "",
  ...overrides,
});

describe("sortResources", () => {
  it("returns empty array for empty resources", () => {
    expect(sortResources(undefined)).toEqual([]);
    expect(sortResources(null)).toEqual([]);
    expect(sortResources([])).toEqual([]);
  });

  it("sorts newer resources before older resources", () => {
    const result = sortResources([
      makeResource("old", "2024-01-01T00:00:00.000Z", CloudType.BAIDU),
      makeResource("new", "2024-12-01T00:00:00.000Z", CloudType.BAIDU),
      makeResource("mid", "2024-06-01T00:00:00.000Z", CloudType.BAIDU),
    ]);

    expect(result.map((item) => item.resource.id)).toEqual(["new", "mid", "old"]);
  });

  it("uses cloud priority when resources have close timestamps", () => {
    const sameTime = "2024-01-01T00:00:00.000Z";
    const result = sortResources([
      makeResource("magnet", sameTime, CloudType.MAGNET),
      makeResource("lanzou", sameTime, CloudType.LANZOU),
      makeResource("quark", sameTime, CloudType.QUARK),
    ]);

    expect(result[0].resource.id).toBe("quark");
    expect(result[1].resource.id).toBe("lanzou");
    expect(result[2].resource.id).toBe("magnet");
  });

  it("keeps resources without links and marks their cloud type as target type", () => {
    const result = sortResources([
      makeResource("detail-only", null, "", {
        target_type: "detail",
        detail: { url: "https://example.com/detail" },
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].cloudType).toBe("detail");
    expect(result[0].primaryLink).toBeUndefined();
  });
});
