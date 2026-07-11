import { beforeEach, describe, expect, it } from "vitest";
import type { ResourceObject } from "@/types/resource";
import {
  findRecentResourceSnapshot,
  RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY,
  writeRecentResourceSnapshots,
} from "@/lib/resourceSnapshot";

const buildResource = (index: number): ResourceObject => ({
  id: `resource-${index}`,
  title: `测试资源 ${index}`,
  source: { type: "plugin", name: "测试来源" },
  links: [
    {
      type: "quark",
      url: `https://example.com/${index}`,
      title: `测试资源 ${index}`,
    },
  ],
  capabilities: {},
  actions: [],
  detail: { content: "详情内容" },
});

describe("resourceSnapshot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("写入最近资源快照时会限制数量并保留关键词", () => {
    writeRecentResourceSnapshots(
      Array.from({ length: 25 }, (_, index) => buildResource(index)),
      "测试关键词",
    );

    const snapshots = JSON.parse(
      localStorage.getItem(RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY) || "[]",
    ) as Array<{ keyword?: string; resource?: { id?: string } }>;

    expect(snapshots).toHaveLength(20);
    expect(snapshots[0]).toMatchObject({
      keyword: "测试关键词",
      resource: { id: "resource-0" },
    });
  });

  it("按资源 ID 读取新鲜快照并忽略过期快照", () => {
    const expiredSavedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      RECENT_RESOURCE_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify([
        {
          resource: buildResource(1),
          keyword: "过期",
          savedAt: expiredSavedAt,
        },
        {
          resource: buildResource(2),
          keyword: "新鲜",
          savedAt: Date.now(),
        },
      ]),
    );

    expect(findRecentResourceSnapshot("resource-1")).toBeNull();
    expect(findRecentResourceSnapshot("resource-2")?.title).toBe("测试资源 2");
  });

  it("首次读取时会清理旧版本快照且不恢复旧资源", () => {
    localStorage.setItem(
      "unisearch_recent_resource_snapshots",
      JSON.stringify([
        {
          resource: buildResource(1),
          keyword: "旧搜索",
          savedAt: Date.now(),
        },
      ]),
    );

    expect(findRecentResourceSnapshot("resource-1")).toBeNull();
    expect(localStorage.getItem("unisearch_recent_resource_snapshots")).toBeNull();
  });

  it("使用新的公开资源 ID 恢复 v2 快照", () => {
    const resource = { ...buildResource(3), id: "r_v1_SmQDFVAJ4QziqGAy9YAA4w" };
    writeRecentResourceSnapshots([resource], "新资源");

    expect(findRecentResourceSnapshot(resource.id)).toMatchObject({
      id: resource.id,
      title: "测试资源 3",
    });
  });
});
