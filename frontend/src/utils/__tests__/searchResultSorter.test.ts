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

  it("keeps scan transfer resources visible before regular links with the same match rank", () => {
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
      "scan-older",
      "regular-newer",
    ]);
    expect(result[0].primaryLink?.access_mode).toBe("scan_transfer");
  });

  it("prioritizes resolved SeedHub resources before deferred SeedHub resources", () => {
    const result = sortResources([
      makeResource("deferred", "2026-06-20T00:00:00.000Z", CloudType.QUARK, {
        source: { type: "plugin", id: "sidhub", name: "SeedHub" },
        meta: {
          sid_hub_resolution_rank: 2,
        },
      }),
      makeResource("resolved", "2026-06-10T00:00:00.000Z", CloudType.QUARK, {
        source: { type: "plugin", id: "sidhub", name: "SeedHub" },
        meta: {
          sid_hub_resolution_rank: 0,
        },
      }),
    ]);

    expect(result.map((item) => item.resource.id)).toEqual(["resolved", "deferred"]);
  });
});
