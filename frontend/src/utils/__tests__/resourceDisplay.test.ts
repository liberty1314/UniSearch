import { describe, expect, it } from "vitest";
import type { ResourceObject } from "@/types/resource";
import {
  resolveDeferredResourceLinks,
  resolveResourceActionTarget,
  resolveResourceDisplayTitle,
  resolveResourceOpenTarget,
} from "../resourceDisplay";

const makeResource = (title: string): ResourceObject => ({
  id: "resource-title-test",
  title,
  description: "",
  source: { type: "plugin", id: "test", name: "测试源" },
  media_type: "movie",
  target_type: "share",
  links: [],
  capabilities: { searchable: true },
  actions: [],
  detail: {},
  tags: [],
  images: [],
  meta: {},
  published_at: "",
});

describe("resolveResourceDisplayTitle", () => {
  it("returns short clean titles as-is", () => {
    expect(resolveResourceDisplayTitle(makeResource("你的名字 4K"))).toBe("你的名字 4K");
  });

  it("cuts off polluted suffixes after known separators", () => {
    expect(
      resolveResourceDisplayTitle(
        makeResource("你的名字 4K 描述：故事发生在彗星造访前 链接：https://example.com"),
      ),
    ).toBe("你的名字 4K");
  });

  it("removes noisy list prefixes before keeping the main title", () => {
    expect(
      resolveResourceDisplayTitle(
        makeResource("#电影名称：【电影】速度与激情10部合集 描述：洛杉矶街头赛车"),
      ),
    ).toBe("【电影】速度与激情10部合集");
  });

  it("keeps the first effective title segment when multiple separators exist", () => {
    expect(
      resolveResourceDisplayTitle(
        makeResource("速度与激情10 4K 提取码：1234 标签：动作/犯罪 简介：系列合集"),
      ),
    ).toBe("速度与激情10 4K");
  });

  it("falls back to the original title when cleanup would empty the result", () => {
    expect(resolveResourceDisplayTitle(makeResource("描述：只有说明文字"))).toBe("描述：只有说明文字");
  });
});

describe("resource open target resolution", () => {

  it("keeps deferred opaque candidates out of direct open targets", () => {
    const resource = {
      ...makeResource("SeedHub deferred"),
      links: [
        {
          id: "lnk-v1",
          type: "quark",
          access_mode: "resolve_required" as const,
          resolution: { status: "deferred" as const, token: "rrt-v1" },
        },
      ],
    };

    expect(resolveResourceOpenTarget({
      resource,
      primaryLink: resource.links[0],
      cloudType: "quark",
    })).toBeNull();
    expect(resolveDeferredResourceLinks(resource)).toEqual(resource.links);
  });
  it("does not fall back to an upstream detail URL when the resource has no links", () => {
    const resource = {
      ...makeResource("仅详情资源"),
      target_type: "detail",
      detail: { content: "仅在 UniSearch 内展示的详情" },
    };
    Object.assign(resource.detail, { url: "https://source.example.com/detail/1" });

    expect(
      resolveResourceOpenTarget({
        resource,
        primaryLink: undefined,
        cloudType: "detail",
      }),
    ).toBeNull();
  });

  it("preserves scan transfer payload from primary link targets", () => {
    const resource = {
      ...makeResource("SeedHub 扫码资源"),
      id: "seedhub-scan-1",
      links: [
        {
          type: "quark",
          url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
          access_mode: "scan_transfer" as const,
          scan_transfer: {
            qr_code_base64: "data:image/png;base64,abc123",
            refreshable: true,
            refresh_key: "seedhub:4259:quark:1",
          },
        },
      ],
    };

    const target = resolveResourceOpenTarget({
      resource,
      primaryLink: resource.links[0],
      cloudType: "quark",
    });

    expect(target).toMatchObject({
      url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
      cloudType: "quark",
      accessMode: "scan_transfer",
      resourceId: "seedhub-scan-1",
      scanTransfer: {
        refresh_key: "seedhub:4259:quark:1",
      },
    });
  });

  it("preserves scan transfer payload from action targets", () => {
    const resource = {
      ...makeResource("SeedHub 扫码资源"),
      id: "seedhub-scan-2",
      links: [],
    };

    const target = resolveResourceActionTarget(
      {
        key: "link.quark.open",
        label: "扫码转存",
        type: "open_link",
        payload: {
          url: "https://www.seedhub.cc/link_start/?redirect_to=quark_scan",
          link_type: "quark",
          access_mode: "scan_transfer",
          scan_transfer: {
            transfer_code: "ABCD1234",
            refresh_key: "seedhub:4259:quark:2",
          },
        },
      },
      {
        resource,
        primaryLink: undefined,
        cloudType: "quark",
      },
    );

    expect(target).toMatchObject({
      accessMode: "scan_transfer",
      resourceId: "seedhub-scan-2",
      scanTransfer: {
        transfer_code: "ABCD1234",
      },
    });
  });
});
