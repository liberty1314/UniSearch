import { describe, expect, it } from "vitest";
import type { ResourceObject } from "@/types/api";
import { resolveResourceDisplayTitle } from "../resourceDisplay";

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
