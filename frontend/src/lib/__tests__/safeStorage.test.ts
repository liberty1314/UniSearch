import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readJsonStorage,
  removeStorage,
  writeJsonStorage,
} from "@/lib/safeStorage";

describe("safeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("在 JSON 损坏时返回默认值", () => {
    localStorage.setItem("broken", "{");

    expect(readJsonStorage("broken", ["默认"])).toEqual(["默认"]);
  });

  it("可以写入并读取 JSON", () => {
    writeJsonStorage("items", ["搜索"]);

    expect(readJsonStorage("items", [])).toEqual(["搜索"]);
  });

  it("写入失败时不抛出异常", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("不可用");
    });

    expect(() => writeJsonStorage("items", ["搜索"])).not.toThrow();
  });

  it("删除失败时不抛出异常", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("不可用");
    });

    expect(() => removeStorage("items")).not.toThrow();
  });
});
