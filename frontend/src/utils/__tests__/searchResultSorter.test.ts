import { describe, expect, it } from "vitest";
import { CloudType } from "@/types/search";
import type { ResourceObject } from "@/types/resource";
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

  it("prioritizes exact phrase matches before fuzzy matches, then sorts exact matches by time", () => {
    const result = sortResources(
      [
        makeResource("fuzzy-newer", "2026-05-17T00:00:00.000Z", CloudType.QUARK, {
          title: "速度：激情特别篇",
        }),
        makeResource("exact-older", "2026-05-10T00:00:00.000Z", CloudType.QUARK, {
          title: "速度与激情8",
        }),
        makeResource("exact-newer", "2026-05-16T00:00:00.000Z", CloudType.BAIDU, {
          title: "速度与激情10",
        }),
      ],
      "速度与激情",
    );

    expect(result.map((item) => item.resource.id)).toEqual([
      "exact-newer",
      "exact-older",
      "fuzzy-newer",
    ]);
  });

  it("keeps resources without links and marks their cloud type as target type", () => {
    const result = sortResources([
      makeResource("detail-only", null, "", {
        target_type: "detail",
        detail: { content: "仅详情资源" },
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].cloudType).toBe("detail");
    expect(result[0].primaryLink).toBeUndefined();
  });

  it("uses scan transfer links as the primary card action when mixed with normal links", () => {
    const result = sortResources([
      makeResource("mixed-links", "2026-06-19T00:00:00.000Z", CloudType.QUARK, {
        title: "铁拳教育 WEB-4K",
        links: [
          {
            type: CloudType.QUARK,
            url: "https://pan.quark.cn/s/normal",
            title: "普通夸克链接",
          },
          {
            type: CloudType.QUARK,
            url: "https://www.seedhub.cc/link_start/?redirect_to=pan_id_626957",
            title: "扫码转存链接",
            access_mode: "scan_transfer",
            scan_transfer: {
              instruction: "请使用手机扫码转存",
              transfer_code: "ABCD1234",
            },
          },
        ],
      }),
    ]);

    expect(result[0].primaryLink?.access_mode).toBe("scan_transfer");
    expect(result[0].primaryLink?.url).toContain("link_start");
    expect(result[0].cloudType).toBe(CloudType.QUARK);
  });

  it("does not globally prioritize scan transfer over regular resources", () => {
    const result = sortResources(
      [
        makeResource("regular-newer", "2026-06-19T00:00:00.000Z", CloudType.QUARK, {
          title: "铁拳教育 4K 高码普通链接",
        }),
        makeResource("scan-older", "2026-06-10T00:00:00.000Z", CloudType.QUARK, {
          title: "铁拳教育 WEB-4K 扫码链接",
          links: [
            {
              type: CloudType.QUARK,
              url: "https://www.seedhub.cc/link_start/?redirect_to=pan_id_626957",
              title: "铁拳教育 WEB-4K",
              access_mode: "scan_transfer",
              scan_transfer: {
                qr_code_value: "https://pan.quark.cn/s/46300ad81d60",
              },
            },
          ],
        }),
      ],
      "铁拳教育",
    );

    expect(result.map((item) => item.resource.id)).toEqual([
      "regular-newer",
      "scan-older",
    ]);
  });

  it("sorts a newer deferred SeedHub result ahead of an older actionable result in the same match tier", () => {
    const result = sortResources(
      [
        makeResource("jutoushe-2024", "2024-03-11T00:00:00.000Z", CloudType.QUARK, {
          title: "蜘蛛侠.全系列",
          source: { type: "plugin", id: "jutoushe", name: "剧透社" },
        }),
        makeResource("sidhub-deferred-2026", "2026-07-16T00:00:00.000Z", CloudType.QUARK, {
          title: "蜘蛛侠",
          source: { type: "plugin", id: "sidhub", name: "SeedHub" },
          meta: { sid_hub_resolution_status: "deferred" },
        }),
      ],
      "蜘蛛侠",
    );

    expect(result.map((item) => item.resource.id)).toEqual([
      "sidhub-deferred-2026",
      "jutoushe-2024",
    ]);
  });

  it("prioritizes resolved SeedHub resources before deferred SeedHub resources", () => {
    const result = sortResources([
      makeResource("deferred", "2026-06-20T00:00:00.000Z", CloudType.QUARK, {
        source: { type: "plugin", id: "sidhub", name: "SeedHub" },
        meta: {
          sid_hub_resolution_status: "deferred",
        },
      }),
      makeResource("resolved", "2026-06-20T00:00:00.000Z", CloudType.QUARK, {
        source: { type: "plugin", id: "sidhub", name: "SeedHub" },
        meta: {
          sid_hub_resolution_status: "resolved",
        },
      }),
    ]);

    expect(result.map((item) => item.resource.id)).toEqual(["resolved", "deferred"]);
  });

  it("sorts legacy deferred SeedHub resources by trusted date before resolution status", () => {
	const result = sortResources([
	  makeResource("legacy-newer", "2026-06-20T00:00:00.000Z", CloudType.QUARK, {
		source: { type: "plugin", id: "sidhub", name: "SeedHub" },
		meta: {},
	  }),
	  makeResource("resolved-older", "2026-06-10T00:00:00.000Z", CloudType.QUARK, {
		source: { type: "plugin", id: "sidhub", name: "SeedHub" },
		meta: { sid_hub_resolution_status: "resolved" },
	  }),
	]);

	expect(result.map((item) => item.resource.id)).toEqual([
	  "legacy-newer",
	  "resolved-older",
	]);
  });

  it("treats synthetic SeedHub timestamps as unknown", () => {
	const result = sortResources([
	  makeResource("synthetic-newer", "2026-06-20T00:00:00.000Z", CloudType.QUARK, {
		source: { type: "plugin", id: "sidhub", name: "SeedHub" },
		meta: {
		  sid_hub_resolution_status: "resolved",
		  sid_hub_time_source: "synthetic_fetch_time",
		},
	  }),
	  makeResource("known-older", "2026-06-10T00:00:00.000Z", CloudType.QUARK, {
		source: { type: "plugin", id: "sidhub", name: "SeedHub" },
		meta: {
		  sid_hub_resolution_status: "resolved",
		  sid_hub_time_source: "resource_row",
		},
	  }),
	]);

	expect(result.map((item) => item.resource.id)).toEqual([
	  "known-older",
	  "synthetic-newer",
	]);
  });

  it("keeps original order when all ranking fields are equal", () => {
	const result = sortResources([
	  makeResource("first", null, CloudType.QUARK),
	  makeResource("second", null, CloudType.QUARK),
	  makeResource("third", null, CloudType.QUARK),
	]);

	expect(result.map((item) => item.resource.id)).toEqual(["first", "second", "third"]);
  });

  it("newest mode sorts strictly by time regardless of match rank", () => {
    const result = sortResources(
      [
        makeResource("exact-older", "2024-01-01T00:00:00.000Z", CloudType.QUARK, {
          title: "速度与激情8",
        }),
        makeResource("fuzzy-newer", "2024-12-01T00:00:00.000Z", CloudType.QUARK, {
          title: "速度：激情特别篇",
        }),
      ],
      "速度与激情",
      "newest",
    );

    expect(result.map((item) => item.resource.id)).toEqual([
      "fuzzy-newer",
      "exact-older",
    ]);
  });

  it("oldest mode reverses time order and keeps unknown-time items last", () => {
    const result = sortResources(
      [
        makeResource("newer", "2024-12-01T00:00:00.000Z", CloudType.QUARK),
        makeResource("no-time", null, CloudType.QUARK),
        makeResource("older", "2024-01-01T00:00:00.000Z", CloudType.QUARK),
      ],
      "",
      "oldest",
    );

    expect(result.map((item) => item.resource.id)).toEqual([
      "older",
      "newer",
      "no-time",
    ]);
  });
});
